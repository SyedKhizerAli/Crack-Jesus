const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
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
    role: {
        type: String,
        default: 'admin',
        enum: ['admin']
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    lastLogin: Date,
    btcPaySettings: {
        centralStore: {
            storeId: String,
            apiKey: String,
            webhookSecret: String,
            verified: Boolean,
            verifiedAt: Date,
            btcAddress: {
                address: String,
                label: String,
                verified: Boolean,
                verifiedAt: Date
            }
        },
        personalStore: {
            storeId: String,
            apiKey: String,
            webhookSecret: String,
            verified: Boolean,
            verifiedAt: Date,
            btcAddress: {
                address: String,
                label: String,
                verified: Boolean,
                verifiedAt: Date
            }
        }
    }
}, { timestamps: true });

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
