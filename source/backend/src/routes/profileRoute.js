const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, getProfile); // /api/profile
router.put('/', authenticateToken, updateProfile); // /api/profile
router.post('/change-password', authenticateToken, changePassword); // /api/profile/change-password

module.exports = router;
