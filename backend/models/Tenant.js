const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subdomain: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    adminEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    brandingColors: {
        primary: { type: String, default: '#2563eb' },
        secondary: { type: String, default: '#1e40af' }
    },
    logoUrl: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    fineConfig: {
        currency: { type: String, default: '₹' }, // Can be changed by Librarian
        finePerDay: { type: Number, default: 10 } // Assesses per overdue day
    }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
