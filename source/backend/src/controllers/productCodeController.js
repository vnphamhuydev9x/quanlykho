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
                                declarationName: true
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
                            declarationName: true
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
                // Relations
                customerId,
                warehouseId,
                categoryId,
                declarationId,

                // Fields (40 Columns Match)
                entryDate, // [A]
                // [B] sale is derived
                customerCodeInput, // [C]
                productName, // [D]
                orderCode, // [E]
                packageCount, // [F] Decimal
                packing, // [G] New
                weight, // [H] Decimal
                volume, // [I] Decimal
                infoSource, // [J] New
                domesticFeeRMB, // [K] Renamed from domesticFeeTQ
                haulingFeeRMB, // [L] Renamed from haulingFeeTQ
                unloadingFeeRMB, // [M] New
                transportRate, // [N] Kg
                transportRateVolume, // [O] m3 - New
                totalTransportFeeEstimate, // [P]
                notes, // [Q]
                images, // [R], [S] Array
                mainTag, // [T]
                subTag, // [U]
                pctConfirmation, // [V] New
                productQuantity, // [W]
                specification, // [X]
                productDescription, // [Y]
                brand, // [Z]
                supplierTaxCode, // [AA]
                supplierName, // [AB]
                declarationNeed, // [AC]
                declarationPolicy, // [AD]
                declarationQuantity, // [AE]
                invoicePriceExport, // [AF]
                declarationPrice, // [AG] New
                trustFee, // [AH]
                declarationName, // [AI] New
                feeAmount, // [AJ] "Phí phải nộp"
                importTax, // [AK]
                vatImportTax, // [AL]
                purchaseFee, // [AM] New
                accountingConfirmation, // [AN] New

                // Extra/Legacy
                taggedImages, // Array
                domesticFeeVN,
                status,
                exchangeRate,
                vatExportStatus,
                partnerName,

                // Sub-tables
                warehouseCosts,
                packageDetails
            } = req.body;

            // Check relations if provided
            if (customerId) {
                const customer = await prisma.user.findFirst({ where: { id: parseInt(customerId), type: 'CUSTOMER', deletedAt: null } });
                if (!customer) return res.status(404).json({ code: 99006, message: "Customer not found" });
            }
            if (warehouseId) {
                const warehouse = await prisma.warehouse.findFirst({ where: { id: parseInt(warehouseId), deletedAt: null } });
                if (!warehouse) return res.status(404).json({ code: 99006, message: "Warehouse not found" });
            }
            if (categoryId) {
                const category = await prisma.category.findFirst({ where: { id: parseInt(categoryId), deletedAt: null } });
                if (!category) return res.status(404).json({ code: 99006, message: "Category not found" });
            }
            if (declarationId) {
                const declaration = await prisma.declaration.findFirst({ where: { id: parseInt(declarationId), deletedAt: null } });
                if (!declaration) return res.status(404).json({ code: 99006, message: "Declaration not found" });
            }

            const newProductCode = await prisma.productCode.create({
                data: {
                    customerId: customerId ? parseInt(customerId) : null,
                    warehouseId: warehouseId ? parseInt(warehouseId) : null,
                    categoryId: categoryId ? parseInt(categoryId) : null,
                    declarationId: declarationId ? parseInt(declarationId) : null,

                    partnerName: partnerName || null,

                    entryDate: entryDate ? new Date(entryDate) : null,
                    customerCodeInput,
                    productName,
                    orderCode,
                    packageCount: packageCount ? parseInt(packageCount) : null,
                    packing,
                    weight: weight ? parseFloat(weight) : null,
                    volume: volume ? parseFloat(volume) : null,
                    infoSource,
                    domesticFeeRMB: domesticFeeRMB ? parseFloat(domesticFeeRMB) : null,
                    haulingFeeRMB: haulingFeeRMB ? parseFloat(haulingFeeRMB) : null,
                    unloadingFeeRMB: unloadingFeeRMB ? parseFloat(unloadingFeeRMB) : null,
                    transportRate: transportRate ? parseFloat(transportRate) : null,
                    transportRateVolume: transportRateVolume ? parseFloat(transportRateVolume) : null,
                    totalTransportFeeEstimate: totalTransportFeeEstimate ? parseFloat(totalTransportFeeEstimate) : null,
                    notes,
                    images: images || [],
                    mainTag,
                    subTag,
                    taggedImages: taggedImages || [],
                    pctConfirmation,
                    productQuantity: productQuantity ? parseFloat(productQuantity) : null,
                    specification,
                    productDescription,
                    brand,
                    supplierTaxCode,
                    supplierName,
                    declarationNeed,
                    declarationPolicy,
                    declarationQuantity: declarationQuantity ? parseFloat(declarationQuantity) : null,
                    invoicePriceExport: invoicePriceExport ? parseFloat(invoicePriceExport) : null,
                    declarationPrice: declarationPrice ? parseFloat(declarationPrice) : null,
                    trustFee: trustFee ? parseFloat(trustFee) : null,
                    declarationName,
                    feeAmount: feeAmount ? parseFloat(feeAmount) : null,
                    importTax: importTax ? parseFloat(importTax) : null,
                    vatImportTax: vatImportTax ? parseFloat(vatImportTax) : null,
                    purchaseFee: purchaseFee ? parseFloat(purchaseFee) : null,
                    accountingConfirmation,

                    domesticFeeVN: domesticFeeVN ? parseFloat(domesticFeeVN) : null,
                    status,
                    exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
                    vatExportStatus,

                    // Nested create
                    warehouseCosts: warehouseCosts && Array.isArray(warehouseCosts) ? {
                        create: warehouseCosts.map(cost => ({
                            costType: cost.costType,
                            currency: cost.currency,
                            originalCost: parseFloat(cost.originalCost),
                            otherFee: cost.otherFee !== undefined ? parseFloat(cost.otherFee) : 0,
                            notes: cost.notes
                        }))
                    } : undefined,
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
            if (keys.length > 0) await redisClient.del(keys);

            logger.info(`[CreateProductCode] ID: ${newProductCode.id} by User: ${req.user.userId}`);
            return res.status(200).json({ code: 200, message: "Success", data: newProductCode });

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

            const productCode = await prisma.productCode.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!productCode) return res.status(404).json({ code: 99006, message: "Product code not found" });

            // Validate relations if updated
            if (updateData.customerId) {
                const customer = await prisma.user.findFirst({ where: { id: parseInt(updateData.customerId), type: 'CUSTOMER', deletedAt: null } });
                if (!customer) return res.status(404).json({ code: 99006, message: "Customer not found" });
            }
            if (updateData.warehouseId) {
                const warehouse = await prisma.warehouse.findFirst({ where: { id: parseInt(updateData.warehouseId), deletedAt: null } });
                if (!warehouse) return res.status(404).json({ code: 99006, message: "Warehouse not found" });
            }
            if (updateData.categoryId) {
                const category = await prisma.category.findFirst({ where: { id: parseInt(updateData.categoryId), deletedAt: null } });
                if (!category) return res.status(404).json({ code: 99006, message: "Category not found" });
            }

            // Build update object
            const dataToUpdate = {};

            // Map all potential fields
            const fields = [
                'entryDate', 'customerCodeInput', 'productName', 'orderCode',
                'packageCount', 'packing', 'weight', 'volume', 'infoSource',
                'domesticFeeRMB', 'haulingFeeRMB', 'unloadingFeeRMB',
                'transportRate', 'transportRateVolume', 'totalTransportFeeEstimate',
                'notes', 'images', 'mainTag', 'subTag', 'pctConfirmation',
                'productQuantity', 'specification', 'productDescription',
                'brand', 'supplierTaxCode', 'supplierName',
                'declarationNeed', 'declarationPolicy', 'declarationQuantity',
                'invoicePriceExport', 'declarationPrice', 'trustFee',
                'declarationName', 'feeAmount', 'importTax', 'vatImportTax',
                'purchaseFee', 'accountingConfirmation',

                // Extra/Legacy
                'taggedImages', 'domesticFeeVN', 'status', 'exchangeRate', 'vatExportStatus',
                'partnerName'
            ];

            // Special handling for Types
            fields.forEach(field => {
                if (updateData[field] !== undefined) {
                    if (['entryDate'].includes(field)) {
                        dataToUpdate[field] = updateData[field] ? new Date(updateData[field]) : null;
                    } else if (['images', 'taggedImages'].includes(field)) {
                        dataToUpdate[field] = updateData[field];
                    } else if ([
                        'weight', 'volume',
                        'domesticFeeRMB', 'haulingFeeRMB', 'unloadingFeeRMB',
                        'transportRate', 'transportRateVolume', 'totalTransportFeeEstimate',
                        'productQuantity', 'declarationQuantity', 'invoicePriceExport',
                        'declarationPrice', 'trustFee', 'feeAmount', 'importTax',
                        'vatImportTax', 'purchaseFee',
                        'domesticFeeVN', 'exchangeRate'
                    ].includes(field)) {
                        dataToUpdate[field] = updateData[field] ? parseFloat(updateData[field]) : null;
                    } else if (field === 'packageCount') {
                        dataToUpdate[field] = updateData[field] ? parseInt(updateData[field]) : null;
                    } else {
                        dataToUpdate[field] = updateData[field];
                    }
                }
            });

            // Relations
            if (updateData.customerId !== undefined) dataToUpdate.customerId = updateData.customerId ? parseInt(updateData.customerId) : null;
            if (updateData.warehouseId !== undefined) dataToUpdate.warehouseId = updateData.warehouseId ? parseInt(updateData.warehouseId) : null;
            if (updateData.categoryId !== undefined) dataToUpdate.categoryId = updateData.categoryId ? parseInt(updateData.categoryId) : null;
            if (updateData.declarationId !== undefined) dataToUpdate.declarationId = updateData.declarationId ? parseInt(updateData.declarationId) : null;

            // Nested updates (WarehouseCosts / PackageDetails) - Full Replace strategy
            if (updateData.warehouseCosts !== undefined && Array.isArray(updateData.warehouseCosts)) {
                await prisma.warehouseCost.deleteMany({ where: { productCodeId: parseInt(id) } });
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
                await prisma.packageDetail.deleteMany({ where: { productCodeId: parseInt(id) } });
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
                include: { warehouseCosts: true, packageDetails: true }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) await redisClient.del(keys);

            logger.info(`[UpdateProductCode] ID: ${id} by User: ${req.user.userId}`);
            return res.status(200).json({ code: 200, message: "Success", data: updated });

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

            // Determine field to update (default: 'images')
            const field = req.query.field === 'taggedImages' ? 'taggedImages' : 'images';

            // Merge with existing images
            const existingImages = productCode[field] || [];
            const updatedImages = [...existingImages, ...newImagePaths];

            // Build update data dynamically
            const updateData = {};
            updateData[field] = updatedImages;

            // Update product code with new image paths
            const updated = await prisma.productCode.update({
                where: { id: parseInt(id) },
                data: updateData
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[UploadImages] ProductCode ID: ${id}, Field: ${field}, Uploaded ${req.files.length} images by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    productCodeId: updated.id,
                    uploadedImages: newImagePaths,
                    totalImages: updatedImages.length,
                    images: updatedImages, // For backward compatibility
                    [field]: updatedImages // Dynamic field return
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
                            declarationName: true
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
