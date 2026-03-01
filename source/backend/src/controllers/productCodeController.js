const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY_LIST = 'product-codes:list';
const CACHE_KEY_DETAIL = 'product-codes:detail';

// Enums
const VALID_PACKAGE_UNITS = ['KHONG_DONG_GOI', 'BAO_TAI', 'THUNG_CARTON', 'PALLET'];

// Helper to manually calculate the transport fee estimate server-side to prevent fraud
const calculateTotalTransportFeeEstimate = (items, exchangeRateInput) => {
    if (!items || !Array.isArray(items)) return null;
    let total = 0;
    const exchangeRate = parseFloat(exchangeRateInput) || 0;

    for (const item of items) {
        const volume = parseFloat(item.volume) || 0;
        const volumeFee = parseFloat(item.volumeFee) || 0;
        const weight = parseFloat(item.weight) || 0;
        const weightFee = parseFloat(item.weightFee) || 0;

        const feeByVolume = volume * volumeFee;
        const feeByWeight = weight * weightFee;

        const maxFeeForItem = Math.max(feeByVolume, feeByWeight);

        const domesticFeeTQ = parseFloat(item.domesticFeeTQ || 0);
        const haulingFeeTQ = parseFloat(item.haulingFeeTQ || 0);
        const unloadingFeeRMB = parseFloat(item.unloadingFeeRMB || 0);
        const extraFeeVND = (domesticFeeTQ + haulingFeeTQ + unloadingFeeRMB) * exchangeRate;

        const itemFeeEstimate = maxFeeForItem + extraFeeVND;
        item.itemTransportFeeEstimate = itemFeeEstimate;

        total += itemFeeEstimate;
    }

    return total > 0 ? total : null;
};

// Helper: Clear cache
const invalidateCache = async (id = null) => {
    try {
        const keysList = await redisClient.keys(`${CACHE_KEY_LIST}:*`);
        if (keysList.length > 0) {
            await redisClient.del(keysList);
        }

        if (id) {
            const detailKey = `${CACHE_KEY_DETAIL}:${id}`;
            await redisClient.del(detailKey);
        }
        // Also a general flush pattern if detail matches multiple keys
        const detailKeys = await redisClient.keys(`${CACHE_KEY_DETAIL}:*`);
        if (detailKeys.length > 0) {
            await redisClient.del(detailKeys);
        }
    } catch (err) {
        logger.error(`[Redis] Cache invalidation failed: ${err.message}`);
    }
};

