const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

/**
 * Xóa tất cả Redis keys khớp với prefix (dùng SCAN để không block Redis).
 * An toàn cho production — thay thế cho KEYS pattern (anti-pattern).
 *
 * @param {string} prefix - Prefix cần xóa, ví dụ: 'inquiries:list:admin_sale:'
 */
const deleteByPrefix = async (prefix) => {
    try {
        const keys = [];
        for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
            keys.push(key);
        }
        if (keys.length > 0) await redisClient.del(...keys);
    } catch (err) {
        logger.warn(`[Redis] deleteByPrefix failed (prefix="${prefix}"): ${err.message}`);
    }
};

module.exports = { deleteByPrefix };
