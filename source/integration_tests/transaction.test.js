const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Transaction API', () => {
    let adminToken;
    let userToken;
    let adminId;
    let userId;
    let customerId;

    beforeAll(async () => {
        await connectTestInfra();
    });

    afterAll(async () => {
        await disconnectTestInfra();
    });

    beforeEach(async () => {
        await resetDb();
        await resetRedis();

        // 1. Setup Users
        const admin = await prisma.user.create({
            data: {
                username: 'admin_trans',
                password: 'hashed',
                fullName: 'Admin Trans',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminId = admin.id;
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        const user = await prisma.user.create({
            data: {
                username: 'user_trans',
                password: 'hashed',
                fullName: 'User Trans',
                role: 'USER',
                isActive: true
            }
        });
        userId = user.id;
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });

        // 2. Setup Customer (Target for transaction)
        const customer = await prisma.user.create({
            data: {
                username: 'khach_hang_1',
                password: 'hashed',
                fullName: 'Nguyen Van Khach',
                phone: '0988777666',
                role: 'USER',
                type: 'CUSTOMER'
            }
        });
        customerId = customer.id;
    });

    describe('Auth Permissions', () => {
        it('should forbid non-admin from creating transactions', async () => {
            const res = await request(BASE_URL)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    customerId: customerId,
                    amount: 500000,
                    content: 'Test Permission'
                });

            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from cancelling transactions', async () => {
            // Setup transaction first
            const trans = await prisma.transaction.create({
                data: {
                    customerId: customerId,
                    amount: 100000,
                    status: 'SUCCESS',
                    createdById: adminId // Use valid Admin ID
                }
            });

            const res = await request(BASE_URL)
                .post(`/api/transactions/${trans.id}/cancel`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Create Transaction', () => {
        it('should allow Admin to create transaction (SUCCESS default)', async () => {
            const res = await request(BASE_URL)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: customerId,
                    amount: 1500000,
                    content: 'Nap tien thang 10'
                });

            expect(res.status).toBe(200);
            // Safe decimal check (API might return number or string)
            expect(String(res.body.data.amount)).toBe('1500000');
            expect(res.body.data.status).toBe('SUCCESS');
            expect(res.body.data.customerId).toBe(customerId);

            // Verify DB
            const dbTrans = await prisma.transaction.findUnique({ where: { id: res.body.data.id } });
            expect(dbTrans).toBeTruthy();
        });

        it('should return error if missing customerId or amount', async () => {
            const res = await request(BASE_URL)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ content: 'Missing info' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Missing required fields');
        });
    });

    describe('Cancel Transaction', () => {
        it('should allow Admin to cancel transaction', async () => {
            // Setup
            const trans = await prisma.transaction.create({
                data: {
                    customerId: customerId,
                    amount: 200000,
                    status: 'SUCCESS',
                    createdById: adminId
                }
            });

            const res = await request(BASE_URL)
                .post(`/api/transactions/${trans.id}/cancel`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('CANCELLED');

            // Verify DB
            const updated = await prisma.transaction.findUnique({ where: { id: trans.id } });
            expect(updated.status).toBe('CANCELLED');
        });

        it('should return error if transaction already cancelled', async () => {
            const trans = await prisma.transaction.create({
                data: {
                    customerId: customerId,
                    amount: 200000,
                    status: 'CANCELLED',
                    createdById: adminId
                }
            });

            const res = await request(BASE_URL)
                .post(`/api/transactions/${trans.id}/cancel`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already cancelled');
        });
    });

    describe('Search & Cache', () => {
        it('should search by Customer Phone', async () => {
            // Create Transaction
            await prisma.transaction.create({
                data: {
                    customerId: customerId,
                    amount: 500000,
                    status: 'SUCCESS',
                    createdById: adminId,
                    content: 'Test Search'
                }
            });

            // Search by Phone '0988777666'
            const res = await request(BASE_URL)
                .get('/api/transactions?search=0988777666')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].customer.fullName).toBe('Nguyen Van Khach');
        });

        it('should invalidate cache on Create', async () => {
            // 1. Seed Cache
            await redisClient.set('transactions:list:1:20::all:all', 'dummy');

            // 2. Create Trans
            await request(BASE_URL)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ customerId, amount: 100 });

            // 3. Verify Cache Gone
            const keys = await redisClient.keys('transactions:list:*');
            expect(keys.length).toBe(0);
        });
    });
});
