const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || '123456', 10);

    // Create Admin User
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: adminPassword,
            fullName: 'Administrator',
            email: 'admin@3t.com',
            phone: '0909000000',
            role: 'ADMIN',
            type: 'EMPLOYEE',
            isActive: true
        }
    });

    console.log(`Created Admin User: ${adminUser.username}`);
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
