const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUnique(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
}

// ─── Product item pool (đa dạng loại hàng & đơn vị kiện) ─────────────────────
const PRODUCT_POOL = [
    // Thời trang
    { name: 'Áo phông cotton', unit: 'THUNG_CARTON', brand: 'Fashion Co', importTax: 12, vatTax: 10 },
    { name: 'Quần jean denim', unit: 'THUNG_CARTON', brand: 'Denim Plus', importTax: 12, vatTax: 10 },
    { name: 'Váy đầm thời trang', unit: 'THUNG_CARTON', brand: 'Lady Style', importTax: 12, vatTax: 10 },
    { name: 'Áo khoác hoodie', unit: 'BAO_TAI', brand: 'Urban Wear', importTax: 12, vatTax: 10 },
    { name: 'Quần short thể thao', unit: 'BAO_TAI', brand: 'Sport Max', importTax: 12, vatTax: 10 },
    { name: 'Áo sơ mi nam', unit: 'THUNG_CARTON', brand: 'Men Style', importTax: 12, vatTax: 10 },
    // Giày dép
    { name: 'Giày thể thao nam', unit: 'THUNG_CARTON', brand: 'RunFast', importTax: 10, vatTax: 10 },
    { name: 'Dép sandal nữ', unit: 'BAO_TAI', brand: 'SandStep', importTax: 10, vatTax: 10 },
    { name: 'Giày da công sở', unit: 'PALLET', brand: 'Office Leather', importTax: 10, vatTax: 10 },
    { name: 'Bốt cổ cao nữ', unit: 'THUNG_CARTON', brand: 'BootChic', importTax: 10, vatTax: 10 },
    { name: 'Giày lười vải', unit: 'THUNG_CARTON', brand: 'CasualStep', importTax: 10, vatTax: 10 },
    // Điện tử / phụ kiện
    { name: 'Tai nghe Bluetooth', unit: 'THUNG_CARTON', brand: 'SoundPro', importTax: 8, vatTax: 10 },
    { name: 'Sạc dự phòng 20000mAh', unit: 'THUNG_CARTON', brand: 'PowerBank Pro', importTax: 8, vatTax: 10 },
    { name: 'Đèn LED trang trí', unit: 'THUNG_CARTON', brand: 'BrightLife', importTax: 5, vatTax: 10 },
    { name: 'Cáp sạc đa năng', unit: 'BAO_TAI', brand: 'CableMax', importTax: 5, vatTax: 10 },
    { name: 'Phụ kiện điện thoại', unit: 'KHONG_DONG_GOI', brand: 'MobiGear', importTax: 5, vatTax: 10 },
    { name: 'Bàn phím cơ mini', unit: 'THUNG_CARTON', brand: 'TypePro', importTax: 8, vatTax: 10 },
    // Túi xách / phụ kiện thời trang
    { name: 'Túi xách da PU', unit: 'THUNG_CARTON', brand: 'PU Luxe', importTax: 12, vatTax: 10 },
    { name: 'Ví da cầm tay', unit: 'KHONG_DONG_GOI', brand: 'WalletCraft', importTax: 12, vatTax: 10 },
    { name: 'Thắt lưng da nam', unit: 'THUNG_CARTON', brand: 'BeltPro', importTax: 12, vatTax: 10 },
    { name: 'Mũ lưỡi trai', unit: 'BAO_TAI', brand: 'CapStyle', importTax: 12, vatTax: 10 },
    { name: 'Khăn quàng cổ', unit: 'BAO_TAI', brand: 'ScarfZone', importTax: 12, vatTax: 10 },
    // Đồ gia dụng
    { name: 'Chăn ga gối cao cấp', unit: 'PALLET', brand: 'SleepWell', importTax: 5, vatTax: 10 },
    { name: 'Đèn ngủ cảm ứng', unit: 'THUNG_CARTON', brand: 'NightLight', importTax: 5, vatTax: 10 },
    { name: 'Khung ảnh nghệ thuật', unit: 'THUNG_CARTON', brand: 'ArtFrame', importTax: 5, vatTax: 10 },
    { name: 'Bình giữ nhiệt', unit: 'THUNG_CARTON', brand: 'ThermoKeep', importTax: 5, vatTax: 10 },
    // Đồ chơi
    { name: 'Xe đồ chơi điều khiển', unit: 'THUNG_CARTON', brand: 'RCZone', importTax: 5, vatTax: 10 },
    { name: 'Búp bê thời trang', unit: 'BAO_TAI', brand: 'DollWorld', importTax: 5, vatTax: 10 },
    { name: 'Đồ xếp hình sáng tạo', unit: 'THUNG_CARTON', brand: 'BuildKid', importTax: 5, vatTax: 10 },
    { name: 'Thú nhồi bông', unit: 'BAO_TAI', brand: 'SoftToy', importTax: 5, vatTax: 10 },
    // Mỹ phẩm
    { name: 'Kem dưỡng da mặt', unit: 'THUNG_CARTON', brand: 'SkinGlow', importTax: 8, vatTax: 10 },
    { name: 'Son môi thời trang', unit: 'KHONG_DONG_GOI', brand: 'LipColor', importTax: 8, vatTax: 10 },
    { name: 'Nước hoa mini set', unit: 'THUNG_CARTON', brand: 'PerfumeCo', importTax: 8, vatTax: 10 },
    // Hàng sỉ / bao bì lớn
    { name: 'Vải thun cuộn', unit: 'PALLET', brand: 'FabricRoll', importTax: 5, vatTax: 8 },
    { name: 'Hạt nhựa nguyên liệu', unit: 'BAO_TAI', brand: 'PlasticRaw', importTax: 5, vatTax: 8 },
];

