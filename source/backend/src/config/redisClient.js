const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Tự động kết nối khi file được require
(async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
})();

module.exports = redisClient;
