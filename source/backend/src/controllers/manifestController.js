const prisma = require('../prisma');
const { createNotification } = require('../utils/notification');
const logger = require('../config/logger');
const redisClient = require('../config/redisClient');

const PC_CACHE_KEY = 'product-codes:list';
const DECL_CACHE_KEY = 'declarations:list';

// Helper: Xóa cache product-codes và declarations sau khi vehicleStatus thay đổi
const invalidateProductCodeCache = async () => {
    try {
        const pcKeys = await redisClient.keys(`${PC_CACHE_KEY}:*`);
        const declKeys = await redisClient.keys(`${DECL_CACHE_KEY}:*`);
        const all = [...pcKeys, ...declKeys];
        if (all.length > 0) await redisClient.del(all);
    } catch (e) {
        logger.warn(`[Manifest] Failed to invalidate cache: ${e.message}`);
    }
};

const VALID_STATUSES = ['CHO_XEP_XE', 'DA_XEP_XE', 'DANG_KIEM_HOA', 'CHO_THONG_QUAN', 'DA_THONG_QUAN', 'DA_NHAP_KHO_VN'];
const callerSelect = { id: true, fullName: true, username: true };

// Tính tổng cân/khối/số mã hàng từ productCodes
const calcTotals = (productCodes) => ({
    totalProductCodes: productCodes.length,
    totalWeight: productCodes.reduce((s, pc) => s + (Number(pc.totalWeight) || 0), 0),
    totalVolume: productCodes.reduce((s, pc) => s + parseFloat(pc.totalVolume || 0), 0),
});

// Validate tất cả PC trong danh sách phải có vehicleStatus = null
const validateVehicleStatus = async (productCodeIds) => {
    const conflicts = await prisma.productCode.findMany({
        where: {
            id: { in: productCodeIds },
            vehicleStatus: { not: null }
        },
        select: {
            id: true,
            orderCode: true,
            manifestId: true,
            manifest: { select: { id: true, licensePlate: true } }
        }
    });
    return conflicts;
};