const EXCHANGE_RATE = 3500;
const WEIGHT_FEE = 30000;
const VOLUME_FEE = 3500000;

async function main() {
    const password = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || '123456', 10);

    // ─── SEED USERS ───────────────────────────────────────────────────────────
    const users = [
        { username: 'admin', fullName: 'Administrator', email: 'admin@3t.com', role: 'ADMIN', phone: '0909000001' },
        { username: 'manager_vu', fullName: 'Vũ Quản Lý', email: 'vu.manager@3t.com', role: 'ADMIN', phone: '0909000002' },
        { username: 'sale_thuy', fullName: 'Nguyễn Thị Thủy', email: 'thuy.sale@3t.com', role: 'SALE', phone: '0909000011' },
        { username: 'sale_hung', fullName: 'Phạm Văn Hùng', email: 'hung.sale@3t.com', role: 'SALE', phone: '0909000012' },
        { username: 'kho_an', fullName: 'Trần Văn An', email: 'an.kho@3t.com', role: 'WAREHOUSE', phone: '0909000021' },
        { username: 'kho_binh', fullName: 'Lê Văn Bình', email: 'binh.kho@3t.com', role: 'WAREHOUSE', phone: '0909000022' },
        { username: 'ketoan_lan', fullName: 'Hoàng Thị Lan', email: 'lan.kt@3t.com', role: 'ACCOUNTANT', phone: '0909000031' },
        { username: 'ketoan_hoa', fullName: 'Vũ Thị Hoa', email: 'hoa.kt@3t.com', role: 'ACCOUNTANT', phone: '0909000032' },
    ];

    console.log('Seeding Users...');
    for (const u of users) {
        const existing = await prisma.user.findFirst({ where: { username: u.username, deletedAt: null } });
        if (!existing) {
            await prisma.user.create({
                data: { ...u, password, type: 'EMPLOYEE', isActive: true }
            });
            console.log(`  Created User: ${u.username} (${u.role})`);
        } else {
            console.log(`  Exists: ${u.username}`);
        }
    }

    // ─── SEED CATEGORIES ─────────────────────────────────────────────────────
    const categories = [
        'Quần áo thời trang', 'Giày dép', 'Linh kiện điện tử', 'Đồ gia dụng',
        'Mỹ phẩm', 'Thực phẩm chức năng', 'Phụ kiện điện thoại', 'Túi xách',
        'Đồ chơi trẻ em', 'Máy móc công nghiệp'
    ];

    console.log('Seeding Categories...');
    for (const catName of categories) {
        const existing = await prisma.category.findFirst({ where: { name: catName, deletedAt: null } });
        if (!existing) {
            await prisma.category.create({ data: { name: catName, status: 'AVAILABLE' } });
            console.log(`  Created Category: ${catName}`);
        }
    }

    // ─── SEED WAREHOUSES ─────────────────────────────────────────────────────
    const warehouses = [
        'Kho Hà Nội', 'Kho Sài Gòn', 'Kho Quảng Châu (TQ)',
        'Kho Bằng Tường (TQ)', 'Kho Đông Hưng (TQ)'
    ];

    console.log('Seeding Warehouses...');
    for (const whName of warehouses) {
        const existing = await prisma.warehouse.findFirst({ where: { name: whName, deletedAt: null } });
        if (!existing) {
            await prisma.warehouse.create({ data: { name: whName, status: 'AVAILABLE' } });
            console.log(`  Created Warehouse: ${whName}`);
        }
    }

    // ─── SEED CUSTOMERS ──────────────────────────────────────────────────────
    console.log('Seeding Customers...');
    const sales = await prisma.user.findMany({ where: { role: 'SALE', deletedAt: null } });

    if (sales.length > 0) {
        const customers = [
            { username: 'kh_minh', fullName: 'Nguyễn Văn Minh', email: 'minh.kh@gmail.com', phone: '0912345678', customerCode: 'KH001', address: 'Hà Nội' },
            { username: 'kh_hang', fullName: 'Trần Thị Hằng', email: 'hang.kh@gmail.com', phone: '0912345679', customerCode: 'KH002', address: 'Hải Phòng' },
            { username: 'kh_tuan', fullName: 'Lê Anh Tuấn', email: 'tuan.kh@gmail.com', phone: '0912345680', customerCode: 'KH003', address: 'Đà Nẵng' },
            { username: 'kh_ngoc', fullName: 'Phạm Thị Ngọc', email: 'ngoc.kh@gmail.com', phone: '0912345681', customerCode: 'KH004', address: 'HCM' },
            { username: 'kh_duc', fullName: 'Hoàng Minh Đức', email: 'duc.kh@gmail.com', phone: '0912345682', customerCode: 'KH005', address: 'Cần Thơ' },
            { username: 'kh_ly', fullName: 'Vũ Thị Ly', email: 'ly.kh@gmail.com', phone: '0912345683', customerCode: 'KH006', address: 'Bắc Ninh' },
            { username: 'kh_quang', fullName: 'Ngô Đăng Quang', email: 'quang.kh@gmail.com', phone: '0912345684', customerCode: 'KH007', address: 'Nam Định' },
            { username: 'kh_mai', fullName: 'Đỗ Tuyết Mai', email: 'mai.kh@gmail.com', phone: '0912345685', customerCode: 'KH008', address: 'Thái Bình' },
            { username: 'kh_cuong', fullName: 'Bùi Văn Cường', email: 'cuong.kh@gmail.com', phone: '0912345686', customerCode: 'KH009', address: 'Hưng Yên' },
            { username: 'kh_thao', fullName: 'Dương Thu Thảo', email: 'thao.kh@gmail.com', phone: '0912345687', customerCode: 'KH010', address: 'Hà Nam' },
        ];

        for (let i = 0; i < customers.length; i++) {
            const c = customers[i];
            const existing = await prisma.user.findFirst({ where: { username: c.username, deletedAt: null } });
            if (!existing) {
                await prisma.user.create({
                    data: {
                        ...c, password,
                        role: 'USER', type: 'CUSTOMER',
                        saleId: sales[i % sales.length].id,
                        isActive: true
                    }
                });
                console.log(`  Created Customer: ${c.username} (${c.customerCode})`);
            } else {
                console.log(`  Exists: ${c.username}`);
            }
        }
    } else {
        console.warn('  No SALE users — skipping customers.');
    }

    // ─── SEED TRANSACTIONS ───────────────────────────────────────────────────
    console.log('Seeding Transactions...');
    const dbCustomers = await prisma.user.findMany({ where: { type: 'CUSTOMER', deletedAt: null } });
    const accountants = await prisma.user.findMany({ where: { role: 'ACCOUNTANT', deletedAt: null } });

    if (dbCustomers.length > 0 && accountants.length > 0) {
        for (const cus of dbCustomers) {
            const existing = await prisma.transaction.findFirst({ where: { customerId: cus.id } });
            if (!existing) {
                const numTrans = randInt(1, 3);
                for (let k = 0; k < numTrans; k++) {
                    const amount = randInt(1, 10) * 1000000;
                    const accountant = accountants[Math.floor(Math.random() * accountants.length)];
                    await prisma.transaction.create({
                        data: {
                            amount, content: `Nạp tiền lần ${k + 1}`,
                            status: 'SUCCESS',
                            customerId: cus.id, createdById: accountant.id
                        }
                    });
                }
                console.log(`  Created ${numTrans} transactions for: ${cus.username}`);
            } else {
                console.log(`  Transactions exist: ${cus.username}`);
            }
        }
    }

    // ─── SEED MERCHANDISE CONDITIONS ─────────────────────────────────────────
    console.log('Seeding Merchandise Conditions...');
    const conditions = [
        { name_vi: 'Nhập kho', name_zh: '入库', canLoadVehicle: true },
        { name_vi: 'Kho TQ', name_zh: '中国仓库', canLoadVehicle: true },
        { name_vi: 'Đang vận chuyển', name_zh: '运输中', canLoadVehicle: false },
        { name_vi: 'Đã giao', name_zh: '已交付', canLoadVehicle: false },
    ];
    for (const cond of conditions) {
        const existing = await prisma.merchandiseCondition.findFirst({ where: { name_vi: cond.name_vi } });
        if (!existing) {
            await prisma.merchandiseCondition.create({ data: cond });
            console.log(`  Created MerchandiseCondition: ${cond.name_vi}`);
        }
    }

    // ─── SEED PRODUCT CODES ──────────────────────────────────────────────────
    console.log('Seeding Product Codes...');
    const KHOI_PHU_TRACH_POOL = ['Khối Bắc', 'Khối Nam', 'Khối Trung', 'Khối Tây Nguyên', null];
    const warehouseEmps = await prisma.user.findMany({ where: { role: 'WAREHOUSE', deletedAt: null } });
    const pCustomers = await prisma.user.findMany({ where: { type: 'CUSTOMER', deletedAt: null } });
    const targetCondition = await prisma.merchandiseCondition.findFirst({ where: { name_vi: 'Nhập kho' } });

    if (warehouseEmps.length > 0 && pCustomers.length > 0 && targetCondition) {
        const existingCount = await prisma.productCode.count();
        const TARGET_COUNT = 40;

        if (existingCount < TARGET_COUNT) {
            for (let i = existingCount; i < TARGET_COUNT; i++) {
                const customer = pCustomers[i % pCustomers.length];
                const emp = warehouseEmps[i % warehouseEmps.length];

                // Random 1–4 mặt hàng, không trùng tên trong cùng mã hàng
                const numItems = randInt(1, 4);
                const selectedProducts = pickUnique(PRODUCT_POOL, numItems);

                // Tạo product code trước để lấy ID
                const pc = await prisma.productCode.create({
                    data: {
                        khoiPhuTrach: KHOI_PHU_TRACH_POOL[i % KHOI_PHU_TRACH_POOL.length],
                        employeeId: emp.id,
                        customerId: customer.id,
                        merchandiseConditionId: targetCondition.id,
                        entryDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
                        orderCode: `ORDER${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
                        totalWeight: 0,
                        totalVolume: 0,
                        infoSource: 'Kho TQ',
                        totalTransportFeeEstimate: 0,
                        exchangeRate: EXCHANGE_RATE,
                        notes: i % 5 === 0 ? `Lô hàng đặc biệt số ${i + 1}, cần kiểm tra kỹ trước khi nhập kho` : null,
                    }
                });

                let pcTotalWeight = 0;
                let pcTotalVolume = 0;
                let pcTotalFee = 0;

                for (const prod of selectedProducts) {
                    const weight = randInt(5, 35);
                    const volume = parseFloat((Math.random() * 1.8 + 0.1).toFixed(3));
                    const packageCount = randInt(1, 20);
                    const domesticFeeTQ = randInt(5, 25);
                    const haulingFeeTQ = randInt(0, 15);
                    const unloadingFeeRMB = randInt(1, 10);
                    const itemFee = Math.max(weight * WEIGHT_FEE, volume * VOLUME_FEE)
                        + (domesticFeeTQ + haulingFeeTQ + unloadingFeeRMB) * EXCHANGE_RATE;

                    pcTotalWeight += weight;
                    pcTotalVolume += volume;
                    pcTotalFee += itemFee;

                    await prisma.productItem.create({
                        data: {
                            productCodeId: pc.id,
                            productName: prod.name,
                            packageCount,
                            packageUnit: prod.unit,
                            weight,
                            volume,
                            weightFee: WEIGHT_FEE,
                            volumeFee: VOLUME_FEE,
                            domesticFeeTQ,
                            haulingFeeTQ,
                            unloadingFeeRMB,
                            itemTransportFeeEstimate: Math.round(itemFee),
                            notes: 'Seed data',
                            declaration: {
                                create: {
                                    productCodeId: pc.id,
                                    productQuantity: randInt(50, 500),
                                    brand: prod.brand,
                                    productDescription: `Mô tả ${prod.name}`,
                                    importTax: prod.importTax,
                                    vatTax: prod.vatTax,
                                    declarationCost: 0,
                                    importCostToCustomer: Math.round(itemFee),
                                }
                            }
                        }
                    });
                }

                // Cập nhật tổng trên product code
                await prisma.productCode.update({
                    where: { id: pc.id },
                    data: {
                        totalWeight: Math.round(pcTotalWeight),
                        totalVolume: parseFloat(pcTotalVolume.toFixed(3)),
                        totalTransportFeeEstimate: Math.round(pcTotalFee),
                        totalImportCostToCustomer: Math.round(pcTotalFee),
                    }
                });

                console.log(`  Created ProductCode: ${pc.orderCode} — ${numItems} mặt hàng (${selectedProducts.map(p => p.unit).join(', ')})`);
            }
        } else {
            console.log('  Product Codes already seeded (≥ 40).');
        }
    } else {
        console.warn('  Skipping product codes (Need Employees, Customers & Conditions).');
    }

    // ─── SEED MANIFESTS (XẾP XE) ─────────────────────────────────────────────
    console.log('Seeding Manifests...');
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', deletedAt: null } });

    const manifestDefs = [
        { licensePlate: '51C-123.45', status: 'CHO_XEP_XE', note: 'Xe đang chờ xếp hàng tại kho TQ' },
        { licensePlate: '29A-456.78', status: 'DA_XEP_XE', note: 'Đã xếp hàng xong, chuẩn bị xuất phát' },
        { licensePlate: '43B-789.01', status: 'DANG_KIEM_HOA', note: 'Đang kiểm tra hải quan cửa khẩu Bằng Tường' },
        { licensePlate: '92C-234.56', status: 'CHO_THONG_QUAN', note: 'Chờ cấp phép thông quan' },
        { licensePlate: '30E-567.89', status: 'DA_THONG_QUAN', note: 'Đã thông quan, đang vận chuyển về HN' },
        { licensePlate: '51G-890.12', status: 'DA_NHAP_KHO_VN', note: 'Đã nhập kho Hà Nội' },
    ];

    const existingManifestCount = await prisma.manifest.count();
    if (existingManifestCount === 0 && admins.length > 0) {
        // Lấy tất cả product codes chưa có xe, để lại 5 cái không xếp (= Chưa xếp xe)
        const allPcs = await prisma.productCode.findMany({
            where: { manifestId: null, deletedAt: null },
            orderBy: { id: 'asc' }
        });
        const pcsToAssign = allPcs.slice(0, Math.max(0, allPcs.length - 5));
        const perManifest = Math.ceil(pcsToAssign.length / manifestDefs.length);

        let pcIdx = 0;
        for (let m = 0; m < manifestDefs.length; m++) {
            const def = manifestDefs[m];
            const chunk = pcsToAssign.slice(pcIdx, pcIdx + perManifest);
            pcIdx += perManifest;

            const caller = admins[m % admins.length];
            // Ngày xếp xe: trải đều trong 3 tháng gần đây
            const daysAgo = (manifestDefs.length - m) * 14;
            const manifestDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

            const manifest = await prisma.manifest.create({
                data: {
                    licensePlate: def.licensePlate,
                    callerId: caller.id,
                    date: manifestDate,
                    status: def.status,
                    note: def.note,
                }
            });

            // Gán product codes vào manifest này
            for (const pc of chunk) {
                await prisma.productCode.update({
                    where: { id: pc.id },
                    data: {
                        manifestId: manifest.id,
                        vehicleStatus: def.status,
                    }
                });
            }

            console.log(`  Created Manifest: ${def.licensePlate} [${def.status}] — ${chunk.length} mã hàng`);
        }
        console.log(`  ${allPcs.length - pcsToAssign.length} mã hàng giữ nguyên (Chưa xếp xe)`);
    } else if (existingManifestCount > 0) {
        console.log('  Manifests already seeded.');
    } else {
        console.warn('  Skipping manifests (Need ADMIN users).');
    }

    // ─── SEED EXPORT ORDERS + TRANSACTIONS (DEBT DEMO) ──────────────────────
    console.log('Seeding Export Orders + Transactions (debt demo)...');
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } });
    const accountantUser = await prisma.user.findFirst({ where: { role: 'ACCOUNTANT', deletedAt: null } });
    const debtCustomers = await prisma.user.findMany({ where: { type: 'CUSTOMER', deletedAt: null }, orderBy: { id: 'asc' } });

    const MARKER = '[DEBT_SEED_V2]';
    const markerOrder = await prisma.exportOrder.findFirst({ where: { notes: { contains: MARKER } } });

    // Nếu còn data V1 cũ → xóa sạch để reseed
    const oldMarker = await prisma.exportOrder.findFirst({ where: { notes: { contains: '[DEBT_SEED]' } } });
    if (oldMarker && !markerOrder) {
        console.log('  Cleaning up old DEBT_SEED V1 data...');
        const oldOrders = await prisma.exportOrder.findMany({ where: { notes: { contains: '[DEBT_SEED]' } } });
        for (const o of oldOrders) {
            await prisma.productCode.updateMany({ where: { exportOrderId: o.id }, data: { exportOrderId: null, exportStatus: null, exportDeliveryDateTime: null } });
        }
        await prisma.exportOrder.deleteMany({ where: { notes: { contains: '[DEBT_SEED]' } } });
        console.log(`  Deleted ${oldOrders.length} old export orders`);
    }

    if (!markerOrder && adminUser && accountantUser && debtCustomers.length >= 6) {
        const freePcs = await prisma.productCode.findMany({
            where: { exportOrderId: null, deletedAt: null },
            orderBy: { id: 'asc' },
        });

        const dt = (year, month, day) => new Date(year, month - 1, day, randInt(8, 17), randInt(0, 59));

        async function createDebtOrder(customerId, date, deliveryCost, paymentReceived, pcs) {
            const order = await prisma.exportOrder.create({
                data: {
                    customerId,
                    createdById: adminUser.id,
                    status: 'DA_XUAT_KHO',
                    paymentReceived,
                    deliveryCost,
                    deliveryDateTime: date,
                    createdAt: date,
                    notes: `${MARKER} Xuất kho ${date.getMonth() + 1}/${date.getFullYear()}`,
                },
            });
            for (const pc of pcs) {
                await prisma.productCode.update({
                    where: { id: pc.id },
                    data: { exportOrderId: order.id, exportStatus: 'DA_XUAT_KHO', exportDeliveryDateTime: date },
                });
            }
            return order;
        }

        async function createPayment(customerId, date, amount, content) {
            return prisma.transaction.create({
                data: { customerId, createdById: accountantUser.id, amount, content, status: 'SUCCESS', createdAt: date },
            });
        }

        let pi = 0;
        const pop = (n) => { const s = freePcs.slice(pi, Math.min(pi + n, freePcs.length)); pi += n; return s; };

        const [c0, c1, c2, c3, c4, c5] = debtCustomers; // kh_minh, kh_hang, kh_tuan, kh_ngoc, kh_duc, kh_ly

        // ── KH001 kh_minh: đặt hàng nhiều, nạp tiền ít — NỢ TÍCH LŨY ──
        // 2025: phát sinh ~3 đợt, nạp 1 lần nhỏ
        await createDebtOrder(c0.id, dt(2025, 2, 10), 150000, false, pop(2));
        await createDebtOrder(c0.id, dt(2025, 2, 22), 200000, false, pop(2)); // tháng 2 có 2 lệnh
        await createDebtOrder(c0.id, dt(2025, 5, 14), 180000, false, pop(2));
        await createDebtOrder(c0.id, dt(2025, 5, 28), 100000, false, pop(1));
        await createPayment(c0.id,   dt(2025, 6, 5),  3000000, 'Nạp một phần T6/2025');
        await createDebtOrder(c0.id, dt(2025, 9, 3),  250000, false, pop(2));
        await createDebtOrder(c0.id, dt(2025, 11, 7), 300000, false, pop(2));
        await createPayment(c0.id,   dt(2025, 12, 10), 2000000, 'Nạp cuối năm 2025');
        // 2026: tiếp tục phát sinh, nạp nhỏ giọt
        await createDebtOrder(c0.id, dt(2026, 1, 15), 120000, false, pop(2));
        await createDebtOrder(c0.id, dt(2026, 1, 28), 80000,  false, pop(1));
        await createPayment(c0.id,   dt(2026, 2, 5),  3000000, 'Nạp T2/2026');
        await createDebtOrder(c0.id, dt(2026, 3, 10), 250000, false, pop(2));
        console.log(`  [${c0.username}] đặt nhiều nạp ít — nợ tích lũy`);

        // ── KH002 kh_hang: đơn đều, nạp từng phần — VẪN CÒN NỢ ──
        // 2025
        await createDebtOrder(c1.id, dt(2025, 1, 8),  200000, false, pop(2));
        await createDebtOrder(c1.id, dt(2025, 4, 12), 180000, false, pop(2));
        await createDebtOrder(c1.id, dt(2025, 4, 25), 150000, false, pop(1)); // 2 lệnh tháng 4
        await createPayment(c1.id,   dt(2025, 5, 10), 2000000, 'Trả 1 phần T5');
        await createDebtOrder(c1.id, dt(2025, 7, 3),  150000, false, pop(2));
        await createDebtOrder(c1.id, dt(2025, 7, 18), 200000, false, pop(1));
        await createPayment(c1.id,   dt(2025, 8, 5),  3000000, 'Nạp T8/2025');
        await createDebtOrder(c1.id, dt(2025, 10, 5), 200000, false, pop(2));
        await createDebtOrder(c1.id, dt(2025, 12, 20),120000, false, pop(1));
        // 2026
        await createDebtOrder(c1.id, dt(2026, 2, 14), 180000, false, pop(2));
        await createPayment(c1.id,   dt(2026, 2, 28), 2500000, 'Trả 1 phần T2/2026');
        await createDebtOrder(c1.id, dt(2026, 3, 5),  180000, false, pop(1));
        console.log(`  [${c1.username}] đơn đều, nạp từng phần — vẫn nợ`);

        // ── KH003 kh_tuan: ít đơn nhưng nạp ít hơn — NỢ TĂNG DẦN ──
        // 2025
        await createDebtOrder(c2.id, dt(2025, 3, 15), 100000, false, pop(2));
        await createDebtOrder(c2.id, dt(2025, 3, 22), 50000,  true,  pop(1)); // đã TT — không ghi nợ
        await createDebtOrder(c2.id, dt(2025, 6, 5),  200000, false, pop(2));
        await createPayment(c2.id,   dt(2025, 7, 10), 1500000, 'Nạp T7/2025');
        await createDebtOrder(c2.id, dt(2025, 9, 11), 150000, false, pop(2));
        await createDebtOrder(c2.id, dt(2025, 11, 3), 150000, false, pop(1));
        // 2026
        await createDebtOrder(c2.id, dt(2026, 1, 20), 200000, false, pop(2));
        await createDebtOrder(c2.id, dt(2026, 2, 8),  100000, false, pop(1));
        await createPayment(c2.id,   dt(2026, 3, 5),  2000000, 'Nạp T3/2026');
        console.log(`  [${c2.username}] nợ tăng dần, ít nạp`);

        // ── KH004 kh_ngoc: nợ lớn, nạp thưa — NỢ RẤT NHIỀU ──
        // 2025
        await createDebtOrder(c3.id, dt(2025, 2, 10), 500000, false, pop(2));
        await createDebtOrder(c3.id, dt(2025, 4, 5),  500000, false, pop(2));
        await createDebtOrder(c3.id, dt(2025, 6, 20), 400000, false, pop(2));
        await createPayment(c3.id,   dt(2025, 7, 15), 2000000, 'Nạp T7/2025');
        await createDebtOrder(c3.id, dt(2025, 8, 14), 350000, false, pop(2));
        await createDebtOrder(c3.id, dt(2025, 11,20), 400000, false, pop(2));
        // 2026
        await createDebtOrder(c3.id, dt(2026, 1, 10), 300000, false, pop(2));
        await createPayment(c3.id,   dt(2026, 2, 1),  1500000, 'Nạp đầu năm');
        await createDebtOrder(c3.id, dt(2026, 3, 8),  350000, false, pop(1));
        console.log(`  [${c3.username}] nợ rất lớn, nạp rất ít`);

        // ── KH005 kh_duc: mới phát sinh nợ năm 2026 thôi ──
        await createDebtOrder(c4.id, dt(2026, 1, 12), 150000, false, pop(2));
        await createDebtOrder(c4.id, dt(2026, 2, 20), 200000, false, pop(1));
        await createPayment(c4.id,   dt(2026, 2, 28), 1000000, 'Nạp T2/2026');
        await createDebtOrder(c4.id, dt(2026, 3, 15), 100000, false, pop(1));
        console.log(`  [${c4.username}] mới phát sinh nợ 2026`);

        // ── KH006 kh_ly: có nợ 2025, đã nạp gần hết nhưng chưa xong ──
        // 2025
        await createDebtOrder(c5.id, dt(2025, 3, 5),  200000, false, pop(2));
        await createDebtOrder(c5.id, dt(2025, 6, 10), 150000, false, pop(2));
        await createPayment(c5.id,   dt(2025, 8, 20), 2000000, 'Nạp T8/2025');
        await createDebtOrder(c5.id, dt(2025, 10, 3), 180000, false, pop(1));
        // 2026
        await createDebtOrder(c5.id, dt(2026, 1, 8),  150000, false, pop(1));
        await createPayment(c5.id,   dt(2026, 2, 10), 1500000, 'Trả bớt T2/2026');
        console.log(`  [${c5.username}] 2025-2026: gần trả hết nhưng vẫn còn`);

    } else if (markerOrder) {
        console.log('  Export Orders (debt demo V2) already seeded.');
    } else {
        console.warn('  Skipping debt orders (Need ADMIN + ACCOUNTANT + ≥6 Customers).');
    }

    // ─── SEED DEBT PERIODS (NỢ ĐẦU KỲ) ─────────────────────────────────────
    console.log('Seeding Debt Periods...');
    const allDebtCus = await prisma.user.findMany({ where: { type: 'CUSTOMER', deletedAt: null }, orderBy: { id: 'asc' }, take: 6 });

    const debtPeriodDefs = [
        // [customerIndex, year, openingBalance]
        [0, 2025, 8000000],   // kh_minh: nợ đầu kỳ 2025 — 8 triệu
        [1, 2025, 15000000],  // kh_hang: 15 triệu
        [2, 2025, 5000000],   // kh_tuan: 5 triệu
        [3, 2025, 25000000],  // kh_ngoc: 25 triệu (khách nợ lớn)
        [3, 2026, 20000000],  // kh_ngoc 2026: carry-over 20 triệu
        [5, 2025, 3000000],   // kh_ly: 3 triệu
    ];

    for (const [idx, year, balance] of debtPeriodDefs) {
        if (idx >= allDebtCus.length) continue;
        const cus = allDebtCus[idx];
        const existing = await prisma.debtPeriod.findFirst({ where: { customerId: cus.id, year } });
        if (!existing) {
            await prisma.debtPeriod.create({ data: { customerId: cus.id, year, openingBalance: balance } });
            console.log(`  DebtPeriod: ${cus.username} ${year} — ${balance.toLocaleString('vi')} VND`);
        } else {
            console.log(`  DebtPeriod exists: ${cus.username} ${year}`);
        }
    }

    console.log('\nSeeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
