const logger = require('../config/logger');

/**
 * Invalidate tất cả cache liên quan đến công nợ của 1 khách hàng trong 1 năm.
 * Gọi sau mỗi sự kiện làm thay đổi số liệu công nợ:
 *   - ExportOrder chuyển DA_XUAT_KHO
 *   - Transaction tạo mới / bị hủy
 *   - DebtPeriod upsert
 */
const invalidateDebtCache = async (redisClient, customerId, year) => {
    try {
        await Promise.all([
            redisClient.del(`debts:customer:${customerId}:year:${year}`),
            redisClient.del(`debts:summary:${year}`),
            redisClient.del('debts:years'),
        ]);
        logger.info(`[DebtCache] Invalidated for customerId=${customerId}, year=${year}`);
    } catch (err) {
        logger.error(`[DebtCache] Invalidation failed: ${err.message}`);
    }
};

module.exports = { invalidateDebtCache };
