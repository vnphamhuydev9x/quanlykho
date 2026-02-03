const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Get All: User allow? "FE hiển thị cho tất cả" -> Yes, Auth Required
router.get('/', authMiddleware, transactionController.getAllTransactions);

// Export Data: ADMIN only
router.get('/export-data', authMiddleware, roleMiddleware(['ADMIN']), transactionController.getAllTransactionsForExport);

// Create/Cancel: ADMIN only
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), transactionController.createTransaction);
router.post('/:id/cancel', authMiddleware, roleMiddleware(['ADMIN']), transactionController.cancelTransaction);

module.exports = router;
