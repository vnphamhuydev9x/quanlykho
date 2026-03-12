const express = require('express');
const router = express.Router();
const exportOrderController = require('../controllers/exportOrderController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', exportOrderController.getAll);
router.get('/:id', exportOrderController.getById);
router.post('/', exportOrderController.create);
router.put('/:id', exportOrderController.update);
router.patch('/:id/submit-reweigh', exportOrderController.submitReweigh);
router.patch('/:id/confirm-reweigh', exportOrderController.confirmReweigh);
router.patch('/:id/status', exportOrderController.updateStatus);
router.delete('/:id', exportOrderController.cancel);

module.exports = router;
