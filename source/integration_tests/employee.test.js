const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Employee API & Cascading Invalidation', () => {
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

        // Setup Admin
        const admin = await prisma.user.create({
            data: {
                username: 'admin_emp',
                password: 'hashed_password',
                fullName: 'Admin Employee',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        // Setup Normal User
        const user = await prisma.user.create({
            data: {
                username: 'user_emp',
                password: 'hashed_password',
                fullName: 'User Employee',
                role: 'USER',
                isActive: true
            }
        });
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });
    });

    describe('Auth & Permission', () => {
        it('should forbid non-admin users from creating employees', async () => {
            const res = await request(BASE_URL)
                .post('/api/employees')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'new_employee',
                    password: '123',
                    fullName: 'New Emp',
                    email: 'test@email.com',
                    role: 'SALE'
                });

            expect(res.status).toBe(403);
        });
    });

    describe('CRUD Operations', () => {
        it('should allow Admin to create a new employee', async () => {
            const res = await request(BASE_URL)
                .post('/api/employees')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'sale_staff',
                    password: '123',
                    fullName: 'Nhan Vien Sale',
                    email: 'sale@test.com',
                    role: 'SALE'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('sale_staff');

            // Verify DB
            const dbUser = await prisma.user.findUnique({ where: { username: 'sale_staff' } });
            expect(dbUser).toBeTruthy();
            expect(dbUser.role).toBe('SALE');
            expect(dbUser.role).toBe('SALE');
        });

        it('should return error if username already exists', async () => {
            await prisma.user.create({
                data: {
                    username: 'exist_emp',
                    password: '123',
                    fullName: 'Exist',
                    role: 'SALE',
                    type: 'EMPLOYEE'
                }
            });

            const res = await request(BASE_URL)
                .post('/api/employees')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'exist_emp',
                    password: '123',
                    fullName: 'Duplicate',
                    role: 'SALE'
                });

            expect(res.status).toBe(400); // Or 409 depending on implementation
            expect(res.body.message).toMatch(/exists|tồn tại/i);
        });

        it('should allow Admin to list employees', async () => {
            // Seed one employee
            await prisma.user.create({
                data: {
                    username: 'sale_1',
                    password: '123',
                    fullName: 'Sale 1',
                    role: 'SALE',
                    type: 'EMPLOYEE'
                }
            });

            const res = await request(BASE_URL)
                .get('/api/employees')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.employees.length).toBeGreaterThanOrEqual(1); // Admin + Sale
        });
    });

    describe('Cascading Cache Invalidation (CRITICAL)', () => {
        let employeeId;

        beforeEach(async () => {
            // Create target employee
            const emp = await prisma.user.create({
                data: {
                    username: 'target_emp',
                    password: '123',
                    fullName: 'Target',
                    role: 'SALE',
                    type: 'EMPLOYEE'
                }
            });
            employeeId = emp.id;

            // Seed Cache Keys to simulate cached lists
            await redisClient.set('employees:list:page1', 'dummy-data');
            await redisClient.set('customers:list:page1', 'dummy-data');
            await redisClient.set('transactions:list:page1', 'dummy-data');

            // Verify keys exist
            expect(await redisClient.exists('employees:list:page1')).toBe(1);
            expect(await redisClient.exists('customers:list:page1')).toBe(1);
            expect(await redisClient.exists('transactions:list:page1')).toBe(1);
        });

        it('should clear ALL related caches (Employees, Customers, Transactions) when an Employee is UPDATED', async () => {
            // Action: Update Employee
            const res = await request(BASE_URL)
                .put(`/api/employees/${employeeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ fullName: 'Updated Name' });

            expect(res.status).toBe(200);

            // Verify ALL expected keys are gone
            const empKeys = await redisClient.keys('employees:list:*');
            const custKeys = await redisClient.keys('customers:list:*');
            const transKeys = await redisClient.keys('transactions:list:*');

            expect(empKeys.length).toBe(0);
            expect(custKeys.length).toBe(0);
            expect(transKeys.length).toBe(0);
        });

        it('should clear ALL related caches when an Employee is DELETED', async () => {
            // Action: Delete Employee
            const res = await request(BASE_URL)
                .delete(`/api/employees/${employeeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            // Verify ALL expected keys are gone
            const empKeys = await redisClient.keys('employees:list:*');
            const custKeys = await redisClient.keys('customers:list:*');
            const transKeys = await redisClient.keys('transactions:list:*');

            expect(empKeys.length).toBe(0);
            expect(custKeys.length).toBe(0);
            expect(transKeys.length).toBe(0);
        });
    });
});
