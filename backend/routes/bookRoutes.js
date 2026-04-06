const express = require('express');
const router = express.Router();
const {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    bulkImportBooks
} = require('../controllers/bookController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/', protect, checkRole(['Librarian']), createBook);
router.post('/bulk', protect, checkRole(['Librarian']), bulkImportBooks);
router.put('/:id', protect, checkRole(['Librarian']), updateBook);
router.delete('/:id', protect, checkRole(['Librarian']), deleteBook);

module.exports = router;
