require('dotenv').config();
const { createClient } = require('redis');

async function clearRedis() {
    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    await client.connect();
    await client.flushAll();
    console.log('Redis Cache Cleared');
    await client.quit();
}

clearRedis().catch(console.error);
