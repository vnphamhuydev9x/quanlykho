const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const { invalidateDebtCache } = require('../utils/debtCacheHelper');

const CACHE_KEY_LIST = 'export-orders:list';
const CACHE_KEY_DETAIL = 'export-orders:detail';
const PC_CACHE_KEY_LIST = 'product-codes:list';
const PC_CACHE_KEY_DETAIL = 'product-codes:detail';

// State machine: các transition hợp lệ
const VALID_TRANSITIONS = {
    DA_TAO_LENH: ['DANG_XAC_NHAN_CAN'],
    DANG_XAC_NHAN_CAN: ['DA_XAC_NHAN_CAN'],
    DA_XAC_NHAN_CAN: ['DA_XUAT_KHO'],
    DA_XUAT_KHO: []
};

const isValidTransition = (from, to) => {
    return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to);
};

// Helper: Invalidate cache export-orders
const invalidateExportOrderCache = async (id = null) => {
    try {
        const listKeys = await redisClient.keys(`${CACHE_KEY_LIST}:*`);
        if (listKeys.length > 0) await redisClient.del(listKeys);
        if (id) await redisClient.del(`${CACHE_KEY_DETAIL}:${id}`);
    } catch (err) {
        logger.error(`[Redis] ExportOrder cache invalidation failed: ${err.message}`);
    }
};

// Helper: Invalidate cache product-codes
const invalidateProductCodeCache = async () => {
    try {
        const listKeys = await redisClient.keys(`${PC_CACHE_KEY_LIST}:*`);
        if (listKeys.length > 0) await redisClient.del(listKeys);
        const detailKeys = await redisClient.keys(`${PC_CACHE_KEY_DETAIL}:*`);
        if (detailKeys.length > 0) await redisClient.del(detailKeys);
    } catch (err) {
        logger.error(`[Redis] ProductCode cache invalidation failed: ${err.message}`);
    }
};

