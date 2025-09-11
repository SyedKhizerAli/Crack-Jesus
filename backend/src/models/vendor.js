const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    btcPayStore: {
        storeId: String,
        apiKey: String,
        webhookSecret: String,
        verified: { 
            type: Boolean, 
            default: false 
        }
    },
    btcAddress: {
        address: String,
        label: String,
        verified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date
    },
    businessDetails: {
        verified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        businessName: String,
        businessType: String,
        contactPhone: String,
        website: String
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'pending'
    },
    vacationMode: {
        type: Boolean,
        default: false
    },
    conversionDate: {
        type: Date,
        default: Date.now
    },
    convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    suspendedAt: Date,
    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

// Add index for status queries
vendorSchema.index({ status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
