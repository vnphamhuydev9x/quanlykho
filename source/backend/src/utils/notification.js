const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const CACHE_KEY_PREFIX = 'notifications:';

const createNotification = async (userId, productCodeIds) => {
    try {
        if (!userId || !productCodeIds || productCodeIds.length === 0) return;

        const content = `Hàng hóa của bạn vừa được cập nhật (ID: ${productCodeIds.join(' ')})`;

        await prisma.notification.create({
            data: {
                userId,
                content,
                isRead: false
            }
        });

        // Invalidate cache
        try {
            await redisClient.del(`${CACHE_KEY_PREFIX}${userId}`);
        } catch (err) {
            logger.error(`Redis error: ${err.message}`);
        }
    } catch (error) {
        logger.error(`[CreateNotification] Error: ${error.message}`);
    }
};

module.exports = { createNotification };
