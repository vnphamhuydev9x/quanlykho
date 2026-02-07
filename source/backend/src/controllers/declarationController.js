const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'declarations:list';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const formatImages = (images) => {
    if (!images || !Array.isArray(images)) return [];
    return images.map(img => {
        if (img.startsWith('http')) return img;
        const cleanPath = img.startsWith('/') ? img : `/${img}`;
        return `${APP_URL}${cleanPath}`;
    });
};

const declarationController = {
    getAllDeclarations: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', isDeclared } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}:${isDeclared || 'all'}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllDeclarations] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllDeclarations] Cache MISS');

            // 2. Build Query
            const where = {
                deletedAt: null // Exclude soft deleted
            };

            if (search) {
                where.OR = [
                    { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
                    { customer: { username: { contains: search, mode: 'insensitive' } } },
                    { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                    { customer: { phone: { contains: search, mode: 'insensitive' } } },
                    { hsCode: { contains: search, mode: 'insensitive' } }
                ].filter(condition => condition.id !== undefined || condition.customer || condition.hsCode);
            }

            if (isDeclared !== undefined) {
                where.isDeclared = isDeclared === 'true';
            }

            // 3. Query DB
            const [declarations, total] = await prisma.$transaction([
                prisma.declaration.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                phone: true
                            }
                        }
                    }
                }),
                prisma.declaration.count({ where })
            ]);

            // Map images for response
            const mappedItems = declarations.map(item => ({
                ...item,
                images: formatImages(item.images)
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

            // 4. Set Cache
            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData)); // Cache 5 mins

            return res.status(200).json(responseData);

        } catch (error) {
            logger.error(`[GetAllDeclarations] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    getDeclarationById: async (req, res) => {
        try {
            const { id } = req.params;

            const declaration = await prisma.declaration.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            phone: true
                        }
                    }
                }
            });

            if (!declaration) {
                return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...declaration,
                    images: formatImages(declaration.images)
                }
            });

        } catch (error) {
            logger.error(`[GetDeclarationById] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createDeclaration: async (req, res) => {
        try {
            // ADMIN only (Middleware handled)
            const {
                invoiceRequestName,
                customerId,
                productNameVi,
                hsCode,
                quantity,
                totalPackages,
                totalWeight,
                totalVolume,
                productDescription,
                contractPrice,
                productUsage,
                productUnit,
                declarationPriceVND,
                importTaxPercent,
                vatPercent,
                serviceFeePercent,
                isDeclared,
                supplierName,
                supplierAddress,
                labelCode,
                labelDate
            } = req.body;

            // Handle Images (Files + Existing Strings)
            let finalImages = [];
            if (req.body.images) {
                if (Array.isArray(req.body.images)) {
                    finalImages = [...req.body.images];
                } else {
                    finalImages = [req.body.images];
                }
            }

            if (req.files && req.files.length > 0) {
                const newImagePaths = req.files.map(file => {
                    const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                    return `/uploads/${relativePath}`;
                });
                finalImages = [...finalImages, ...newImagePaths];
            }

            // Validation
            if (!invoiceRequestName || !customerId || !productNameVi || !hsCode ||
                !quantity || !totalPackages || !totalWeight || !totalVolume ||
                !contractPrice || !productUnit || !declarationPriceVND ||
                importTaxPercent === undefined || vatPercent === undefined ||
                serviceFeePercent === undefined) {
                return res.status(400).json({ code: 99001, message: "Missing required fields" });
            }

            // Check if customer exists
            const customer = await prisma.user.findFirst({
                where: {
                    id: parseInt(customerId),
                    type: 'CUSTOMER',
                    deletedAt: null
                }
            });

            if (!customer) {
                return res.status(404).json({ code: 99006, message: "Customer not found" });
            }

            const newDeclaration = await prisma.declaration.create({
                data: {
                    invoiceRequestName,
                    customerId: parseInt(customerId),
                    productNameVi,
                    hsCode,
                    quantity: parseInt(quantity),
                    totalPackages: parseInt(totalPackages),
                    totalWeight: parseFloat(totalWeight),
                    totalVolume: parseFloat(totalVolume),
                    productDescription,
                    contractPrice: parseFloat(contractPrice),
                    productUsage,
                    productUnit,
                    declarationPriceVND: parseFloat(declarationPriceVND),
                    importTaxPercent: parseFloat(importTaxPercent),
                    vatPercent: parseFloat(vatPercent),
                    serviceFeePercent: parseFloat(serviceFeePercent),
                    isDeclared: isDeclared === true || isDeclared === 'true',
                    supplierName,
                    supplierAddress,
                    labelCode,
                    labelDate: labelDate ? new Date(labelDate) : null,
                    images: finalImages
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateDeclaration] ID: ${newDeclaration.id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...newDeclaration,
                    images: formatImages(newDeclaration.images)
                }
            });

        } catch (error) {
            logger.error(`[CreateDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateDeclaration: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;
            const {
                invoiceRequestName,
                customerId,
                productNameVi,
                hsCode,
                quantity,
                totalPackages,
                totalWeight,
                totalVolume,
                productDescription,
                contractPrice,
                productUsage,
                productUnit,
                declarationPriceVND,
                importTaxPercent,
                vatPercent,
                serviceFeePercent,
                isDeclared,
                supplierName,
                supplierAddress,
                labelCode,
                labelDate
            } = req.body;

            // Handle Images (Files + Existing Strings)
            let finalImages = [];

            // 1. Get existing images passed in body (if any)
            // Note: If formData has multiple fields with same name 'images', body-parser puts them in an array (if text)
            // But if mixed text and files, it can be tricky depending on middleware order.
            // Multer handles files. Body parser handles text.
            if (req.body.images) {
                if (Array.isArray(req.body.images)) {
                    finalImages = [...req.body.images];
                } else {
                    finalImages = [req.body.images];
                }
            } else {
                // If NOT FormData (json request) and images provided
                if (req.body.images && Array.isArray(req.body.images)) {
                    finalImages = req.body.images;
                }
            }

            if (req.files && req.files.length > 0) {
                const newImagePaths = req.files.map(file => {
                    const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                    return `/uploads/${relativePath}`;
                });
                finalImages = [...finalImages, ...newImagePaths];
            }

            // If it was a FormData request (req.files exists or content-type multipart), 
            // and no images were in body (meaning user deleted all existing), finalImages might be empty.
            // BUT, if it was logic to keep existing if undefined in JSON, we need to be careful.
            // For FormData, 'images' field will be present if sent. If not sent, it's undefined.

            // Logic refind:
            // If req.files is present OR req.headers['content-type'].includes('multipart/form-data'), 
            // then we treat finalImages as the source of truth.

            // However, to mimic previous JSON behavior:
            // "images: images !== undefined ? images : declaration.images"
            // We need to know if 'images' key was actually submitted in FormData.
            // In FormData, if we append 'images', it exists.

            // Let's assume if (req.files.length > 0 || req.body.images), we update images.
            // If both are empty/undefined, do we keep existing? 
            // If user explicitly wants to delete all images, they might send empty array?

            // Safe bet for now: 
            // If (req.files > 0 OR req.body.images is defined), use finalImages.
            // Else, keep declaration.images.

            const shouldUpdateImages = (req.files && req.files.length > 0) || (req.body.images !== undefined);

            const declaration = await prisma.declaration.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!declaration) {
                return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            const imagesToUpdate = shouldUpdateImages ? finalImages : declaration.images;

            // If customerId is being changed, check if new customer exists
            if (customerId && parseInt(customerId) !== declaration.customerId) {
                const customer = await prisma.user.findFirst({
                    where: {
                        id: parseInt(customerId),
                        type: 'CUSTOMER',
                        deletedAt: null
                    }
                });

                if (!customer) {
                    return res.status(404).json({ code: 99006, message: "Customer not found" });
                }
            }

            const updated = await prisma.declaration.update({
                where: { id: parseInt(id) },
                data: {
                    invoiceRequestName: invoiceRequestName || declaration.invoiceRequestName,
                    customerId: customerId ? parseInt(customerId) : declaration.customerId,
                    productNameVi: productNameVi || declaration.productNameVi,
                    hsCode: hsCode || declaration.hsCode,
                    quantity: quantity !== undefined ? parseInt(quantity) : declaration.quantity,
                    totalPackages: totalPackages !== undefined ? parseInt(totalPackages) : declaration.totalPackages,
                    totalWeight: totalWeight !== undefined ? parseFloat(totalWeight) : declaration.totalWeight,
                    totalVolume: totalVolume !== undefined ? parseFloat(totalVolume) : declaration.totalVolume,
                    productDescription: productDescription !== undefined ? productDescription : declaration.productDescription,
                    contractPrice: contractPrice !== undefined ? parseFloat(contractPrice) : declaration.contractPrice,
                    productUsage: productUsage !== undefined ? productUsage : declaration.productUsage,
                    productUnit: productUnit || declaration.productUnit,
                    declarationPriceVND: declarationPriceVND !== undefined ? parseFloat(declarationPriceVND) : declaration.declarationPriceVND,
                    importTaxPercent: importTaxPercent !== undefined ? parseFloat(importTaxPercent) : declaration.importTaxPercent,
                    vatPercent: vatPercent !== undefined ? parseFloat(vatPercent) : declaration.vatPercent,
                    serviceFeePercent: serviceFeePercent !== undefined ? parseFloat(serviceFeePercent) : declaration.serviceFeePercent,
                    isDeclared: isDeclared !== undefined ? (isDeclared === true || isDeclared === 'true') : declaration.isDeclared,
                    supplierName: supplierName !== undefined ? supplierName : declaration.supplierName,
                    supplierAddress: supplierAddress !== undefined ? supplierAddress : declaration.supplierAddress,
                    labelCode: labelCode !== undefined ? labelCode : declaration.labelCode,
                    labelDate: labelDate !== undefined ? (labelDate ? new Date(labelDate) : null) : declaration.labelDate,
                    images: imagesToUpdate
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[UpdateDeclaration] ID: ${id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...updated,
                    images: formatImages(updated.images)
                }
            });

        } catch (error) {
            logger.error(`[UpdateDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    deleteDeclaration: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;

            const declaration = await prisma.declaration.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!declaration) {
                return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            // Soft Delete
            await prisma.declaration.update({
                where: { id: parseInt(id) },
                data: {
                    deletedAt: new Date()
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[DeleteDeclaration] ID: ${id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success"
            });

        } catch (error) {
            logger.error(`[DeleteDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    getAllDeclarationsForExport: async (req, res) => {
        try {
            // ADMIN only
            const declarations = await prisma.declaration.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            phone: true
                        }
                    }
                }
            });

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: declarations
            });
        } catch (error) {
            logger.error(`[GetAllDeclarationsForExport] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    uploadImages: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;

            // Check if declaration exists
            const declaration = await prisma.declaration.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!declaration) {
                return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            // Check if files were uploaded
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ code: 99001, message: "No files uploaded" });
            }

            // Check total images limit (existing + new <= 3)
            const existingImages = declaration.images || [];
            const totalImages = existingImages.length + req.files.length;

            if (totalImages > 3) {
                // Delete uploaded files if limit exceeded
                req.files.forEach(file => {
                    const fs = require('fs');
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                return res.status(400).json({
                    code: 99009,
                    message: `Maximum 3 images allowed. You have ${existingImages.length} existing images.`
                });
            }

            // Generate relative paths for storage
            const newImagePaths = req.files.map(file => {
                // Convert absolute path to relative path from backend root
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                return `/uploads/${relativePath}`;
            });

            // Merge with existing images
            const updatedImages = [...existingImages, ...newImagePaths];

            // Update declaration with new image paths
            const updated = await prisma.declaration.update({
                where: { id: parseInt(id) },
                data: {
                    images: updatedImages
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[UploadImages] Declaration ID: ${id}, Uploaded ${req.files.length} images by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    declarationId: updated.id,
                    uploadedImages: formatImages(newImagePaths),
                    totalImages: updatedImages.length,
                    images: formatImages(updatedImages)
                }
            });

        } catch (error) {
            logger.error(`[UploadImages] Error: ${error.message}`);

            // Clean up uploaded files on error
            if (req.files) {
                const fs = require('fs');
                req.files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }

            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = declarationController;
