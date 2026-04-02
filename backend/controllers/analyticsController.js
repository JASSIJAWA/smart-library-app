const Book = require('../models/Book');
const Request = require('../models/Request');

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private (Librarian)
const getAnalytics = async (req, res) => {
    try {
        const totalBooks = await Book.countDocuments({ tenantId: req.tenant._id });
        const totalIssued = await Request.countDocuments({ tenantId: req.tenant._id, status: 'Issued' });
        const totalOverdue = await Request.countDocuments({ tenantId: req.tenant._id, status: 'Overdue' });

        // Calculate total fines collected (from returned books)
        const fineAgg = await Request.aggregate([
            { $match: { tenantId: req.tenant._id, fineAmount: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$fineAmount' } } }
        ]);

        const totalFine = fineAgg.length > 0 ? fineAgg[0].total : 0;

        res.status(200).json({
            totalBooks,
            totalIssued,
            totalOverdue,
            totalFine
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAnalytics
};
