const express = require('express');
const router = express.Router();
const manifestController = require('../controllers/manifestController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/', manifestController.create);
router.get('/', manifestController.getAll);
router.get('/:id', manifestController.getById);
router.put('/:id', manifestController.update);
router.delete('/:id', manifestController.delete);
router.post('/:id/add-items', manifestController.addItems);
router.post('/:id/remove-items', manifestController.removeItems);

module.exports = router;
