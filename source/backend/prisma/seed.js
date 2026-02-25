const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Default password for all seeded users: 123456
    const password = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || '123456', 10);

    const users = [
        // Role: ADMIN (2 users)
        {
            username: 'admin',
            fullName: 'Administrator',
            email: 'admin@3t.com',
            role: 'ADMIN',
            phone: '0909000001'
        },
        {
            username: 'manager_vu',
            fullName: 'Vũ Quản Lý',
            email: 'vu.manager@3t.com',
            role: 'ADMIN',
            phone: '0909000002'
        },

        // Role: SALE (2 users)
        {
            username: 'sale_thuy',
            fullName: 'Nguyễn Thị Thủy',
            email: 'thuy.sale@3t.com',
            role: 'SALE',
            phone: '0909000011'
        },
        {
            username: 'sale_hung',
            fullName: 'Phạm Văn Hùng',
            email: 'hung.sale@3t.com',
            role: 'SALE',
            phone: '0909000012'
        },

        // Role: WAREHOUSE (2 users)
        {
            username: 'kho_an',
            fullName: 'Trần Văn An',
            email: 'an.kho@3t.com',
            role: 'WAREHOUSE',
            phone: '0909000021'
        },
        {
            username: 'kho_binh',
            fullName: 'Lê Văn Bình',
            email: 'binh.kho@3t.com',
            role: 'WAREHOUSE',
            phone: '0909000022'
        },

        // Role: ACCOUNTANT (2 users)
        {
            username: 'ketoan_lan',
            fullName: 'Hoàng Thị Lan',
            email: 'lan.kt@3t.com',
            role: 'ACCOUNTANT',
            phone: '0909000031'
        },
        {
            username: 'ketoan_hoa',
            fullName: 'Vũ Thị Hoa',
            email: 'hoa.kt@3t.com',
            role: 'ACCOUNTANT',
            phone: '0909000032'
        },
    ];

    console.log('Start seeding...');

    for (const u of users) {
        const existing = await prisma.user.findFirst({
            where: {
                username: u.username,
                deletedAt: null
            }
        });

        if (!existing) {
            await prisma.user.create({
                data: {
                    username: u.username,
                    password: password,
                    fullName: u.fullName,
                    email: u.email,
                    phone: u.phone,
                    role: u.role,
                    type: 'EMPLOYEE',
                    isActive: true
                }
            });
            console.log(`Created User: ${u.username} (${u.role})`);
        } else {
            console.log(`User already exists: ${u.username}`);
        }
    }

    // --- SEED CATEGORIES ---
    const categories = [
        "Quần áo thời trang",
        "Giày dép",
        "Linh kiện điện tử",
        "Đồ gia dụng",
        "Mỹ phẩm",
        "Thực phẩm chức năng",
        "Phụ kiện điện thoại",
        "Túi xách",
        "Đồ chơi trẻ em",
        "Máy móc công nghiệp"
    ];

    console.log('Seeding Categories...');
    for (const catName of categories) {
        const existingCat = await prisma.category.findFirst({
            where: {
                name: catName,
                deletedAt: null
            }
        });

        if (!existingCat) {
            await prisma.category.create({
                data: {
                    name: catName,
                    status: 'AVAILABLE'
                }
            });
            console.log(`Created Category: ${catName}`);
        } else {
            console.log(`Category already exists: ${catName}`);
        }
    }

    // --- SEED WAREHOUSES ---
    const warehouses = [
        "Kho Hà Nội",
        "Kho Sài Gòn",
        "Kho Quảng Châu (TQ)",
        "Kho Bằng Tường (TQ)",
        "Kho Đông Hưng (TQ)"
    ];

    console.log('Seeding Warehouses...');
    for (const whName of warehouses) {
        const existingWh = await prisma.warehouse.findFirst({
            where: {
                name: whName,
                deletedAt: null
            }
        });

        if (!existingWh) {
            await prisma.warehouse.create({
                data: {
                    name: whName,
                    status: 'AVAILABLE'
                }
            });
            console.log(`Created Warehouse: ${whName}`);
        } else {
            console.log(`Warehouse already exists: ${whName}`);
        }
    }

    // --- SEED CUSTOMERS ---
    console.log('Seeding Customers...');

    // Get Sale users to assign
    const sales = await prisma.user.findMany({
        where: { role: 'SALE', deletedAt: null }
    });

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
            // Round robin assignment
            const saleUser = sales[i % sales.length];

            const existingCus = await prisma.user.findFirst({
                where: {
                    username: c.username,
                    deletedAt: null
                }
            });

            if (!existingCus) {
                await prisma.user.create({
                    data: {
                        username: c.username,
                        password: password,
                        fullName: c.fullName,
                        email: c.email,
                        phone: c.phone,
                        role: 'USER',
                        type: 'CUSTOMER',
                        customerCode: c.customerCode,
                        address: c.address,
                        saleId: saleUser.id,
                        isActive: true
                    }
                });
                console.log(`Created Customer: ${c.username} (${c.customerCode}) - Sale: ${saleUser.username}`);
            } else {
                console.log(`Customer already exists: ${c.username}`);
            }
        }
    } else {
        console.warn('No SALE users found to assign to customers. Skipping customer seeding.');
    }

    // --- SEED TRANSACTIONS (DEPOSITS) ---
    console.log('Seeding Transactions...');

    // Get seeded customers
    const dbCustomers = await prisma.user.findMany({
        where: { type: 'CUSTOMER', deletedAt: null }
    });

    // Get Accountants
    const accountants = await prisma.user.findMany({
        where: { role: 'ACCOUNTANT', deletedAt: null }
    });

    if (dbCustomers.length > 0 && accountants.length > 0) {
        for (const cus of dbCustomers) {
            // Check if customer already has transactions to avoid duplicate seeding on re-runs
            const existingTrans = await prisma.transaction.findFirst({
                where: { customerId: cus.id }
            });

            if (!existingTrans) {
                // Create 1-3 random transactions
                const numTrans = Math.floor(Math.random() * 3) + 1;

                for (let k = 0; k < numTrans; k++) {
                    const amount = (Math.floor(Math.random() * 10) + 1) * 1000000; // 1M - 10M
                    const accountant = accountants[Math.floor(Math.random() * accountants.length)];

                    await prisma.transaction.create({
                        data: {
                            amount: amount,
                            content: `Nạp tiền lần ${k + 1}`,
                            status: 'SUCCESS',
                            customerId: cus.id,
                            createdById: accountant.id
                        }
                    });
                    console.log(`Created Transaction: ${cus.username} +${amount.toLocaleString()} (by ${accountant.username})`);
                }
            } else {
                console.log(`Transactions already exist for: ${cus.username}`);
            }
        }
    } else {
        console.warn('Skipping transactions (Need Customers & Accountants)');
    }

    console.log('Seeding finished.');

    // --- SEED MERCHANDISE CONDITIONS ---
    console.log('Seeding Merchandise Conditions...');
    const defaultStatusName = "Nhập kho";
    const existingDefaultStatus = await prisma.merchandiseCondition.findFirst({
        where: { name_vi: defaultStatusName }
    });
    if (!existingDefaultStatus) {
        await prisma.merchandiseCondition.create({
            data: {
                name_vi: defaultStatusName,
                name_zh: "入库",
                canLoadVehicle: true
            }
        });
        console.log(`Created MerchandiseCondition: ${defaultStatusName}`);
    } else {
        console.log(`MerchandiseCondition already exists: ${defaultStatusName}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
