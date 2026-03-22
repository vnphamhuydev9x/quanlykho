/**
 * @module notification
 * @SD_Ref 03_1_notification_SD.md
 * @SD_Version SD-v1.0.0
 */
const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY_PREFIX = 'notifications:';

const notificationController = {
    getNotifications: async (req, res) => {
        try {
            const userId = req.user.userId;
            logger.info(`[GetNotifications] userId=${userId}`);
            const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

            // Try to get from cache
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    logger.info(`[GetNotifications] Cache HIT userId=${userId}`);
                    return res.status(200).json({ code: 200, message: "Success (Cached)", data: JSON.parse(cachedData) });
                }
            } catch (err) {
                logger.error(`Redis error: ${err.message}`);
            }

            logger.info(`[GetNotifications] Cache MISS userId=${userId} - querying DB`);
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

    // GET /notifications/list?page=1&limit=20 — tất cả noti (đã đọc + chưa đọc), sorted mới nhất
    getNotificationsList: async (req, res) => {
        try {
            const userId = req.user.userId;
            logger.info(`[GetNotificationsList] userId=${userId}`);
            const page  = Math.max(1, parseInt(req.query.page)  || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);

            const [total, items] = await Promise.all([
                prisma.notification.count({ where: { userId } }),
                prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
            ]);

            return res.status(200).json({ code: 200, message: 'Success', data: { items, total, page } });
        } catch (error) {
            logger.error(`[GetNotificationsList] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const userId = req.user.userId;
            logger.info(`[MarkAsRead] userId=${userId}`);
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
    },

    markOneAsRead: async (req, res) => {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            logger.info(`[MarkOneAsRead] userId=${userId} notificationId=${id}`);
            if (!id) return res.status(400).json({ code: 99011, message: 'Invalid id' });

            const notification = await prisma.notification.findFirst({ where: { id } });
            if (!notification) return res.status(404).json({ code: 404, message: 'Notification not found' });
            if (notification.userId !== userId) return res.status(403).json({ code: 99021, message: 'Forbidden' });

            if (!notification.isRead) {
                await prisma.notification.update({ where: { id }, data: { isRead: true } });
                // Invalidate unread cache
                try {
                    await redisClient.del(`${CACHE_KEY_PREFIX}${userId}`);
                } catch (err) {
                    logger.error(`Redis error: ${err.message}`);
                }
            }

            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[MarkOneAsRead] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },
};

module.exports = notificationController;
