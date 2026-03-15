const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const { NOTIFICATION_TYPE } = require('../constants/enums');

const CACHE_KEY_PREFIX = 'notifications:';

const createNotification = async (userId, productCodeIds) => {
    try {
        if (!userId || !productCodeIds || productCodeIds.length === 0) return;

        const content = `Hàng hóa của bạn vừa được cập nhật (ID: ${productCodeIds.join(' ')})`;

        await prisma.notification.create({
            data: {
                userId,
                content,
                isRead: false,
                type: NOTIFICATION_TYPE.PRODUCT_CODE,
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

/**
 * Gửi notification đến nhiều user cùng lúc (dùng cho inquiry)
 * @param {number[]} userIds - Danh sách userId nhận thông báo
 * @param {string} content - Nội dung thông báo
 * @param {number} inquiryId - ID của inquiry liên quan
 */
const createInquiryNotification = async (userIds, content, inquiryId) => {
    try {
        if (!userIds || userIds.length === 0) return;

        await prisma.notification.createMany({
            data: userIds.map(userId => ({
                userId,
                content,
                isRead: false,
                type: NOTIFICATION_TYPE.INQUIRY,
                refId: inquiryId,
            }))
        });

        // Invalidate cache cho tất cả user được notify
        try {
            await Promise.all(
                userIds.map(userId => redisClient.del(`${CACHE_KEY_PREFIX}${userId}`))
            );
        } catch (err) {
            logger.error(`Redis error: ${err.message}`);
        }
    } catch (error) {
        logger.error(`[CreateInquiryNotification] Error: ${error.message}`);
    }
};

module.exports = { createNotification, createInquiryNotification };