const exportOrderController = {

    // GET /api/export-orders
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, status, customerId } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const cacheKey = `${CACHE_KEY_LIST}:${page}:${limit}:${status || 'all'}:${customerId || 'all'}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info('[ExportOrder.getAll] Cache HIT');
                return res.status(200).json(JSON.parse(cached));
            }

            const where = { deletedAt: null };
            if (status) where.status = status;
            if (customerId) where.customerId = parseInt(customerId);

            const [items, total] = await prisma.$transaction([
                prisma.exportOrder.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        customer: { select: { id: true, fullName: true, customerCode: true } },
                        createdBy: { select: { id: true, fullName: true } },
                        _count: { select: { productCodes: true } }
                    }
                }),
                prisma.exportOrder.count({ where })
            ]);

            const responseData = {
                code: 200,
                message: 'Success',
                data: {
                    items: items.map(eo => ({
                        ...eo,
                        productCodeCount: eo._count.productCodes,
                        _count: undefined
                    })),
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            };

            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[ExportOrder.getAll] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // GET /api/export-orders/:id
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `${CACHE_KEY_DETAIL}:${id}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info('[ExportOrder.getById] Cache HIT');
                return res.status(200).json(JSON.parse(cached));
            }

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: {
                        customer: { select: { id: true, fullName: true, customerCode: true } },
                        createdBy: { select: { id: true, fullName: true } },
                        productCodes: {
                            where: { deletedAt: null },
                            include: {
                                customer: { select: { id: true, fullName: true, customerCode: true } },
                            items: {
                                where: { deletedAt: null },
                                select: {
                                    id: true,
                                    productName: true,
                                    packageCount: true,
                                    packageUnit: true,
                                    weight: true,
                                    volume: true,
                                    volumeFee: true,
                                    weightFee: true,
                                    domesticFeeTQ: true,
                                    haulingFeeTQ: true,
                                    unloadingFeeRMB: true,
                                    itemTransportFeeEstimate: true,
                                    actualWeight: true,
                                    actualVolume: true,
                                    actualItemTransportFeeEstimate: true,
                                    actualImportCostToCustomer: true,
                                    useActualData: true,
                                    declaration: {
                                        select: { id: true, declarationCost: true, importCostToCustomer: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            const responseData = { code: 200, message: 'Success', data: exportOrder };
            await redisClient.setEx(cacheKey, 600, JSON.stringify(responseData));
            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[ExportOrder.getById] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // POST /api/export-orders
    create: async (req, res) => {
        try {
            const { productCodeIds, deliveryDateTime, deliveryCost, notes } = req.body;

            // Validate input
            if (!productCodeIds || !Array.isArray(productCodeIds) || productCodeIds.length === 0) {
                return res.status(400).json({ code: 99001, message: 'productCodeIds is required and must be a non-empty array' });
            }

            const ids = productCodeIds.map(id => parseInt(id));

            // Bước 1: Validate vehicleStatus = DA_NHAP_KHO_VN
            const notInVN = await prisma.productCode.findMany({
                where: {
                    id: { in: ids },
                    deletedAt: null,
                    vehicleStatus: { not: 'DA_NHAP_KHO_VN' }
                },
                select: { id: true, orderCode: true, vehicleStatus: true }
            });
            if (notInVN.length > 0) {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'VEHICLE_STATUS_INVALID',
                    message: 'Các mã hàng sau chưa về kho VN',
                    conflicts: notInVN
                });
            }

            // Bước 2: Validate tất cả mã hàng phải cùng 1 khách hàng
            const allPCs = await prisma.productCode.findMany({
                where: { id: { in: ids }, deletedAt: null },
                select: {
                    id: true, orderCode: true, customerId: true,
                    customer: { select: { fullName: true, customerCode: true } }
                }
            });
            const uniqueCustomerIds = [...new Set(allPCs.map(pc => pc.customerId).filter(id => id != null))];
            if (uniqueCustomerIds.length > 1) {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'MIXED_CUSTOMERS',
                    message: 'Lệnh xuất kho chỉ được tạo cho 1 khách hàng',
                    conflicts: allPCs.map(pc => ({
                        id: pc.id,
                        orderCode: pc.orderCode,
                        customerId: pc.customerId,
                        customerName: pc.customer
                            ? `${pc.customer.customerCode || ''} — ${pc.customer.fullName}`.trim()
                            : null
                    }))
                });
            }
            const customerId = uniqueCustomerIds[0] || null;

            // Bước 3: Validate exportOrderId = null
            const alreadyExported = await prisma.productCode.findMany({
                where: {
                    id: { in: ids },
                    deletedAt: null,
                    exportOrderId: { not: null }
                },
                select: { id: true, orderCode: true, exportOrderId: true }
            });
            if (alreadyExported.length > 0) {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'ALREADY_IN_EXPORT_ORDER',
                    message: 'Các mã hàng sau đã có lệnh xuất kho',
                    conflicts: alreadyExported
                });
            }

            // Tạo ExportOrder trong transaction
            const exportOrder = await prisma.$transaction(async (tx) => {
                const eo = await tx.exportOrder.create({
                    data: {
                        customerId,
                        createdById: req.user?.id || null,
                        deliveryDateTime: deliveryDateTime ? new Date(deliveryDateTime) : null,
                        deliveryCost: deliveryCost ? parseInt(deliveryCost) : null,
                        notes: notes || null,
                        status: 'DA_TAO_LENH'
                    }
                });

                await tx.productCode.updateMany({
                    where: { id: { in: ids } },
                    data: {
                        exportOrderId: eo.id,
                        exportStatus: 'DA_TAO_LENH',
                        exportDeliveryDateTime: deliveryDateTime ? new Date(deliveryDateTime) : null
                    }
                });

                return eo;
            });

            await invalidateExportOrderCache();
            await invalidateProductCodeCache();

            logger.info(`[ExportOrder.create] ID: ${exportOrder.id}`);
            return res.status(201).json({ code: 200, message: 'Success', data: exportOrder });
        } catch (error) {
            logger.error(`[ExportOrder.create] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PATCH /api/export-orders/:id/submit-reweigh
    // Nhân viên gửi số liệu cân lại: DA_TAO_LENH → DANG_XAC_NHAN_CAN
    submitReweigh: async (req, res) => {
        try {
            const { id } = req.params;
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ code: 99001, message: 'items is required' });
            }

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            if (exportOrder.status !== 'DA_TAO_LENH') {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'INVALID_STATUS_TRANSITION',
                    message: `Không thể gửi số cân từ trạng thái ${exportOrder.status}`
                });
            }

            // Lấy ProductItem kèm ProductCode (để lấy exchangeRate và declaration)
            const productItemIds = items.map(i => parseInt(i.productItemId));
            const productItems = await prisma.productItem.findMany({
                where: { id: { in: productItemIds }, deletedAt: null },
                include: {
                    productCode: { select: { exchangeRate: true } },
                    declaration: { select: { declarationCost: true } }
                }
            });

            const itemMap = {};
            for (const pi of productItems) {
                itemMap[pi.id] = pi;
            }

            await prisma.$transaction(async (tx) => {
                for (const inputItem of items) {
                    const piId = parseInt(inputItem.productItemId);
                    const pi = itemMap[piId];
                    if (!pi) continue;

                    const actualWeight = inputItem.actualWeight != null ? parseInt(inputItem.actualWeight) : null;
                    const actualVolume = inputItem.actualVolume != null ? parseFloat(inputItem.actualVolume) : null;

                    const exchangeRate = parseFloat(pi.productCode?.exchangeRate || 0);
                    const feeByVolume = (parseFloat(pi.volumeFee || 0)) * (actualVolume || 0);
                    const feeByWeight = (parseFloat(pi.weightFee || 0)) * (actualWeight || 0);
                    const maxFee = Math.max(feeByVolume, feeByWeight);
                    const extraFeeVND = (
                        parseFloat(pi.domesticFeeTQ || 0) +
                        parseFloat(pi.haulingFeeTQ || 0) +
                        parseFloat(pi.unloadingFeeRMB || 0)
                    ) * exchangeRate;
                    const actualTransportFee = maxFee + extraFeeVND;

                    const declarationCost = pi.declaration?.declarationCost
                        ? parseInt(pi.declaration.declarationCost)
                        : 0;
                    const actualImportCost = actualTransportFee + declarationCost;

                    await tx.productItem.update({
                        where: { id: piId },
                        data: {
                            actualWeight,
                            actualVolume: actualVolume != null ? actualVolume : null,
                            actualItemTransportFeeEstimate: actualTransportFee,
                            actualImportCostToCustomer: actualImportCost
                        }
                    });
                }

                // Chuyển trạng thái ExportOrder
                await tx.exportOrder.update({
                    where: { id: parseInt(id) },
                    data: { status: 'DANG_XAC_NHAN_CAN' }
                });

                // Clone status xuống ProductCode
                await tx.productCode.updateMany({
                    where: { exportOrderId: parseInt(id) },
                    data: { exportStatus: 'DANG_XAC_NHAN_CAN' }
                });
            });

            await invalidateExportOrderCache(id);
            await invalidateProductCodeCache();

            logger.info(`[ExportOrder.submitReweigh] ID: ${id}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[ExportOrder.submitReweigh] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PATCH /api/export-orders/:id/confirm-reweigh
    // Admin xác nhận số cân: DANG_XAC_NHAN_CAN → DA_XAC_NHAN_CAN
    confirmReweigh: async (req, res) => {
        try {
            const { id } = req.params;
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ code: 99001, message: 'items is required' });
            }

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            if (exportOrder.status !== 'DANG_XAC_NHAN_CAN') {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'INVALID_STATUS_TRANSITION',
                    message: `Không thể xác nhận số cân từ trạng thái ${exportOrder.status}`
                });
            }

            await prisma.$transaction(async (tx) => {
                for (const item of items) {
                    await tx.productItem.update({
                        where: { id: parseInt(item.productItemId) },
                        data: { useActualData: item.useActualData === true }
                    });
                }

                await tx.exportOrder.update({
                    where: { id: parseInt(id) },
                    data: { status: 'DA_XAC_NHAN_CAN' }
                });

                await tx.productCode.updateMany({
                    where: { exportOrderId: parseInt(id) },
                    data: { exportStatus: 'DA_XAC_NHAN_CAN' }
                });
            });

            await invalidateExportOrderCache(id);
            await invalidateProductCodeCache();

            logger.info(`[ExportOrder.confirmReweigh] ID: ${id}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[ExportOrder.confirmReweigh] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PATCH /api/export-orders/:id/status
    // Giao hàng: DA_XAC_NHAN_CAN → DA_XUAT_KHO (kèm deliveryCost/phí ship, paymentReceived)
    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, deliveryCost, paymentReceived } = req.body;

            if (!status) {
                return res.status(400).json({ code: 99001, message: 'status is required' });
            }

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            if (!isValidTransition(exportOrder.status, status)) {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'INVALID_STATUS_TRANSITION',
                    message: `Không thể chuyển từ ${exportOrder.status} sang ${status}`
                });
            }

            const updateData = { status };
            if (status === 'DA_XUAT_KHO') {
                if (deliveryCost != null) updateData.deliveryCost = parseInt(deliveryCost);
                updateData.paymentReceived = paymentReceived === true || paymentReceived === 'true';
            }

            await prisma.$transaction(async (tx) => {
                await tx.exportOrder.update({
                    where: { id: parseInt(id) },
                    data: updateData
                });

                await tx.productCode.updateMany({
                    where: { exportOrderId: parseInt(id) },
                    data: { exportStatus: status }
                });
            });

            await invalidateExportOrderCache(id);
            await invalidateProductCodeCache();

            // Invalidate debt cache khi chuyển sang DA_XUAT_KHO (phát sinh công nợ)
            if (status === 'DA_XUAT_KHO' && exportOrder.customerId) {
                const eoYear = new Date(exportOrder.createdAt).getFullYear();
                await invalidateDebtCache(redisClient, exportOrder.customerId, eoYear);
            }

            logger.info(`[ExportOrder.updateStatus] ID: ${id} → ${status}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[ExportOrder.updateStatus] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/export-orders/:id
    // Cập nhật thông tin lệnh: deliveryDateTime, notes (deliveryCost chỉ nhập tại bước giao hàng)
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { deliveryDateTime, notes } = req.body;

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            const updateData = {};
            if (deliveryDateTime !== undefined) updateData.deliveryDateTime = deliveryDateTime ? new Date(deliveryDateTime) : null;
            if (notes !== undefined) updateData.notes = notes || null;

            await prisma.$transaction(async (tx) => {
                await tx.exportOrder.update({
                    where: { id: parseInt(id) },
                    data: updateData
                });

                // Sync exportDeliveryDateTime on linked ProductCodes if deliveryDateTime changed
                if (deliveryDateTime !== undefined) {
                    await tx.productCode.updateMany({
                        where: { exportOrderId: parseInt(id) },
                        data: { exportDeliveryDateTime: deliveryDateTime ? new Date(deliveryDateTime) : null }
                    });
                }
            });

            await invalidateExportOrderCache(id);
            await invalidateProductCodeCache();

            logger.info(`[ExportOrder.update] ID: ${id}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[ExportOrder.update] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // DELETE /api/export-orders/:id
    // Hủy lệnh xuất kho — soft delete, chỉ khi DA_TAO_LENH
    cancel: async (req, res) => {
        try {
            const { id } = req.params;

            const exportOrder = await prisma.exportOrder.findFirst({
                where: { id: parseInt(id), deletedAt: null }
            });

            if (!exportOrder) {
                return res.status(404).json({ code: 99006, message: 'Export order not found' });
            }

            if (exportOrder.status !== 'DA_TAO_LENH') {
                return res.status(400).json({
                    code: 400,
                    errorCode: 'CANNOT_CANCEL',
                    message: `Không thể hủy lệnh xuất kho ở trạng thái ${exportOrder.status}. Chỉ có thể hủy khi trạng thái là Đã tạo lệnh.`
                });
            }

            await prisma.$transaction(async (tx) => {
                await tx.exportOrder.update({
                    where: { id: parseInt(id) },
                    data: { deletedAt: new Date() }
                });

                await tx.productCode.updateMany({
                    where: { exportOrderId: parseInt(id) },
                    data: {
                        exportOrderId: null,
                        exportStatus: null,
                        exportDeliveryDateTime: null
                    }
                });
            });

            await invalidateExportOrderCache(id);
            await invalidateProductCodeCache();

            logger.info(`[ExportOrder.cancel] ID: ${id}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[ExportOrder.cancel] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    }
};

module.exports = exportOrderController;
