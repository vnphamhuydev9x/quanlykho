const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const { createInquiryNotification } = require('../utils/notification');
const { sendInquiryReply } = require('../services/emailService');
const { ROLES, INQUIRY_STATUS } = require('../constants/enums');
const { deleteByPrefix } = require('../utils/redisUtils');

// CHUNG_TU không nhìn thấy PENDING_REVIEW(1) và QUESTION_REJECTED(6) trong danh sách
const CHUNG_TU_HIDDEN_STATUSES = [
    INQUIRY_STATUS.PENDING_REVIEW,
    INQUIRY_STATUS.QUESTION_REJECTED,
];

// CHUNG_TU không được xem detail PENDING_REVIEW(1) và QUESTION_REJECTED(6)
const CHUNG_TU_DETAIL_BLOCKED = [
    INQUIRY_STATUS.PENDING_REVIEW,
    INQUIRY_STATUS.QUESTION_REJECTED,
];

// Mask data trả về cho CHUNG_TU: chỉ ẩn email, trạng thái thực được trả về đầy đủ
const maskInquiryForChungTu = ({ email, ...rest }) => rest;

// ─── Cache — SCAN+DEL Strategy ───────────────────────────────────────────────
// Dùng SCAN+DEL để xóa toàn bộ page cache theo prefix khi có thay đổi.
// Phù hợp với keyspace nhỏ (internal app). Không để lại orphaned keys dù TTL lớn.
const INQUIRY_CACHE_TTL = 300; // giây
const DETAIL_CACHE_TTL  = 300;

const LIST_CACHE_PREFIX = {
    admin_sale: 'inquiries:list:admin_sale:',
    chung_tu:   'inquiries:list:chung_tu:',
};
const detailCacheKey   = (id) => `inquiries:detail:${id}`;
const pageListCacheKey = (roleKey, page, limit) =>
    `${LIST_CACHE_PREFIX[roleKey]}p${page}:l${limit}`;

// Invalidate toàn bộ list cache của cả 2 role group
const invalidateListCache = async () => {
    try {
        await Promise.all([
            deleteByPrefix(LIST_CACHE_PREFIX.admin_sale),
            deleteByPrefix(LIST_CACHE_PREFIX.chung_tu),
        ]);
    } catch (err) {
        logger.error(`[Inquiry] List cache invalidation error: ${err.message}`);
    }
};

// Invalidate list cache + detail cache của một inquiry cụ thể
const invalidateInquiryCache = async (id) => {
    try {
        await Promise.all([
            redisClient.del(detailCacheKey(id)),
            deleteByPrefix(LIST_CACHE_PREFIX.admin_sale),
            deleteByPrefix(LIST_CACHE_PREFIX.chung_tu),
        ]);
    } catch (err) {
        logger.error(`[Inquiry] Cache invalidation error: ${err.message}`);
    }
};

