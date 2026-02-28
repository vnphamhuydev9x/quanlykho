const express = require('express');
const router = express.Router();
const productCodeController = require('../controllers/productCodeController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../config/upload');

// All product code routes require authentication and ADMIN role base on new TechSpec
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

// Get All
router.get('/', productCodeController.getAllProductCodes);

// Get By ID
router.get('/:id', productCodeController.getProductCodeById);

// Create
router.post('/', productCodeController.createProductCode);

// Update
router.put('/:id', productCodeController.updateProductCode);

// Delete
router.delete('/:id', productCodeController.deleteProductCode);

module.exports = router;
