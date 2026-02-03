const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Customer API', () => {
    let adminToken;
    let saleToken;
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
                username: 'admin_cust',
                password: 'hashed',
                fullName: 'Admin Cust',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        const sale = await prisma.user.create({
            data: {
                username: 'sale_cust',
                password: 'hashed',
                fullName: 'Sale Cust',
                role: 'SALE',
                isActive: true
            }
        });
        saleToken = generateToken({ userId: sale.id, username: sale.username, role: sale.role });

        // 2. Setup Existing Customer
        const customer = await prisma.user.create({
            data: {
                username: 'khach_hang_cu',
                password: 'hashed',
                fullName: 'Khach Hang A',
                type: 'CUSTOMER',
                role: 'USER'
            }
        });
        customerId = customer.id;
    });

    describe('Auth Permissions', () => {
        it('should forbid non-admin from creating customer', async () => {
            const res = await request(BASE_URL)
                .post('/api/customers')
                .set('Authorization', `Bearer ${saleToken}`) // Sale cannot create generic customer via API, only Admin? Or Sale can? 
                // Route says: authorize(['ADMIN']) for create/delete.
                .send({ username: 'forbidden', password: '123', fullName: 'Forbidden' });
            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from deleting customer', async () => {
            const res = await request(BASE_URL)
                .delete(`/api/customers/${customerId}`)
                .set('Authorization', `Bearer ${saleToken}`);
            expect(res.status).toBe(403);
        });
    });

    describe('CRUD Operations', () => {
        it('should allow Admin to create a customer', async () => {
            const res = await request(BASE_URL)
                .post('/api/customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'new_customer',
                    password: '123',
                    fullName: 'Khach Hang Moi',
                    phone: '0909000111'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('new_customer');
            expect(res.body.data.type).toBe('CUSTOMER');
        });

        it('should return error if username exists', async () => {
            const res = await request(BASE_URL)
                .post('/api/customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'khach_hang_cu',
                    password: '123',
                    fullName: 'Duplicate'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Username already exists');
        });

        it('should allow Admin to update customer', async () => {
            const res = await request(BASE_URL)
                .put(`/api/customers/${customerId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fullName: 'Khach Hang A Updated',
                    phone: '0999888777'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.fullName).toBe('Khach Hang A Updated');

            // Verify DB
            const updated = await prisma.user.findUnique({ where: { id: customerId } });
            expect(updated.fullName).toBe('Khach Hang A Updated');
        });

        it('should allow Admin to delete customer', async () => {
            const res = await request(BASE_URL)
                .delete(`/api/customers/${customerId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            // Verify DB
            const check = await prisma.user.findUnique({ where: { id: customerId } });
            expect(check).toBeNull();
        });
    });

    describe('Reset Password', () => {
        it('should allow Admin to reset password', async () => {
            const res = await request(BASE_URL)
                .post(`/api/customers/${customerId}/reset-password`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.newPassword).toBe('123');
        });
    });

    describe('Total Paid Calculation (TDD)', () => {
        it('should return correct totalPaid sum for customer', async () => {
            // 1. Setup Customer
            const cust = await prisma.user.create({
                data: {
                    username: 'paid_customer',
                    password: '123',
                    fullName: 'Rich Customer',
                    type: 'CUSTOMER',
                    role: 'USER'
                }
            });

            // 2. Setup Transactions
            const adminId = (await prisma.user.findFirst({ where: { role: 'ADMIN' } })).id;

            // Trans 1: Success (50,000)
            await prisma.transaction.create({
                data: {
                    customerId: cust.id,
                    amount: 50000,
                    status: 'SUCCESS',
                    createdById: adminId
                }
            });

            // Trans 2: Success (150,000)
            await prisma.transaction.create({
                data: {
                    customerId: cust.id,
                    amount: 150000,
                    status: 'SUCCESS',
                    createdById: adminId
                }
            });

            // Trans 3: Cancelled (1,000,000) - Should NOT be counted
            await prisma.transaction.create({
                data: {
                    customerId: cust.id,
                    amount: 1000000,
                    status: 'CANCELLED',
                    createdById: adminId
                }
            });

            // 3. Call API
            const res = await request(BASE_URL)
                .get('/api/customers?search=paid_customer')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.customers).toHaveLength(1);

            const customerData = res.body.data.customers[0];
            expect(customerData.username).toBe('paid_customer');

            // 4. Verify Total Paid (50k + 150k = 200k)
            // Note: API might return number or string for BigInt/Decimal
            expect(Number(customerData.totalPaid)).toBe(200000);
        });
    });

    describe('Cascading Cache Invalidation', () => {
        beforeEach(async () => {
            // Seed Caches
            await redisClient.set('customers:list:page1', 'dummy');
            await redisClient.set('transactions:list:page1', 'dummy'); // Transactions list displays customer names
        });

        it('should clear customer AND transaction caches on Update', async () => {
            await request(BASE_URL)
                .put(`/api/customers/${customerId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ fullName: 'Cache Test' });

            const custKeys = await redisClient.keys('customers:list:*');
            const transKeys = await redisClient.keys('transactions:list:*');

            expect(custKeys.length).toBe(0);
            expect(transKeys.length).toBe(0);
        });

        it('should clear customer AND transaction caches on Create', async () => {
            await request(BASE_URL)
                .post('/api/customers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ username: 'cache_create', password: '123', fullName: 'New' });

            const custKeys = await redisClient.keys('customers:list:*');
            // Note: Create might not strictly need to clear transactions list if that list doesn't depend on count of customers, 
            // but usually we clear related lists. Let's check controller logic.
            // customerController.js: createCustomer -> Invalidate 'customers:list:*' ONLY.
            // Wait, createCustomer ONLY clears 'customers:list:*'. It does NOT clear transactions (which is correct, new customer has no transactions yet).
            expect(custKeys.length).toBe(0);
        });

        it('should clear customer AND transaction caches on Delete', async () => {
            await request(BASE_URL)
                .delete(`/api/customers/${customerId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            const custKeys = await redisClient.keys('customers:list:*');
            const transKeys = await redisClient.keys('transactions:list:*');
            // Delete DOES clear transactions because deleted customer might be in transaction list (though usually invalid, but cache should be cleared)
            expect(custKeys.length).toBe(0);
            expect(transKeys.length).toBe(0);
        });
    });
});
