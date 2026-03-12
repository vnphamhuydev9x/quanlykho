const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const { invalidateDebtCache } = require('../utils/debtCacheHelper');

const CACHE_TTL_YEARS   = 3600;   // 1 giờ
const CACHE_TTL_SUMMARY = 600;    // 10 phút
const CACHE_TTL_DETAIL  = 600;    // 10 phút

/**
 * Tính mảng 12 tháng: { month, incurred, paid, runningBalance }
 * cho 1 khách hàng trong 1 năm, dựa vào dữ liệu đã load sẵn.
 */
function calcMonths(openingBalance, debtOrders, payments) {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        incurred: 0,
        paid: 0,
        runningBalance: 0,
    }));

    for (const order of debtOrders) {
        const month = new Date(order.createdAt).getMonth(); // 0-based
        const importCost = order.productCodes.reduce(
            (s, pc) => s + Number(pc.totalImportCostToCustomer || 0), 0
        );
        monthly[month].incurred += importCost + Number(order.deliveryCost || 0);
    }

    for (const tx of payments) {
        const month = new Date(tx.createdAt).getMonth(); // 0-based
        monthly[month].paid += Number(tx.amount || 0);
    }

    let running = Number(openingBalance);
    for (const m of monthly) {
        running = running + m.incurred - m.paid;
        m.runningBalance = running;
    }

    return monthly;
}

