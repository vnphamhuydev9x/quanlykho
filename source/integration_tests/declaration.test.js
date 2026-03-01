/**
 * Integration Test: Declaration API
 * TestSpec Reference: docs/business-tech-note/testspec/06_TestSpec_declaration_management.md
 * Schema: model Declaration (schema.prisma) — dùng đúng field hiện tại, KHÔNG dùng field cũ
 *
 * SETUP CHUNG (beforeEach):
 *   - admin (ADMIN role) + user (USER role)
 *   - customer (type: CUSTOMER)
 *   - productCode (PC-TEST-001) → productItem (Giày Nike Test) → declaration (brand: Nike)
 *   declarationId được dùng xuyên suốt các test case
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

describe('Integration: Declaration API', () => {
    let adminToken, userToken;
    let customerId, productCodeId, productItemId, declarationId;

    // Helper: tạo file JPEG tối thiểu hợp lệ để test upload
    const createTestImage = (filename = 'test-decl.jpg') => {
        const filePath = path.join(__dirname, filename);
        const jpegBuffer = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ]);
        fs.writeFileSync(filePath, jpegBuffer);
        return filePath;
    };

    // Cleanup các file ảnh test tạm
    const cleanupImages = () => {
        ['test-decl.jpg', 'test-decl-2.jpg', 'test-decl-3.jpg'].forEach(f => {
            const p = path.join(__dirname, f);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    };

    beforeAll(async () => {
        await connectTestInfra();
    });

    afterAll(async () => {
        cleanupImages();
        await disconnectTestInfra();
    });

    beforeEach(async () => {
        await resetDb();
        await resetRedis();

        // 1. Tạo ADMIN user
        const admin = await prisma.user.create({
            data: { username: 'admin_decl', password: 'hashed', fullName: 'Admin Decl', role: 'ADMIN', isActive: true }
        });
        adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

        // 2. Tạo USER (non-admin)
        const user = await prisma.user.create({
            data: { username: 'user_decl', password: 'hashed', fullName: 'User Decl', role: 'USER', isActive: true }
        });
        userToken = generateToken({ userId: user.id, username: user.username, role: user.role });

        // 3. Tạo Customer
        const customer = await prisma.user.create({
            data: { username: 'khachhang_decl', password: 'hashed', fullName: 'Nguyen Van A', phone: '0901234567', role: 'USER', type: 'CUSTOMER' }
        });
        customerId = customer.id;

        // 4. Tạo ProductCode (Master)
        const pc = await prisma.productCode.create({
            data: { customerId, orderCode: 'PC-TEST-001' }
        });
        productCodeId = pc.id;

        // 5. Tạo ProductItem (Detail) — itemTransportFeeEstimate = 500,000 dùng cho TC-DECL-UPDATE-05
        const item = await prisma.productItem.create({
            data: {
                productCodeId,
                productName: 'Giày Nike Test',
                packageUnit: 'THUNG_CARTON',
                packageCount: 10,
                weight: 50,
                itemTransportFeeEstimate: 500000
            }
        });
        productItemId = item.id;

        // 6. Tạo Declaration (linked đúng schema hiện tại)
        const decl = await prisma.declaration.create({
            data: {
                productCodeId,
                productItemId,
                brand: 'Nike',
                sellerCompanyName: 'Nike China Ltd',
                declarationQuantity: 10,
                invoicePriceBeforeVat: 100000,
                importTax: 10,
                vatTax: 10
            }
        });
        declarationId = decl.id;
    });

    // ============================================================
    // Nhóm 1: Auth & Permissions
    // ============================================================
    describe('Auth & Permissions', () => {

        // [TC-DECL-AUTH-01] No token → 401 (GET list)
        it('[TC-DECL-AUTH-01] should return 401 when no token is provided for GET list', async () => {
            const res = await request(BASE_URL).get('/api/declarations');
            expect(res.status).toBe(401);
        });

        // [TC-DECL-AUTH-02] No token → 401 (GET by ID)
        it('[TC-DECL-AUTH-02] should return 401 when no token is provided for GET by ID', async () => {
            const res = await request(BASE_URL).get(`/api/declarations/${declarationId}`);
            expect(res.status).toBe(401);
        });

        // [TC-DECL-AUTH-03] USER role có thể đọc danh sách
        it('[TC-DECL-AUTH-03] should allow USER role to GET list', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
        });

        // [TC-DECL-AUTH-04] USER role có thể đọc chi tiết
        it('[TC-DECL-AUTH-04] should allow USER role to GET by ID', async () => {
            const res = await request(BASE_URL)
                .get(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
        });

        // [TC-DECL-AUTH-05] USER role không thể cập nhật → 403
        it('[TC-DECL-AUTH-05] should return 403 when USER role tries to update', async () => {
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ brand: 'Adidas' });
            expect(res.status).toBe(403);
        });

        // [TC-DECL-AUTH-06] USER role không thể xóa → 403
        it('[TC-DECL-AUTH-06] should return 403 when USER role tries to delete', async () => {
            const res = await request(BASE_URL)
                .delete(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(403);
        });

        // [TC-DECL-AUTH-07] USER role không thể export → 403
        it('[TC-DECL-AUTH-07] should return 403 when USER role tries to export', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/export/all')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(403);
        });
    });

    // ============================================================
    // Nhóm 2: GET /api/declarations — Danh sách
    // ============================================================
    describe('GET /api/declarations — List & Pagination', () => {

        // [TC-DECL-GET-01] Response structure chuẩn
        it('[TC-DECL-GET-01] should return paginated list with correct structure', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.code).toBe(200);
            expect(res.body.data).toHaveProperty('items');
            expect(res.body.data).toHaveProperty('total');
            expect(res.body.data).toHaveProperty('page');
            expect(res.body.data).toHaveProperty('totalPages');
            expect(Array.isArray(res.body.data.items)).toBe(true);
            expect(res.body.data.items.length).toBeGreaterThan(0);
        });

        // [TC-DECL-GET-02] Phân trang hoạt động đúng
        it('[TC-DECL-GET-02] should respect page and limit params', async () => {
            // Tạo thêm declaration thứ 2 qua productItem mới
            const item2 = await prisma.productItem.create({
                data: { productCodeId, productName: 'Item 2', packageUnit: 'PALLET' }
            });
            await prisma.declaration.create({ data: { productCodeId, productItemId: item2.id } });

            const res = await request(BASE_URL)
                .get('/api/declarations?page=1&limit=1')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.page).toBe(1);
            expect(res.body.data.total).toBeGreaterThanOrEqual(2);
            expect(res.body.data.totalPages).toBeGreaterThanOrEqual(2);
        });

        // [TC-DECL-GET-03] Tìm kiếm theo brand
        it('[TC-DECL-GET-03] should search by brand', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?search=Nike')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBeGreaterThan(0);
            expect(res.body.data.items[0].brand).toBe('Nike');
        });

        // [TC-DECL-GET-04] Tìm kiếm theo sellerCompanyName
        it('[TC-DECL-GET-04] should search by sellerCompanyName', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations?search=Nike+China')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBeGreaterThan(0);
        });

        // [TC-DECL-GET-05] Lọc theo productCodeId
        it('[TC-DECL-GET-05] should filter by productCodeId', async () => {
            // Tạo ProductCode thứ 2 với Declaration riêng
            const pc2 = await prisma.productCode.create({ data: { customerId, orderCode: 'PC-TEST-002' } });
            const item2 = await prisma.productItem.create({ data: { productCodeId: pc2.id, productName: 'Other Item', packageUnit: 'PALLET' } });
            await prisma.declaration.create({ data: { productCodeId: pc2.id, productItemId: item2.id } });

            const res = await request(BASE_URL)
                .get(`/api/declarations?productCodeId=${productCodeId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].productCodeId).toBe(productCodeId);
        });

        // [TC-DECL-GET-06] Không hiện record đã soft-delete
        it('[TC-DECL-GET-06] should NOT show soft-deleted declarations in list', async () => {
            await prisma.declaration.update({
                where: { id: declarationId },
                data: { deletedAt: new Date() }
            });

            const res = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.items.map(i => i.id);
            expect(ids).not.toContain(declarationId);
        });

        // [TC-DECL-GET-07] Cache: lần 2 lấy từ Redis
        it('[TC-DECL-GET-07] should cache response and serve from cache on second request', async () => {
            // Lần 1 — cache MISS
            await request(BASE_URL).get('/api/declarations').set('Authorization', `Bearer ${userToken}`);

            // Verify cache được set
            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBeGreaterThan(0);

            // Lần 2 — cache HIT
            const res2 = await request(BASE_URL).get('/api/declarations').set('Authorization', `Bearer ${userToken}`);
            expect(res2.status).toBe(200);
            expect(res2.body.data.items.length).toBeGreaterThan(0);
        });
    });

    // ============================================================
    // Nhóm 3: GET /api/declarations/:id — Chi tiết
    // ============================================================
    describe('GET /api/declarations/:id — Detail', () => {

        // [TC-DECL-GETID-01] Trả về đầy đủ relations
        it('[TC-DECL-GETID-01] should return declaration with productItem and productCode relations', async () => {
            const res = await request(BASE_URL)
                .get(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(declarationId);
            // productItem relation
            expect(res.body.data.productItem).toBeTruthy();
            expect(res.body.data.productItem.productName).toBe('Giày Nike Test');
            // productCode relation
            expect(res.body.data.productCode).toBeTruthy();
            expect(res.body.data.productCode.orderCode).toBe('PC-TEST-001');
        });

        // [TC-DECL-GETID-02] Not Found → 404
        it('[TC-DECL-GETID-02] should return 404 for non-existent declaration', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/99999')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(404);
        });

        // [TC-DECL-GETID-03] Soft-deleted → 404
        it('[TC-DECL-GETID-03] should return 404 for soft-deleted declaration', async () => {
            await prisma.declaration.update({ where: { id: declarationId }, data: { deletedAt: new Date() } });

            const res = await request(BASE_URL)
                .get(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ============================================================
    // Nhóm 4: PUT /api/declarations/:id — Cập nhật & Tính toán
    // ============================================================
    describe('PUT /api/declarations/:id — Update & Secure Recalculation', () => {

        // [TC-DECL-UPDATE-01] Happy Path — Cập nhật trường text thành công
        it('[TC-DECL-UPDATE-01] should update text fields successfully', async () => {
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    brand: 'Adidas Updated',
                    sellerCompanyName: 'Adidas China Co.',
                    declarationNeed: 'Nhập khẩu thương mại',
                    specification: 'Size 40-44',
                    notes: 'Ghi chú integration test'
                });

            expect(res.status).toBe(200);
            // Verify DB
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.brand).toBe('Adidas Updated');
            expect(db.sellerCompanyName).toBe('Adidas China Co.');
            expect(db.declarationNeed).toBe('Nhập khẩu thương mại');
            expect(db.notes).toBe('Ghi chú integration test');
        });

        // [TC-DECL-UPDATE-02] Secure Recalculation — chặn fake totalLotValueBeforeVat
        it('[TC-DECL-UPDATE-02] should recalculate totalLotValueBeforeVat server-side, ignoring client fake value', async () => {
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoicePriceBeforeVat: 100000,  // Giá xuất HĐ: 100,000 VND
                    declarationQuantity: 10,          // Số lượng khai báo: 10
                    importTax: 5,                     // Thuế NK: 5%
                    vatTax: 10,                       // VAT: 10%
                    totalLotValueBeforeVat: 99000000  // ← GIẢ MẠO từ client, phải bị bỏ qua
                });

            expect(res.status).toBe(200);

            // Server PHẢI tự tính, không dùng giá trị client gửi lên
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.totalLotValueBeforeVat).toBe(1000000);  // 100,000 × 10 = 1,000,000
            expect(db.importTaxPayable).toBe(50000);           // 1,000,000 × 5%
            expect(db.vatTaxPayable).toBe(100000);             // 1,000,000 × 10%
        });

        // [TC-DECL-UPDATE-03] Edge Case — declarationQuantity = 0 → tất cả = 0
        it('[TC-DECL-UPDATE-03] should set all calculated fields to 0 when declarationQuantity is 0', async () => {
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ invoicePriceBeforeVat: 500000, declarationQuantity: 0, importTax: 10, vatTax: 10 });

            expect(res.status).toBe(200);
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.totalLotValueBeforeVat).toBe(0);
            expect(db.importTaxPayable).toBe(0);
            expect(db.vatTaxPayable).toBe(0);
        });

        // [TC-DECL-UPDATE-04] Edge Case — invoicePriceBeforeVat = 0 → tổng = 0
        it('[TC-DECL-UPDATE-04] should set totalLotValueBeforeVat to 0 when invoicePriceBeforeVat is 0', async () => {
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ invoicePriceBeforeVat: 0, declarationQuantity: 50, importTax: 20, vatTax: 10 });

            expect(res.status).toBe(200);
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.totalLotValueBeforeVat).toBe(0);
        });

        // [TC-DECL-UPDATE-05] Full chain — importCostToCustomer tính đúng
        it('[TC-DECL-UPDATE-05] should correctly calculate full chain including importCostToCustomer', async () => {
            // beforeEach đã seed itemTransportFeeEstimate = 500,000 cho productItem
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    invoicePriceBeforeVat: 200000,  // Giá: 200,000
                    declarationQuantity: 5,           // SL: 5
                    importTax: 10,                    // NK: 10%
                    vatTax: 10,                       // VAT: 10%
                    payableFee: 50000,                // Phí: 50,000
                    entrustmentFee: 30000             // Ủy thác: 30,000
                });

            expect(res.status).toBe(200);
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });

            // totalLotValueBeforeVat = 200,000 × 5 = 1,000,000
            expect(db.totalLotValueBeforeVat).toBe(1000000);
            // importTaxPayable = 1,000,000 × 10% = 100,000
            expect(db.importTaxPayable).toBe(100000);
            // vatTaxPayable = 1,000,000 × 10% = 100,000
            expect(db.vatTaxPayable).toBe(100000);
            // importCostToCustomer = 500,000 (itemFee) + 100,000 + 100,000 + 50,000 + 30,000 = 780,000
            expect(db.importCostToCustomer).toBe(780000);
        });

        // [TC-DECL-UPDATE-06] Not Found → 404
        it('[TC-DECL-UPDATE-06] should return 404 for non-existent declaration', async () => {
            const res = await request(BASE_URL)
                .put('/api/declarations/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ brand: 'Test' });
            expect(res.status).toBe(404);
        });

        // [TC-DECL-UPDATE-07] Cache invalidated sau update
        it('[TC-DECL-UPDATE-07] should invalidate all declarations cache keys after update', async () => {
            await redisClient.set('declarations:list:1:20::', 'dummy');

            await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ brand: 'Updated' });

            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });

        // [TC-DECL-UPDATE-08] Bug Regression: Save không đổi gì → KHÔNG reset calculated fields về 0
        // Bug gốc: parseInt(undefined || null) || 0 = 0 → xóa mất giá trị DB hiện có
        // Fix: dùng parseOrKeep() — fallback về giá trị DB khi field không được gửi lên
        it('[TC-DECL-UPDATE-08] should preserve DB values for numeric fields when they are not included in the payload', async () => {
            // Setup: Declaration đã có đủ dữ liệu tính toán trong DB
            await prisma.declaration.update({
                where: { id: declarationId },
                data: { invoicePriceBeforeVat: 200000, declarationQuantity: 5, importTax: 10, vatTax: 8 }
            });

            // User chỉ sửa notes — KHÔNG gửi invoicePriceBeforeVat, declarationQuantity, importTax, vatTax
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ notes: 'Chỉ sửa ghi chú, không đụng đến số liệu' });

            expect(res.status).toBe(200);
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });

            // Giá trị tính toán PHẢI được GIỮ NGUYÊN từ DB — không reset về 0
            expect(db.totalLotValueBeforeVat).toBe(1000000); // 200,000 × 5 (dùng existing values)
            expect(db.importTaxPayable).toBe(100000);         // 1,000,000 × 10%
            expect(db.vatTaxPayable).toBe(80000);             // 1,000,000 × 8%
            // notes được cập nhật đúng
            expect(db.notes).toBe('Chỉ sửa ghi chú, không đụng đến số liệu');
        });
    });


    // ============================================================
    // Nhóm 5: DELETE /api/declarations/:id — Soft Delete
    // ============================================================
    describe('DELETE /api/declarations/:id — Soft Delete', () => {

        // [TC-DECL-DELETE-01] Happy Path — set deletedAt
        it('[TC-DECL-DELETE-01] should soft-delete declaration by setting deletedAt', async () => {
            const res = await request(BASE_URL)
                .delete(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            // DB Verify
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.deletedAt).not.toBeNull();
        });

        // [TC-DECL-DELETE-02] Sau delete không hiện trong list
        it('[TC-DECL-DELETE-02] should NOT show deleted declaration in subsequent GET list', async () => {
            await request(BASE_URL)
                .delete(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            const listRes = await request(BASE_URL)
                .get('/api/declarations')
                .set('Authorization', `Bearer ${userToken}`);

            const ids = listRes.body.data.items.map(i => i.id);
            expect(ids).not.toContain(declarationId);
        });

        // [TC-DECL-DELETE-03] Cache invalidated sau delete
        it('[TC-DECL-DELETE-03] should invalidate cache after delete', async () => {
            await redisClient.set('declarations:list:1:20::', 'dummy');

            await request(BASE_URL)
                .delete(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            const keys = await redisClient.keys('declarations:list:*');
            expect(keys.length).toBe(0);
        });
    });

    // ============================================================
    // Nhóm 6: GET /api/declarations/export/all — Export
    // ============================================================
    describe('GET /api/declarations/export/all — Export', () => {

        // [TC-DECL-EXPORT-01] ADMIN export thành công với cấu trúc đầy đủ
        it('[TC-DECL-EXPORT-01] should allow ADMIN to export all with full data structure', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/export/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            // Verify joined relations có trong response
            const item = res.body.data[0];
            expect(item).toHaveProperty('productItem');
            expect(item).toHaveProperty('productCode');
        });

        // [TC-DECL-EXPORT-02] USER role bị từ chối → 403
        it('[TC-DECL-EXPORT-02] should return 403 when USER role tries to export', async () => {
            const res = await request(BASE_URL)
                .get('/api/declarations/export/all')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(403);
        });
    });

    // ============================================================
    // Nhóm 7: PUT /:id với upload images qua req.files
    // (Upload được gửi kèm qua PUT, không phải endpoint riêng)
    // ============================================================
    describe('PUT /api/declarations/:id — Upload Images (via req.files)', () => {

        afterEach(() => {
            cleanupImages();
        });

        // [TC-DECL-UPLOAD-01] Upload 1 ảnh thành công
        it('[TC-DECL-UPLOAD-01] should store images when uploaded via PUT', async () => {
            const imgPath = createTestImage('test-decl.jpg');
            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', imgPath);

            expect(res.status).toBe(200);
            // DB Verify: images field được update
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            expect(db.images).not.toBeNull();
            const storedImages = JSON.parse(db.images);
            expect(storedImages).toHaveLength(1);
        });

        // [TC-DECL-UPLOAD-02] Upload nhiều ảnh (tối đa 3)
        it('[TC-DECL-UPLOAD-02] should accept up to 3 images', async () => {
            const img1 = createTestImage('test-decl.jpg');
            const img2 = createTestImage('test-decl-2.jpg');
            const img3 = createTestImage('test-decl-3.jpg');

            const res = await request(BASE_URL)
                .put(`/api/declarations/${declarationId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', img1)
                .attach('images', img2)
                .attach('images', img3);

            expect(res.status).toBe(200);
            const db = await prisma.declaration.findUnique({ where: { id: declarationId } });
            const storedImages = JSON.parse(db.images || '[]');
            expect(storedImages).toHaveLength(3);
        });
    });

    // ============================================================
    // Nhóm 8: Scenario 1 — Auto Creation via ProductCode
    // ============================================================
    describe('Scenario 1: Auto Declaration Creation via ProductCode', () => {

        // [TC-DECL-AUTO-01] POST ProductCode với 2 items → tự tạo 2 Declarations
        it('[TC-DECL-AUTO-01] should auto-create Declaration for each ProductItem when creating ProductCode', async () => {
            const res = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId,
                    orderCode: 'PC-AUTO-001',
                    items: [
                        { productName: 'Item A', packageUnit: 'THUNG_CARTON', packageCount: 10 },
                        { productName: 'Item B', packageUnit: 'BAO_TAI', packageCount: 5 }
                    ]
                });

            expect(res.status).toBe(201);
            const newPcId = res.body.data.id;

            // Verify: 2 ProductItem được tạo
            const items = await prisma.productItem.findMany({ where: { productCodeId: newPcId } });
            expect(items).toHaveLength(2);

            // Verify (cốt lõi): 2 Declaration được tạo tự động, map đúng
            const decls = await prisma.declaration.findMany({ where: { productCodeId: newPcId } });
            expect(decls).toHaveLength(2);

            const itemIds = items.map(i => i.id);
            decls.forEach(d => {
                expect(d.productCodeId).toBe(newPcId);
                expect(itemIds).toContain(d.productItemId);
            });
        });

        // [TC-DECL-AUTO-02] PUT ProductCode thay items → Declaration cũ cascade-delete, mới được tạo
        it('[TC-DECL-AUTO-02] should cascade-delete old Declarations and create new ones when updating ProductCode items', async () => {
            // Setup: tạo ProductCode với 1 item
            const createRes = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ customerId, orderCode: 'PC-UPDATE-001', items: [{ productName: 'Old Item', packageUnit: 'THUNG_CARTON' }] });
            expect(createRes.status).toBe(201);

            const pcId = createRes.body.data.id;
            const oldItems = await prisma.productItem.findMany({ where: { productCodeId: pcId } });
            const oldDeclId = (await prisma.declaration.findFirst({ where: { productCodeId: pcId } }))?.id;
            expect(oldDeclId).toBeDefined();

            // Update: thay thế bằng item hoàn toàn mới
            const updateRes = await request(BASE_URL)
                .put(`/api/product-codes/${pcId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ items: [{ productName: 'New Item Entirely', packageUnit: 'PALLET' }] });
            expect(updateRes.status).toBe(200);

            // Old item bị xóa
            expect(await prisma.productItem.findFirst({ where: { id: oldItems[0].id } })).toBeNull();

            // Old Declaration bị cascade delete theo ProductItem
            expect(await prisma.declaration.findFirst({ where: { id: oldDeclId } })).toBeNull();

            // Declaration mới được tạo cho item mới
            const newDecls = await prisma.declaration.findMany({ where: { productCodeId: pcId } });
            expect(newDecls).toHaveLength(1);
            expect(newDecls[0].productItemId).not.toBe(oldItems[0].id);
        });
    });

    // ============================================================
    // Nhóm 9: Scenario 3 — DB Consistency
    // ============================================================
    describe('Scenario 3: DB Consistency — Count(Declaration) == Count(ProductItem)', () => {

        // [TC-DECL-CONS-01] Count invariant: Declaration = ProductItem cho cùng ProductCode
        it('[TC-DECL-CONS-01] Declaration count must exactly equal ProductItem count for same ProductCode', async () => {
            const res = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId,
                    orderCode: 'PC-CONS-001',
                    items: [
                        { productName: 'Item X', packageUnit: 'THUNG_CARTON' },
                        { productName: 'Item Y', packageUnit: 'PALLET' },
                        { productName: 'Item Z', packageUnit: 'BAO_TAI' }
                    ]
                });
            expect(res.status).toBe(201);
            const pcId = res.body.data.id;

            const itemCount = await prisma.productItem.count({ where: { productCodeId: pcId } });
            const declCount = await prisma.declaration.count({ where: { productCodeId: pcId } });

            expect(itemCount).toBe(3);
            expect(declCount).toBe(3);
            expect(declCount).toBe(itemCount); // Bất biến cốt lõi
        });

        // [TC-DECL-CONS-02] Sau update không có Orphan Declaration records
        it('[TC-DECL-CONS-02] no Orphan Declaration records should exist after ProductCode items update', async () => {
            // Tạo ProductCode với 2 Items
            const createRes = await request(BASE_URL)
                .post('/api/product-codes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerId,
                    orderCode: 'PC-ORPHAN-001',
                    items: [
                        { productName: 'Item A', packageUnit: 'THUNG_CARTON' },
                        { productName: 'Item B', packageUnit: 'BAO_TAI' }
                    ]
                });
            const pcId = createRes.body.data.id;

            // Update với 1 item duy nhất
            await request(BASE_URL)
                .put(`/api/product-codes/${pcId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ items: [{ productName: 'Only Item Remaining', packageUnit: 'PALLET' }] });

            // Verify: Sau update, đúng 1 Item và 1 Declaration, không có orphan
            const finalItemCount = await prisma.productItem.count({ where: { productCodeId: pcId } });
            const finalDeclCount = await prisma.declaration.count({ where: { productCodeId: pcId } });

            expect(finalItemCount).toBe(1);
            expect(finalDeclCount).toBe(1);
            expect(finalDeclCount).toBe(finalItemCount);
        });
    });
});
