const mongoose = require('mongoose');

const requestSchema = mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    status: {
        type: String,
        enum: ['Requested', 'Approved', 'Rejected', 'Issued', 'Returned', 'Overdue', 'Waitlisted'],
        default: 'Requested'
    },
    issueDate: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    returnDate: {
        type: Date
    },
    fineAmount: {
        type: Number,
        default: 0
    },
    otp: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Request', requestSchema);