const manifestController = {
    // 1. Tạo chuyến xe mới (nhận thêm productCodeIds)
    create: async (req, res) => {
        try {
            const { licensePlate, callerId, date, status, note, productCodeIds = [] } = req.body;

            if (!licensePlate || !licensePlate.trim()) {
                return res.status(400).json({ code: 400, message: 'Biển số xe là bắt buộc' });
            }
            const manifestStatus = status || 'CHO_XEP_XE';
            if (!VALID_STATUSES.includes(manifestStatus)) {
                return res.status(400).json({ code: 400, message: 'Trạng thái không hợp lệ' });
            }

            // Validate vehicleStatus của các PC
            if (productCodeIds.length > 0) {
                const ids = productCodeIds.map(id => parseInt(id));
                const conflicts = await validateVehicleStatus(ids);
                if (conflicts.length > 0) {
                    return res.status(400).json({
                        code: 400,
                        message: 'Một số mã hàng đã được xếp xe',
                        conflicts: conflicts.map(c => ({
                            productCodeId: c.id,
                            orderCode: c.orderCode,
                            manifestId: c.manifest?.id,
                            licensePlate: c.manifest?.licensePlate
                        }))
                    });
                }
            }

            // Tạo Manifest + gán PC trong transaction
            const newManifest = await prisma.$transaction(async (tx) => {
                const manifest = await tx.manifest.create({
                    data: {
                        licensePlate: licensePlate.trim(),
                        callerId: callerId ? parseInt(callerId) : null,
                        date: date ? new Date(date) : new Date(),
                        status: manifestStatus,
                        note: note || null,
                    },
                    include: { caller: { select: callerSelect } }
                });

                if (productCodeIds.length > 0) {
                    const ids = productCodeIds.map(id => parseInt(id));
                    await tx.productCode.updateMany({
                        where: { id: { in: ids } },
                        data: {
                            manifestId: manifest.id,
                            vehicleStatus: 'CHO_XEP_XE',
                            vehicleStatusOverridden: false
                        }
                    });
                }
                return manifest;
            });

            logger.info(`[Manifest.create] ID: ${newManifest.id} with ${productCodeIds.length} product codes`);
            if (productCodeIds.length > 0) await invalidateProductCodeCache();
            return res.status(201).json({ code: 201, message: 'Success', data: newManifest });
        } catch (error) {
            logger.error(`[Manifest.create] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi tạo chuyến xe' });
        }
    },

    // 2. Danh sách chuyến xe
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = { deletedAt: null };
            if (search) {
                where.licensePlate = { contains: search, mode: 'insensitive' };
            }

            const [manifests, total] = await Promise.all([
                prisma.manifest.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        caller: { select: callerSelect },
                        productCodes: {
                            where: { deletedAt: null },
                            select: { totalWeight: true, totalVolume: true }
                        }
                    }
                }),
                prisma.manifest.count({ where })
            ]);

            const items = manifests.map(m => {
                const { productCodes, ...rest } = m;
                return { ...rest, ...calcTotals(productCodes) };
            });

            return res.status(200).json({
                code: 200,
                message: 'Success',
                data: { items, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
            });
        } catch (error) {
            logger.error(`[Manifest.getAll] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi tải danh sách chuyến xe' });
        }
    },

    // 3. Chi tiết chuyến xe
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const manifest = await prisma.manifest.findFirst({
                where: { id: parseInt(id), deletedAt: null },
                include: {
                    caller: { select: callerSelect },
                    productCodes: {
                        where: { deletedAt: null },
                        include: {
                            customer: { select: { id: true, fullName: true, customerCode: true } },
                            items: { select: { packageCount: true, packageUnit: true } }
                        }
                    }
                }
            });

            if (!manifest) {
                return res.status(404).json({ code: 404, message: 'Không tìm thấy chuyến xe' });
            }

            const totals = calcTotals(manifest.productCodes);
            return res.status(200).json({ code: 200, message: 'Success', data: { ...manifest, ...totals } });
        } catch (error) {
            logger.error(`[Manifest.getById] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi tải chi tiết chuyến xe' });
        }
    },

    // 4. Cập nhật thông tin chuyến xe
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { licensePlate, callerId, date, status, note } = req.body;

            const existing = await prisma.manifest.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!existing) return res.status(404).json({ code: 404, message: 'Không tìm thấy chuyến xe' });

            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json({ code: 400, message: 'Trạng thái không hợp lệ' });
            }

            const updated = await prisma.$transaction(async (tx) => {
                const manifest = await tx.manifest.update({
                    where: { id: parseInt(id) },
                    data: {
                        licensePlate: licensePlate ? licensePlate.trim() : undefined,
                        callerId: callerId !== undefined ? (callerId ? parseInt(callerId) : null) : undefined,
                        date: date ? new Date(date) : undefined,
                        status: status || undefined,
                        note: note !== undefined ? note : undefined,
                    },
                    include: { caller: { select: callerSelect } }
                });

                // Đồng bộ vehicleStatus cho PC chưa bị override thủ công
                if (status && status !== existing.status) {
                    await tx.productCode.updateMany({
                        where: {
                            manifestId: parseInt(id),
                            vehicleStatusOverridden: false,
                            deletedAt: null
                        },
                        data: { vehicleStatus: status }
                    });
                    logger.info(`[Manifest.update] Synced vehicleStatus=${status} for non-overridden PCs of manifest ${id}`);
                }
                return manifest;
            });

            logger.info(`[Manifest.update] ID: ${id}`);
            if (status && status !== existing.status) await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Success', data: updated });
        } catch (error) {
            logger.error(`[Manifest.update] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi cập nhật chuyến xe' });
        }
    },

    // 5. Thêm mã hàng vào xe (validate vehicleStatus = null)
    addItems: async (req, res) => {
        try {
            const { id } = req.params;
            const { productCodeIds } = req.body;

            if (!productCodeIds || productCodeIds.length === 0) {
                return res.status(400).json({ code: 400, message: 'Danh sách mã hàng trống' });
            }

            const manifest = await prisma.manifest.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!manifest) return res.status(404).json({ code: 404, message: 'Không tìm thấy chuyến xe' });

            const ids = productCodeIds.map(pid => parseInt(pid));

            // Validate vehicleStatus = null
            const conflicts = await validateVehicleStatus(ids);
            if (conflicts.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: 'Một số mã hàng đã được xếp xe',
                    conflicts: conflicts.map(c => ({
                        productCodeId: c.id,
                        orderCode: c.orderCode,
                        manifestId: c.manifest?.id,
                        licensePlate: c.manifest?.licensePlate
                    }))
                });
            }

            // Gán vào xe + set vehicleStatus theo trạng thái xe hiện tại
            const pcs = await prisma.productCode.findMany({
                where: { id: { in: ids } },
                select: { id: true, customerId: true }
            });

            await prisma.productCode.updateMany({
                where: { id: { in: ids } },
                data: {
                    manifestId: parseInt(id),
                    vehicleStatus: manifest.status,
                    vehicleStatusOverridden: false
                }
            });

            // Notification
            const customerGroups = pcs.reduce((acc, pc) => {
                if (pc.customerId) {
                    if (!acc[pc.customerId]) acc[pc.customerId] = [];
                    acc[pc.customerId].push(pc.id);
                }
                return acc;
            }, {});
            for (const [customerId, pcIds] of Object.entries(customerGroups)) {
                await createNotification(parseInt(customerId), pcIds);
            }

            logger.info(`[Manifest.addItems] Added ${ids.length} PCs to manifest ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Thêm mã hàng vào xe thành công' });
        } catch (error) {
            logger.error(`[Manifest.addItems] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi thêm mã hàng vào xe' });
        }
    },

    // 6. Xóa mã hàng khỏi xe (reset vehicleStatus)
    removeItems: async (req, res) => {
        try {
            const { id } = req.params;
            const { productCodeIds } = req.body;

            if (!productCodeIds || productCodeIds.length === 0) {
                return res.status(400).json({ code: 400, message: 'Danh sách mã hàng trống' });
            }

            const ids = productCodeIds.map(pid => parseInt(pid));

            await prisma.productCode.updateMany({
                where: { id: { in: ids }, manifestId: parseInt(id) },
                data: {
                    manifestId: null,
                    vehicleStatus: null,
                    vehicleStatusOverridden: false
                }
            });

            logger.info(`[Manifest.removeItems] Removed ${ids.length} PCs from manifest ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Xóa mã hàng khỏi xe thành công' });
        } catch (error) {
            logger.error(`[Manifest.removeItems] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi xóa mã hàng khỏi xe' });
        }
    },

    // 7. Xóa chuyến xe (soft delete + reset tất cả PC)
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const manifest = await prisma.manifest.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!manifest) return res.status(404).json({ code: 404, message: 'Không tìm thấy chuyến xe' });

            await prisma.$transaction(async (tx) => {
                await tx.productCode.updateMany({
                    where: { manifestId: parseInt(id) },
                    data: { manifestId: null, vehicleStatus: null, vehicleStatusOverridden: false }
                });
                await tx.manifest.update({
                    where: { id: parseInt(id) },
                    data: { deletedAt: new Date() }
                });
            });

            logger.info(`[Manifest.delete] Deleted ID: ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Xóa chuyến xe thành công' });
        } catch (error) {
            logger.error(`[Manifest.delete] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi xóa chuyến xe' });
        }
    },

    // 8. [NEW] Chỉnh thủ công vehicleStatus của 1 mã hàng
    updateProductCodeVehicleStatus: async (req, res) => {
        try {
            const { id, pcId } = req.params;
            const { vehicleStatus } = req.body;

            if (!vehicleStatus || !VALID_STATUSES.includes(vehicleStatus)) {
                return res.status(400).json({ code: 400, message: 'Trạng thái không hợp lệ' });
            }

            // Validate PC thuộc manifest này
            const pc = await prisma.productCode.findFirst({
                where: { id: parseInt(pcId), manifestId: parseInt(id), deletedAt: null }
            });
            if (!pc) return res.status(404).json({ code: 404, message: 'Mã hàng không thuộc chuyến xe này' });

            const updated = await prisma.productCode.update({
                where: { id: parseInt(pcId) },
                data: { vehicleStatus, vehicleStatusOverridden: true }
            });

            logger.info(`[Manifest.updateVehicleStatus] PC ${pcId} → ${vehicleStatus} (override) in manifest ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Cập nhật trạng thái thành công', data: updated });
        } catch (error) {
            logger.error(`[Manifest.updateVehicleStatus] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi cập nhật trạng thái' });
        }
    },

    // 9. [NEW] Khôi phục vehicleStatus về trạng thái hiện tại của xe
    resetProductCodeVehicleStatus: async (req, res) => {
        try {
            const { id, pcId } = req.params;

            const manifest = await prisma.manifest.findFirst({ where: { id: parseInt(id), deletedAt: null } });
            if (!manifest) return res.status(404).json({ code: 404, message: 'Không tìm thấy chuyến xe' });

            const pc = await prisma.productCode.findFirst({
                where: { id: parseInt(pcId), manifestId: parseInt(id), deletedAt: null }
            });
            if (!pc) return res.status(404).json({ code: 404, message: 'Mã hàng không thuộc chuyến xe này' });

            const updated = await prisma.productCode.update({
                where: { id: parseInt(pcId) },
                data: { vehicleStatus: manifest.status, vehicleStatusOverridden: false }
            });

            logger.info(`[Manifest.resetVehicleStatus] PC ${pcId} reset → ${manifest.status} in manifest ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: 'Khôi phục trạng thái thành công', data: updated });
        } catch (error) {
            logger.error(`[Manifest.resetVehicleStatus] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi khôi phục trạng thái' });
        }
    },

    // 10. [NEW] Chỉnh thủ công vehicleStatus cho nhiều mã hàng (bulk)
    bulkUpdateVehicleStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { productCodeIds, vehicleStatus } = req.body;

            if (!vehicleStatus || !VALID_STATUSES.includes(vehicleStatus)) {
                return res.status(400).json({ code: 400, message: 'Trạng thái không hợp lệ' });
            }
            if (!productCodeIds || productCodeIds.length === 0) {
                return res.status(400).json({ code: 400, message: 'Danh sách mã hàng trống' });
            }

            const ids = productCodeIds.map(pid => parseInt(pid));

            await prisma.productCode.updateMany({
                where: { id: { in: ids }, manifestId: parseInt(id), deletedAt: null },
                data: { vehicleStatus, vehicleStatusOverridden: true }
            });

            logger.info(`[Manifest.bulkUpdateVehicleStatus] ${ids.length} PCs → ${vehicleStatus} (override) in manifest ${id}`);
            await invalidateProductCodeCache();
            return res.status(200).json({ code: 200, message: `Cập nhật trạng thái cho ${ids.length} mã hàng thành công` });
        } catch (error) {
            logger.error(`[Manifest.bulkUpdateVehicleStatus] ${error.message}`);
            return res.status(500).json({ code: 500, message: 'Lỗi khi cập nhật trạng thái hàng loạt' });
        }
    }
};

module.exports = manifestController;
