const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prisma');
const redisClient = require('../src/config/redisClient');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.test' });

// Mock uuid to avoid jest ESM export errors
jest.mock('uuid', () => ({ v4: () => '123456789' }));

let adminToken;
let customerToken;
let testEmployeeId;
let testCustomerId;
let testConditionId;
let createdProductCodeId;

// Mock Token Generator
const generateToken = (userId, type, role) => {
    return jwt.sign({ userId, type, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

beforeAll(async () => {
    // 1. Connect Redis
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    // 2. Prepare test data
    // 2. Prepare test data (findOrCreate)
    const getOrCreateUser = async (username, email, fullName, type, role, phone) => {
        let user = await prisma.user.findFirst({ where: { username } });
        if (!user) {
            user = await prisma.user.create({
                data: { username, email, fullName, type, role, phone, password: 'hashedpassword', isActive: true }
            });
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { deletedAt: null, isActive: true }
            });
        }
        return user;
    };

    const adminUser = await getOrCreateUser('test_admin', 'admin@test.com', 'Test Admin', 'EMPLOYEE', 'ADMIN', '0987654321');
    const empUser = await getOrCreateUser('test_emp', 'emp@test.com', 'Test Employee', 'EMPLOYEE', 'USER', '0987654322');
    const cusUser = await getOrCreateUser('test_cus', 'cus@test.com', 'Test Customer', 'CUSTOMER', 'USER', '0987654323');

    let condition = await prisma.merchandiseCondition.findFirst({ where: { id: 1 } });
    if (!condition) {
        condition = await prisma.merchandiseCondition.create({ data: { name_vi: 'Nhập kho test' } });
    }

    // Populate global IDs for testing
    adminToken = generateToken(adminUser.id, 'ADMIN', 'ADMIN');
    customerToken = generateToken(cusUser.id, 'CUSTOMER', 'USER');

    testEmployeeId = empUser.id;
    testCustomerId = cusUser.id;
    testConditionId = condition.id;

    // Cache active status for auth middleware
    await redisClient.setEx(`user:status:${adminUser.id}`, 3600, 'ACTIVE');
    await redisClient.setEx(`user:status:${cusUser.id}`, 3600, 'ACTIVE');
});

afterAll(async () => {
    // Clean up
    if (createdProductCodeId) {
        await prisma.productItem.deleteMany({ where: { productCodeId: createdProductCodeId } });
        await prisma.productCode.delete({ where: { id: createdProductCodeId } });
    }
    await prisma.user.deleteMany({
        where: { username: { in: ['test_admin', 'test_emp', 'test_cus'] } }
    });
    // Do not delete condition to not overlap with seeded data, maybe it's fine
    if (redisClient.isOpen) {
        await redisClient.disconnect();
    }
    await prisma.$disconnect();
});

describe('Product Code API - Master/Detail', () => {

    describe('Scenario 1: Validation - Relation Database', () => {
        it('should return 400 if employeeId not found', async () => {
            const res = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    employeeId: 9999, // Invalid
                    orderCode: 'ORD_TEST_01'
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Employee not found');
        });

        it('should return 400 if customerId not found', async () => {
            const res = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: 9999, // Invalid
                    orderCode: 'ORD_TEST_01'
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Customer not found');
        });

        it('should return 400 if merchandiseConditionId not found', async () => {
            const res = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    merchandiseConditionId: 9999, // Invalid
                    orderCode: 'ORD_TEST_01'
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Condition not found');
        });
    });

    describe('Scenario 2: Validation - Enum Hard-coded', () => {
        it('should return 400 if item packageUnit is invalid enum', async () => {
            const res = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderCode: 'ORD_TEST_02',
                    items: [
                        { productName: 'Item A', packageUnit: 'HU_HONG_NANG' } // Invalid enum
                    ]
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid package unit in items');
        });
    });

    describe('Scenario 3: Business Logic - Auto Calculation & Scenario 5.1: List Caching', () => {
        it('should create product code and auto calculate total transport fee based on max values', async () => {
            const res = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    employeeId: testEmployeeId,
                    customerId: testCustomerId,
                    merchandiseConditionId: testConditionId,
                    orderCode: 'ORD_CALC_03',
                    totalTransportFeeEstimate: 0, // FE hacked
                    items: [
                        {
                            productName: 'Item 1',
                            weight: 10,
                            weightFee: 5000, // fee = 50.000
                            volume: 0.5,
                            volumeFee: 200000 // fee = 100.000 (MAX is 100k)
                        },
                        {
                            productName: 'Item 2',
                            weight: 100,
                            weightFee: 5000, // fee = 500.000 (MAX is 500k)
                            volume: 1,
                            volumeFee: 200000 // fee = 200.000 
                        }
                    ]
                });
            if (res.statusCode !== 201) console.log(res.body);
            expect(res.statusCode).toBe(201);
            expect(res.body.data).toBeDefined();
            // Total should be Max(50k, 100k) + Max(500k, 200k) = 100k + 500k = 600000
            expect(Number(res.body.data.totalTransportFeeEstimate)).toBe(600000);
            expect(res.body.data.items).toBeDefined();
            expect(res.body.data.items.length).toBe(2);

            createdProductCodeId = res.body.data.id;
        });

        it('should have invalidated list cache after creation', async () => {
            const keysList = await redisClient.keys(`product-codes:list:*`);
            expect(keysList.length).toBe(0);
        });
    });

    describe('Scenario 4: Master-Detail Database Consistency & Scenario 5.2: Detail Caching', () => {
        it('should update (PUT) product code, replacing items and recalculating transport fee', async () => {
            // First, trigger cache by GET
            await request(app).get(`/api/product-codes/${createdProductCodeId}`).set('Authorization', `Bearer ${adminToken}`);
            const cacheKeyDetail = `product-codes:detail:${createdProductCodeId}`;
            const cachedBefore = await redisClient.get(cacheKeyDetail);
            expect(cachedBefore).not.toBeNull();

            // Perform Update
            const res = await request(app)
                .put(`/api/product-codes/${createdProductCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderCode: 'ORD_CALC_03_UPDATED',
                    items: [
                        {
                            productName: 'Item 2 Updated',
                            weight: 10, // Originally 100. weight fee = 10 * 5k = 50k
                            weightFee: 5000,
                            volume: 1,
                            volumeFee: 200000 // fee = 200k (MAX is 200k now)
                        }
                    ]
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.items.length).toBe(1);
            expect(Number(res.body.data.totalTransportFeeEstimate)).toBe(200000);
            expect(res.body.data.orderCode).toBe('ORD_CALC_03_UPDATED');

            // Verify detail cache is invalidated
            const cachedAfter = await redisClient.get(cacheKeyDetail);
            expect(cachedAfter).toBeNull();
        });

        it('should cascade soft delete and clear cache on DELETE API', async () => {
            // Re-fetch detail to populate cache
            await request(app).get(`/api/product-codes/${createdProductCodeId}`).set('Authorization', `Bearer ${adminToken}`);
            const cacheKeyDetail = `product-codes:detail:${createdProductCodeId}`;

            // Delete
            const res = await request(app)
                .delete(`/api/product-codes/${createdProductCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);

            // DB Verification (soft deleted)
            const checkDb = await prisma.productCode.findFirst({
                where: { id: parseInt(createdProductCodeId) }
            });
            expect(checkDb.deletedAt).not.toBeNull();

            // Cache validation
            const cachedAfter = await redisClient.get(cacheKeyDetail);
            expect(cachedAfter).toBeNull();

            // Unset so afterAll doesn't fail trying to hard delete soft deleted item
        });
    });

});
