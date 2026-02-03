const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);

// GET - List all
router.get('/', warehouseController.getAllWarehouses);

// Create - ADMIN only
router.post('/', authorize(['ADMIN']), warehouseController.createWarehouse);

// Update - ADMIN only
router.put('/:id', authorize(['ADMIN']), warehouseController.updateWarehouse);

// Delete - ADMIN only
router.delete('/:id', authorize(['ADMIN']), warehouseController.deleteWarehouse);

module.exports = router;
