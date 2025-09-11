const mongoose = require('mongoose');

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
    btcPayInvoiceId: {
        type: String,
        sparse: true,
        index: true
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        sparse: true
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
}, { _id: true });

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    btcBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    transactions: [transactionSchema],
    lastVerifiedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'locked'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
walletSchema.index({ 'transactions.status': 1 });
walletSchema.index({ 'transactions.createdAt': 1 });

// Virtual for pending balance
walletSchema.virtual('pendingBalance').get(function() {
    return this.transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => {
            if (t.type === 'deposit' || t.type === 'refund') {
                return sum + t.amount;
            }
            return sum - t.amount;
        }, 0);
});

// Methods
walletSchema.methods.addTransaction = async function(transactionData) {
    this.transactions.push(transactionData);
    
    if (transactionData.status === 'completed') {
        if (transactionData.type === 'deposit' || transactionData.type === 'refund') {
            this.btcBalance += transactionData.amount;
        } else if (transactionData.type === 'payment' || transactionData.type === 'withdrawal') {
            this.btcBalance -= transactionData.amount;
        }
    }

    return this.save();
};

walletSchema.methods.completeTransaction = async function(btcPayInvoiceId) {
    const transaction = this.transactions.find(
        t => t.btcPayInvoiceId === btcPayInvoiceId && t.status === 'pending'
    );

    if (transaction) {
        transaction.status = 'completed';
        transaction.completedAt = new Date();

        if (transaction.type === 'deposit' || transaction.type === 'refund') {
            this.btcBalance += transaction.amount;
        } else if (transaction.type === 'payment' || transaction.type === 'withdrawal') {
            this.btcBalance -= transaction.amount;
        }

        return this.save();
    }
    
    throw new Error('Transaction not found');
};

walletSchema.methods.failTransaction = async function(btcPayInvoiceId, reason) {
    const transaction = this.transactions.find(
        t => t.btcPayInvoiceId === btcPayInvoiceId && t.status === 'pending'
    );

    if (transaction) {
        transaction.status = 'failed';
        transaction.failedAt = new Date();
        transaction.failureReason = reason;
        return this.save();
    }

    throw new Error('Transaction not found');
};

// Statics
walletSchema.statics.findByInvoiceId = function(btcPayInvoiceId) {
    return this.findOne({
        'transactions.btcPayInvoiceId': btcPayInvoiceId
    });
};

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

module.exports = Wallet; 