const request = require('supertest');
const {
    prisma, redisClient, BASE_URL,
    connectTestInfra, disconnectTestInfra,
    resetDb, resetRedis, generateToken
} = require('./helpers');

let adminToken;
let adminId;
let customerId1;
let customerId2;

// Helper: Tạo ProductCode với vehicleStatus = DA_NHAP_KHO_VN
const createReadyProductCode = async (customerId, overrides = {}) => {
    const pc = await prisma.productCode.create({
        data: {
            customerId,
            orderCode: `TEST-${Date.now()}-${Math.random()}`,
            vehicleStatus: 'DA_NHAP_KHO_VN',
            exchangeRate: 3500,
            exportOrderId: null,
            exportStatus: null,
            ...overrides,
            items: {
                create: [
                    {
                        productName: 'Test Item',
                        weight: 100,
                        volume: 1.0,
                        volumeFee: 300000,
                        weightFee: 2000,
                        domesticFeeTQ: 0,
                        haulingFeeTQ: 0,
                        unloadingFeeRMB: 0,
                        itemTransportFeeEstimate: 300000
                    }
                ]
            }
        },
        include: { items: true }
    });
    return pc;
};

beforeAll(async () => {
    await connectTestInfra();
});

afterAll(async () => {
    await disconnectTestInfra();
});

beforeEach(async () => {
    await resetDb();
    await resetRedis();

    const adminUser = await prisma.user.create({
        data: {
            username: 'test_admin',
            password: 'hashedpassword',
            fullName: 'Test Admin',
            type: 'EMPLOYEE',
            role: 'ADMIN',
            isActive: true
        }
    });

    const customer1 = await prisma.user.create({
        data: {
            username: 'test_cus1',
            password: 'hashedpassword',
            fullName: 'Khách Hàng 1',
            customerCode: 'KH001',
            type: 'CUSTOMER',
            role: 'USER',
            isActive: true
        }
    });

    const customer2 = await prisma.user.create({
        data: {
            username: 'test_cus2',
            password: 'hashedpassword',
            fullName: 'Khách Hàng 2',
            customerCode: 'KH002',
            type: 'CUSTOMER',
            role: 'USER',
            isActive: true
        }
    });

    adminToken = generateToken({ userId: adminUser.id, type: 'EMPLOYEE', role: 'ADMIN' });
    adminId = adminUser.id;
    customerId1 = customer1.id;
    customerId2 = customer2.id;

    await redisClient.setEx(`user:status:${adminUser.id}`, 3600, 'ACTIVE');
    await redisClient.setEx(`user:status:${customer1.id}`, 3600, 'ACTIVE');
});

