const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

let adminToken;
let customerToken;
let testEmployeeId;
let testCustomerId;
let testConditionId;
let createdProductCodeId;

beforeAll(async () => {
    await connectTestInfra();
});

afterAll(async () => {
    await disconnectTestInfra();
});

beforeEach(async () => {
    await resetDb();
    await resetRedis();

    // Setup Test Data manually since we do Black-Box Integration
    const adminUser = await prisma.user.create({
        data: {
            username: 'test_admin',
            password: 'hashedpassword',
            fullName: 'Test Admin',
            phone: '0987654321',
            type: 'EMPLOYEE',
            role: 'ADMIN',
            isActive: true,
            email: 'admin@test.com'
        }
    });

    const empUser = await prisma.user.create({
        data: {
            username: 'test_emp',
            password: 'hashedpassword',
            fullName: 'Test Employee',
            phone: '0987654322',
            type: 'EMPLOYEE',
            role: 'USER',
            isActive: true,
            email: 'emp@test.com'
        }
    });

    const cusUser = await prisma.user.create({
        data: {
            username: 'test_cus',
            password: 'hashedpassword',
            fullName: 'Test Customer',
            phone: '0987654323',
            type: 'CUSTOMER',
            role: 'USER',
            isActive: true,
            email: 'cus@test.com'
        }
    });

    const condition = await prisma.merchandiseCondition.create({
        data: { name_vi: 'Nhập kho test' }
    });

    // Tokens based on backend's jwt scheme
    adminToken = generateToken({ userId: adminUser.id, type: 'EMPLOYEE', role: 'ADMIN' });
    customerToken = generateToken({ userId: cusUser.id, type: 'CUSTOMER', role: 'USER' });

    testEmployeeId = empUser.id;
    testCustomerId = cusUser.id;
    testConditionId = condition.id;

    // Cache active status for auth middleware so it doesn't fail
    await redisClient.setEx(`user:status:${adminUser.id}`, 3600, 'ACTIVE');
    await redisClient.setEx(`user:status:${cusUser.id}`, 3600, 'ACTIVE');
});

describe('Product Code API - Master/Detail', () => {

    describe('Scenario 1: Validation - Relation Database', () => {
        it('should return 400 if employeeId not found', async () => {
            const res = await request(BASE_URL)
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
            const res = await request(BASE_URL)
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
            const res = await request(BASE_URL)
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
            const res = await request(BASE_URL)
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

        it('should return 400 if infoSource is invalid', async () => {
            const res = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderCode: 'ORD_TEST_02_INFO',
                    infoSource: 'ABC' // Invalid string
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid info source');
        });

        it('should create product code properly if infoSource is valid', async () => {
            const res = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderCode: 'ORD_TEST_02_INFO_VALID',
                    infoSource: 'Kho TQ'
                });
            expect(res.statusCode).toBe(201);
            expect(res.body.data.infoSource).toBe('Kho TQ');
        });
    });

    describe('Scenario 3: Business Logic - Auto Calculation & Scenario 5.1: List Caching', () => {
        it('should create product code and auto calculate total transport fee based on max values', async () => {
            const res = await request(BASE_URL)
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
            expect(res.statusCode).toBe(201);
            expect(res.body.data).toBeDefined();
            // Total should be Max(50k, 100k) + Max(500k, 200k) = 100k + 500k = 600000
            expect(Number(res.body.data.totalTransportFeeEstimate)).toBe(600000);
            expect(res.body.data.items).toBeDefined();
            expect(res.body.data.items.length).toBe(2);

            createdProductCodeId = res.body.data.id;
        });

        it('should invalidate list cache after creation', async () => {
            // First, trigger cache by GET
            await request(BASE_URL).get('/api/product-codes').set('Authorization', `Bearer ${adminToken}`);

            const keysListBefore = await redisClient.keys(`product-codes:list:*`);
            expect(keysListBefore.length).toBeGreaterThan(0);

            // Create
            await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    employeeId: testEmployeeId,
                    customerId: testCustomerId,
                    orderCode: 'ORD_CALC_04'
                });

            const keysListAfter = await redisClient.keys(`product-codes:list:*`);
            expect(keysListAfter.length).toBe(0);
        });
    });

    describe('Scenario 4: Master-Detail Database Consistency & Scenario 5.2: Detail Caching', () => {

        beforeEach(async () => {
            // Let's create an item to operate on
            const createRes = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    employeeId: testEmployeeId,
                    customerId: testCustomerId,
                    merchandiseConditionId: testConditionId,
                    orderCode: 'ORD_FOR_EDIT',
                    items: [
                        { productName: 'Item A', weight: 10, weightFee: 5000, volume: 1, volumeFee: 200000 }
                    ]
                });
            createdProductCodeId = createRes.body.data.id;
        });

        it('should update (PUT) product code, replacing items and recalculating transport fee', async () => {
            // First, trigger cache by GET
            await request(BASE_URL).get(`/api/product-codes/${createdProductCodeId}`).set('Authorization', `Bearer ${adminToken}`);
            const cacheKeyDetail = `product-codes:detail:${createdProductCodeId}`;
            const cachedBefore = await redisClient.get(cacheKeyDetail);
            expect(cachedBefore).not.toBeNull();

            // Perform Update
            const res = await request(BASE_URL)
                .put(`/api/product-codes/${createdProductCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderCode: 'ORD_CALC_03_UPDATED',
                    items: [
                        {
                            productName: 'Item 2 Updated',
                            weight: 10,
                            weightFee: 5000,
                            volume: 1,
                            volumeFee: 80000 // fee = 80k (MAX is 80k now)
                        }
                    ]
                });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.items.length).toBe(1);
            expect(Number(res.body.data.totalTransportFeeEstimate)).toBe(80000);
            expect(res.body.data.orderCode).toBe('ORD_CALC_03_UPDATED');

            // Verify detail cache is invalidated
            const cachedAfter = await redisClient.get(cacheKeyDetail);
            expect(cachedAfter).toBeNull();
        });

        it('should cascade soft delete and clear cache on DELETE API', async () => {
            // Re-fetch detail to populate cache
            await request(BASE_URL).get(`/api/product-codes/${createdProductCodeId}`).set('Authorization', `Bearer ${adminToken}`);
            const cacheKeyDetail = `product-codes:detail:${createdProductCodeId}`;

            // Delete
            const res = await request(BASE_URL)
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
        });
    });

});
