const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const fileStorageService = require('../services/fileStorageService');
const { STORAGE_PROVIDER, IMAGE_DELETION_STATUS } = require('../constants/enums');

const { buildImageUrl } = fileStorageService;

const CACHE_KEY = 'declarations:list';

// Build absolute URL array từ Image[] (sorted by sortOrder, backward compat)
const toImageUrls = (images) =>
    (images || [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(img => buildImageUrl(img))
        .filter(Boolean);

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
                        images: { orderBy: { sortOrder: 'asc' } },
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
                                vehicleStatus: true,
                                vehicleStatusOverridden: true,
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
                imageUrls: toImageUrls(item.images)
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
                    images: { orderBy: { sortOrder: 'asc' } },
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
                    imageUrls: toImageUrls(declaration.images)
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

            // Check existence + load current images
            const existing = await prisma.declaration.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: {
                    productItem: true,
                    images: { orderBy: { sortOrder: 'asc' } }
                }
            });

            if (!existing) {
                return res.status(404).json({ code: 404, message: "Declaration not found" });
            }

            // ── Xác định images cần giữ lại và xóa đi ────────────────────────
            let keepImageIds = [];
            let imagesToDelete = [];

            if (body.keepImageIds !== undefined) {
                // Format mới: FE gửi mảng ID của Image rows cần giữ
                const rawIds = Array.isArray(body.keepImageIds)
                    ? body.keepImageIds
                    : JSON.parse(body.keepImageIds);
                keepImageIds = rawIds.map(Number).filter(n => !isNaN(n));
                imagesToDelete = existing.images.filter(img => !keepImageIds.includes(img.id));
            } else if (body.existingImages !== undefined) {
                // Format cũ (backward compat): FE gửi absolute URL strings
                const existingRaw = Array.isArray(body.existingImages)
                    ? body.existingImages
                    : JSON.parse(body.existingImages);
                const keepUrls = new Set(
                    existingRaw.map(item => {
                        if (item && typeof item === 'object' && item.url) return buildImageUrl(item);
                        return typeof item === 'string' ? item : null;
                    }).filter(Boolean)
                );
                imagesToDelete = existing.images.filter(img => !keepUrls.has(buildImageUrl(img)));
                keepImageIds = existing.images
                    .filter(img => keepUrls.has(buildImageUrl(img)))
                    .map(img => img.id);
            } else {
                // Không có image instruction → giữ tất cả
                keepImageIds = existing.images.map(img => img.id);
            }

            // Validate tổng số ảnh
            const newFiles = req.files || [];
            if (keepImageIds.length + newFiles.length > 3) {
                return res.status(400).json({ code: 400, message: 'Declaration can have at most 3 images' });
            }

            // Upload files mới trước transaction
            const keepCount = keepImageIds.length;
            let uploadedImages = [];
            if (newFiles.length > 0) {
                uploadedImages = await Promise.all(
                    newFiles.map((file, index) =>
                        fileStorageService.moveTempFileToStorage(file.path, 'declarations', id, file.originalname)
                            .then(imageObj => ({ ...imageObj, sortOrder: keepCount + index }))
                    )
                );
            }

            // R2 images cần enqueue để xóa
            const r2ToDelete = imagesToDelete.filter(img => STORAGE_PROVIDER.CLOUDFLARE_R2 === img.provider);

            // ── Transaction: enqueue + delete Image rows + insert mới ─────────
            await prisma.$transaction(async (tx) => {
                if (r2ToDelete.length > 0) {
                    await tx.imageDeletionQueue.createMany({
                        data: r2ToDelete.map(img => ({
                            imageUrl: img.url,
                            provider: img.provider,
                            status:   IMAGE_DELETION_STATUS.PENDING,
                        }))
                    });
                }
                if (imagesToDelete.length > 0) {
                    await tx.image.deleteMany({
                        where: { id: { in: imagesToDelete.map(img => img.id) } }
                    });
                }
                if (uploadedImages.length > 0) {
                    await tx.image.createMany({
                        data: uploadedImages.map(img => ({
                            url:           img.url,
                            provider:      img.provider,
                            sortOrder:     img.sortOrder,
                            declarationId: parseInt(id),
                        }))
                    });
                }
            });

            // Best-effort: xóa R2 files + cập nhật queue
            for (const img of r2ToDelete) {
                try {
                    await fileStorageService.deleteFile(img.url);
                    await prisma.imageDeletionQueue.updateMany({
                        where: { imageUrl: img.url, status: IMAGE_DELETION_STATUS.PENDING },
                        data:  { status: IMAGE_DELETION_STATUS.DONE }
                    });
                } catch (deleteErr) {
                    logger.error(`[UpdateDeclaration] R2 delete failed for ${img.url}: ${deleteErr.message}`);
                }
            }

            // ── Calculations ──────────────────────────────────────────────────
            const parseOrKeep = (bodyVal, existingVal, isFloat = false) => {
                if (bodyVal === undefined || bodyVal === null || bodyVal === '') {
                    return existingVal ?? 0;
                }
                const parsed = isFloat ? parseFloat(bodyVal) : parseInt(bodyVal);
                return isNaN(parsed) ? (existingVal ?? 0) : parsed;
            };

            const invoicePriceBeforeVat = parseOrKeep(body.invoicePriceBeforeVat, existing.invoicePriceBeforeVat);
            const declarationQuantity   = parseOrKeep(body.declarationQuantity, existing.declarationQuantity);
            const totalLotValueBeforeVat = invoicePriceBeforeVat * declarationQuantity;

            const importTax = parseOrKeep(body.importTax, existing.importTax, true);
            const vatTax    = parseOrKeep(body.vatTax, existing.vatTax, true);

            const importTaxPayable = Math.round(totalLotValueBeforeVat * importTax / 100);
            const vatTaxPayable    = Math.round(totalLotValueBeforeVat * vatTax / 100);

            const payableFee      = parseOrKeep(body.payableFee, existing.payableFee);
            const entrustmentFee  = parseOrKeep(body.entrustmentFee, existing.entrustmentFee);

            const itemFee = parseFloat(existing.productItem?.itemTransportFeeEstimate || 0);

            const declarationCost       = Math.round(importTaxPayable + vatTaxPayable + payableFee + entrustmentFee);
            const importCostToCustomer  = Math.round(itemFee + declarationCost);

            const dataToUpdate = {
                mainStamp:            body.mainStamp,
                subStamp:             body.subStamp,
                productQuantity:      parseInt(body.productQuantity) || null,
                specification:        body.specification,
                productDescription:   body.productDescription,
                brand:                body.brand,
                sellerTaxCode:        body.sellerTaxCode,
                sellerCompanyName:    body.sellerCompanyName,
                declarationNeed:      body.declarationNeed,
                declarationQuantity:  parseInt(body.declarationQuantity) || 0,
                invoicePriceBeforeVat,
                totalLotValueBeforeVat,
                importTax,
                vatTax,
                importTaxPayable,
                vatTaxPayable,
                payableFee,
                notes:                body.notes,
                entrustmentFee,
                declarationCost,
                importCostToCustomer
            };

            const updated = await prisma.declaration.update({
                where: { id: parseInt(id) },
                data:  dataToUpdate
            });

            if (updated.productCodeId) {
                const allDeclarations = await prisma.declaration.findMany({
                    where: { productCodeId: updated.productCodeId, deletedAt: null }
                });
                const totalImportCostToCustomer = allDeclarations.reduce(
                    (sum, d) => sum + (d.importCostToCustomer || 0), 0
                );
                await prisma.productCode.update({
                    where: { id: updated.productCodeId },
                    data:  { totalImportCostToCustomer }
                });
            }

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) await redisClient.del(keys);

            if (updated.productCodeId) {
                await redisClient.del(`product-codes:detail:${updated.productCodeId}`);
                const pcKeysList = await redisClient.keys(`product-codes:list:*`);
                if (pcKeysList.length > 0) await redisClient.del(pcKeysList);
            }

            return res.status(200).json({ code: 200, message: "Success", data: updated });
        } catch (error) {
            logger.error(`[UpdateDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        } finally {
            fileStorageService.deleteTempFiles(req.files);
        }
    },

    deleteDeclaration: async (req, res) => {
        try {
            const { id } = req.params;
            const parsedId = parseInt(id);

            // Load declaration + images trước khi xóa
            const existing = await prisma.declaration.findFirst({
                where: { id: parsedId, deletedAt: null },
                include: { images: true }
            });

            if (!existing) {
                return res.status(404).json({ code: 404, message: 'Declaration not found' });
            }

            // Lọc R2 images cần enqueue
            const r2Items = existing.images.filter(
                img => STORAGE_PROVIDER.CLOUDFLARE_R2 === img.provider
            );

            // Transaction: enqueue R2 + hard-delete Image rows + soft-delete Declaration
            await prisma.$transaction(async (tx) => {
                if (r2Items.length > 0) {
                    await tx.imageDeletionQueue.createMany({
                        data: r2Items.map(img => ({
                            imageUrl: img.url,
                            provider: img.provider,
                            status:   IMAGE_DELETION_STATUS.PENDING,
                        }))
                    });
                }
                if (existing.images.length > 0) {
                    await tx.image.deleteMany({ where: { declarationId: parsedId } });
                }
                await tx.declaration.update({
                    where: { id: parsedId },
                    data:  { deletedAt: new Date() }
                });
            });

            // Invalidate cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) await redisClient.del(keys);

            // Best-effort: xóa R2 files + cập nhật queue status
            for (const img of r2Items) {
                try {
                    await fileStorageService.deleteFile(img.url);
                    await prisma.imageDeletionQueue.updateMany({
                        where: { imageUrl: img.url, status: IMAGE_DELETION_STATUS.PENDING },
                        data:  { status: IMAGE_DELETION_STATUS.DONE }
                    });
                } catch (deleteErr) {
                    logger.error(`[DeleteDeclaration] R2 delete failed for ${img.url}: ${deleteErr.message}`);
                }
            }

            return res.status(200).json({ code: 200, message: 'Deleted' });
        } catch (error) {
            logger.error(`[DeleteDeclaration] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: error.message });
        }
    },

    // Not usually used directly but keeping for compatibility if needed
    createDeclaration: async (req, res) => {
        return res.status(405).json({ code: 405, message: "Declarations are created automatically via ProductCode" });
    },

    getAllDeclarationsForExport: async (req, res) => {
        try {
            const declarations = await prisma.declaration.findMany({
                where: { deletedAt: null },
                include: {
                    images: { orderBy: { sortOrder: 'asc' } },
                    productItem: true,
                    productCode: { include: { customer: true } }
                }
            });
            const mapped = declarations.map(item => ({
                ...item,
                imageUrls: toImageUrls(item.images)
            }));
            return res.status(200).json({ code: 200, data: mapped });
        } catch (e) {
            return res.status(500).json({ message: e.message });
        }
    }
};

module.exports = declarationController;