// =============================================================================
// POST /api/export-orders — Tạo ExportOrder
// =============================================================================
describe('POST /api/export-orders — Tạo ExportOrder', () => {

    // [TC-EO-CREATE-01] Happy Path: Tạo thành công
    it('[TC-EO-CREATE-01] Happy Path: Tạo lệnh xuất kho thành công, clone đúng status sang ProductCode', async () => {
        const pc1 = await createReadyProductCode(customerId1);
        const pc2 = await createReadyProductCode(customerId1);

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                productCodeIds: [pc1.id, pc2.id],
                deliveryDateTime: '2026-03-20T09:00:00Z',
                deliveryCost: 500000,
                notes: 'Giao hàng trước 9h'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.status).toBe('DA_TAO_LENH');

        // Verify DB
        const eoId = res.body.data.id;
        const updatedPc1 = await prisma.productCode.findUnique({ where: { id: pc1.id } });
        const updatedPc2 = await prisma.productCode.findUnique({ where: { id: pc2.id } });

        expect(updatedPc1.exportOrderId).toBe(eoId);
        expect(updatedPc1.exportStatus).toBe('DA_TAO_LENH');
        expect(updatedPc1.exportDeliveryDateTime).not.toBeNull();
        expect(updatedPc2.exportOrderId).toBe(eoId);
        expect(updatedPc2.exportStatus).toBe('DA_TAO_LENH');
    });

    // [TC-EO-CREATE-02] Happy Path: Không truyền deliveryDateTime (null)
    it('[TC-EO-CREATE-02] Happy Path: Tạo không có deliveryDateTime → exportDeliveryDateTime = null', async () => {
        const pc = await createReadyProductCode(customerId1);

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [pc.id] });

        expect(res.statusCode).toBe(201);

        const updatedPc = await prisma.productCode.findUnique({ where: { id: pc.id } });
        expect(updatedPc.exportDeliveryDateTime).toBeNull();
    });

    // [TC-EO-CREATE-AUTH-01] No Token → 401
    it('[TC-EO-CREATE-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .send({ productCodeIds: [1] });

        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-CREATE-VAL-01] Missing productCodeIds → 400
    it('[TC-EO-CREATE-VAL-01] Missing productCodeIds → 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ deliveryCost: 500000 });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(99001);
    });

    // [TC-EO-CREATE-VAL-02] productCodeIds là mảng rỗng → 400
    it('[TC-EO-CREATE-VAL-02] productCodeIds rỗng → 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(99001);
    });

    // [TC-EO-CREATE-BVAL-01] vehicleStatus ≠ DA_NHAP_KHO_VN → 400
    it('[TC-EO-CREATE-BVAL-01] vehicleStatus ≠ DA_NHAP_KHO_VN → 400 VEHICLE_STATUS_INVALID', async () => {
        const pc = await createReadyProductCode(customerId1, { vehicleStatus: 'DA_XEP_XE' });

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [pc.id] });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('VEHICLE_STATUS_INVALID');
        expect(res.body.conflicts).toHaveLength(1);
        expect(res.body.conflicts[0].id).toBe(pc.id);

        // DB: không có ExportOrder mới
        const eoCount = await prisma.exportOrder.count();
        expect(eoCount).toBe(0);
    });

    // [TC-EO-CREATE-BVAL-02] Happy Path: Nhiều khách hàng trong cùng 1 lệnh xuất
    it('[TC-EO-CREATE-BVAL-02] Happy Path: Tạo lệnh xuất kho với SP của nhiều khách hàng khác nhau', async () => {
        const pc1 = await createReadyProductCode(customerId1);
        const pc2 = await createReadyProductCode(customerId2);

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                productCodeIds: [pc1.id, pc2.id],
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.status).toBe('DA_TAO_LENH');

        // Verify DB: cả 2 PC đều gắn vào 1 EO
        const eoId = res.body.data.id;
        const updatedPc1 = await prisma.productCode.findUnique({ where: { id: pc1.id } });
        const updatedPc2 = await prisma.productCode.findUnique({ where: { id: pc2.id } });
        expect(updatedPc1.exportOrderId).toBe(eoId);
        expect(updatedPc2.exportOrderId).toBe(eoId);
    });

    // [TC-EO-CREATE-BVAL-03] ProductCode đã có exportOrderId ≠ null → 400
    it('[TC-EO-CREATE-BVAL-03] ProductCode đã thuộc lệnh xuất khác → 400 ALREADY_IN_EXPORT_ORDER', async () => {
        // Tạo ExportOrder cũ trước
        const pc = await createReadyProductCode(customerId1);
        const existingEO = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: existingEO.id, exportStatus: 'DA_TAO_LENH' }
        });

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [pc.id] });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('ALREADY_IN_EXPORT_ORDER');

        // DB: vẫn chỉ 1 ExportOrder (cũ)
        const eoCount = await prisma.exportOrder.count();
        expect(eoCount).toBe(1);
    });

    // [TC-EO-CREATE-BVAL-04] Mixed: 1 hợp lệ + 1 sai vehicleStatus
    it('[TC-EO-CREATE-BVAL-04] Mixed: 1 PC hợp lệ + 1 PC sai vehicleStatus → 400, cả 2 không thay đổi', async () => {
        const pc1 = await createReadyProductCode(customerId1); // DA_NHAP_KHO_VN
        const pc2 = await createReadyProductCode(customerId1, { vehicleStatus: 'CHO_XEP_XE' });

        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [pc1.id, pc2.id] });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('VEHICLE_STATUS_INVALID');

        const unchanged1 = await prisma.productCode.findUnique({ where: { id: pc1.id } });
        const unchanged2 = await prisma.productCode.findUnique({ where: { id: pc2.id } });
        expect(unchanged1.exportOrderId).toBeNull();
        expect(unchanged2.exportOrderId).toBeNull();
    });
});

