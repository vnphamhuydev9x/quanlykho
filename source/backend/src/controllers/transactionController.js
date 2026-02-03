const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'transactions:list';

const transactionController = {
    getAllTransactions: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', status, createdById } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}:${status || 'all'}:${createdById || 'all'}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllTransactions] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllTransactions] Cache MISS');

            // 2. Build Query
            const where = {};

            if (search) {
                where.OR = [
                    { customer: { username: { contains: search, mode: 'insensitive' } } },
                    { customer: { fullName: { contains: search, mode: 'insensitive' } } },
                    { customer: { phone: { contains: search, mode: 'insensitive' } } },
                    { content: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (status) {
                where.status = status;
            }

            if (createdById) {
                where.createdById = parseInt(createdById);
            }

            // 3. Query DB
            const [transactions, total] = await prisma.$transaction([
                prisma.transaction.findMany({
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
                        creator: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true
                            }
                        }
                    }
                }),
                prisma.transaction.count({ where })
            ]);

            const responseData = {
                code: 200,
                message: "Success",
                data: {
                    items: transactions,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };

            // 4. Set Cache
            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData)); // Cache 5 mins

            return res.status(200).json(responseData);

        } catch (error) {
            logger.error(`[GetAllTransactions] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createTransaction: async (req, res) => {
        try {
            // ADMIN only (Middleware handled)
            const { customerId, amount, content } = req.body;
            const creatorId = req.user.userId;

            if (!customerId || !amount) {
                return res.status(400).json({ code: 99001, message: "Missing required fields" });
            }

            const newTransaction = await prisma.transaction.create({
                data: {
                    customerId: parseInt(customerId),
                    amount: parseFloat(amount),
                    content,
                    status: 'SUCCESS',
                    createdById: parseInt(creatorId)
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateTransaction] ID: ${newTransaction.id} by User: ${creatorId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: newTransaction
            });

        } catch (error) {
            logger.error(`[CreateTransaction] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    cancelTransaction: async (req, res) => {
        try {
            // ADMIN only
            const { id } = req.params;

            const transaction = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });

            if (!transaction) {
                return res.status(404).json({ code: 99006, message: "Transaction not found" });
            }

            if (transaction.status === 'CANCELLED') {
                return res.status(400).json({ code: 99009, message: "Transaction already cancelled" });
            }

            const updated = await prisma.transaction.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'CANCELLED'
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CancelTransaction] ID: ${id} by User: ${req.user.userId}`);

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: updated
            });

        } catch (error) {
            logger.error(`[CancelTransaction] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = transactionController;
