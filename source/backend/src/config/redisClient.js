const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error(`[Redis] Client Error: ${err.message}`));
redisClient.on('connect', () => logger.info('[Redis] Client Connected'));

// Tự động kết nối khi file được require
(async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
})();

// Safe wrapper — trả về null/[] thay vì throw khi Redis lỗi (vd: Upstash hết limit free tier).
// Giúp app vẫn chạy bình thường (fallback về DB) thay vì trả 500.
const safeRedisClient = {
    get: async (key) => {
        try {
            return await redisClient.get(key);
        } catch (err) {
            logger.warn(`[Redis] GET failed (key="${key}"): ${err.message}`);
            return null;
        }
    },
    set: async (key, value, options) => {
        try {
            await redisClient.set(key, value, options);
        } catch (err) {
            logger.warn(`[Redis] SET failed (key="${key}"): ${err.message}`);
        }
    },
    setEx: async (key, ttl, value) => {
        try {
            await redisClient.setEx(key, ttl, value);
        } catch (err) {
            logger.warn(`[Redis] SETEX failed (key="${key}"): ${err.message}`);
        }
    },
    keys: async (pattern) => {
        try {
            return await redisClient.keys(pattern);
        } catch (err) {
            logger.warn(`[Redis] KEYS failed (pattern="${pattern}"): ${err.message}`);
            return [];
        }
    },
    del: async (...args) => {
        try {
            return await redisClient.del(...args);
        } catch (err) {
            logger.warn(`[Redis] DEL failed: ${err.message}`);
        }
    },
    scanIterator: (options) => redisClient.scanIterator(options),
    get isOpen() { return redisClient.isOpen; },
};

module.exports = safeRedisClient;