const productCodeController = {
    getAllProductCodes: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY_LIST}:${page}:${limit}:${search}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllProductCodes] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllProductCodes] Cache MISS');

            // 2. Build Query
            const where = { deletedAt: null };

            if (search) {
                const searchNum = parseInt(search);
                where.OR = [
                    { id: isNaN(searchNum) ? undefined : searchNum },
                    { orderCode: { contains: search, mode: 'insensitive' } },
                    {
                        items: {
                            some: {
                                productName: { contains: search, mode: 'insensitive' }
                            }
                        }
                    }
                ];
            }

            // 3. Query DB
            const [productCodes, total] = await prisma.$transaction([
                prisma.productCode.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        customer: { select: { id: true, fullName: true, username: true } },
                        employee: { select: { id: true, fullName: true, username: true } },
                        merchandiseCondition: { select: { id: true, name_vi: true } },
                        items: {
                            include: {
                                declaration: {
                                    select: { id: true }
                                }
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
            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData)); // 5 mins

            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[GetAllProductCodes] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    getProductCodeById: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `${CACHE_KEY_DETAIL}:${id}`;

            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetProductCodeById] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            const productCode = await prisma.productCode.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: {
                    customer: { select: { id: true, fullName: true, username: true } },
                    employee: { select: { id: true, fullName: true, username: true } },
                    merchandiseCondition: { select: { id: true, name_vi: true } },
                    items: {
                        include: {
                            declaration: {
                                select: { id: true }
                            }
                        }
                    }
                }
            });

            if (!productCode) {
                return res.status(404).json({ code: 99006, message: "Product code not found" });
            }

            const responseData = {
                code: 200,
                message: "Success",
                data: productCode
            };

            await redisClient.setEx(cacheKey, 600, JSON.stringify(responseData)); // 10 mins

            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[GetProductCodeById] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createProductCode: async (req, res) => {
        try {
            const {
                employeeId,
                customerId,
                merchandiseConditionId,
                entryDate,
                orderCode,
                totalWeight,
                totalVolume,
                infoSource,
                exchangeRate,
                items // Detail array
            } = req.body;

            // 1. Validate Relations
            if (employeeId) {
                const employee = await prisma.user.findFirst({ where: { id: parseInt(employeeId), deletedAt: null } });
                if (!employee) return res.status(400).json({ code: 400, message: "Employee not found" });
            }
            if (customerId) {
                const customer = await prisma.user.findFirst({ where: { id: parseInt(customerId), deletedAt: null } });
                if (!customer) return res.status(400).json({ code: 400, message: "Customer not found" });
            }
            if (merchandiseConditionId) {
                const condition = await prisma.merchandiseCondition.findFirst({ where: { id: parseInt(merchandiseConditionId), deletedAt: null } });
                if (!condition) return res.status(400).json({ code: 400, message: "Condition not found" });
            }

            // 2. Validate Detail Enum
            let hasItems = items && Array.isArray(items);
            if (hasItems) {
                for (let item of items) {
                    if (item.packageUnit && !VALID_PACKAGE_UNITS.includes(item.packageUnit)) {
                        return res.status(400).json({ code: 400, message: "Invalid package unit in items" });
                    }
                }
            }

            // 3. Auto Calculation for transport fee
            const calculateFee = calculateTotalTransportFeeEstimate(hasItems ? items : [], exchangeRate);

            // 4. Create Master & Nested Create Detail
            const newProductCode = await prisma.$transaction(async (tx) => {
                const pc = await tx.productCode.create({
                    data: {
                        employeeId: employeeId ? parseInt(employeeId) : null,
                        customerId: customerId ? parseInt(customerId) : null,
                        merchandiseConditionId: merchandiseConditionId ? parseInt(merchandiseConditionId) : null,
                        entryDate: entryDate ? new Date(entryDate) : null,
                        orderCode,
                        totalWeight: totalWeight ? parseInt(totalWeight) : null,
                        totalVolume: totalVolume ? parseFloat(totalVolume) : null,
                        infoSource,
                        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
                        totalTransportFeeEstimate: calculateFee,
                        items: hasItems ? {
                            create: items.map(i => ({
                                productName: i.productName,
                                packageCount: i.packageCount ? parseInt(i.packageCount) : null,
                                packageUnit: i.packageUnit,
                                weight: i.weight ? parseInt(i.weight) : null,
                                volume: i.volume ? parseFloat(i.volume) : null,
                                volumeFee: i.volumeFee ? parseInt(i.volumeFee) : null,
                                weightFee: i.weightFee ? parseInt(i.weightFee) : null,
                                domesticFeeTQ: i.domesticFeeTQ ? parseFloat(i.domesticFeeTQ) : null,
                                haulingFeeTQ: i.haulingFeeTQ ? parseFloat(i.haulingFeeTQ) : null,
                                unloadingFeeRMB: i.unloadingFeeRMB ? parseFloat(i.unloadingFeeRMB) : null,
                                itemTransportFeeEstimate: i.itemTransportFeeEstimate !== undefined ? parseFloat(i.itemTransportFeeEstimate) : null,
                                notes: i.notes
                            }))
                        } : undefined
                    },
                    include: {
                        items: {
                            include: {
                                declaration: {
                                    select: { id: true }
                                }
                            }
                        }
                    }
                });

                // Tự động tạo bản ghi Khai báo (Declaration) cho mỗi mặt hàng
                if (pc.items && pc.items.length > 0) {
                    await tx.declaration.createMany({
                        data: pc.items.map(item => ({
                            productCodeId: pc.id,
                            productItemId: item.id
                        }))
                    });
                }
                return pc;
            });

            // 5. Invalidate Cache
            await invalidateCache();

            logger.info(`[CreateProductCode] ID: ${newProductCode.id}`);
            return res.status(201).json({ code: 201, message: "Success", data: newProductCode });

        } catch (error) {
            logger.error(`[CreateProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    },

    updateProductCode: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const existing = await prisma.productCode.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!existing) return res.status(404).json({ code: 404, message: "Product code not found" });

            // 1. Validate Relations
            if (updateData.employeeId) {
                const employee = await prisma.user.findFirst({ where: { id: parseInt(updateData.employeeId), deletedAt: null } });
                if (!employee) return res.status(400).json({ code: 400, message: "Employee not found" });
            }
            if (updateData.customerId) {
                const customer = await prisma.user.findFirst({ where: { id: parseInt(updateData.customerId), deletedAt: null } });
                if (!customer) return res.status(400).json({ code: 400, message: "Customer not found" });
            }
            if (updateData.merchandiseConditionId) {
                const condition = await prisma.merchandiseCondition.findFirst({ where: { id: parseInt(updateData.merchandiseConditionId), deletedAt: null } });
                if (!condition) return res.status(400).json({ code: 400, message: "Condition not found" });
            }

            // 2. Validate Details Enums
            if (updateData.items && Array.isArray(updateData.items)) {
                for (let item of updateData.items) {
                    if (item.packageUnit && !VALID_PACKAGE_UNITS.includes(item.packageUnit)) {
                        return res.status(400).json({ code: 400, message: "Invalid package unit in items" });
                    }
                }
            }

            // 3. Auto Calculation for transport fee based on new items or fallback to DB
            let feeToSave = updateData.totalTransportFeeEstimate;
            let transactionStmts = [];

            if (updateData.items && Array.isArray(updateData.items)) {
                feeToSave = calculateTotalTransportFeeEstimate(updateData.items, updateData.exchangeRate !== undefined ? updateData.exchangeRate : existing.exchangeRate);

                // Completely replace items details by deleting them first
                transactionStmts.push(
                    prisma.productItem.deleteMany({
                        where: { productCodeId: parseInt(id) }
                    })
                );
            }

            // Master Update Payload
            const dataToUpdate = {
                employeeId: updateData.employeeId !== undefined ? (updateData.employeeId ? parseInt(updateData.employeeId) : null) : undefined,
                customerId: updateData.customerId !== undefined ? (updateData.customerId ? parseInt(updateData.customerId) : null) : undefined,
                merchandiseConditionId: updateData.merchandiseConditionId !== undefined ? (updateData.merchandiseConditionId ? parseInt(updateData.merchandiseConditionId) : null) : undefined,
                entryDate: updateData.entryDate !== undefined ? (updateData.entryDate ? new Date(updateData.entryDate) : null) : undefined,
                orderCode: updateData.orderCode,
                totalWeight: updateData.totalWeight !== undefined ? (updateData.totalWeight ? parseInt(updateData.totalWeight) : null) : undefined,
                totalVolume: updateData.totalVolume !== undefined ? (updateData.totalVolume ? parseFloat(updateData.totalVolume) : null) : undefined,
                infoSource: updateData.infoSource,
                exchangeRate: updateData.exchangeRate !== undefined ? (updateData.exchangeRate ? parseFloat(updateData.exchangeRate) : null) : undefined,
                totalTransportFeeEstimate: feeToSave !== undefined ? feeToSave : undefined,
            };

            // If we have items to update, nested create them
            if (updateData.items && Array.isArray(updateData.items)) {
                dataToUpdate.items = {
                    create: updateData.items.map(i => ({
                        productName: i.productName,
                        packageCount: i.packageCount ? parseInt(i.packageCount) : null,
                        packageUnit: i.packageUnit,
                        weight: i.weight ? parseInt(i.weight) : null,
                        volume: i.volume ? parseFloat(i.volume) : null,
                        volumeFee: i.volumeFee ? parseInt(i.volumeFee) : null,
                        weightFee: i.weightFee ? parseInt(i.weightFee) : null,
                        domesticFeeTQ: i.domesticFeeTQ ? parseFloat(i.domesticFeeTQ) : null,
                        haulingFeeTQ: i.haulingFeeTQ ? parseFloat(i.haulingFeeTQ) : null,
                        unloadingFeeRMB: i.unloadingFeeRMB ? parseFloat(i.unloadingFeeRMB) : null,
                        itemTransportFeeEstimate: i.itemTransportFeeEstimate !== undefined ? parseFloat(i.itemTransportFeeEstimate) : null,
                        notes: i.notes
                    }))
                };
            }

            // Execute Transaction explicitly
            const updatedMaster = await prisma.$transaction(async (tx) => {
                // Execute pre-defined deletion (if items were updated)
                for (const stmt of transactionStmts.filter(s => s !== undefined)) {
                    // Note: Here transactionStmts contains Promises if created without await, 
                    // but we need them executed on the 'tx' object for atomicity.
                    // So we'll refine the logic below.
                }

                // Better way: Redraw the transaction logic to use 'tx'
                if (updateData.items && Array.isArray(updateData.items)) {
                    await tx.productItem.deleteMany({
                        where: { productCodeId: parseInt(id) }
                    });
                }

                const pc = await tx.productCode.update({
                    where: { id: parseInt(id) },
                    data: dataToUpdate,
                    include: { items: true }
                });

                // Tạo lại các bản ghi Khai báo cho Items mới
                if (updateData.items && Array.isArray(updateData.items) && pc.items && pc.items.length > 0) {
                    await tx.declaration.createMany({
                        data: pc.items.map(item => ({
                            productCodeId: pc.id,
                            productItemId: item.id
                        }))
                    });
                }

                return pc;
            });

            // 5. Invalidate Cache
            await invalidateCache(id);

            logger.info(`[UpdateProductCode] ID: ${id}`);
            return res.status(200).json({ code: 200, message: "Success", data: updatedMaster });

        } catch (error) {
            logger.error(`[UpdateProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    },

    deleteProductCode: async (req, res) => {
        try {
            const { id } = req.params;

            const productCode = await prisma.productCode.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!productCode) {
                return res.status(404).json({ code: 404, message: "Product code not found" });
            }

            await prisma.productCode.update({
                where: { id: parseInt(id) },
                data: { deletedAt: new Date() }
            });

            // Invalidate Cache
            await invalidateCache(id);

            logger.info(`[DeleteProductCode] ID: ${id}`);

            return res.status(200).json({ code: 200, message: "Success" });

        } catch (error) {
            logger.error(`[DeleteProductCode] Error: ${error.message}`);
            return res.status(500).json({ code: 500, message: "Internal Server Error" });
        }
    }
};

module.exports = productCodeController;
