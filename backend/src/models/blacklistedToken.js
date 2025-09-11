const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 // This will automatically remove the document when it expires
    }
});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema); 