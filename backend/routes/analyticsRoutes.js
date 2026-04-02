const express = require('express');
const router = express.Router();
const {
    getAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/', protect, checkRole(['Librarian']), getAnalytics);

module.exports = router;
