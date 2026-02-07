const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'product_codes:list';

const productCodeController = {
    getAllProductCodes: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', status = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}:${status}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllProductCodes] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllProductCodes] Cache MISS');

            // 2. Build Query
            const where = {
                deletedAt: null // Exclude soft deleted
            };

            // Filter by status if provided
            if (status) {
                if (status === 'NOT_XUAT_DU') {
                    // Tồn kho TQ: All except XUAT_DU
                    where.status = {
                        not: 'XUAT_DU'
                    };
                } else if (status.includes(',')) {
                    // Multiple statuses (e.g., "XUAT_THIEU,NHAP_KHO_VN")
                    const statuses = status.split(',');
                    where.status = {
                        in: statuses
                    };
                } else {
                    // Single status
                    where.status = status;
                }
            }

            if (search) {
                where.OR = [
                    { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
                    { customer: { username: { contains: search, mode: 'insensitive' } } },
                    { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                    { customer: { phone: { contains: search, mode: 'insensitive' } } },
                    { partnerName: { contains: search, mode: 'insensitive' } },
                    { productName: { contains: search, mode: 'insensitive' } },
                    { warehouse: { name: { contains: search, mode: 'insensitive' } } },
                    { category: { name: { contains: search, mode: 'insensitive' } } }
                ].filter(condition =>
                    condition.id !== undefined ||
                    condition.customer ||
                    condition.partnerName ||
                    condition.productName ||
                    condition.warehouse ||
                    condition.category
                );
            }

            // 3. Query DB
            const [productCodes, total] = await prisma.$transaction([
                prisma.productCode.findMany({
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
                        },
                        warehouse: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        declaration: {
                            select: {
                                id: true,
                                invoiceRequestName: true
                            }
                        }
                    }
                }),
                prisma.productCode.count({ where })
            ]);

            const responseData = {
                code: 200,
                message: "Success",
                data: {
                    items: productCodes,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };

            // 4. Set Cache
            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData)); // Cache 5 mins

            return res.status(200).json(responseData);

        } catch (error) {
            logger.error(`[GetAllProductCodes] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    getProductCodeById: async (req, res) => {
        try {
            const { id } = req.params;

            const productCode = await prisma.productCode.findFirst({
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
                    },
                    warehouse: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    declaration: {
                        select: {
                            id: true,
                            invoiceRequestName: true
                        }
                    },
                    warehouseCosts: {
                        orderBy: { createdAt: 'asc' }
                    },
                    packageDetails: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            if (!productCode) {
                return res.status(404).json({ code: 99006, message: "Product code not found" });
            }

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: productCode
            });

        } catch (error) {
            logger.error(`[GetProductCodeById] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createProductCode: async (req, res) => {
        try {
            // ADMIN only (Middleware handled)
            const {
                customerId,
                partnerName,
                warehouseId,
                categoryId,
                productName,
                exchangeRate,
                declarationId,
                notes,
                separateTax,
                originalWeightPrice,
                originalVolumePrice,
                serviceFee,
                importTax,
                vat,
                totalAmount,
                incidentalFee,
                incidentalNotes,
                profit,
                totalWeight,
                totalVolume,
                totalPackages,
                costCalculationMethod,
                weightPrice,
                volumePrice,
                images,
                warehouseCosts, // Array of warehouse costs
                packageDetails  // Array of package details
            } = req.body;

            // Validation
            if (!customerId || !partnerName || !warehouseId || !categoryId || !productName ||
                exchangeRate === undefined || originalWeightPrice === undefined ||
                originalVolumePrice === undefined || serviceFee === undefined ||
                totalAmount === undefined || totalWeight === undefined ||
                totalVolume === undefined || totalPackages === undefined ||
                weightPrice === undefined || volumePrice === undefined) {
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

            // Check if warehouse exists
            const warehouse = await prisma.warehouse.findFirst({
                where: {
                    id: parseInt(warehouseId),
                    deletedAt: null
                }
            });

            if (!warehouse) {
                return res.status(404).json({ code: 99006, message: "Warehouse not found" });
            }

            // Check if category exists
            const category = await prisma.category.findFirst({
                where: {
                    id: parseInt(categoryId),
                    deletedAt: null
                }
            });

            if (!category) {
                return res.status(404).json({ code: 99006, message: "Category not found" });
            }

            // Check if declaration exists (if provided)
            if (declarationId) {
                const declaration = await prisma.declaration.findFirst({
                    where: {
                        id: parseInt(declarationId),
                        deletedAt: null
                    }
                });

                if (!declaration) {
                    return res.status(404).json({ code: 99006, message: "Declaration not found" });
                }
            }

            // Nested create
            const newProductCode = await prisma.productCode.create({
                data: {
                    customerId: parseInt(customerId),
                    partnerName,
                    warehouseId: parseInt(warehouseId),
                    categoryId: parseInt(categoryId),
                    productName,
                    exchangeRate: parseFloat(exchangeRate),
                    declarationId: declarationId ? parseInt(declarationId) : null,
                    notes,
                    separateTax: separateTax === true || separateTax === 'true',
                    originalWeightPrice: parseFloat(originalWeightPrice),
                    originalVolumePrice: parseFloat(originalVolumePrice),
                    serviceFee: parseFloat(serviceFee),
                    importTax: importTax !== undefined ? parseFloat(importTax) : null,
                    vat: vat !== undefined ? parseFloat(vat) : null,
                    totalAmount: parseFloat(totalAmount),
                    incidentalFee: incidentalFee !== undefined ? parseFloat(incidentalFee) : 0,
                    incidentalNotes,
                    profit: profit !== undefined ? parseFloat(profit) : 0,
                    totalWeight: parseFloat(totalWeight),
                    totalVolume: parseFloat(totalVolume),
                    totalPackages: parseInt(totalPackages),
                    costCalculationMethod: costCalculationMethod || 'AUTO',
                    weightPrice: parseFloat(weightPrice),
                    volumePrice: parseFloat(volumePrice),
                    images: images || [],
                    // Nested create for warehouseCosts
                    warehouseCosts: warehouseCosts && Array.isArray(warehouseCosts) ? {
                        create: warehouseCosts.map(cost => ({
                            costType: cost.costType,
                            currency: cost.currency,
                            originalCost: parseFloat(cost.originalCost),
                            otherFee: cost.otherFee !== undefined ? parseFloat(cost.otherFee) : 0,
                            notes: cost.notes
                        }))
                    } : undefined,
                    // Nested create for packageDetails
                    packageDetails: packageDetails && Array.isArray(packageDetails) ? {
                        create: packageDetails.map(pkg => ({
                            trackingCode: pkg.trackingCode,
                            length: parseFloat(pkg.length),
                            width: parseFloat(pkg.width),
                            height: parseFloat(pkg.height),
                            totalWeight: parseFloat(pkg.totalWeight),
                            totalPackages: parseInt(pkg.totalPackages)
                        }))
                    } : undefined
                },
                include: {
                    warehouseCosts: true,
                    packageDetails: true
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateProductCode] ID: ${newProductCode.id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: newProductCode
            });

        } catch (error) {
            logger.error(`[CreateProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateProductCode: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;
            const updateData = req.body;

            const productCode = await prisma.productCode.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!productCode) {
                return res.status(404).json({ code: 99006, message: "Product code not found" });
            }

            // Validate foreign keys if being updated
            if (updateData.customerId) {
                const customer = await prisma.user.findFirst({
                    where: {
                        id: parseInt(updateData.customerId),
                        type: 'CUSTOMER',
                        deletedAt: null
                    }
                });
                if (!customer) {
                    return res.status(404).json({ code: 99006, message: "Customer not found" });
                }
            }

            if (updateData.warehouseId) {
                const warehouse = await prisma.warehouse.findFirst({
                    where: {
                        id: parseInt(updateData.warehouseId),
                        deletedAt: null
                    }
                });
                if (!warehouse) {
                    return res.status(404).json({ code: 99006, message: "Warehouse not found" });
                }
            }

            if (updateData.categoryId) {
                const category = await prisma.category.findFirst({
                    where: {
                        id: parseInt(updateData.categoryId),
                        deletedAt: null
                    }
                });
                if (!category) {
                    return res.status(404).json({ code: 99006, message: "Category not found" });
                }
            }

            // Build update object
            const dataToUpdate = {};

            // Simple fields
            if (updateData.customerId !== undefined) dataToUpdate.customerId = parseInt(updateData.customerId);
            if (updateData.partnerName !== undefined) dataToUpdate.partnerName = updateData.partnerName;
            if (updateData.warehouseId !== undefined) dataToUpdate.warehouseId = parseInt(updateData.warehouseId);
            if (updateData.categoryId !== undefined) dataToUpdate.categoryId = parseInt(updateData.categoryId);
            if (updateData.productName !== undefined) dataToUpdate.productName = updateData.productName;
            if (updateData.exchangeRate !== undefined) dataToUpdate.exchangeRate = parseFloat(updateData.exchangeRate);
            if (updateData.declarationId !== undefined) dataToUpdate.declarationId = updateData.declarationId ? parseInt(updateData.declarationId) : null;
            if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
            if (updateData.separateTax !== undefined) dataToUpdate.separateTax = updateData.separateTax === true || updateData.separateTax === 'true';
            if (updateData.originalWeightPrice !== undefined) dataToUpdate.originalWeightPrice = parseFloat(updateData.originalWeightPrice);
            if (updateData.originalVolumePrice !== undefined) dataToUpdate.originalVolumePrice = parseFloat(updateData.originalVolumePrice);
            if (updateData.serviceFee !== undefined) dataToUpdate.serviceFee = parseFloat(updateData.serviceFee);
            if (updateData.importTax !== undefined) dataToUpdate.importTax = updateData.importTax !== null ? parseFloat(updateData.importTax) : null;
            if (updateData.vat !== undefined) dataToUpdate.vat = updateData.vat !== null ? parseFloat(updateData.vat) : null;
            if (updateData.totalAmount !== undefined) dataToUpdate.totalAmount = parseFloat(updateData.totalAmount);
            if (updateData.incidentalFee !== undefined) dataToUpdate.incidentalFee = parseFloat(updateData.incidentalFee);
            if (updateData.incidentalNotes !== undefined) dataToUpdate.incidentalNotes = updateData.incidentalNotes;
            if (updateData.profit !== undefined) dataToUpdate.profit = parseFloat(updateData.profit);
            if (updateData.totalWeight !== undefined) dataToUpdate.totalWeight = parseFloat(updateData.totalWeight);
            if (updateData.totalVolume !== undefined) dataToUpdate.totalVolume = parseFloat(updateData.totalVolume);
            if (updateData.totalPackages !== undefined) dataToUpdate.totalPackages = parseInt(updateData.totalPackages);
            if (updateData.costCalculationMethod !== undefined) dataToUpdate.costCalculationMethod = updateData.costCalculationMethod;
            if (updateData.weightPrice !== undefined) dataToUpdate.weightPrice = parseFloat(updateData.weightPrice);
            if (updateData.volumePrice !== undefined) dataToUpdate.volumePrice = parseFloat(updateData.volumePrice);
            if (updateData.images !== undefined) dataToUpdate.images = updateData.images;

            // Handle nested updates for warehouseCosts and packageDetails
            // Note: For simplicity, we'll delete all existing and recreate
            // A more sophisticated approach would be to diff and update individually

            if (updateData.warehouseCosts !== undefined && Array.isArray(updateData.warehouseCosts)) {
                // Delete existing
                await prisma.warehouseCost.deleteMany({
                    where: { productCodeId: parseInt(id) }
                });

                // Create new
                dataToUpdate.warehouseCosts = {
                    create: updateData.warehouseCosts.map(cost => ({
                        costType: cost.costType,
                        currency: cost.currency,
                        originalCost: parseFloat(cost.originalCost),
                        otherFee: cost.otherFee !== undefined ? parseFloat(cost.otherFee) : 0,
                        notes: cost.notes
                    }))
                };
            }

            if (updateData.packageDetails !== undefined && Array.isArray(updateData.packageDetails)) {
                // Delete existing
                await prisma.packageDetail.deleteMany({
                    where: { productCodeId: parseInt(id) }
                });

                // Create new
                dataToUpdate.packageDetails = {
                    create: updateData.packageDetails.map(pkg => ({
                        trackingCode: pkg.trackingCode,
                        length: parseFloat(pkg.length),
                        width: parseFloat(pkg.width),
                        height: parseFloat(pkg.height),
                        totalWeight: parseFloat(pkg.totalWeight),
                        totalPackages: parseInt(pkg.totalPackages)
                    }))
                };
            }

            const updated = await prisma.productCode.update({
                where: { id: parseInt(id) },
                data: dataToUpdate,
                include: {
                    warehouseCosts: true,
                    packageDetails: true
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[UpdateProductCode] ID: ${id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: updated
            });

        } catch (error) {
            logger.error(`[UpdateProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    deleteProductCode: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;

            const productCode = await prisma.productCode.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!productCode) {
                return res.status(404).json({ code: 99006, message: "Product code not found" });
            }

            // Soft Delete (cascade handled by Prisma onDelete: Cascade for hard delete)
            await prisma.productCode.update({
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

            logger.info(`[DeleteProductCode] ID: ${id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success"
            });

        } catch (error) {
            logger.error(`[DeleteProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    uploadImages: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;

            // Check if product code exists
            const productCode = await prisma.productCode.findFirst({
                where: {
                    id: parseInt(id),
                    deletedAt: null
                }
            });

            if (!productCode) {
                return res.status(404).json({ code: 99006, message: "Product code not found" });
            }

            // Check if files were uploaded
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ code: 99001, message: "No files uploaded" });
            }

            // Generate relative paths for storage
            const newImagePaths = req.files.map(file => {
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
                return `/uploads/${relativePath}`;
            });

            // Merge with existing images
            const existingImages = productCode.images || [];
            const updatedImages = [...existingImages, ...newImagePaths];

            // Update product code with new image paths
            const updated = await prisma.productCode.update({
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

            logger.info(`[UploadImages] ProductCode ID: ${id}, Uploaded ${req.files.length} images by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    productCodeId: updated.id,
                    uploadedImages: newImagePaths,
                    totalImages: updatedImages.length,
                    images: updatedImages
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
    },

    getAllProductCodesForExport: async (req, res) => {
        try {
            // ADMIN only
            const productCodes = await prisma.productCode.findMany({
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
                    },
                    warehouse: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    declaration: {
                        select: {
                            id: true,
                            invoiceRequestName: true
                        }
                    },
                    warehouseCosts: true,
                    packageDetails: true
                }
            });

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: productCodes
            });
        } catch (error) {
            logger.error(`[GetAllProductCodesForExport] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = productCodeController;
