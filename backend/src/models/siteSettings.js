const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
    siteName: {
        type: String,
        default: 'CrackJesus'
    },
    siteDescription: {
        type: String,
        default: 'Secure Card Management Platform'
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    registrationEnabled: {
        type: Boolean,
        default: true
    },
    vendorRegistrationEnabled: {
        type: Boolean,
        default: true
    },
    minWithdrawalAmount: {
        type: Number,
        default: 10,
        min: 0
    },
    maxWithdrawalAmount: {
        type: Number,
        default: 1000,
        min: 0
    },
    platformFeePercentage: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
    },
    commissionSplitEnabled: {
        type: Boolean,
        default: false
    },
    commissionSplitPercentage: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    paymentHoldPeriodMinutes: {
        type: Number,
        default: 5,
        min: 0
    },
    contactEmail: {
        type: String,
        default: 'contact@crackjesus.com'
    },
    supportEmail: {
        type: String,
        default: 'support@crackjesus.com'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

// Create a singleton pattern - there's only one settings document
siteSettingsSchema.statics.getSettings = async function() {
    const settings = await this.findOne();
    if (settings) {
        return settings;
    }
    
    // If no settings exist, create with defaults
    return await this.create({});
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema); 