// =============================================================================
// GET /api/export-orders — Danh sách
// =============================================================================
describe('GET /api/export-orders — Danh sách', () => {

    // [TC-EO-LIST-01] Happy Path
    it('[TC-EO-LIST-01] Happy Path: Lấy danh sách, không trả ExportOrder đã soft delete', async () => {
        // Tạo 2 EO sống + 1 EO soft deleted
        await prisma.exportOrder.create({ data: { status: 'DA_TAO_LENH', createdById: adminId } });
        await prisma.exportOrder.create({ data: { status: 'DA_XUAT_KHO', createdById: adminId } });
        await prisma.exportOrder.create({ data: { status: 'DA_TAO_LENH', createdById: adminId, deletedAt: new Date() } });

        const res = await request(BASE_URL)
            .get('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.total).toBe(2);
        expect(res.body.data.items).toHaveLength(2);
    });

    // [TC-EO-LIST-AUTH-01] No Token → 401
    it('[TC-EO-LIST-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL).get('/api/export-orders');
        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-LIST-FILTER-01] Filter theo status
    it('[TC-EO-LIST-FILTER-01] Filter theo status = DANG_XAC_NHAN_CAN', async () => {
        await prisma.exportOrder.create({ data: { status: 'DA_TAO_LENH', createdById: adminId } });
        await prisma.exportOrder.create({ data: { status: 'DANG_XAC_NHAN_CAN', createdById: adminId } });
        await prisma.exportOrder.create({ data: { status: 'DA_XUAT_KHO', createdById: adminId } });

        const res = await request(BASE_URL)
            .get('/api/export-orders?status=DANG_XAC_NHAN_CAN')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.total).toBe(1);
        expect(res.body.data.items[0].status).toBe('DANG_XAC_NHAN_CAN');
    });
});

// =============================================================================
// GET /api/export-orders/:id — Chi tiết
// =============================================================================
describe('GET /api/export-orders/:id — Chi tiết', () => {

    // [TC-EO-DETAIL-01] Happy Path
    it('[TC-EO-DETAIL-01] Happy Path: Trả đầy đủ productCodes + items với trường actual*', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId, productCodes: { connect: [{ id: pc.id }] } }
        });

        const res = await request(BASE_URL)
            .get(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(eo.id);
        expect(res.body.data.productCodes).toHaveLength(1);
        expect(res.body.data.productCodes[0].items).toHaveLength(1);
        expect(res.body.data.productCodes[0].items[0]).toHaveProperty('actualWeight');
        expect(res.body.data.productCodes[0].items[0]).toHaveProperty('useActualData');
    });

    // [TC-EO-DETAIL-AUTH-01] No Token → 401
    it('[TC-EO-DETAIL-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL).get('/api/export-orders/1');
        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-DETAIL-404] Not Found → 404
    it('[TC-EO-DETAIL-404] ID không tồn tại → 404', async () => {
        const res = await request(BASE_URL)
            .get('/api/export-orders/99999')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
    });

    // [TC-EO-DETAIL-SOFTDEL-01] Soft deleted → 404
    it('[TC-EO-DETAIL-SOFTDEL-01] ExportOrder đã soft delete → 404', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId, deletedAt: new Date() }
        });

        const res = await request(BASE_URL)
            .get(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
    });
});

