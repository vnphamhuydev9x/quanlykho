const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');

const redisClient = require('../config/redisClient');
const CACHE_KEY = 'customers:list';

const customerController = {

    createCustomer: async (req, res) => {
        try {
            const { username, password, fullName, phone, address, saleId, isActive } = req.body;

            logger.info(`[CreateCustomer] Request received. Username: ${username}, Name: ${fullName}`);

            // Validation
            if (!username || !password || !fullName) {
                return res.status(400).json({ code: 99001, message: "Username, Password and Full Name are required" });
            }

            // Check if username exists
            const existing = await prisma.user.findUnique({ where: { username } });
            if (existing) {
                return res.status(400).json({ code: 99005, message: "Username already exists" });
            }

            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 10);

            // We no longer auto-generate customerCode. User manually inputs username.

            const newCustomer = await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    fullName,
                    phone,
                    address,
                    saleId: saleId ? parseInt(saleId) : null,
                    isActive: isActive !== undefined ? isActive : true,
                    type: 'CUSTOMER',
                    role: 'USER' // Default role for customer
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys('customers:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateCustomer] Success. ID: ${newCustomer.id}`);
            return res.status(200).json({
                code: 200,
                message: "Success",
                data: newCustomer
            });

        } catch (error) {
            logger.error(`[CreateCustomer] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    getCustomers: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', status, saleId } = req.query;

            let skip, take;
            if (parseInt(limit) > 0) {
                skip = (parseInt(page) - 1) * parseInt(limit);
                take = parseInt(limit);
            } else {
                // limit = 0 or invalid (but we treat 0 as all) -> Fetch All
                skip = undefined;
                take = undefined;
            }

            const where = {
                type: 'CUSTOMER',
            };

            if (search) {
                where.OR = [
                    { username: { contains: search, mode: 'insensitive' } },
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (status) {
                if (status === 'active') where.isActive = true;
                if (status === 'inactive') where.isActive = false;
            }

            if (saleId) {
                where.saleId = parseInt(saleId);
            }

            const queryOptions = {
                where,
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    address: true,
                    isActive: true,
                    saleId: true,
                    sale: {
                        select: { fullName: true } // Include Sale name
                    }
                }
            };

            if (take !== undefined) {
                queryOptions.skip = skip;
                queryOptions.take = take;
            }

            const [customers, total] = await prisma.$transaction([
                prisma.user.findMany(queryOptions),
                prisma.user.count({ where })
            ]);

            const responseData = {
                customers,
                total,
                page: parseInt(page),
                totalPages: take ? Math.ceil(total / take) : 1
            };

            // 2. Set Cache (disabled for dynamic search for now or update logic)
            // For simple searches we might cache, but for filters it's complex. 
            // Let's skip cache for search/filter queries for simplicity or add efficient keys.
            // Current key: const cacheKey = `customers:list:${page}:${limit}:${search || 'all'}`;
            // We should extend cache key if we want to support caching with filters, or just return directly.

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: responseData
            });

        } catch (error) {
            logger.error(`[GetCustomers] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateCustomer: async (req, res) => {
        try {
            const { id } = req.params;
            const { fullName, phone, address, saleId, isActive, password } = req.body; // Add password

            const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
            if (!existing || existing.type !== 'CUSTOMER') {
                return res.status(404).json({ code: 99006, message: "Customer not found" });
            }

            const updateData = {
                fullName,
                phone,
                address,
                saleId: saleId ? parseInt(saleId) : null,
                isActive: isActive !== undefined ? isActive : existing.isActive
            };

            if (password) {
                const bcrypt = require('bcryptjs');
                updateData.password = await bcrypt.hash(password, 10);
            }

            const updated = await prisma.user.update({
                where: { id: parseInt(id) },
                data: updateData
            });

            // Invalidate Cache
            const keys = await redisClient.keys('customers:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            // Invalidate User Status Cache
            await redisClient.del(`user:status:${id}`);

            // Invalidate Transaction Cache (Customer info might be displayed there)
            const transactionKeys = await redisClient.keys('transactions:list:*');
            if (transactionKeys.length > 0) {
                await redisClient.del(transactionKeys);
            }

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: updated
            });

        } catch (error) {
            logger.error(`[UpdateCustomer] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    deleteCustomer: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.user.delete({ where: { id: parseInt(id) } });

            // Invalidate Cache
            const keys = await redisClient.keys('customers:list:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            // Invalidate User Status Cache
            await redisClient.del(`user:status:${id}`);

            // Invalidate Transaction Cache (Customer info might be displayed there)
            const transactionKeys = await redisClient.keys('transactions:list:*');
            if (transactionKeys.length > 0) {
                await redisClient.del(transactionKeys);
            }

            return res.status(200).json({
                code: 200,
                message: "Delete Success"
            });
        } catch (error) {
            logger.error(`[DeleteCustomer] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const customerId = parseInt(id);
            const { role } = req.user;
            const bcrypt = require('bcryptjs');

            const customer = await prisma.user.findUnique({
                where: { id: customerId, type: 'CUSTOMER' }
            });

            if (!customer) {
                return res.status(404).json({ code: 99006, message: 'Khách hàng không tồn tại' });
            }

            if (role !== 'ADMIN') {
                // ADMIN or SALE (if assigned)
                if (role === 'SALE' && customer.saleId !== req.user.userId) {
                    return res.status(403).json({ code: 99008, message: 'Không có quyền' });
                }
                if (role !== 'SALE' && role !== 'ADMIN') {
                    return res.status(403).json({ code: 99008, message: 'Không có quyền' });
                }
            }

            const newPassword = '123';
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: customerId },
                data: { password: hashedPassword }
            });

            // Invalidate Status Cache
            await redisClient.del(`user:status:${customerId}`);

            logger.info(`[CustomerResetPassword] By ${req.user.username} for CustomerID: ${id}`);

            res.json({
                code: 200,
                message: 'Reset mật khẩu thành công',
                data: { newPassword }
            });
        } catch (error) {
            logger.error('Customer Reset Password Error:', error);
            res.status(500).json({ code: 99500, message: 'Lỗi server' });
        }
    },

    getAllCustomersForExport: async (req, res) => {
        try {
            // No pagination, just simple list for export
            // Fetch relevant fields only
            const customers = await prisma.user.findMany({
                where: { type: 'CUSTOMER' },
                orderBy: { createdAt: 'desc' },
                select: {
                    username: true,
                    fullName: true,
                    phone: true,
                    address: true,
                    isActive: true
                }
            });

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: customers
            });
        } catch (error) {
            logger.error(`[GetAllCustomersForExport] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = customerController;
