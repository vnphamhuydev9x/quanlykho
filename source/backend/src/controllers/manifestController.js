const prisma = require('../prisma');
const { createNotification } = require('../utils/notification');

const manifestController = {
    // 1. Create Manifest
    create: async (req, res) => {
        try {
            const { name, date, note } = req.body;
            const newManifest = await prisma.manifest.create({
                data: {
                    name,
                    date: date ? new Date(date) : new Date(),
                    note,
                    status: 'OPEN'
                }
            });
            res.status(201).json(newManifest);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi tạo chuyến xe' });
        }
    },

    // 2. Get All Manifests
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const skip = (page - 1) * limit;

            const where = { deletedAt: null };
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }

            const [items, total] = await Promise.all([
                prisma.manifest.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: { select: { productCodes: true } }
                    }
                }),
                prisma.manifest.count({ where })
            ]);

            res.json({
                items,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi tải danh sách chuyến xe' });
        }
    },

    // 3. Get Manifest Detail
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const manifest = await prisma.manifest.findUnique({
                where: { id: parseInt(id) },
                include: {
                    productCodes: {
                        include: {
                            customer: true
                        }
                    }
                }
            });

            if (!manifest) return res.status(404).json({ message: 'Không tìm thấy chuyến xe' });
            res.json(manifest);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi tải chi tiết chuyến xe' });
        }
    },

    // 4. Update Manifest Info
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, date, note, status } = req.body;

            const updatedManifest = await prisma.manifest.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    date: date ? new Date(date) : undefined,
                    note,
                    status
                }
            });
            res.json(updatedManifest);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi cập nhật thông tin chuyến xe' });
        }
    },

    // 5. Add Items to Manifest
    addItems: async (req, res) => {
        try {
            const { id } = req.params;
            const { productCodeIds } = req.body; // Array of IDs

            if (!productCodeIds || productCodeIds.length === 0) {
                return res.status(400).json({ message: 'Danh sách hàng hóa trống' });
            }

            // Fetch to know customers
            const items = await prisma.productCode.findMany({
                where: { id: { in: productCodeIds.map(pid => parseInt(pid)) } },
                select: { id: true, customerId: true }
            });

            await prisma.productCode.updateMany({
                where: { id: { in: productCodeIds.map(pid => parseInt(pid)) } },
                data: {
                    manifestId: parseInt(id),
                    status: 'DA_XEP_XE' // Update status
                }
            });

            // Group notifications
            const customerGroups = items.reduce((acc, item) => {
                if (item.customerId) {
                    if (!acc[item.customerId]) acc[item.customerId] = [];
                    acc[item.customerId].push(item.id);
                }
                return acc;
            }, {});

            for (const [customerId, ids] of Object.entries(customerGroups)) {
                await createNotification(parseInt(customerId), ids);
            }

            res.json({ message: 'Đã thêm hàng vào chuyến xe thành công' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi thêm hàng vào chuyến xe' });
        }
    },

    // 6. Remove Items from Manifest
    removeItems: async (req, res) => {
        try {
            const { id } = req.params;
            const { productCodeIds } = req.body;

            if (!productCodeIds || productCodeIds.length === 0) {
                return res.status(400).json({ message: 'Danh sách hàng hóa trống' });
            }

            // Fetch to know customers
            const items = await prisma.productCode.findMany({
                where: {
                    id: { in: productCodeIds.map(pid => parseInt(pid)) },
                    manifestId: parseInt(id)
                },
                select: { id: true, customerId: true }
            });

            await prisma.productCode.updateMany({
                where: {
                    id: { in: productCodeIds.map(pid => parseInt(pid)) },
                    manifestId: parseInt(id)
                },
                data: {
                    manifestId: null,
                    status: 'CHO_XEP_XE' // Revert status (or keep previous logic if complex)
                }
            });

            // Group notifications
            const customerGroups = items.reduce((acc, item) => {
                if (item.customerId) {
                    if (!acc[item.customerId]) acc[item.customerId] = [];
                    acc[item.customerId].push(item.id);
                }
                return acc;
            }, {});

            for (const [customerId, ids] of Object.entries(customerGroups)) {
                await createNotification(parseInt(customerId), ids);
            }

            res.json({ message: 'Đã xóa hàng khỏi chuyến xe thành công' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi xóa hàng khỏi chuyến xe' });
        }
    },

    // 7. Delete Manifest (Soft Delete)
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            // check if has items? Or just dissociate them?
            // Simple: Dissociate items first

            // Fetch to know customers
            const items = await prisma.productCode.findMany({
                where: { manifestId: parseInt(id) },
                select: { id: true, customerId: true }
            });

            await prisma.productCode.updateMany({
                where: { manifestId: parseInt(id) },
                data: { manifestId: null, status: 'CHO_XEP_XE' }
            });

            // Group notifications
            const customerGroups = items.reduce((acc, item) => {
                if (item.customerId) {
                    if (!acc[item.customerId]) acc[item.customerId] = [];
                    acc[item.customerId].push(item.id);
                }
                return acc;
            }, {});

            for (const [customerId, ids] of Object.entries(customerGroups)) {
                await createNotification(parseInt(customerId), ids);
            }

            await prisma.manifest.update({
                where: { id: parseInt(id) },
                data: { deletedAt: new Date() }
            });

            res.json({ message: 'Xóa chuyến xe thành công' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi xóa chuyến xe' });
        }
    }
};

module.exports = manifestController;