// =============================================================================
// PATCH /api/export-orders/:id/submit-reweigh
// =============================================================================
describe('PATCH /api/export-orders/:id/submit-reweigh — Gửi số liệu cân lại', () => {

    // [TC-EO-REWEIGH-01] Happy Path + tính đúng actualItemTransportFeeEstimate
    it('[TC-EO-REWEIGH-01] Happy Path: Tính actualItemTransportFeeEstimate theo công thức MAX(vol*volFee, wt*wtFee)', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_TAO_LENH', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: eo.id, exportStatus: 'DA_TAO_LENH' }
        });

        const pi = pc.items[0];

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/submit-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                items: [{ productItemId: pi.id, actualWeight: 95, actualVolume: 0.90 }]
            });

        expect(res.statusCode).toBe(200);

        // Verify DB: actualItemTransportFeeEstimate = MAX(0.90*300000, 95*2000) = MAX(270000,190000) = 270000
        const updatedPi = await prisma.productItem.findUnique({ where: { id: pi.id } });
        expect(updatedPi.actualWeight).toBe(95);
        expect(parseFloat(updatedPi.actualVolume)).toBeCloseTo(0.90, 2);
        expect(parseFloat(updatedPi.actualItemTransportFeeEstimate)).toBeCloseTo(270000, 0);

        // Verify ExportOrder status chuyển
        const updatedEo = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(updatedEo.status).toBe('DANG_XAC_NHAN_CAN');

        // Verify ProductCode clone status
        const updatedPc = await prisma.productCode.findUnique({ where: { id: pc.id } });
        expect(updatedPc.exportStatus).toBe('DANG_XAC_NHAN_CAN');

        // Verify số liệu gốc KHÔNG bị thay đổi
        expect(updatedPi.weight).toBe(100);
        expect(parseFloat(updatedPi.volume)).toBeCloseTo(1.0, 2);
    });

    // [TC-EO-REWEIGH-02] Tính actualImportCostToCustomer có declarationCost
    it('[TC-EO-REWEIGH-02] Tính actualImportCostToCustomer = actualTransportFee + declarationCost', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_TAO_LENH', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: eo.id, exportStatus: 'DA_TAO_LENH' }
        });

        const pi = pc.items[0];
        // Tạo Declaration với declarationCost = 100000
        await prisma.declaration.create({
            data: { productCodeId: pc.id, productItemId: pi.id, declarationCost: 100000 }
        });

        // Thêm các phí RMB vào item
        await prisma.productItem.update({
            where: { id: pi.id },
            data: { domesticFeeTQ: 50, haulingFeeTQ: 30, unloadingFeeRMB: 20 }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/submit-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                items: [{ productItemId: pi.id, actualWeight: 80, actualVolume: 0.80 }]
            });

        expect(res.statusCode).toBe(200);

        // extraFeeVND = (50+30+20)*3500 = 350000
        // feeByVolume = 0.80*300000 = 240000
        // feeByWeight = 80*2000 = 160000
        // actualTransportFee = MAX(240000,160000) + 350000 = 590000
        // actualImportCost = 590000 + 100000 = 690000
        const updatedPi = await prisma.productItem.findUnique({ where: { id: pi.id } });
        expect(parseFloat(updatedPi.actualItemTransportFeeEstimate)).toBeCloseTo(590000, 0);
        expect(parseFloat(updatedPi.actualImportCostToCustomer)).toBeCloseTo(690000, 0);
    });

    // [TC-EO-REWEIGH-AUTH-01] No Token → 401
    it('[TC-EO-REWEIGH-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/1/submit-reweigh')
            .send({ items: [] });

        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-REWEIGH-404] Not Found → 404
    it('[TC-EO-REWEIGH-404] ExportOrder không tồn tại → 404', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/99999/submit-reweigh')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ productItemId: 1, actualWeight: 50, actualVolume: 0.5 }] });

        expect(res.statusCode).toBe(404);
    });

    // [TC-EO-REWEIGH-VAL-01] Status ≠ DA_TAO_LENH → 400 INVALID_STATUS_TRANSITION
    it('[TC-EO-REWEIGH-VAL-01] Status DANG_XAC_NHAN_CAN → 400 INVALID_STATUS_TRANSITION, DB không đổi', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: { status: 'DANG_XAC_NHAN_CAN', createdById: adminId, productCodes: { connect: [{ id: pc.id }] } }
        });
        const pi = pc.items[0];
        const originalWeight = pi.actualWeight;

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/submit-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ productItemId: pi.id, actualWeight: 50, actualVolume: 0.5 }] });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');

        // DB: item không thay đổi
        const unchangedPi = await prisma.productItem.findUnique({ where: { id: pi.id } });
        expect(unchangedPi.actualWeight).toBe(originalWeight);

        // EO status không đổi
        const unchangedEo = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(unchangedEo.status).toBe('DANG_XAC_NHAN_CAN');
    });
});

