const express = require('express');
const router = express.Router();
const { getAllEmployees, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// Base path: /api/employees
// All routes require ADMIN role
router.get('/', authenticateToken, authorize(['ADMIN']), getAllEmployees);
router.post('/', authenticateToken, authorize(['ADMIN']), createEmployee);
router.put('/:id', authenticateToken, authorize(['ADMIN']), updateEmployee);
router.delete('/:id', authenticateToken, authorize(['ADMIN']), deleteEmployee);

module.exports = router;
