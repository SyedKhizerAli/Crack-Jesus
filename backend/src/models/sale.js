const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    btcAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'refunded'], 
        default: 'pending' 
    },
    paymentSource: { 
        type: String, 
        enum: ['system_wallet'], 
        default: 'system_wallet'
    },
    btcPayInvoiceId: String,
    forwardingStatus: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    commissionSplit: {
        applied: { type: Boolean, default: false },
        adminAmount: { type: Number },
        vendorAmount: { type: Number },
        percentage: { type: Number }
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    refundedAt: Date,
    failureReason: String,
    manuallyMarked: { type: Boolean, default: false },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who marked it
    adminNotes: String
});

// Update completedDate when status changes to completed
saleSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'completed') {
            this.completedAt = new Date();
        } else if (this.status === 'refunded') {
            this.refundedAt = new Date();
        }
    }
    next();
});

// Indexes
saleSchema.index({ buyerId: 1, status: 1 });
saleSchema.index({ vendorId: 1, status: 1 });
saleSchema.index({ btcPayInvoiceId: 1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);