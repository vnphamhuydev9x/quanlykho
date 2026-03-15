const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, notificationController.getNotifications);
router.get('/list', authMiddleware, notificationController.getNotificationsList);
router.put('/read', authMiddleware, notificationController.markAsRead);
router.put('/:id/read', authMiddleware, notificationController.markOneAsRead);

module.exports = router;
