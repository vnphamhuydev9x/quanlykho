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

// Create: ADMIN only
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), upload.array('productImage', 1), declarationController.createDeclaration);

// Update: ADMIN only
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), upload.array('productImage', 1), declarationController.updateDeclaration);

// Delete: ADMIN only
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), declarationController.deleteDeclaration);



module.exports = router;
