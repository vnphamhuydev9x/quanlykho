const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// Base path: /api/customers
// All routes require ADMIN role
router.get('/', authenticateToken, authorize(['ADMIN']), customerController.getCustomers);
router.post('/', authenticateToken, authorize(['ADMIN']), customerController.createCustomer);
router.put('/:id', authenticateToken, authorize(['ADMIN']), customerController.updateCustomer);
router.delete('/:id', authenticateToken, authorize(['ADMIN']), customerController.deleteCustomer);

// Allow ADMIN and SALE (middleware handles generic role check, controller handles specific ownership)
router.post('/:id/reset-password', authenticateToken, authorize(['ADMIN', 'SALE']), customerController.resetPassword);

// Export Data (JSON) for Client-side Excel generation (ADMIN only)
router.get('/export-data', authenticateToken, authorize(['ADMIN']), customerController.getAllCustomersForExport);

module.exports = router;
