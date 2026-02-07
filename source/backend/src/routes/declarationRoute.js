const express = require('express');
const router = express.Router();
const declarationController = require('../controllers/declarationController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../config/upload');

// Get All: FE hiển thị cho tất cả -> Auth Required
router.get('/', authMiddleware, declarationController.getAllDeclarations);

// Get By ID: Auth Required
router.get('/:id', authMiddleware, declarationController.getDeclarationById);

// Export Data: ADMIN only
router.get('/export/all', authMiddleware, roleMiddleware(['ADMIN']), declarationController.getAllDeclarationsForExport);

// Upload Images: ADMIN only (max 3 images)
router.post('/:id/upload', authMiddleware, roleMiddleware(['ADMIN']), upload.array('images', 3), declarationController.uploadImages);

// Create/Update/Delete: ADMIN only
// Create/Update/Delete: ADMIN only
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), upload.array('images', 8), declarationController.createDeclaration);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), upload.array('images', 8), declarationController.updateDeclaration);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), declarationController.deleteDeclaration);

module.exports = router;
