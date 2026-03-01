const express = require('express');
const router = express.Router();
const declarationController = require('../controllers/declarationController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../config/upload');

// ⚠️ QUAN TRỌNG: /export/all phải đăng ký TRƯỚC /:id
// Nếu đổi thứ tự, Express sẽ match /export/all thành /:id với id="export" → 404
router.get('/export/all', authMiddleware, roleMiddleware(['ADMIN']), declarationController.getAllDeclarationsForExport);

// Get All: Auth Required (any role)
router.get('/', authMiddleware, declarationController.getAllDeclarations);

// Get By ID: Auth Required
router.get('/:id', authMiddleware, declarationController.getDeclarationById);

// Create: ADMIN only (trả về 405 - declarations được tạo tự động qua ProductCode)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), declarationController.createDeclaration);

// Update: ADMIN only (upload images được xử lý cùng thông qua req.files)
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), upload.array('images', 3), declarationController.updateDeclaration);

// Delete: ADMIN only
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), declarationController.deleteDeclaration);

module.exports = router;
