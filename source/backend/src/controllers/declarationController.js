const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'declarations:list';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const formatImagesArray = (imagesJson) => {
    if (!imagesJson) return [];
    try {
        const images = JSON.parse(imagesJson);
        if (!Array.isArray(images)) return [];
        return images.map(img => {
            if (img.startsWith('http')) return img;
            const cleanPath = img.startsWith('/') ? img : `/${img}`;
            return `${APP_URL}${cleanPath}`;
        });
    } catch (e) {
        return [];
    }
};

const declarationController = {
    getAllDeclarations: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', productCodeId } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}:${productCodeId || ''}`;

            // Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }

            // Build Query
            const where = { deletedAt: null };
            if (productCodeId) {
                where.productCodeId = parseInt(productCodeId);
            }
            if (req.query.productItemId) {
                where.productItemId = parseInt(req.query.productItemId);
            }

            if (search) {
                where.OR = [
                    { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
                    { brand: { contains: search, mode: 'insensitive' } },
                    { sellerCompanyName: { contains: search, mode: 'insensitive' } },
                    { productItem: { productName: { contains: search, mode: 'insensitive' } } },
                    { productCode: { orderCode: { contains: search, mode: 'insensitive' } } }
                ].filter(Boolean);
            }

            // Query DB
            const [declarations, total] = await prisma.$transaction([
                prisma.declaration.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        productItem: {
                            select: {
                                id: true,
                                productName: true,
                                itemTransportFeeEstimate: true,
                                packageCount: true,
                                packageUnit: true,
                                weight: true,
                                volume: true
                            }
                        },
                        productCode: {
                            select: {
                                id: true,
                                orderCode: true,
                                entryDate: true,
                                infoSource: true,
                                customer: {
                                    select: {
                                        fullName: true,
                                        customerCode: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.declaration.count({ where })
            ]);

            const mappedItems = declarations.map(item => ({
                ...item,
                imageUrls: formatImagesArray(item.images)
            }));

            const responseData = {
                code: 200,
                message: "Success",
                data: {
                    items: mappedItems,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };

            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[GetAllDeclarations] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    },

    getDeclarationById: async (req, res) => {
        try {
            const { id } = req.params;
            const declaration = await prisma.declaration.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: {
                    productItem: true,
                    productCode: {
                        include: {
                            customer: true
                        }
                    }
                }
            });

            if (!declaration) {
                return res.status(404).json({ code: 404, message: "Declaration not found" });
            }

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...declaration,
                    imageUrls: formatImagesArray(declaration.images)
                }
            });
        } catch (error) {
            logger.error(`[GetDeclarationById] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    },

    updateDeclaration: async (req, res) => {
        try {
            const { id } = req.params;
            const body = req.body;

            // Check existence and get product item fee
            const existing = await prisma.declaration.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: { productItem: true }
            });

            if (!existing) {
                return res.status(404).json({ code: 404, message: "Declaration not found" });
            }

            // Handle Images
            let imagesJson = existing.images;
            if (req.files && req.files.length > 0) {
                const newPaths = req.files.map(file => {
                    const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                    return `/uploads/${relativePath}`;
                });
                // Note: User can replace all or append, but here we append and limit to 3 if requested, 
                // or just take the current upload as final.
                imagesJson = JSON.stringify(newPaths.slice(0, 3));
            } else if (body.existingImages) {
                // If user deleted some images from UI
                const existingImages = Array.isArray(body.existingImages) ? body.existingImages : JSON.parse(body.existingImages);
                imagesJson = JSON.stringify(existingImages.slice(0, 3));
            }

            // Calculations
            // QUAN TRỌNG: Dùng giá trị từ DB (existing) khi field không được gửi lên (undefined/null/empty)
            // Tránh trường hợp user ấn Save mà không đổi gì → backend reset về 0 do || 0 overrride
            const parseOrKeep = (bodyVal, existingVal, isFloat = false) => {
                if (bodyVal === undefined || bodyVal === null || bodyVal === '') {
                    return existingVal ?? 0;
                }
                const parsed = isFloat ? parseFloat(bodyVal) : parseInt(bodyVal);
                return isNaN(parsed) ? (existingVal ?? 0) : parsed;
            };

            const invoicePriceBeforeVat = parseOrKeep(body.invoicePriceBeforeVat, existing.invoicePriceBeforeVat);
            const declarationQuantity = parseOrKeep(body.declarationQuantity, existing.declarationQuantity);
            const totalLotValueBeforeVat = invoicePriceBeforeVat * declarationQuantity;

            const importTax = parseOrKeep(body.importTax, existing.importTax, true);
            const vatTax = parseOrKeep(body.vatTax, existing.vatTax, true);

            const importTaxPayable = Math.round(totalLotValueBeforeVat * importTax / 100);
            const vatTaxPayable = Math.round(totalLotValueBeforeVat * vatTax / 100);

            const payableFee = parseOrKeep(body.payableFee, existing.payableFee);
            const entrustmentFee = parseOrKeep(body.entrustmentFee, existing.entrustmentFee);

            const itemFee = parseFloat(existing.productItem?.itemTransportFeeEstimate || 0);

            const importCostToCustomer = Math.round(itemFee + importTaxPayable + vatTaxPayable + payableFee + entrustmentFee);

            const dataToUpdate = {
                images: imagesJson,
                mainStamp: body.mainStamp,
                subStamp: body.subStamp,
                productQuantity: parseInt(body.productQuantity) || null,
                specification: body.specification,
                productDescription: body.productDescription,
                brand: body.brand,
                sellerTaxCode: body.sellerTaxCode,
                sellerCompanyName: body.sellerCompanyName,
                declarationNeed: body.declarationNeed,
                declarationQuantity: parseInt(body.declarationQuantity) || 0,
                invoicePriceBeforeVat,
                totalLotValueBeforeVat,
                importTax,
                vatTax,
                importTaxPayable,
                vatTaxPayable,
                payableFee,
                notes: body.notes,
                entrustmentFee,
                importCostToCustomer
            };

            const updated = await prisma.declaration.update({
                where: { id: parseInt(id) },
                data: dataToUpdate
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) await redisClient.del(keys);

            return res.status(200).json({ code: 200, message: "Success", data: updated });
        } catch (error) {
            logger.error(`[UpdateDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    },

    deleteDeclaration: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.declaration.update({
                where: { id: parseInt(id) },
                data: { deletedAt: new Date() }
            });
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) await redisClient.del(keys);
            return res.status(200).json({ code: 200, message: "Deleted" });
        } catch (error) {
            return res.status(500).json({ code: 500, message: error.message });
        }
    },

    // Not usually used directly but keeping for compatibility if needed
    createDeclaration: async (req, res) => {
        return res.status(405).json({ code: 405, message: "Declarations are created automatically via ProductCode" });
    },

    getAllDeclarationsForExport: async (req, res) => {
        // ... Similar to getAll but without pagination if needed
        try {
            const declarations = await prisma.declaration.findMany({
                where: { deletedAt: null },
                include: { productItem: true, productCode: { include: { customer: true } } }
            });
            return res.status(200).json({ code: 200, data: declarations });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    }
};

module.exports = declarationController;
