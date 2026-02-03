const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Warehouse API (Black Box)', () => {
    let adminToken;
    let userToken;

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
                username: 'admin_test',
                password: 'hashed_password',
                fullName: 'Admin Test',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        const user = await prisma.user.create({
            data: {
                username: 'user_test',
                password: 'hashed_password',
                fullName: 'User Test',
                role: 'USER',
                isActive: true
            }
        });
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });
    });

    // --- 0. Auth Permissions ---
    describe('Auth Permissions', () => {
        it('should forbid non-admin from creating warehouse', async () => {
            const res = await request(BASE_URL)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Kho Forbidden', status: 'AVAILABLE' });
            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from deleting warehouse', async () => {
            const wh = await prisma.warehouse.create({ data: { name: 'Kho Test Auth', status: 'AVAILABLE' } });
            const res = await request(BASE_URL)
                .delete(`/api/warehouses/${wh.id}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(403);
        });
    });

    // --- 1. CRUD Tests ---
    describe('CRUD Operations', () => {
        it('POST /api/warehouses - Admin should create warehouse successfully', async () => {
            const res = await request(BASE_URL)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Kho Ha Noi',
                    status: 'AVAILABLE'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('Kho Ha Noi');
            expect(res.body.data.status).toBe('AVAILABLE');

            // Verify DB
            const dbItem = await prisma.warehouse.findFirst({ where: { name: 'Kho Ha Noi' } });
            expect(dbItem).toBeTruthy();
        });

        it('POST /api/warehouses - Should return error if name is missing', async () => {
            const res = await request(BASE_URL)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'AVAILABLE' }); // No name

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Tên kho là bắt buộc');
        });

        it('POST /api/warehouses - Should return error if name is duplicate', async () => {
            // Setup existing
            await prisma.warehouse.create({ data: { name: 'Kho Trung Tam', status: 'AVAILABLE' } });

            const res = await request(BASE_URL)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Kho TRUNG TAM' }); // Case insensitive check

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('đã tồn tại');
        });

        it('PUT /api/warehouses/:id - Admin should update warehouse', async () => {
            const wh = await prisma.warehouse.create({ data: { name: 'Kho Cu', status: 'AVAILABLE' } });

            const res = await request(BASE_URL)
                .put(`/api/warehouses/${wh.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Kho Moi', status: 'UNAVAILABLE' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Kho Moi');
            expect(res.body.data.status).toBe('UNAVAILABLE');

            // Verify DB
            const updated = await prisma.warehouse.findUnique({ where: { id: wh.id } });
            expect(updated.name).toBe('Kho Moi');
        });

        it('DELETE /api/warehouses/:id - Admin should delete warehouse', async () => {
            const wh = await prisma.warehouse.create({ data: { name: 'Kho Can Xoa', status: 'AVAILABLE' } });

            const res = await request(BASE_URL)
                .delete(`/api/warehouses/${wh.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            // Verify DB
            const check = await prisma.warehouse.findUnique({ where: { id: wh.id } });
            expect(check).toBeNull();
        });
    });

    // --- 2. Filter & Search Tests ---
    describe('Filter & Search', () => {
        beforeEach(async () => {
            await prisma.warehouse.createMany({
                data: [
                    { name: 'Kho A Ha Noi', status: 'AVAILABLE' },
                    { name: 'Kho B Da Nang', status: 'UNAVAILABLE' },
                    { name: 'Kho C HCM', status: 'AVAILABLE' }
                ]
            });
        });

        it('GET /api/warehouses - Should list all', async () => {
            const res = await request(BASE_URL)
                .get('/api/warehouses')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(3);
        });

        it('GET /api/warehouses?search=Ha Noi - Should filter by name', async () => {
            const res = await request(BASE_URL)
                .get('/api/warehouses?search=Ha Noi')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('Kho A Ha Noi');
        });

        it('GET /api/warehouses?status=FULL - Should filter by status', async () => {
            const res = await request(BASE_URL)
                .get('/api/warehouses?status=UNAVAILABLE')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('Kho B Da Nang');
        });
    });

    // --- 3. Caching Tests ---
    describe('Redis Caching Logic', () => {
        it('should cache results on GET and invalidate on mutations', async () => {
            // 1. Initial State
            await prisma.warehouse.create({ data: { name: 'Kho Cache Test', status: 'AVAILABLE' } });

            // 2. First GET (Cache Miss -> Set Cache)
            const res1 = await request(BASE_URL).get('/api/warehouses').set('Authorization', `Bearer ${userToken}`);
            expect(res1.status).toBe(200);

            // Check Redis Key exists
            // Key format from controller: `warehouses:list:${search || 'all'}:${status || 'all'}`
            const keysAfterGet = await redisClient.keys('warehouses:list:all:all');
            expect(keysAfterGet.length).toBe(1);

            // 3. Mutation (Update)
            const wh = await prisma.warehouse.findFirst({ where: { name: 'Kho Cache Test' } });
            await request(BASE_URL)
                .put(`/api/warehouses/${wh.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Kho Cache Updated' });

            // 4. Verify Cache Cleared
            // Controller logic: await redisClient.keys('warehouses:list:*') then del
            const keysAfterUpdate = await redisClient.keys('warehouses:list:*');
            expect(keysAfterUpdate.length).toBe(0);

            // 5. Second GET (Should verify DB data, not old cache)
            const res2 = await request(BASE_URL).get('/api/warehouses').set('Authorization', `Bearer ${userToken}`);
            expect(res2.body.data[0].name).toBe('Kho Cache Updated');
        });
    });
});
