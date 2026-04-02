const express = require('express');
const router = express.Router();
const {
    getCategories,
    createCategory,
    deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/', getCategories);
router.post('/', protect, checkRole(['Librarian']), createCategory);
router.delete('/:id', protect, checkRole(['Librarian']), deleteCategory);

module.exports = router;
