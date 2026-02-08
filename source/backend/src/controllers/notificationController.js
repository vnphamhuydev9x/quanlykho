const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY_PREFIX = 'notifications:';

const notificationController = {
    getNotifications: async (req, res) => {
        try {
            const userId = req.user.userId;
            const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

            // Try to get from cache
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    return res.status(200).json({ code: 200, message: "Success (Cached)", data: JSON.parse(cachedData) });
                }
            } catch (err) {
                logger.error(`Redis error: ${err.message}`);
            }

            const notifications = await prisma.notification.findMany({
                where: { userId, isRead: false },
                orderBy: { createdAt: 'desc' }
            });

            // Set to cache
            try {
                await redisClient.set(cacheKey, JSON.stringify(notifications), { EX: 60 }); // Cache for 60 seconds
            } catch (err) {
                logger.error(`Redis error: ${err.message}`);
            }

            return res.status(200).json({ code: 200, message: "Success", data: notifications });
        } catch (error) {
            logger.error(`[GetNotifications] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const userId = req.user.userId;
            const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });

            // Invalidate cache
            try {
                await redisClient.del(cacheKey);
            } catch (err) {
                logger.error(`Redis error: ${err.message}`);
            }

            return res.status(200).json({ code: 200, message: "Success" });
        } catch (error) {
            logger.error(`[MarkAsRead] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: "Internal Server Error" });
        }
    }
};

module.exports = notificationController;
