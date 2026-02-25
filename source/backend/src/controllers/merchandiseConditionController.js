const { PrismaClient } = require('@prisma/client');
const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY = 'merchandiseConditions:list';
const SYSTEM_LOCKED_STATUS_NAME = 'Nhập kho'; // Không cho phép sửa tên, khóa hoặc xóa

const merchandiseConditionController = {
    getAllStatuses: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const parsedLimit = parseInt(limit);
            const skip = parsedLimit > 0 ? (parseInt(page) - 1) * parsedLimit : undefined;
            const take = parsedLimit > 0 ? parsedLimit : undefined;
            const cacheKey = `${CACHE_KEY}:${page}:${limit}:${search}`;

            // 1. Check Cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('[GetAllStatuses] Cache HIT');
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info('[GetAllStatuses] Cache MISS');

            // 2. Build Query
            const where = { deletedAt: null };
            if (search) {
                where.OR = [
                    { name_vi: { contains: search, mode: 'insensitive' } },
                    { name_zh: { contains: search, mode: 'insensitive' } }
                ];
            }

            // 3. Query DB
            const queryOptions = {
                where,
                orderBy: {
                    createdAt: 'asc' // Nhập kho thường tạo đầu tiên nên sẽ nằm trên cùng
                }
            };

            if (take !== undefined) {
                queryOptions.skip = skip;
                queryOptions.take = take;
            }

            const [statuses, total] = await prisma.$transaction([
                prisma.merchandiseCondition.findMany(queryOptions),
                prisma.merchandiseCondition.count({ where })
            ]);

            const responseData = {
                code: 200,
                message: "Success",
                data: {
                    items: statuses,
                    total,
                    page: parseInt(page),
                    totalPages: take ? Math.ceil(total / take) : 1
                }
            };

            // 4. Set Cache
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(responseData));

            return res.status(200).json(responseData);

        } catch (error) {
            logger.error(`[GetAllStatuses] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    createStatus: async (req, res) => {
        try {
            const { name_vi, name_zh, canLoadVehicle } = req.body;
            if (!name_vi) {
                return res.status(400).json({ code: 99001, message: "Tên tiếng Việt là bắt buộc" });
            }

            if (name_vi.trim().toLowerCase() === SYSTEM_LOCKED_STATUS_NAME.toLowerCase()) {
                return res.status(400).json({ code: 99009, message: "Tình trạng này là mặc định của hệ thống, không thể tạo thêm." });
            }

            const newStatus = await prisma.merchandiseCondition.create({
                data: {
                    name_vi,
                    name_zh,
                    canLoadVehicle: canLoadVehicle || false
                }
            });

            // Invalidate Cache
            const keys = await redisClient.keys(`${CACHE_KEY}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }

            logger.info(`[CreateStatus] Success ID: ${newStatus.id}`);
            return res.status(200).json({
                code: 200,
                message: "Success",
                data: newStatus
            });
        } catch (error) {
            logger.error(`[CreateStatus] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const targetId = parseInt(id);
            const { name_vi, name_zh, canLoadVehicle } = req.body;

            const existing = await prisma.merchandiseCondition.findUnique({ where: { id: targetId, deletedAt: null } });
            if (!existing) {
                return res.status(404).json({ code: 99006, message: "Status not found" });
            }

            // Protect System Default Status
            if (existing.name_vi === SYSTEM_LOCKED_STATUS_NAME) {
                if (name_vi !== undefined && name_vi !== SYSTEM_LOCKED_STATUS_NAME) {
                    return res.status(400).json({ code: 99009, message: "Không thể đổi tên tình trạng hệ thống Nhập kho" });
                }
            } else {
                if (name_vi && name_vi.trim().toLowerCase() === SYSTEM_LOCKED_STATUS_NAME.toLowerCase()) {
                    return res.status(400).json({ code: 99009, message: "Trùng tên với trạng thái hệ thống." });
                }
            }

            const updated = await prisma.merchandiseCondition.update({
                where: { id: targetId },
                data: {
                    name_vi: name_vi !== undefined ? name_vi : existing.name_vi,
                    name_zh: name_zh !== undefined ? name_zh : existing.name_zh,
                    canLoadVehicle: canLoadVehicle !== undefined ? canLoadVehicle : existing.canLoadVehicle
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
            logger.error(`[UpdateStatus] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    deleteStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const targetId = parseInt(id);

            const existing = await prisma.merchandiseCondition.findUnique({ where: { id: targetId } });
            if (!existing) {
                return res.status(404).json({ code: 99006, message: "Status not found" });
            }

            if (existing.name_vi === SYSTEM_LOCKED_STATUS_NAME) {
                return res.status(400).json({ code: 99009, message: "Không thể xóa tình trạng hệ thống Nhập kho" });
            }

            await prisma.merchandiseCondition.delete({ where: { id: targetId } });

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
            logger.error(`[DeleteStatus] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = merchandiseConditionController;
