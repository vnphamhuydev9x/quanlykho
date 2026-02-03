const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../backend/.env.test' }); // Load env test from backend folder

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

// Helper: Connect DBs
const connectTestInfra = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

const disconnectTestInfra = async () => {
    await prisma.$disconnect();
    if (redisClient.isOpen) {
        await redisClient.disconnect();
    }
};

// Helper: Clear Database
const resetDb = async () => {
    const tablenames = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');

    if (tables.length > 0) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
};

// Helper: Clear Redis
const resetRedis = async () => {
    if (redisClient.isOpen) {
        await redisClient.flushDb();
    }
};

// Helper: Generate Token
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret-key-123', {
        expiresIn: '1h',
    });
};

module.exports = {
    prisma,
    redisClient,
    BASE_URL,
    connectTestInfra,
    disconnectTestInfra,
    resetDb,
    resetRedis,
    generateToken
};
