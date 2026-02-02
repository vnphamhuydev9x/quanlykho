const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');

const customerController = {
    // Helper to generate Customer Code (Deprecated - Using Manual Username)
    // generateCustomerCode: async () => { ... } 

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

            // Invalidate Cache? Customer list might not be cached yet, but good practice if we add it.
            // To be safe, we can trigger cache clearing if we had it.
            // Currently only employee list is cached in Redis code shown previously.

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
            const { page = 1, limit = 10, search } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = { type: 'CUSTOMER' };
            if (search) {
                where.OR = [
                    { customerCode: { contains: search, mode: 'insensitive' } },
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [customers, total] = await prisma.$transaction([
                prisma.user.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sale: {
                            select: { fullName: true } // Include Sale name
                        }
                    }
                }),
                prisma.user.count({ where })
            ]);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: {
                    customers,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
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
            return res.status(200).json({
                code: 200,
                message: "Delete Success"
            });
        } catch (error) {
            logger.error(`[DeleteCustomer] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = customerController;