const debtController = {

    // GET /api/debts/years
    getYears: async (req, res) => {
        try {
            const cacheKey = 'debts:years';
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info('[Debt.getYears] Cache HIT');
                return res.status(200).json(JSON.parse(cached));
            }

            const [eoRows, txRows, periodRows] = await Promise.all([
                prisma.$queryRaw`
                    SELECT DISTINCT EXTRACT(YEAR FROM "createdAt")::int AS year
                    FROM export_orders
                    WHERE status = 'DA_XUAT_KHO' AND "paymentReceived" = false AND "deletedAt" IS NULL`,
                prisma.$queryRaw`
                    SELECT DISTINCT EXTRACT(YEAR FROM "createdAt")::int AS year
                    FROM transactions WHERE status = 'SUCCESS'`,
                prisma.debtPeriod.findMany({ select: { year: true }, distinct: ['year'] }),
            ]);

            const years = [...new Set([
                ...eoRows.map(r => Number(r.year)),
                ...txRows.map(r => Number(r.year)),
                ...periodRows.map(r => r.year),
            ])].sort((a, b) => b - a);

            const responseData = { code: 200, message: 'Success', data: years };
            await redisClient.setEx(cacheKey, CACHE_TTL_YEARS, JSON.stringify(responseData));
            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[Debt.getYears] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // GET /api/debts?year=YYYY
    getSummary: async (req, res) => {
        try {
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const cacheKey = `debts:summary:${year}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info('[Debt.getSummary] Cache HIT');
                return res.status(200).json(JSON.parse(cached));
            }

            const yearStart = new Date(year, 0, 1);
            const yearEnd   = new Date(year + 1, 0, 1);

            // 1. Lấy tất cả customerId có phát sinh trong năm (union 3 nguồn)
            const [eoCustomers, txCustomers, periodCustomers] = await Promise.all([
                prisma.exportOrder.findMany({
                    where: { status: 'DA_XUAT_KHO', paymentReceived: false, deletedAt: null, createdAt: { gte: yearStart, lt: yearEnd } },
                    select: { customerId: true },
                    distinct: ['customerId'],
                }),
                prisma.transaction.findMany({
                    where: { status: 'SUCCESS', createdAt: { gte: yearStart, lt: yearEnd } },
                    select: { customerId: true },
                    distinct: ['customerId'],
                }),
                prisma.debtPeriod.findMany({
                    where: { year },
                    select: { customerId: true },
                }),
            ]);

            const customerIds = [...new Set([
                ...eoCustomers.map(r => r.customerId).filter(Boolean),
                ...txCustomers.map(r => r.customerId),
                ...periodCustomers.map(r => r.customerId),
            ])];

            if (customerIds.length === 0) {
                const empty = { code: 200, message: 'Success', data: [] };
                await redisClient.setEx(cacheKey, CACHE_TTL_SUMMARY, JSON.stringify(empty));
                return res.status(200).json(empty);
            }

            // 2. Load dữ liệu song song cho tất cả khách
            const [customers, allDebtOrders, allPayments, allPeriods] = await Promise.all([
                prisma.user.findMany({
                    where: { id: { in: customerIds } },
                    select: { id: true, fullName: true, customerCode: true },
                }),
                prisma.exportOrder.findMany({
                    where: {
                        customerId: { in: customerIds },
                        status: 'DA_XUAT_KHO',
                        paymentReceived: false,
                        deletedAt: null,
                        createdAt: { gte: yearStart, lt: yearEnd },
                    },
                    select: {
                        customerId: true,
                        createdAt: true,
                        deliveryCost: true,
                        productCodes: { select: { totalImportCostToCustomer: true } },
                    },
                }),
                prisma.transaction.findMany({
                    where: {
                        customerId: { in: customerIds },
                        status: 'SUCCESS',
                        createdAt: { gte: yearStart, lt: yearEnd },
                    },
                    select: { customerId: true, amount: true, createdAt: true },
                }),
                prisma.debtPeriod.findMany({
                    where: { customerId: { in: customerIds }, year },
                    select: { customerId: true, openingBalance: true },
                }),
            ]);

            const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
            const periodMap   = Object.fromEntries(allPeriods.map(p => [p.customerId, Number(p.openingBalance)]));

            const result = customerIds.map(cid => {
                const openingBalance = periodMap[cid] || 0;
                const orders   = allDebtOrders.filter(o => o.customerId === cid);
                const payments = allPayments.filter(t => t.customerId === cid);
                const months   = calcMonths(openingBalance, orders, payments);
                const totalRunningBalance = months[11].runningBalance;

                return {
                    customer: customerMap[cid] || { id: cid },
                    openingBalance,
                    months,
                    totalRunningBalance,
                };
            }).filter(r => r.months.some(m => m.incurred > 0 || m.paid > 0) || r.openingBalance !== 0);

            const responseData = { code: 200, message: 'Success', data: result };
            await redisClient.setEx(cacheKey, CACHE_TTL_SUMMARY, JSON.stringify(responseData));
            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[Debt.getSummary] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // GET /api/debts/:customerId?year=YYYY
    getCustomerDetail: async (req, res) => {
        try {
            const customerId = parseInt(req.params.customerId);
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const cacheKey = `debts:customer:${customerId}:year:${year}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info('[Debt.getCustomerDetail] Cache HIT');
                return res.status(200).json(JSON.parse(cached));
            }

            const customer = await prisma.user.findFirst({
                where: { id: customerId, deletedAt: null },
                select: { id: true, fullName: true, customerCode: true, phone: true },
            });
            if (!customer) {
                return res.status(404).json({ code: 99006, message: 'Customer not found' });
            }

            const yearStart = new Date(year, 0, 1);
            const yearEnd   = new Date(year + 1, 0, 1);

            const [period, debtOrders, payments] = await Promise.all([
                prisma.debtPeriod.findUnique({
                    where: { customerId_year: { customerId, year } },
                }),
                prisma.exportOrder.findMany({
                    where: {
                        customerId,
                        status: 'DA_XUAT_KHO',
                        paymentReceived: false,
                        deletedAt: null,
                        createdAt: { gte: yearStart, lt: yearEnd },
                    },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        createdAt: true,
                        deliveryCost: true,
                        productCodes: {
                            select: {
                                id: true,
                                orderCode: true,
                                totalImportCostToCustomer: true,
                                items: { select: { id: true, productName: true, packageCount: true } },
                            },
                        },
                    },
                }),
                prisma.transaction.findMany({
                    where: {
                        customerId,
                        status: 'SUCCESS',
                        createdAt: { gte: yearStart, lt: yearEnd },
                    },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        amount: true,
                        content: true,
                        createdAt: true,
                        creator: { select: { id: true, fullName: true } },
                    },
                }),
            ]);

            const openingBalance = period ? Number(period.openingBalance) : 0;
            const months = calcMonths(openingBalance, debtOrders, payments);

            // Tính totalOwed cho từng order để hiển thị
            const debtOrdersWithTotal = debtOrders.map(order => {
                const importCost = order.productCodes.reduce(
                    (s, pc) => s + Number(pc.totalImportCostToCustomer || 0), 0
                );
                return {
                    ...order,
                    totalOwed: importCost + Number(order.deliveryCost || 0),
                };
            });

            const responseData = {
                code: 200,
                message: 'Success',
                data: {
                    customer,
                    year,
                    openingBalance,
                    debtOrders: debtOrdersWithTotal,
                    payments,
                    months,
                    totalRunningBalance: months[11].runningBalance,
                },
            };

            await redisClient.setEx(cacheKey, CACHE_TTL_DETAIL, JSON.stringify(responseData));
            return res.status(200).json(responseData);
        } catch (error) {
            logger.error(`[Debt.getCustomerDetail] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/debts/:customerId/opening-balance
    upsertOpeningBalance: async (req, res) => {
        try {
            const customerId = parseInt(req.params.customerId);
            const { year, openingBalance } = req.body;

            if (!year || openingBalance === undefined || openingBalance === null) {
                return res.status(400).json({ code: 99001, message: 'Missing required fields: year, openingBalance' });
            }

            const customer = await prisma.user.findFirst({
                where: { id: customerId, deletedAt: null },
            });
            if (!customer) {
                return res.status(404).json({ code: 99006, message: 'Customer not found' });
            }

            const period = await prisma.debtPeriod.upsert({
                where: { customerId_year: { customerId, year: parseInt(year) } },
                update: { openingBalance: parseFloat(openingBalance) },
                create: { customerId, year: parseInt(year), openingBalance: parseFloat(openingBalance) },
            });

            await invalidateDebtCache(redisClient, customerId, parseInt(year));

            logger.info(`[Debt.upsertOpeningBalance] customerId=${customerId}, year=${year}, amount=${openingBalance}`);
            return res.status(200).json({
                code: 200,
                message: 'Success',
                data: { customerId, year: period.year, openingBalance: Number(period.openingBalance) },
            });
        } catch (error) {
            logger.error(`[Debt.upsertOpeningBalance] Error: ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },
};

module.exports = debtController;