// =============================================================================
// PATCH /api/export-orders/:id/confirm-reweigh
// =============================================================================
describe('PATCH /api/export-orders/:id/confirm-reweigh — Admin xác nhận số cân', () => {

    // [TC-EO-CONFIRM-01] Happy Path: per-item mixed true/false
    it('[TC-EO-CONFIRM-01] Happy Path: useActualData set đúng per-item, status → DA_XAC_NHAN_CAN, số liệu gốc không đổi', async () => {
        const pc = await prisma.productCode.create({
            data: {
                customerId: customerId1,
                orderCode: 'CONFIRM-TEST',
                vehicleStatus: 'DA_NHAP_KHO_VN',
                exchangeRate: 3500,
                items: {
                    create: [
                        { productName: 'Item A', weight: 100, volume: 1.0, itemTransportFeeEstimate: 300000, actualWeight: 90, actualVolume: 0.9 },
                        { productName: 'Item B', weight: 50, volume: 0.5, itemTransportFeeEstimate: 150000, actualWeight: 45, actualVolume: 0.45 }
                    ]
                }
            },
            include: { items: true }
        });

        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DANG_XAC_NHAN_CAN', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });

        const pi1 = pc.items[0];
        const pi2 = pc.items[1];

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/confirm-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                items: [
                    { productItemId: pi1.id, useActualData: true },
                    { productItemId: pi2.id, useActualData: false }
                ]
            });

        expect(res.statusCode).toBe(200);

        // Verify DB
        const updatedPi1 = await prisma.productItem.findUnique({ where: { id: pi1.id } });
        const updatedPi2 = await prisma.productItem.findUnique({ where: { id: pi2.id } });

        expect(updatedPi1.useActualData).toBe(true);
        expect(updatedPi2.useActualData).toBe(false);

        // Số liệu gốc KHÔNG bị xóa
        expect(updatedPi1.weight).toBe(100);
        expect(parseFloat(updatedPi1.volume)).toBeCloseTo(1.0, 2);

        // EO status
        const updatedEo = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(updatedEo.status).toBe('DA_XAC_NHAN_CAN');

        // ProductCode clone
        const updatedPc = await prisma.productCode.findUnique({ where: { id: pc.id } });
        expect(updatedPc.exportStatus).toBe('DA_XAC_NHAN_CAN');
    });

    // [TC-EO-CONFIRM-02] Bulk: tất cả useActualData = true
    it('[TC-EO-CONFIRM-02] Bulk all true: tất cả item đều useActualData = true sau khi confirm', async () => {
        const pc = await prisma.productCode.create({
            data: {
                customerId: customerId1,
                orderCode: 'BULK-TEST',
                vehicleStatus: 'DA_NHAP_KHO_VN',
                exchangeRate: 3500,
                items: {
                    create: [
                        { productName: 'Item X', weight: 100, volume: 1.0, actualWeight: 90, actualVolume: 0.9 },
                        { productName: 'Item Y', weight: 50, volume: 0.5, actualWeight: 45, actualVolume: 0.45 },
                        { productName: 'Item Z', weight: 70, volume: 0.7, actualWeight: 65, actualVolume: 0.65 }
                    ]
                }
            },
            include: { items: true }
        });

        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DANG_XAC_NHAN_CAN', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/confirm-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                items: pc.items.map(pi => ({ productItemId: pi.id, useActualData: true }))
            });

        expect(res.statusCode).toBe(200);

        const updatedItems = await prisma.productItem.findMany({ where: { productCodeId: pc.id } });
        updatedItems.forEach(pi => expect(pi.useActualData).toBe(true));
    });

    // [TC-EO-CONFIRM-AUTH-01] No Token → 401
    it('[TC-EO-CONFIRM-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/1/confirm-reweigh')
            .send({ items: [] });

        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-CONFIRM-404] Not Found → 404
    it('[TC-EO-CONFIRM-404] ExportOrder không tồn tại → 404', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/99999/confirm-reweigh')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ productItemId: 1, useActualData: true }] });

        expect(res.statusCode).toBe(404);
    });

    // [TC-EO-CONFIRM-VAL-01] Status ≠ DANG_XAC_NHAN_CAN → 400
    it('[TC-EO-CONFIRM-VAL-01] Status DA_TAO_LENH → 400 INVALID_STATUS_TRANSITION', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId, productCodes: { connect: [{ id: pc.id }] } }
        });
        const pi = pc.items[0];

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/confirm-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ productItemId: pi.id, useActualData: true }] });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');

        // DB không đổi
        const pi2 = await prisma.productItem.findUnique({ where: { id: pi.id } });
        expect(pi2.useActualData).toBe(false);
    });
});

