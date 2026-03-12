const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const debtController = require('../controllers/debtController');

router.get('/years',                  authMiddleware, debtController.getYears);
router.get('/',                       authMiddleware, roleMiddleware(['ADMIN']), debtController.getSummary);
router.get('/:customerId',            authMiddleware, roleMiddleware(['ADMIN']), debtController.getCustomerDetail);
router.put('/:customerId/opening-balance', authMiddleware, roleMiddleware(['ADMIN']), debtController.upsertOpeningBalance);

module.exports = router;
