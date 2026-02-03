const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'categories:list';

const categoryController = {
    getAllCategories: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', status } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}:${status || 'all'}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllCategories] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllCategories] Cache MISS');

            // 2. Build Query
            const where = {};
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }
            if (status) {
                where.status = status;
            }

            // 3. Query DB
            const [categories, total] = await prisma.$transaction([
                prisma.category.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.category.count({ where })
            ]);

            const responseData = {
                code: 200,
                message: "Success",
                data: {
                    items: categories, // Using 'items' standard for array
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };

            // 4. Set Cache
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(responseData));

            return res.status(200).json(responseData);

        } catch (error) {
            logger.error(`[GetAllCategories] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createCategory: async (req, res) => {
        try {
            const { name, status } = req.body;
            if (!name) {
                return res.status(400).json({ code: 99001, message: "Category name is required" });
            }

            const newCategory = await prisma.category.create({
                data: {
                    name,
                    status: status || 'AVAILABLE'
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateCategory] Success ID: ${newCategory.id}`);
            return res.status(200).json({
                code: 200,
                message: "Success",
                data: newCategory
            });
        } catch (error) {
            logger.error(`[CreateCategory] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, status } = req.body;

            const existing = await prisma.category.findUnique({ where: { id: parseInt(id) } });
            if (!existing) {
                return res.status(404).json({ code: 99006, message: "Category not found" });
            }

            const updated = await prisma.category.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    status
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            return res.status(200).json({
                code: 200,
                message: "Success",
                data: updated
            });
        } catch (error) {
            logger.error(`[UpdateCategory] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;

            await prisma.category.delete({ where: { id: parseInt(id) } });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            return res.status(200).json({
                code: 200,
                message: "Success"
            });
        } catch (error) {
            logger.error(`[DeleteCategory] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = categoryController;
