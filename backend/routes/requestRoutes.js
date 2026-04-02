const express = require('express');
const router = express.Router();
const {
    createRequest,
    getRequests,
    updateRequestStatus,
    processIsbnReturn
} = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.post('/return/isbn', protect, checkRole(['Librarian']), processIsbnReturn);
router.put('/:id', protect, checkRole(['Librarian']), updateRequestStatus);

module.exports = router;
