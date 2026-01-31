const express = require('express');
const router = express.Router();
const { getAllEmployees, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const authenticateToken = require('../middlewares/authMiddleware');

// Middleware check Role Admin (Optional: Add specific middleware if needed)
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ code: 403, message: 'Không có quyền truy cập' });
    }
    next();
};

router.get('/', authenticateToken, requireAdmin, getAllEmployees);
router.post('/', authenticateToken, requireAdmin, createEmployee);
router.put('/:id', authenticateToken, requireAdmin, updateEmployee);
router.delete('/:id', authenticateToken, requireAdmin, deleteEmployee);

module.exports = router;
