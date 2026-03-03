const express = require('express');
const router = express.Router();
const manifestController = require('../controllers/manifestController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/', manifestController.create);
router.get('/', manifestController.getAll);
router.get('/:id', manifestController.getById);
router.put('/:id', manifestController.update);
router.delete('/:id', manifestController.delete);
router.post('/:id/add-items', manifestController.addItems);
router.post('/:id/remove-items', manifestController.removeItems);

// v3 — Vehicle Status Override
router.patch('/:id/product-codes/bulk-vehicle-status', manifestController.bulkUpdateVehicleStatus);
router.patch('/:id/product-codes/:pcId/vehicle-status', manifestController.updateProductCodeVehicleStatus);
router.patch('/:id/product-codes/:pcId/reset-vehicle-status', manifestController.resetProductCodeVehicleStatus);

module.exports = router;
