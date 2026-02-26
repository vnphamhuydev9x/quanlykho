const express = require('express');
const router = express.Router();
const shortDeclarationController = require('../controllers/shortDeclaration.controller');
const authenticateToken = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');
const multer = require('multer');

// Configure multer for file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes require authentication
router.use(authenticateToken);

// GET /api/short-declarations
router.get('/', shortDeclarationController.getAll);

// GET /api/short-declarations/:id
router.get('/:id', shortDeclarationController.getById);

// POST /api/short-declarations
router.post('/', authorize(['ADMIN', 'SALE']), shortDeclarationController.create);

// PUT /api/short-declarations/:id
router.put('/:id', authorize(['ADMIN', 'SALE']), shortDeclarationController.update);

// DELETE /api/short-declarations/:id
router.delete('/:id', authorize(['ADMIN', 'SALE']), shortDeclarationController.delete);

// POST /api/short-declarations/upload
router.post('/upload', authorize(['ADMIN', 'SALE']), upload.single('file'), shortDeclarationController.uploadExcel);

module.exports = router;
