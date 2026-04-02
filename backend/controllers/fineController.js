const Request = require('../models/Request');

// @desc    Check for overdue books and update status
// @route   GET /api/fines/check-overdue
// @access  Private (Librarian)
const checkOverdue = async (req, res) => {
    try {
        const today = new Date();

        // Find all requests that are Issued and due date is past
        const overdueRequests = await Request.find({
            status: 'Issued',
            dueDate: { $lt: today }
        });

        let updatedCount = 0;
        for (const request of overdueRequests) {
            request.status = 'Overdue';
            // Optional: Calculate initial fine here if needed, but we calculate on Return usually
            // Or we can update fine per day here. 
            // For simplicity, we just mark as Overdue. Fine is calculated on Return or View.
            await request.save();
            updatedCount++;
        }

        res.status(200).json({ message: `Checked overdue books. Updated ${updatedCount} records to Overdue.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ... (We could add getTotalFines or similar here, but it's part of Analytics)

module.exports = {
    checkOverdue
};
