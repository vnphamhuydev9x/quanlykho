const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Category API', () => {
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
                username: 'admin_cat',
                password: 'hashed',
                fullName: 'Admin Category',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        const user = await prisma.user.create({
            data: {
                username: 'user_cat',
                password: 'hashed',
                fullName: 'User Category',
                role: 'USER',
                isActive: true
            }
        });
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });
    });

    describe('Auth & Permission', () => {
        it('should forbid non-admin users from creating categories', async () => {
            const res = await request(BASE_URL)
                .post('/api/categories')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Cat Test' });

            expect(res.status).toBe(403);
        });

        it('should forbid non-admin users from updating categories', async () => {
            const cat = await prisma.category.create({ data: { name: 'Old Cat' } });

            const res = await request(BASE_URL)
                .put(`/api/categories/${cat.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'New Cat' });

            expect(res.status).toBe(403);
        });
    });

    describe('CRUD Operations', () => {
        it('should allow Admin to create a category', async () => {
            const res = await request(BASE_URL)
                .post('/api/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Dien Lanh',
                    status: 'AVAILABLE'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Dien Lanh');
            expect(res.body.data.status).toBe('AVAILABLE');

            // Verify DB
            const dbItem = await prisma.category.findFirst({ where: { name: 'Dien Lanh' } });
            expect(dbItem).toBeTruthy();
        });

        it('should return error if name is missing', async () => {
            const res = await request(BASE_URL)
                .post('/api/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'AVAILABLE' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('name is required');
        });

        it('should allow Admin to update a category', async () => {
            const cat = await prisma.category.create({ data: { name: 'May Giat', status: 'AVAILABLE' } });

            const res = await request(BASE_URL)
                .put(`/api/categories/${cat.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'May Giat - Tivi', status: 'UNAVAILABLE' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('May Giat - Tivi');
            expect(res.body.data.status).toBe('UNAVAILABLE');

            // Verify DB
            const updated = await prisma.category.findUnique({ where: { id: cat.id } });
            expect(updated.name).toBe('May Giat - Tivi');
        });

        it('should allow Admin to delete a category', async () => {
            const cat = await prisma.category.create({ data: { name: 'Rac', status: 'AVAILABLE' } });

            const res = await request(BASE_URL)
                .delete(`/api/categories/${cat.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            // Verify DB (Soft Delete) - Use raw query to bypass middleware
            const check = await prisma.$queryRaw`SELECT * FROM categories WHERE id = ${cat.id}`;
            expect(check.length).toBe(1);
            expect(check[0].deletedAt).not.toBeNull();

            // Verify API usage
            const listRes = await request(BASE_URL)
                .get('/api/categories')
                .set('Authorization', `Bearer ${adminToken}`);
            const found = listRes.body.data.items.find(c => c.id === cat.id);
            expect(found).toBeUndefined();
        });
    });

    describe('Redis Caching Logic', () => {
        it('should cache results on GET and invalidate on mutations', async () => {
            // 1. Initial State
            await prisma.category.create({ data: { name: 'Cache Test Cat', status: 'AVAILABLE' } });

            // 2. First GET (Cache Miss -> Set Cache)
            const res1 = await request(BASE_URL).get('/api/categories').set('Authorization', `Bearer ${userToken}`);
            expect(res1.status).toBe(200);

            // Check Redis Key exists
            // Key format: `categories:list:${page}:${limit}:${search}:${status}`
            // Default: 1:20::all
            const keysAfterGet = await redisClient.keys('categories:list:*');
            expect(keysAfterGet.length).toBeGreaterThan(0);

            // 3. Mutation (Create)
            await request(BASE_URL)
                .post('/api/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'New Cat Cache Invalid' });

            // 4. Verify Cache Cleared
            const keysAfterUpdate = await redisClient.keys('categories:list:*');
            expect(keysAfterUpdate.length).toBe(0);
        });
    });
});
