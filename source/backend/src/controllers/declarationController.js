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
            const { page = 1, limit = 20, search = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}`;

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
                    { orderCode: { contains: search, mode: 'insensitive' } },
                    { productName: { contains: search, mode: 'insensitive' } },
                    { declarationName: { contains: search, mode: 'insensitive' } }
                ].filter(condition => condition.id !== undefined || condition.customer || condition.orderCode || condition.productName || condition.declarationName);
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
                productImage: item.productImage ? formatImages([item.productImage])[0] : null
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
                    productImage: declaration.productImage ? formatImages([declaration.productImage])[0] : null
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
            const body = req.body;
            const userId = req.user.userId;

            // Handle Image Upload
            let imagePath = body.productImage || null;

            if (req.files && req.files.length > 0) {
                const file = req.files[0];
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                imagePath = `/uploads/${relativePath}`;
            }

            // Extract all new fields
            const data = {
                customerId: parseInt(body.customerId),
                entryDate: body.entryDate ? new Date(body.entryDate) : null,
                customerCodeInput: body.customerCodeInput,
                productName: body.productName,
                orderCode: body.orderCode,
                packageCount: body.packageCount ? parseInt(body.packageCount) : null,
                weight: body.weight ? parseFloat(body.weight) : null,
                volume: body.volume ? parseFloat(body.volume) : null,
                infoSource: body.infoSource,
                domesticFeeRMB: body.domesticFeeRMB ? parseFloat(body.domesticFeeRMB) : null,
                haulingFeeRMB: body.haulingFeeRMB ? parseFloat(body.haulingFeeRMB) : null,
                unloadingFeeRMB: body.unloadingFeeRMB ? parseFloat(body.unloadingFeeRMB) : null,
                transportRate: body.transportRate ? parseFloat(body.transportRate) : null,
                transportRateVolume: body.transportRateVolume ? parseFloat(body.transportRateVolume) : null,
                totalTransportFeeEstimate: body.totalTransportFeeEstimate ? parseFloat(body.totalTransportFeeEstimate) : null,
                note: body.note,
                productImage: imagePath,
                subTag: body.subTag,
                productQuantity: body.productQuantity ? parseInt(body.productQuantity) : null,
                specification: body.specification,
                productDescription: body.productDescription,
                brand: body.brand,
                declarationNeed: body.declarationNeed,
                declarationPolicy: body.declarationPolicy,
                declarationQuantity: body.declarationQuantity,
                invoicePrice: body.invoicePrice,
                additionalInfo: body.additionalInfo,
                declarationName: body.declarationName,
                declarationQuantityDeclared: body.declarationQuantityDeclared,
                unit: body.unit,
                declarationPrice: body.declarationPrice,
                value: body.value,
                packageCountDeclared: body.packageCountDeclared ? parseInt(body.packageCountDeclared) : null,
                netWeight: body.netWeight,
                grossWeight: body.grossWeight,
                cbm: body.cbm,
                hsCode: body.hsCode,
                vatPercent: body.vatPercent,
                vatAmount: body.vatAmount,
                importTaxPercent: body.importTaxPercent,
                importTaxUSD: body.importTaxUSD,
                importTaxVND: body.importTaxVND,
                customsExchangeRate: body.customsExchangeRate,
                qualityControlFee: body.qualityControlFee,
                accountingConfirmation: body.accountingConfirmation,

            };

            // Basic Validation
            if (!data.customerId) {
                return res.status(400).json({ code: 99001, message: "Missing required field: customerId" });
            }

            // Check customer
            const customer = await prisma.user.findFirst({
                where: { id: data.customerId, type: 'CUSTOMER', deletedAt: null }
            });
            if (!customer) {
                return res.status(404).json({ code: 99006, message: "Customer not found" });
            }

            const newDeclaration = await prisma.declaration.create({
                data
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateDeclaration] ID: ${newDeclaration.id} by User: ${userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...newDeclaration,
                    productImage: newDeclaration.productImage ? formatImages([newDeclaration.productImage])[0] : null
                }
            });

        } catch (error) {
            logger.error(`[CreateDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateDeclaration: async (req, res) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const userId = req.user.userId;

            // Check existence
            const existingDeclaration = await prisma.declaration.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!existingDeclaration) {
                return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            // Handle Image
            let imagePath = body.productImage;

            if (req.files && req.files.length > 0) {
                const file = req.files[0];
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                imagePath = `/uploads/${relativePath}`;
            } else if (body.productImage === undefined) {
                imagePath = existingDeclaration.productImage; // Keep existing
            }

            // Prepare update data
            const data = {
                customerId: body.customerId ? parseInt(body.customerId) : undefined,
                entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
                customerCodeInput: body.customerCodeInput,
                productName: body.productName,
                orderCode: body.orderCode,
                packageCount: body.packageCount ? parseInt(body.packageCount) : undefined,
                weight: body.weight ? parseFloat(body.weight) : undefined,
                volume: body.volume ? parseFloat(body.volume) : undefined,
                infoSource: body.infoSource,
                domesticFeeRMB: body.domesticFeeRMB ? parseFloat(body.domesticFeeRMB) : undefined,
                haulingFeeRMB: body.haulingFeeRMB ? parseFloat(body.haulingFeeRMB) : undefined,
                unloadingFeeRMB: body.unloadingFeeRMB ? parseFloat(body.unloadingFeeRMB) : undefined,
                transportRate: body.transportRate ? parseFloat(body.transportRate) : undefined,
                transportRateVolume: body.transportRateVolume ? parseFloat(body.transportRateVolume) : undefined,
                totalTransportFeeEstimate: body.totalTransportFeeEstimate ? parseFloat(body.totalTransportFeeEstimate) : undefined,
                note: body.note,
                productImage: imagePath,
                subTag: body.subTag,
                productQuantity: body.productQuantity ? parseInt(body.productQuantity) : undefined,
                specification: body.specification,
                productDescription: body.productDescription,
                brand: body.brand,
                declarationNeed: body.declarationNeed,
                declarationPolicy: body.declarationPolicy,
                declarationQuantity: body.declarationQuantity,
                invoicePrice: body.invoicePrice,
                additionalInfo: body.additionalInfo,
                declarationName: body.declarationName,
                declarationQuantityDeclared: body.declarationQuantityDeclared,
                unit: body.unit,
                declarationPrice: body.declarationPrice,
                value: body.value,
                packageCountDeclared: body.packageCountDeclared ? parseInt(body.packageCountDeclared) : undefined,
                netWeight: body.netWeight,
                grossWeight: body.grossWeight,
                cbm: body.cbm,
                hsCode: body.hsCode,
                vatPercent: body.vatPercent,
                vatAmount: body.vatAmount,
                importTaxPercent: body.importTaxPercent,
                importTaxUSD: body.importTaxUSD,
                importTaxVND: body.importTaxVND,
                customsExchangeRate: body.customsExchangeRate,
                qualityControlFee: body.qualityControlFee,
                accountingConfirmation: body.accountingConfirmation
            };

            // Clean undefined values
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            // Validate Customer if changing
            if (data.customerId && data.customerId !== existingDeclaration.customerId) {
                const customer = await prisma.user.findFirst({
                    where: { id: data.customerId, type: 'CUSTOMER', deletedAt: null }
                });
                if (!customer) {
                    return res.status(404).json({ code: 99006, message: "Customer not found" });
                }
            }

            const updated = await prisma.declaration.update({
                where: { id: parseInt(id) },
                data
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[UpdateDeclaration] ID: ${id} by User: ${userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    ...updated,
                    productImage: updated.productImage ? formatImages([updated.productImage])[0] : null
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
            const userId = req.user.userId;

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

            logger.info(`[DeleteDeclaration] ID: ${id} by User: ${userId}`);

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
    }
};

module.exports = declarationController;
