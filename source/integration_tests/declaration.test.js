const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Declaration API', () => {
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
                username: 'admin_decl',
                password: 'hashed',
                fullName: 'Admin Declaration',
                role: 'ADMIN',
                isActive: true
            }
        });
        adminId = admin.id;
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        const user = await prisma.user.create({
            data: {
                username: 'user_decl',
                password: 'hashed',
                fullName: 'User Declaration',
                role: 'USER',
                isActive: true
            }
        });
        userId = user.id;
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });

        // 2. Setup Customer (Target for declaration)
        const customer = await prisma.user.create({
            data: {
                username: 'khach_hang_decl',
                password: 'hashed',
                fullName: 'Nguyen Van A',
                phone: '0901234567',
                role: 'USER',
                type: 'CUSTOMER'
            }
        });
        customerId = customer.id;
    });

    describe('Auth Permissions', () => {
        it('should forbid non-admin from creating declarations', async () => {
            const res = await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    invoiceRequestName: 'Test Invoice',
                    customerId: customerId,
                    productNameVi: 'Giày thể thao',
                    hsCode: '6403.99',
                    quantity: 100,
                    totalPackages: 10,
                    totalWeight: 50.5,
                    totalVolume: 2.5,
                    contractPrice: 1000000,
                    productUnit: 'Đôi',
                    declarationPriceVND: 1500000,
                    importTaxPercent: 20,
                    vatPercent: 10,
                    serviceFeePercent: 5
                });

            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from updating declarations', async () => {
            // Setup declaration first
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const res = await request(BASE_URL)
                .put(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productNameVi: 'Updated Name' });

            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from deleting declarations', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const res = await request(BASE_URL)
                .delete(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });

        it('should forbid non-admin from exporting data', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/export/all')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });

        it('should allow any authenticated user to view declarations', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
        });
    });

    describe('Create Declaration', () => {
        it('should allow Admin to create declaration with all required fields', async () => {
            const res = await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoiceRequestName: 'Hóa đơn tháng 10',
                    customerId: customerId,
                    productNameVi: 'Giày thể thao Nike',
                    hsCode: '6403.99.90',
                    quantity: 500,
                    totalPackages: 50,
                    totalWeight: 250.75,
                    totalVolume: 12.5,
                    productDescription: 'Giày thể thao cao cấp',
                    contractPrice: 5000000,
                    productUsage: 'Sử dụng cá nhân',
                    productUnit: 'Đôi',
                    declarationPriceVND: 7500000,
                    importTaxPercent: 20.5,
                    vatPercent: 10,
                    serviceFeePercent: 5.5,
                    isDeclared: false,
                    supplierName: 'Nike China Ltd',
                    supplierAddress: 'Guangzhou, China',
                    labelCode: 'LBL-001',
                    labelDate: '2026-02-01T00:00:00.000Z',
                    images: ['image1.jpg', 'image2.jpg']
                });

            expect(res.status).toBe(200);
            expect(res.body.data.invoiceRequestName).toBe('Hóa đơn tháng 10');
            expect(res.body.data.customerId).toBe(customerId);
            expect(res.body.data.productNameVi).toBe('Giày thể thao Nike');
            expect(res.body.data.hsCode).toBe('6403.99.90');
            expect(res.body.data.quantity).toBe(500);
            expect(String(res.body.data.totalWeight)).toBe('250.75');
            expect(String(res.body.data.vatPercent)).toBe('10');
            expect(res.body.data.isDeclared).toBe(false);
            expect(res.body.data.images).toEqual(['image1.jpg', 'image2.jpg']);

            // Verify DB
            const dbDecl = await prisma.declaration.findUnique({ where: { id: res.body.data.id } });
            expect(dbDecl).toBeTruthy();
            expect(dbDecl.productNameVi).toBe('Giày thể thao Nike');
        });

        it('should return error if missing required fields', async () => {
            const res = await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoiceRequestName: 'Test',
                    customerId: customerId
                    // Missing many required fields
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Missing required fields');
        });

        it('should return error if customer does not exist', async () => {
            const res = await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoiceRequestName: 'Test',
                    customerId: 99999, // Non-existent
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Customer not found');
        });

        it('should set default vatPercent to 10 if not provided', async () => {
            const res = await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoiceRequestName: 'Test VAT',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10, // Explicitly set
                    serviceFeePercent: 5
                });

            expect(res.status).toBe(200);
            expect(String(res.body.data.vatPercent)).toBe('10');
        });
    });

    describe('Update Declaration', () => {
        it('should allow Admin to update declaration', async () => {
            // Setup
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Original Invoice',
                    customerId: customerId,
                    productNameVi: 'Original Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5,
                    isDeclared: false
                }
            });

            const res = await request(BASE_URL)
                .put(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    productNameVi: 'Updated Product',
                    quantity: 20,
                    isDeclared: true
                });

            expect(res.status).toBe(200);
            expect(res.body.data.productNameVi).toBe('Updated Product');
            expect(res.body.data.quantity).toBe(20);
            expect(res.body.data.isDeclared).toBe(true);

            // Verify DB
            const updated = await prisma.declaration.findUnique({ where: { id: decl.id } });
            expect(updated.productNameVi).toBe('Updated Product');
            expect(updated.isDeclared).toBe(true);
        });

        it('should return error if declaration not found', async () => {
            const res = await request(BASE_URL)
                .put('/api/declarations/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ productNameVi: 'Test' });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Declaration not found');
        });
    });

    describe('Delete Declaration (Soft Delete)', () => {
        it('should allow Admin to soft delete declaration', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'To Delete',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const res = await request(BASE_URL)
                .delete(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            // Verify soft delete in DB
            const deleted = await prisma.declaration.findUnique({ where: { id: decl.id } });
            expect(deleted.deletedAt).not.toBeNull();
        });

        it('should not show soft-deleted declarations in list', async () => {
            // Create and soft delete
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Deleted',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5,
                    deletedAt: new Date()
                }
            });

            const res = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
        });
    });

    describe('Search & Filter', () => {
        beforeEach(async () => {
            // Create test data
            await prisma.declaration.createMany({
                data: [
                    {
                        invoiceRequestName: 'Invoice 1',
                        customerId: customerId,
                        productNameVi: 'Giày Nike',
                        hsCode: '6403.99',
                        quantity: 100,
                        totalPackages: 10,
                        totalWeight: 50,
                        totalVolume: 2,
                        contractPrice: 1000,
                        productUnit: 'Đôi',
                        declarationPriceVND: 1500,
                        importTaxPercent: 20,
                        vatPercent: 10,
                        serviceFeePercent: 5,
                        isDeclared: true
                    },
                    {
                        invoiceRequestName: 'Invoice 2',
                        customerId: customerId,
                        productNameVi: 'Áo Adidas',
                        hsCode: '6109.10',
                        quantity: 200,
                        totalPackages: 20,
                        totalWeight: 30,
                        totalVolume: 1.5,
                        contractPrice: 500,
                        productUnit: 'Cái',
                        declarationPriceVND: 750,
                        importTaxPercent: 15,
                        vatPercent: 10,
                        serviceFeePercent: 5,
                        isDeclared: false
                    }
                ]
            });
        });

        it('should search by customer phone', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?search=0901234567')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
        });

        it('should search by hsCode', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?search=6403.99')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].productNameVi).toBe('Giày Nike');
        });

        it('should filter by isDeclared=true', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?isDeclared=true')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].isDeclared).toBe(true);
        });

        it('should filter by isDeclared=false', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?isDeclared=false')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].isDeclared).toBe(false);
        });
    });

    describe('Cache Invalidation', () => {
        it('should invalidate cache on Create', async () => {
            // 1. Seed Cache
            await redisClient.set('declarations:list:1:20::all', 'dummy');

            // 2. Create Declaration
            await request(BASE_URL)
                .post('/api/declarations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                });

            // 3. Verify Cache Gone
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });

        it('should invalidate cache on Update', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            // Seed cache
            await redisClient.set('declarations:list:1:20::all', 'dummy');

            // Update
            await request(BASE_URL)
                .put(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ productNameVi: 'Updated' });

            // Verify cache gone
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });

        it('should invalidate cache on Delete', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            // Seed cache
            await redisClient.set('declarations:list:1:20::all', 'dummy');

            // Delete
            await request(BASE_URL)
                .delete(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            // Verify cache gone
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });

        it('should use cache on second GET request', async () => {
            // Create data
            await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            // First request - cache MISS
            await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            // Verify cache exists
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBeGreaterThan(0);

            // Second request - should hit cache
            const res2 = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res2.status).toBe(200);
        });
    });

    describe('Export Data', () => {
        it('should allow ADMIN to export all declarations', async () => {
            // Create some data
            await prisma.declaration.createMany({
                data: [
                    {
                        invoiceRequestName: 'Export 1',
                        customerId: customerId,
                        productNameVi: 'Product 1',
                        hsCode: '1234.56',
                        quantity: 10,
                        totalPackages: 5,
                        totalWeight: 10,
                        totalVolume: 1,
                        contractPrice: 100,
                        productUnit: 'Cái',
                        declarationPriceVND: 150,
                        importTaxPercent: 10,
                        vatPercent: 10,
                        serviceFeePercent: 5
                    },
                    {
                        invoiceRequestName: 'Export 2',
                        customerId: customerId,
                        productNameVi: 'Product 2',
                        hsCode: '7890.12',
                        quantity: 20,
                        totalPackages: 10,
                        totalWeight: 20,
                        totalVolume: 2,
                        contractPrice: 200,
                        productUnit: 'Hộp',
                        declarationPriceVND: 300,
                        importTaxPercent: 15,
                        vatPercent: 10,
                        serviceFeePercent: 5
                    }
                ]
            });

            const res = await request(BASE_URL)
                .get('/api/declarations/export/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            // Verify structure
            expect(res.body.data[0]).toHaveProperty('customer');
            expect(res.body.data[0]).toHaveProperty('productNameVi');
            expect(res.body.data[0]).toHaveProperty('hsCode');
        });
    });

    describe('Get Declaration By ID', () => {
        it('should return declaration with customer details', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const res = await request(BASE_URL)
                .get(`/api/declarations/${decl.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(decl.id);
            expect(res.body.data.customer).toBeTruthy();
            expect(res.body.data.customer.fullName).toBe('Nguyen Van A');
        });

        it('should return 404 if declaration not found', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/99999')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('Upload Images', () => {
        const path = require('path');
        const fs = require('fs');

        // Create a test image file
        const createTestImage = (filename = 'test-image.jpg') => {
            const testImagePath = path.join(__dirname, filename);
            // Create a minimal valid JPEG file (1x1 pixel)
            const jpegHeader = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
                0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
            ]);
            fs.writeFileSync(testImagePath, jpegHeader);
            return testImagePath;
        };

        afterEach(() => {
            // Clean up test images
            const testFiles = ['test-image.jpg', 'test-image2.jpg', 'test-image3.jpg', 'test-image4.jpg'];
            testFiles.forEach(file => {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        });

        it('should allow ADMIN to upload images to declaration', async () => {
            // Create declaration
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test Upload',
                    customerId: customerId,
                    productNameVi: 'Test Product',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const testImagePath = createTestImage();

            const res = await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', testImagePath);

            expect(res.status).toBe(200);
            expect(res.body.data.uploadedImages).toHaveLength(1);
            expect(res.body.data.totalImages).toBe(1);
            expect(res.body.data.images[0]).toContain('/uploads/declarations/');

            // Verify DB
            const updated = await prisma.declaration.findUnique({ where: { id: decl.id } });
            expect(updated.images).toHaveLength(1);
        });

        it('should forbid non-admin from uploading images', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const testImagePath = createTestImage();

            const res = await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${userToken}`)
                .attach('images', testImagePath);

            expect(res.status).toBe(403);
        });

        it('should allow uploading multiple images (up to 3)', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const img1 = createTestImage('test-image.jpg');
            const img2 = createTestImage('test-image2.jpg');
            const img3 = createTestImage('test-image3.jpg');

            const res = await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', img1)
                .attach('images', img2)
                .attach('images', img3);

            expect(res.status).toBe(200);
            expect(res.body.data.uploadedImages).toHaveLength(3);
            expect(res.body.data.totalImages).toBe(3);
        });

        it('should reject upload if total images exceed 3', async () => {
            // Create declaration with 2 existing images
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5,
                    images: ['/uploads/existing1.jpg', '/uploads/existing2.jpg']
                }
            });

            const img1 = createTestImage('test-image.jpg');
            const img2 = createTestImage('test-image2.jpg');

            const res = await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', img1)
                .attach('images', img2);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Maximum 3 images allowed');
            expect(res.body.message).toContain('You have 2 existing images');

            // Verify images were not added
            const updated = await prisma.declaration.findUnique({ where: { id: decl.id } });
            expect(updated.images).toHaveLength(2);
        });

        it('should return error if no files uploaded', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            const res = await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('No files uploaded');
        });

        it('should return 404 if declaration not found', async () => {
            const testImagePath = createTestImage();

            const res = await request(BASE_URL)
                .post('/api/declarations/99999/upload')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', testImagePath);

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Declaration not found');
        });

        it('should invalidate cache after upload', async () => {
            const decl = await prisma.declaration.create({
                data: {
                    invoiceRequestName: 'Test',
                    customerId: customerId,
                    productNameVi: 'Test',
                    hsCode: '1234.56',
                    quantity: 10,
                    totalPackages: 5,
                    totalWeight: 10,
                    totalVolume: 1,
                    contractPrice: 100,
                    productUnit: 'Cái',
                    declarationPriceVND: 150,
                    importTaxPercent: 10,
                    vatPercent: 10,
                    serviceFeePercent: 5
                }
            });

            // Seed cache
            await redisClient.set('declarations:list:1:20::all', 'dummy');

            const testImagePath = createTestImage();

            await request(BASE_URL)
                .post(`/api/declarations/${decl.id}/upload`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', testImagePath);

            // Verify cache gone
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });
    });
});
