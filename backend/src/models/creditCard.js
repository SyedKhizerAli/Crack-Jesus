const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
    cardDetails: {
        number: {
            type: String,
            required: true
        },
        bin: {
            type: String,
            required: true
        },
        holderName: String,
        expiryMonth: {
            type: Number,
            required: true
        },
        expiryYear: {
            type: Number,
            required: true
        },
        cvv: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['Visa', 'Mastercard', 'Amex'],
            required: true
        },
        cardType: {
            type: String,
            enum: ['debit', 'credit', 'charge', 'other'],
            default: 'credit'
        }
    },
    address: {
        country: String,
        state: String,
        city: String,
        zip: String
    },
    bank: {
        type: String,
        default: 'Unknown'
    },
    base: {
        type: String,
        default: 'Standard'
    },
    additionalInfo: String,
    note: String,
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'pending', 'sold', 'hidden'],
        default: 'available'
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    soldTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    soldAt: Date,
    listedBy: {
        type: String,
        enum: ['vendor', 'admin'],
        required: true
    },
    pendingSaleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure sensitive card details are not returned by default
creditCardSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        if (!options.includeCardDetails) {
            delete ret.cardDetails.number;
            delete ret.cardDetails.cvv;
        }
        return ret;
    }
});

module.exports = mongoose.model('CreditCard', creditCardSchema);
