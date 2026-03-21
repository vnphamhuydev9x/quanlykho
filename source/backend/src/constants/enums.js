/**
 * BE Constants / Enums
 * Tất cả giá trị cố định (role, status, type...) PHẢI được định nghĩa tại đây.
 * KHÔNG dùng plain text string trực tiếp trong controller/route/service.
 */

const ROLES = {
    ADMIN: 'ADMIN',
    SALE: 'SALE',
    WAREHOUSE: 'WAREHOUSE',
    ACCOUNTANT: 'ACCOUNTANT',
    CHUNG_TU: 'CHUNG_TU',
    USER: 'USER',
};

// InquiryStatus dùng số nguyên để hỗ trợ DB-level sort theo priority (ORDER BY status ASC)
// Giá trị số = thứ tự ưu tiên hiển thị: số nhỏ hơn → lên trước
const INQUIRY_STATUS = {
    PENDING_REVIEW:    1, // Khách vừa gửi, chờ admin/sale review lần 1
    PENDING_ANSWER:    2, // Admin approve, chờ chứng từ trả lời
    PENDING_SEND:      3, // Chứng từ đã trả lời, chờ admin review lần 2
    EMAIL_SENT:        4, // Đã gửi email phản hồi
    ANSWER_REJECTED:   5, // Admin/Sale reject câu trả lời (lần 2), chứng từ cần sửa lại
    QUESTION_REJECTED: 6, // Admin/Sale reject câu hỏi (lần 1)
};

const NOTIFICATION_TYPE = {
    PRODUCT_CODE: 'PRODUCT_CODE',
    INQUIRY: 'INQUIRY',
};

const STORAGE_PROVIDER = {
    LOCAL: 'LOCAL',
    CLOUDFLARE_R2: 'CLOUDFLARE_R2',
};

const IMAGE_DELETION_STATUS = {
    PENDING: 'PENDING',
    DONE: 'DONE',
    FAILED: 'FAILED',
};

module.exports = { ROLES, INQUIRY_STATUS, NOTIFICATION_TYPE, STORAGE_PROVIDER, IMAGE_DELETION_STATUS };