// =============================================================================
// PATCH /api/export-orders/:id/status — Giao hàng
// =============================================================================
describe('PATCH /api/export-orders/:id/status — Cập nhật trạng thái (Giao hàng)', () => {

    // [TC-EO-STATUS-01] Happy Path: DA_XAC_NHAN_CAN → DA_XUAT_KHO
    it('[TC-EO-STATUS-01] Happy Path: DA_XAC_NHAN_CAN → DA_XUAT_KHO, lưu amountReceived + actualShippingCost', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_XAC_NHAN_CAN', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: eo.id, exportStatus: 'DA_XAC_NHAN_CAN' }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DA_XUAT_KHO', amountReceived: 2500000, actualShippingCost: 150000 });

        expect(res.statusCode).toBe(200);

        const updatedEo = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(updatedEo.status).toBe('DA_XUAT_KHO');
        expect(updatedEo.amountReceived).toBe(2500000);
        expect(updatedEo.actualShippingCost).toBe(150000);

        const updatedPc = await prisma.productCode.findUnique({ where: { id: pc.id } });
        expect(updatedPc.exportStatus).toBe('DA_XUAT_KHO');
    });

    // [TC-EO-STATUS-AUTH-01] No Token → 401
    it('[TC-EO-STATUS-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/1/status')
            .send({ status: 'DA_XUAT_KHO' });

        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-STATUS-404] Not Found → 404
    it('[TC-EO-STATUS-404] ExportOrder không tồn tại → 404', async () => {
        const res = await request(BASE_URL)
            .patch('/api/export-orders/99999/status')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DA_XUAT_KHO' });

        expect(res.statusCode).toBe(404);
    });

    // [TC-EO-STATUS-VAL-01] Nhảy cóc: DA_TAO_LENH → DA_XUAT_KHO → 400
    it('[TC-EO-STATUS-VAL-01] Nhảy cóc DA_TAO_LENH → DA_XUAT_KHO → 400 INVALID_STATUS_TRANSITION', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DA_XUAT_KHO' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');

        const unchanged = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(unchanged.status).toBe('DA_TAO_LENH');
    });

    // [TC-EO-STATUS-VAL-02] DA_TAO_LENH → DA_XAC_NHAN_CAN → 400
    it('[TC-EO-STATUS-VAL-02] DA_TAO_LENH → DA_XAC_NHAN_CAN → 400 INVALID_STATUS_TRANSITION', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_TAO_LENH', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DA_XAC_NHAN_CAN' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    // [TC-EO-STATUS-VAL-03] DA_XUAT_KHO → bất kỳ → 400
    it('[TC-EO-STATUS-VAL-03] Trạng thái cuối DA_XUAT_KHO không thể chuyển tiếp → 400', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_XUAT_KHO', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DA_TAO_LENH' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });
});

// =============================================================================
// DELETE /api/export-orders/:id — Hủy ExportOrder
// =============================================================================
describe('DELETE /api/export-orders/:id — Hủy ExportOrder', () => {

    // [TC-EO-CANCEL-01] Happy Path: Hủy thành công, reset ProductCode fields
    it('[TC-EO-CANCEL-01] Happy Path: soft delete EO, reset exportOrderId/exportStatus/exportDeliveryDateTime = null trên ProductCode', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_TAO_LENH', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: {
                exportOrderId: eo.id,
                exportStatus: 'DA_TAO_LENH',
                exportDeliveryDateTime: new Date('2026-03-20T09:00:00Z')
            }
        });

        const res = await request(BASE_URL)
            .delete(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);

        // EO bị soft delete
        const deletedEo = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(deletedEo.deletedAt).not.toBeNull();

        // ProductCode reset
        const resetPc = await prisma.productCode.findUnique({ where: { id: pc.id } });
        expect(resetPc.exportOrderId).toBeNull();
        expect(resetPc.exportStatus).toBeNull();
        expect(resetPc.exportDeliveryDateTime).toBeNull();
    });

    // [TC-EO-CANCEL-AUTH-01] No Token → 401
    it('[TC-EO-CANCEL-AUTH-01] No Token → 401', async () => {
        const res = await request(BASE_URL).delete('/api/export-orders/1');
        expect(res.statusCode).toBe(401);
    });

    // [TC-EO-CANCEL-404] Not Found → 404
    it('[TC-EO-CANCEL-404] ExportOrder không tồn tại → 404', async () => {
        const res = await request(BASE_URL)
            .delete('/api/export-orders/99999')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
    });

    // [TC-EO-CANCEL-VAL-01] Status = DANG_XAC_NHAN_CAN → 400 CANNOT_CANCEL
    it('[TC-EO-CANCEL-VAL-01] Status DANG_XAC_NHAN_CAN → 400 CANNOT_CANCEL, EO không bị xóa', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DANG_XAC_NHAN_CAN', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .delete(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('CANNOT_CANCEL');

        const unchanged = await prisma.exportOrder.findUnique({ where: { id: eo.id } });
        expect(unchanged.deletedAt).toBeNull();
    });

    // [TC-EO-CANCEL-VAL-02] Status = DA_XAC_NHAN_CAN → 400 CANNOT_CANCEL
    it('[TC-EO-CANCEL-VAL-02] Status DA_XAC_NHAN_CAN → 400 CANNOT_CANCEL', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_XAC_NHAN_CAN', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .delete(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('CANNOT_CANCEL');
    });

    // [TC-EO-CANCEL-VAL-03] Status = DA_XUAT_KHO → 400 CANNOT_CANCEL
    it('[TC-EO-CANCEL-VAL-03] Status DA_XUAT_KHO → 400 CANNOT_CANCEL', async () => {
        const eo = await prisma.exportOrder.create({
            data: { status: 'DA_XUAT_KHO', createdById: adminId }
        });

        const res = await request(BASE_URL)
            .delete(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.errorCode).toBe('CANNOT_CANCEL');
    });
});

