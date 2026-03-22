const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || '123456', 10);

    const existing = await prisma.user.findFirst({ where: { username: 'admin', deletedAt: null } });
    if (!existing) {
        await prisma.user.create({
            data: {
                username: 'admin',
                fullName: 'Administrator',
                email: 'admin@3t.com',
                role: 'ADMIN',
                phone: '0909000001',
                password,
                type: 'EMPLOYEE',
                isActive: true,
            }
        });
        console.log('Created admin account');
    } else {
        console.log('Admin account already exists');
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
