/**
 * @module landing_page
 * @SD_Ref 03_1_landing_page_SD.md
 * @SD_Version SD-v1.0.5
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const inquiryController = require('../controllers/inquiryController');
const createTempUpload = require('../config/upload');
const uploadInquiry = createTempUpload({ maxFiles: 1 });
const { ROLES } = require('../constants/enums');

// Public — khách hàng gửi câu hỏi (không cần auth)
router.post('/public', uploadInquiry.single('image'), inquiryController.submitInquiry);

// Tất cả role nội bộ được xem danh sách và chi tiết
router.get('/', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE, ROLES.CHUNG_TU]), inquiryController.getInquiries);
router.get('/:id', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE, ROLES.CHUNG_TU]), inquiryController.getInquiryById);

// ADMIN/SALE: review lần 1 (approve/reject câu hỏi từ khách)
router.put('/:id/review', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE]), inquiryController.reviewInquiry);

// CHUNG_TU + ADMIN: điền câu trả lời (ADMIN có thể làm mọi thứ)
router.put('/:id/answer', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.CHUNG_TU]), inquiryController.submitAnswer);

// Tất cả role nội bộ: cập nhật ghi chú nội bộ (không gửi email)
router.put('/:id/note', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE, ROLES.CHUNG_TU]), inquiryController.updateNote);

// ADMIN/SALE: review lần 2 + gửi email
router.put('/:id/send', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE]), inquiryController.reviewAndSend);

module.exports = router;