// =============================================================================
// Cache Invalidation
// =============================================================================
describe('Cache Invalidation', () => {

    // [TC-EO-CACHE-01] Create ExportOrder → invalidate list cache
    it('[TC-EO-CACHE-01] POST tạo mới → list cache bị invalidate → GET trả data mới', async () => {
        // Populate cache
        await request(BASE_URL)
            .get('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`);

        // Tạo mới
        const pc = await createReadyProductCode(customerId1);
        const res = await request(BASE_URL)
            .post('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productCodeIds: [pc.id] });

        // GET lại → phải thấy bản ghi mới
        const getRes = await request(BASE_URL)
            .get('/api/export-orders')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(getRes.body.data.total).toBe(1);
    });

    // [TC-EO-CACHE-02] submit-reweigh → invalidate product-codes cache
    it('[TC-EO-CACHE-02] submit-reweigh → product-codes list cache bị invalidate → exportStatus cập nhật đúng', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_TAO_LENH', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: eo.id, exportStatus: 'DA_TAO_LENH' }
        });

        // Populate product-codes cache
        await request(BASE_URL).get('/api/product-codes').set('Authorization', `Bearer ${adminToken}`);

        // submit-reweigh
        await request(BASE_URL)
            .patch(`/api/export-orders/${eo.id}/submit-reweigh`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ productItemId: pc.items[0].id, actualWeight: 90, actualVolume: 0.9 }] });

        // GET product-codes → exportStatus phải là DANG_XAC_NHAN_CAN (không phải stale cache)
        const getRes = await request(BASE_URL)
            .get('/api/product-codes')
            .set('Authorization', `Bearer ${adminToken}`);

        const updatedPc = getRes.body.data.items.find(p => p.id === pc.id);
        expect(updatedPc.exportStatus).toBe('DANG_XAC_NHAN_CAN');
    });

    // [TC-EO-CACHE-03] Cancel → invalidate export-orders và product-codes cache
    it('[TC-EO-CACHE-03] Cancel EO → cả 2 cache bị invalidate → GET phản ánh đúng', async () => {
        const pc = await createReadyProductCode(customerId1);
        const eo = await prisma.exportOrder.create({
            data: {
                status: 'DA_TAO_LENH', createdById: adminId,
                productCodes: { connect: [{ id: pc.id }] }
            }
        });
        await prisma.productCode.update({
            where: { id: pc.id },
            data: { exportOrderId: eo.id, exportStatus: 'DA_TAO_LENH' }
        });

        // Populate cả 2 cache
        await request(BASE_URL).get('/api/export-orders').set('Authorization', `Bearer ${adminToken}`);
        await request(BASE_URL).get('/api/product-codes').set('Authorization', `Bearer ${adminToken}`);

        // Cancel EO
        await request(BASE_URL)
            .delete(`/api/export-orders/${eo.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        // GET export-orders → không còn EO (status ok và items rỗng)
        const eoRes = await request(BASE_URL).get('/api/export-orders').set('Authorization', `Bearer ${adminToken}`);
        expect(eoRes.body.data.total).toBe(0);

        // GET product-codes → exportStatus = null
        const pcRes = await request(BASE_URL).get('/api/product-codes').set('Authorization', `Bearer ${adminToken}`);
        const updatedPc = pcRes.body.data.items.find(p => p.id === pc.id);
        expect(updatedPc.exportOrderId).toBeNull();
        expect(updatedPc.exportStatus).toBeNull();
    });
});
