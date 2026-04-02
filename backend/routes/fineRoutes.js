const express = require('express');
const router = express.Router();
const {
    checkOverdue,
} = require('../controllers/fineController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/check-overdue', protect, checkRole(['Librarian']), checkOverdue);

module.exports = router;
