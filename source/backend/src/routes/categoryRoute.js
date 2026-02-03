const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Public/User Routes (Read-only for now, or as per requirement)
// Requirement: "phân quyền admin mới được call api, FE hiển thị cho tất cả"
// -> GET is public or User allowed? "FE hiển thị cho tất cả" implies GET is for everyone.
router.get('/', authMiddleware, categoryController.getAllCategories);

// Admin Routes (Create, Update, Delete)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), categoryController.createCategory);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), categoryController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), categoryController.deleteCategory);

module.exports = router;
