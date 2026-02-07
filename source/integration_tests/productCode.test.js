const request = require('supertest');
const app = require('../backend/src/app');
const prisma = require('../backend/src/prisma');
const bcrypt = require('bcryptjs');

describe('Product Code API Integration Tests', () => {
    let adminToken, userToken;
    let adminUser, normalUser, customer;
    let warehouse, category, declaration;

    beforeAll(async () => {
        // Clean up
        await prisma.packageDetail.deleteMany({});
        await prisma.warehouseCost.deleteMany({});
        await prisma.productCode.deleteMany({});
        await prisma.declaration.deleteMany({});
        await prisma.category.deleteMany({});
        await prisma.warehouse.deleteMany({});
        await prisma.transaction.deleteMany({});
        await prisma.user.deleteMany({});

        // Create users
        const hashedPassword = await bcrypt.hash('password123', 10);

        adminUser = await prisma.user.create({
            data: {
                username: 'admin_pc',
                password: hashedPassword,
                fullName: 'Admin User',
                role: 'ADMIN',
                type: 'EMPLOYEE'
            }
        });

        normalUser = await prisma.user.create({
            data: {
                username: 'user_pc',
                password: hashedPassword,
                fullName: 'Normal User',
                role: 'USER',
                type: 'EMPLOYEE'
            }
        });

        customer = await prisma.user.create({
            data: {
                username: 'customer_pc',
                password: hashedPassword,
                fullName: 'Customer User',
                role: 'USER',
                type: 'CUSTOMER',
                customerCode: 'CUST001'
            }
        });

        // Login to get tokens
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin_pc', password: 'password123' });
        adminToken = adminLogin.body.data.access_token;

        const userLogin = await request(app)
            .post('/api/auth/login')
            .send({ username: 'user_pc', password: 'password123' });
        userToken = userLogin.body.data.access_token;

        // Create warehouse
        warehouse = await prisma.warehouse.create({
            data: {
                name: 'Test Warehouse PC',
                status: 'AVAILABLE'
            }
        });

        // Create category
        category = await prisma.category.create({
            data: {
                name: 'Test Category PC',
                status: 'AVAILABLE'
            }
        });

        // Create declaration
        declaration = await prisma.declaration.create({
            data: {
                customerId: customer.id,
                invoiceRequestName: 'Test Invoice',
                hsCode: '1234567890',
                productUnit: 'pcs',
                declarationPriceVND: 1000000,
                importTaxPercent: 10,
                vatPercent: 10,
                serviceFeePercent: 5
            }
        });
    });

    afterAll(async () => {
        await prisma.packageDetail.deleteMany({});
        await prisma.warehouseCost.deleteMany({});
        await prisma.productCode.deleteMany({});
        await prisma.declaration.deleteMany({});
        await prisma.category.deleteMany({});
        await prisma.warehouse.deleteMany({});
        await prisma.transaction.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();
    });

    describe('POST /api/product-codes - Create Product Code', () => {
        it('should allow ADMIN to create product code with basic fields', async () => {
            const response = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: customer.id,
                    partnerName: 'Partner ABC',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Test Product',
                    exchangeRate: 3500.5,
                    notes: 'Test notes',
                    separateTax: false,
                    originalWeightPrice: 100.50,
                    originalVolumePrice: 200.75,
                    serviceFee: 50.00,
                    totalAmount: 1000.00,
                    incidentalFee: 20.00,
                    profit: 150.00,
                    totalWeight: 50.5,
                    totalVolume: 2.5,
                    totalPackages: 10,
                    costCalculationMethod: 'AUTO',
                    weightPrice: 10.00,
                    volumePrice: 20.00
                });

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.partnerName).toBe('Partner ABC');
            expect(response.body.data.productName).toBe('Test Product');
        });

        it('should allow ADMIN to create product code with nested data', async () => {
            const response = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: customer.id,
                    partnerName: 'Partner XYZ',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Test Product 2',
                    exchangeRate: 3600.0,
                    separateTax: true,
                    originalWeightPrice: 150.00,
                    originalVolumePrice: 250.00,
                    serviceFee: 75.00,
                    importTax: 100000,
                    vat: 50000,
                    totalAmount: 2000.00,
                    profit: 300.00,
                    totalWeight: 100.0,
                    totalVolume: 5.0,
                    totalPackages: 20,
                    costCalculationMethod: 'BY_WEIGHT',
                    weightPrice: 15.00,
                    volumePrice: 25.00,
                    warehouseCosts: [
                        {
                            costType: 'SHIP_NOI_DIA',
                            currency: 'YUAN',
                            originalCost: 500.00,
                            otherFee: 50.00,
                            notes: 'Shipping cost'
                        },
                        {
                            costType: 'PHI_LUU_KHO',
                            currency: 'VND',
                            originalCost: 200000,
                            otherFee: 0,
                            notes: 'Storage fee'
                        }
                    ],
                    packageDetails: [
                        {
                            trackingCode: 'TRACK001',
                            length: 100.0,
                            width: 50.0,
                            height: 30.0,
                            totalWeight: 50.0,
                            totalPackages: 10
                        },
                        {
                            trackingCode: 'TRACK002',
                            length: 120.0,
                            width: 60.0,
                            height: 40.0,
                            totalWeight: 50.0,
                            totalPackages: 10
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.warehouseCosts).toHaveLength(2);
            expect(response.body.data.packageDetails).toHaveLength(2);
            expect(response.body.data.warehouseCosts[0].costType).toBe('SHIP_NOI_DIA');
            expect(response.body.data.packageDetails[0].trackingCode).toBe('TRACK001');
        });

        it('should reject non-ADMIN user', async () => {
            const response = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    customerId: customer.id,
                    partnerName: 'Partner',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20
                });

            expect(response.status).toBe(403);
        });

        it('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: customer.id,
                    partnerName: 'Partner'
                    // Missing many required fields
                });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe(99001);
        });

        it('should reject non-existent customer', async () => {
            const response = await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: 99999,
                    partnerName: 'Partner',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20
                });

            expect(response.status).toBe(404);
            expect(response.body.code).toBe(99006);
        });
    });

    describe('GET /api/product-codes - Get All Product Codes', () => {
        it('should return paginated list for authenticated user', async () => {
            const response = await request(app)
                .get('/api/product-codes')
                .set('Authorization', `Bearer ${userToken}`)
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(response.body.data).toHaveProperty('items');
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('page');
            expect(response.body.data).toHaveProperty('totalPages');
        });

        it('should support search by product name', async () => {
            const response = await request(app)
                .get('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: 'Test Product' });

            expect(response.status).toBe(200);
            expect(response.body.data.items.length).toBeGreaterThan(0);
        });

        it('should reject unauthenticated request', async () => {
            const response = await request(app)
                .get('/api/product-codes');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/product-codes/:id - Get Product Code By ID', () => {
        let productCodeId;

        beforeAll(async () => {
            const pc = await prisma.productCode.create({
                data: {
                    customerId: customer.id,
                    partnerName: 'Partner Detail',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Detail Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20,
                    warehouseCosts: {
                        create: [
                            {
                                costType: 'PHI_CAN',
                                currency: 'YUAN',
                                originalCost: 100,
                                otherFee: 10
                            }
                        ]
                    },
                    packageDetails: {
                        create: [
                            {
                                trackingCode: 'DETAIL001',
                                length: 50,
                                width: 30,
                                height: 20,
                                totalWeight: 25,
                                totalPackages: 5
                            }
                        ]
                    }
                }
            });
            productCodeId = pc.id;
        });

        it('should return product code with nested data', async () => {
            const response = await request(app)
                .get(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(response.body.data).toHaveProperty('id', productCodeId);
            expect(response.body.data).toHaveProperty('customer');
            expect(response.body.data).toHaveProperty('warehouse');
            expect(response.body.data).toHaveProperty('category');
            expect(response.body.data).toHaveProperty('warehouseCosts');
            expect(response.body.data).toHaveProperty('packageDetails');
            expect(response.body.data.warehouseCosts.length).toBeGreaterThan(0);
            expect(response.body.data.packageDetails.length).toBeGreaterThan(0);
        });

        it('should return 404 for non-existent product code', async () => {
            const response = await request(app)
                .get('/api/product-codes/99999')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(404);
            expect(response.body.code).toBe(99006);
        });
    });

    describe('PUT /api/product-codes/:id - Update Product Code', () => {
        let productCodeId;

        beforeAll(async () => {
            const pc = await prisma.productCode.create({
                data: {
                    customerId: customer.id,
                    partnerName: 'Partner Update',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Update Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20
                }
            });
            productCodeId = pc.id;
        });

        it('should allow ADMIN to update product code', async () => {
            const response = await request(app)
                .put(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    partnerName: 'Updated Partner',
                    productName: 'Updated Product',
                    profit: 500.00
                });

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(response.body.data.partnerName).toBe('Updated Partner');
            expect(response.body.data.productName).toBe('Updated Product');
        });

        it('should allow ADMIN to update with nested data', async () => {
            const response = await request(app)
                .put(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    warehouseCosts: [
                        {
                            costType: 'PHI_NANG_HANG',
                            currency: 'VND',
                            originalCost: 300000,
                            otherFee: 50000,
                            notes: 'New cost'
                        }
                    ],
                    packageDetails: [
                        {
                            trackingCode: 'UPDATE001',
                            length: 80,
                            width: 40,
                            height: 25,
                            totalWeight: 30,
                            totalPackages: 8
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.data.warehouseCosts).toHaveLength(1);
            expect(response.body.data.packageDetails).toHaveLength(1);
            expect(response.body.data.warehouseCosts[0].costType).toBe('PHI_NANG_HANG');
        });

        it('should reject non-ADMIN user', async () => {
            const response = await request(app)
                .put(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    partnerName: 'Hacked'
                });

            expect(response.status).toBe(403);
        });

        it('should return 404 for non-existent product code', async () => {
            const response = await request(app)
                .put('/api/product-codes/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    partnerName: 'Test'
                });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/product-codes/:id - Delete Product Code', () => {
        let productCodeId;

        beforeEach(async () => {
            const pc = await prisma.productCode.create({
                data: {
                    customerId: customer.id,
                    partnerName: 'Partner Delete',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Delete Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20
                }
            });
            productCodeId = pc.id;
        });

        it('should allow ADMIN to soft delete product code', async () => {
            const response = await request(app)
                .delete(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);

            // Verify soft delete
            const deleted = await prisma.productCode.findUnique({
                where: { id: productCodeId }
            });
            expect(deleted.deletedAt).not.toBeNull();
        });

        it('should reject non-ADMIN user', async () => {
            const response = await request(app)
                .delete(`/api/product-codes/${productCodeId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('should return 404 for non-existent product code', async () => {
            const response = await request(app)
                .delete('/api/product-codes/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/product-codes/export/all - Export Product Codes', () => {
        it('should allow ADMIN to export all product codes', async () => {
            const response = await request(app)
                .get('/api/product-codes/export/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.code).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should reject non-ADMIN user', async () => {
            const response = await request(app)
                .get('/api/product-codes/export/all')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('Cache Invalidation', () => {
        it('should invalidate cache after create', async () => {
            // First request - cache miss
            await request(app)
                .get('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 10 });

            // Create new product code
            await request(app)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId: customer.id,
                    partnerName: 'Cache Test',
                    warehouseId: warehouse.id,
                    categoryId: category.id,
                    productName: 'Cache Product',
                    exchangeRate: 3500,
                    originalWeightPrice: 100,
                    originalVolumePrice: 200,
                    serviceFee: 50,
                    totalAmount: 1000,
                    totalWeight: 50,
                    totalVolume: 2,
                    totalPackages: 10,
                    weightPrice: 10,
                    volumePrice: 20
                });

            // Second request - should get fresh data
            const response = await request(app)
                .get('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
        });
    });
});
