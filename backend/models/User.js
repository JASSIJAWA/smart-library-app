const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otpAuthCode: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['Member', 'Librarian'],
        default: 'Member'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
