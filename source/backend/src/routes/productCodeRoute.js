const express = require('express');
const router = express.Router();
const productCodeController = require('../controllers/productCodeController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../config/upload');

// Get All: FE hiển thị cho tất cả -> Auth Required
router.get('/', authMiddleware, productCodeController.getAllProductCodes);

// Get By ID: Auth Required
router.get('/:id', authMiddleware, productCodeController.getProductCodeById);

// Export Data: ADMIN only
router.get('/export/all', authMiddleware, roleMiddleware(['ADMIN']), productCodeController.getAllProductCodesForExport);

// Upload Images: ADMIN only
router.post('/:id/upload', authMiddleware, roleMiddleware(['ADMIN']), upload.array('images', 10), productCodeController.uploadImages);

// Create/Update/Delete: ADMIN only
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), productCodeController.createProductCode);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), productCodeController.updateProductCode);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), productCodeController.deleteProductCode);

module.exports = router;
