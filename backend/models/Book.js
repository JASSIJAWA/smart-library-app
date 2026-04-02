const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    isbn: {
        type: String,
        required: false
    },
    imageUrl: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Book', bookSchema);
