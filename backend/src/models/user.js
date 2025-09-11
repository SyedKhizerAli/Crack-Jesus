const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['deposit', 'payment', 'refund', 'withdrawal'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    btcPayInvoiceId: String,
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    failedAt: Date,
    failureReason: String,
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
});

const userSchema = new mongoose.Schema({
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
        enum: ['user', 'vendor', 'admin'],
        default: 'user'
    },
    wallet: {
        btcBalance: {
            type: Number,
            default: 0
        },
        transactions: [transactionSchema],
        lastVerifiedAt: Date,
        status: {
            type: String,
            enum: ['active', 'suspended', 'locked'],
            default: 'active'
        }
    },
    btcPayStore: {
        storeId: String,
        apiKey: String,
        webhookSecret: String,
        verified: Boolean
    }
}, { timestamps: true });

// Add password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
