const express = require('express');
const router = express.Router();
const merchandiseConditionController = require('../controllers/merchandiseConditionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Get all (Available for logged in users)
router.get('/', authMiddleware, merchandiseConditionController.getAllStatuses);

// Admin Routes (Create, Update, Delete)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), merchandiseConditionController.createStatus);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), merchandiseConditionController.updateStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), merchandiseConditionController.deleteStatus);

module.exports = router;