// ─── Role-based user ID cache ─────────────────────────────────────────────────
const ROLES_CACHE_TTL = 600; // 10 phút
const getUserIdsByRoles = async (roles) => {
    const cacheKey = `roles_user_ids:${roles.slice().sort().join(',')}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (_) { /* cache miss */ }

    const users = await prisma.user.findMany({
        where: { role: { in: roles }, isActive: true, deletedAt: null },
        select: { id: true }
    });
    const ids = users.map(u => u.id);

    try {
        await redisClient.set(cacheKey, JSON.stringify(ids), { EX: ROLES_CACHE_TTL });
    } catch (_) { /* non-critical */ }

    return ids;
};

// ─── Email helper ─────────────────────────────────────────────────────────────
const buildQuestionText = (inquiry) => {
    const lines = [];
    if (inquiry.productName) lines.push(`Tên sản phẩm: ${inquiry.productName}`);
    if (inquiry.material)    lines.push(`Chất liệu: ${inquiry.material}`);
    if (inquiry.usage)       lines.push(`Công dụng: ${inquiry.usage}`);
    if (inquiry.size)        lines.push(`Kích thước/kích cỡ: ${inquiry.size}`);
    if (inquiry.brand)       lines.push(`Nhãn hàng: ${inquiry.brand}`);
    if (inquiry.specialInfo) lines.push(`Thông tin đặc thù: ${inquiry.specialInfo}`);
    if (inquiry.techSpec)    lines.push(`Thông số kỹ thuật: ${inquiry.techSpec}`);
    if (inquiry.demand)      lines.push(`Nhu cầu: ${inquiry.demand}`);
    return lines.join('\n');
};

// ─── Controller ───────────────────────────────────────────────────────────────
const inquiryController = {
    // POST /api/inquiries/public — Public, không cần auth
    submitInquiry: async (req, res) => {
        try {
            const { email, productName, material, usage, size, brand, specialInfo, techSpec, demand } = req.body;

            if (!email) {
                return res.status(400).json({ code: 400, message: 'Missing required field: email' });
            }

            const inquiry = await prisma.customerInquiry.create({
                data: {
                    email: email.trim(),
                    productName: productName?.trim() || null,
                    material: material?.trim() || null,
                    usage: usage?.trim() || null,
                    size: size?.trim() || null,
                    brand: brand?.trim() || null,
                    specialInfo: specialInfo?.trim() || null,
                    techSpec: techSpec?.trim() || null,
                    demand: demand?.trim() || null,
                }
            });

            await invalidateListCache();

            const adminSaleIds = await getUserIdsByRoles([ROLES.ADMIN, ROLES.SALE]);
            await createInquiryNotification(
                adminSaleIds,
                JSON.stringify({ key: 'notification.newInquiry', params: { email } }),
                inquiry.id
            );

            logger.info(`[Inquiry] New inquiry submitted by ${email}, id=${inquiry.id}`);
            return res.status(201).json({ code: 201, message: 'Success', data: inquiry });
        } catch (error) {
            logger.error(`[Inquiry][submitInquiry] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // GET /api/inquiries?page=1&limit=20&search=abc&status=1
    // Sort: status ASC (số nhỏ = ưu tiên cao), createdAt ASC — DB-level
    // Cache: chỉ cho request không filter; khi có search/status → skip cache
    getInquiries: async (req, res) => {
        try {
            const { role } = req.user;
            const isChungTu = ROLES.CHUNG_TU === role;
            const roleKey = isChungTu ? 'chung_tu' : 'admin_sale';

            const page   = Math.max(1, parseInt(req.query.page)  || 1);
            const limit  = Math.max(1, parseInt(req.query.limit) || 20);
            const search = req.query.search?.trim() || '';
            const statusFilter = (req.query.status !== undefined && req.query.status !== '')
                ? parseInt(req.query.status) : null;
            const hasFilter = search !== '' || statusFilter !== null;

            // Cache chỉ cho request không filter
            if (!hasFilter) {
                const cacheKey = pageListCacheKey(roleKey, page, limit);
                try {
                    const cached = await redisClient.get(cacheKey);
                    if (cached) return res.status(200).json({ code: 200, message: 'Success', data: JSON.parse(cached) });
                } catch (_) { /* cache miss */ }
            }

            // Build where clause
            const whereClause = { deletedAt: null };

            // Status filter (override default CHUNG_TU restriction khi đã chọn status cụ thể)
            if (statusFilter !== null) {
                if (isChungTu && CHUNG_TU_HIDDEN_STATUSES.includes(statusFilter)) {
                    return res.status(200).json({ code: 200, message: 'Success', data: { items: [], total: 0, page, totalPages: 0 } });
                }
                whereClause.status = statusFilter;
            } else if (isChungTu) {
                whereClause.status = { notIn: CHUNG_TU_HIDDEN_STATUSES };
            }

            // Full-text search across all text fields + ID
            if (search) {
                const idNum = (Number.isInteger(Number(search)) && Number(search) > 0) ? Number(search) : null;
                const textConditions = [
                    { productName: { contains: search, mode: 'insensitive' } },
                    { material:    { contains: search, mode: 'insensitive' } },
                    { usage:       { contains: search, mode: 'insensitive' } },
                    { size:        { contains: search, mode: 'insensitive' } },
                    { brand:       { contains: search, mode: 'insensitive' } },
                    { specialInfo: { contains: search, mode: 'insensitive' } },
                    { demand:      { contains: search, mode: 'insensitive' } },
                    { techSpec:    { contains: search, mode: 'insensitive' } },
                    ...(!isChungTu ? [{ email: { contains: search, mode: 'insensitive' } }] : []),
                ];
                if (idNum) textConditions.push({ id: idNum });
                whereClause.OR = textConditions;
            }

            const [total, rawItems] = await Promise.all([
                prisma.customerInquiry.count({ where: whereClause }),
                prisma.customerInquiry.findMany({
                    where: whereClause,
                    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
            ]);

            const items = isChungTu ? rawItems.map(maskInquiryForChungTu) : rawItems;
            const totalPages = Math.ceil(total / limit);
            const data = { items, total, page, totalPages };

            // Cache chỉ khi không filter
            if (!hasFilter) {
                try {
                    await redisClient.set(pageListCacheKey(roleKey, page, limit), JSON.stringify(data), { EX: INQUIRY_CACHE_TTL });
                } catch (_) { /* non-critical */ }
            }

            return res.status(200).json({ code: 200, message: 'Success', data });
        } catch (error) {
            logger.error(`[Inquiry][getInquiries] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // GET /api/inquiries/:id
    getInquiryById: async (req, res) => {
        try {
            const { role } = req.user;
            const id = parseInt(req.params.id);
            const isChungTu = ROLES.CHUNG_TU === role;

            // Thử lấy từ cache (raw data)
            let inquiry = null;
            try {
                const cached = await redisClient.get(detailCacheKey(id));
                if (cached) inquiry = JSON.parse(cached);
            } catch (_) { /* cache miss */ }

            if (!inquiry) {
                inquiry = await prisma.customerInquiry.findFirst({ where: { id, deletedAt: null } });
                if (!inquiry) {
                    return res.status(404).json({ code: 404, message: 'Inquiry not found' });
                }
                try {
                    await redisClient.set(detailCacheKey(id), JSON.stringify(inquiry), { EX: DETAIL_CACHE_TTL });
                } catch (_) { /* non-critical */ }
            }

            if (isChungTu && CHUNG_TU_DETAIL_BLOCKED.includes(inquiry.status)) {
                return res.status(403).json({ code: 99008, message: 'Forbidden' });
            }

            const data = isChungTu ? maskInquiryForChungTu(inquiry) : inquiry;
            return res.status(200).json({ code: 200, message: 'Success', data });
        } catch (error) {
            logger.error(`[Inquiry][getInquiryById] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/inquiries/:id/review — ADMIN/SALE: review lần 1
    // body: { approved: boolean }
    reviewInquiry: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { approved } = req.body;

            if (approved === undefined) {
                return res.status(400).json({ code: 400, message: 'Missing required field: approved' });
            }

            const inquiry = await prisma.customerInquiry.findFirst({ where: { id, deletedAt: null } });
            if (!inquiry) {
                return res.status(404).json({ code: 404, message: 'Inquiry not found' });
            }

            if (INQUIRY_STATUS.PENDING_REVIEW !== inquiry.status) {
                return res.status(400).json({ code: 400, message: 'Inquiry is not in PENDING_REVIEW status' });
            }

            const isApproved = true === approved;
            const newStatus = isApproved ? INQUIRY_STATUS.PENDING_ANSWER : INQUIRY_STATUS.QUESTION_REJECTED;
            await prisma.customerInquiry.update({ where: { id }, data: { status: newStatus } });

            await invalidateInquiryCache(id);

            if (isApproved) {
                const chungTuIds = await getUserIdsByRoles([ROLES.CHUNG_TU]);
                await createInquiryNotification(
                    chungTuIds,
                    JSON.stringify({ key: 'notification.inquiryNeedsAnswer', params: { email: inquiry.email } }),
                    inquiry.id
                );
            }

            logger.info(`[Inquiry] id=${id} reviewed, status=${newStatus}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[Inquiry][reviewInquiry] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/inquiries/:id/answer — ADMIN/CHUNG_TU: điền/sửa câu trả lời
    // body: { answer: string }
    submitAnswer: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { answer } = req.body;

            if (!answer || !answer.trim()) {
                return res.status(400).json({ code: 400, message: 'Missing required field: answer' });
            }

            const inquiry = await prisma.customerInquiry.findFirst({ where: { id, deletedAt: null } });
            if (!inquiry) {
                return res.status(404).json({ code: 404, message: 'Inquiry not found' });
            }

            const allowedStatuses = [INQUIRY_STATUS.PENDING_ANSWER, INQUIRY_STATUS.ANSWER_REJECTED];
            if (!allowedStatuses.includes(inquiry.status)) {
                return res.status(400).json({ code: 400, message: 'Inquiry is not in a valid status for answering' });
            }

            await prisma.customerInquiry.update({
                where: { id },
                data: { answer: answer.trim(), status: INQUIRY_STATUS.PENDING_SEND }
            });

            await invalidateInquiryCache(id);

            const adminSaleIds = await getUserIdsByRoles([ROLES.ADMIN, ROLES.SALE]);
            await createInquiryNotification(
                adminSaleIds,
                JSON.stringify({ key: 'notification.inquiryAnswered', params: { email: inquiry.email } }),
                inquiry.id
            );

            logger.info(`[Inquiry] id=${id} answered, status=${INQUIRY_STATUS.PENDING_SEND}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[Inquiry][submitAnswer] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/inquiries/:id/note — ADMIN/SALE/CHUNG_TU: cập nhật ghi chú nội bộ
    // body: { internalNote: string }
    updateNote: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { internalNote } = req.body;

            if (internalNote === undefined) {
                return res.status(400).json({ code: 400, message: 'Missing required field: internalNote' });
            }

            const inquiry = await prisma.customerInquiry.findFirst({ where: { id, deletedAt: null } });
            if (!inquiry) {
                return res.status(404).json({ code: 404, message: 'Inquiry not found' });
            }

            await prisma.customerInquiry.update({
                where: { id },
                data: { internalNote: internalNote?.trim() || null }
            });

            // Note không ảnh hưởng đến list → chỉ invalidate detail cache
            try {
                await redisClient.del(detailCacheKey(id));
            } catch (_) { /* non-critical */ }

            logger.info(`[Inquiry] id=${id} internalNote updated`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[Inquiry][updateNote] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },

    // PUT /api/inquiries/:id/send — ADMIN/SALE: review lần 2 + gửi email
    // body: { approved: boolean }
    reviewAndSend: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { approved } = req.body;

            if (approved === undefined) {
                return res.status(400).json({ code: 400, message: 'Missing required field: approved' });
            }

            const inquiry = await prisma.customerInquiry.findFirst({ where: { id, deletedAt: null } });
            if (!inquiry) {
                return res.status(404).json({ code: 404, message: 'Inquiry not found' });
            }

            if (INQUIRY_STATUS.PENDING_SEND !== inquiry.status) {
                return res.status(400).json({ code: 400, message: 'Inquiry is not in PENDING_SEND status' });
            }

            const isApproved = true === approved;
            if (!isApproved) {
                await prisma.customerInquiry.update({
                    where: { id },
                    data: { status: INQUIRY_STATUS.ANSWER_REJECTED }
                });

                await invalidateInquiryCache(id);

                const chungTuIds = await getUserIdsByRoles([ROLES.CHUNG_TU]);
                await createInquiryNotification(
                    chungTuIds,
                    JSON.stringify({ key: 'notification.answerRejected', params: { id } }),
                    inquiry.id
                );

                return res.status(200).json({ code: 200, message: 'Success' });
            }

            // Approve → gửi email
            const questionText = buildQuestionText(inquiry);
            await sendInquiryReply({ toEmail: inquiry.email, question: questionText, answer: inquiry.answer });

            await prisma.customerInquiry.update({ where: { id }, data: { status: INQUIRY_STATUS.EMAIL_SENT } });

            await invalidateInquiryCache(id);

            logger.info(`[Inquiry] id=${id} email sent to ${inquiry.email}`);
            return res.status(200).json({ code: 200, message: 'Success' });
        } catch (error) {
            logger.error(`[Inquiry][reviewAndSend] ${error.message}`);
            return res.status(500).json({ code: 99500, message: 'Internal Server Error' });
        }
    },
};

module.exports = inquiryController;
