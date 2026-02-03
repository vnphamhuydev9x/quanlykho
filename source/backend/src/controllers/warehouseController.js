const { PrismaClient } = require('@prisma/client');
const redisClient = require('../config/redisClient');
const prisma = new PrismaClient();

const warehouseController = {
    // GET: List all warehouses (with Search & Filter)
    // Public/User accessible
    getAllWarehouses: async (req, res) => {
        try {
            const { search, status } = req.query;
            const cacheKey = `warehouses:list:${search || 'all'}:${status || 'all'}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.json({
                    code: 200,
                    message: 'Success (Cache)',
                    data: JSON.parse(cachedData)
                });
            }

            const where = {};

            if (search) {
                where.name = {
                    contains: search,
                    mode: 'insensitive'
                };
            }

            if (status) {
                where.status = status;
            }

            const warehouses = await prisma.warehouse.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // 2. Set Cache (Expire after 1 hour)
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(warehouses));

            res.json({
                code: 200,
                message: 'Success',
                data: warehouses
            });
        } catch (error) {
            console.error('Get All Warehouses Error:', error);
            res.status(500).json({
                code: 99500,
                message: 'Internal Server Error'
            });
        }
    },

    // POST: Create Warehouse (Admin only)
    createWarehouse: async (req, res) => {
        try {
            const { name, status } = req.body;

            if (!name) {
                return res.status(400).json({
                    code: 99001,
                    message: 'Tên kho là bắt buộc'
                });
            }

            // Check duplicate name
            const existing = await prisma.warehouse.findFirst({
                where: { name: { equals: name, mode: 'insensitive' } }
            });

            if (existing) {
                return res.status(400).json({
                    code: 99005,
                    message: 'Tên kho đã tồn tại'
                });
            }

            const newWarehouse = await prisma.warehouse.create({
                data: {
                    name,
                    status: status || 'AVAILABLE'
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys('warehouses:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            res.status(201).json({
                code: 201,
                message: 'Tạo kho thành công',
                data: newWarehouse
            });
        } catch (error) {
            console.error('Create Warehouse Error:', error);
            res.status(500).json({
                code: 99500,
                message: 'Internal Server Error'
            });
        }
    },

    // PUT: Update Warehouse (Admin only)
    updateWarehouse: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, status } = req.body;
            const warehouseId = parseInt(id);

            const existingWarehouse = await prisma.warehouse.findUnique({
                where: { id: warehouseId }
            });

            if (!existingWarehouse) {
                return res.status(404).json({
                    code: 99006,
                    message: 'Kho không tồn tại'
                });
            }

            // Check duplicate name if name changed
            if (name && name !== existingWarehouse.name) {
                const nameCheck = await prisma.warehouse.findFirst({
                    where: {
                        name: { equals: name, mode: 'insensitive' },
                        NOT: { id: warehouseId }
                    }
                });
                if (nameCheck) {
                    return res.status(400).json({
                        code: 99005,
                        message: 'Tên kho đã tồn tại'
                    });
                }
            }

            const updatedWarehouse = await prisma.warehouse.update({
                where: { id: warehouseId },
                data: {
                    name: name || undefined,
                    status: status || undefined
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys('warehouses:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            res.json({
                code: 200,
                message: 'Cập nhật kho thành công',
                data: updatedWarehouse
            });
        } catch (error) {
            console.error('Update Warehouse Error:', error);
            res.status(500).json({
                code: 99500,
                message: 'Internal Server Error'
            });
        }
    },

    // DELETE: Delete Warehouse (Admin only)
    deleteWarehouse: async (req, res) => {
        try {
            const { id } = req.params;
            const warehouseId = parseInt(id);

            const existingWarehouse = await prisma.warehouse.findUnique({
                where: { id: warehouseId }
            });

            if (!existingWarehouse) {
                return res.status(404).json({
                    code: 99006,
                    message: 'Kho không tồn tại'
                });
            }

            await prisma.warehouse.delete({
                where: { id: warehouseId }
            });

            // Invalidate Cache
            const keys = await redisClient.keys('warehouses:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            res.json({
                code: 200,
                message: 'Xóa kho thành công'
            });
        } catch (error) {
            console.error('Delete Warehouse Error:', error);
            res.status(500).json({
                code: 99500,
                message: 'Internal Server Error'
            });
        }
    }
};

module.exports = warehouseController;
