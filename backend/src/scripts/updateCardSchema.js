const mongoose = require('mongoose');
const CreditCard = require('../models/creditCard');
require('dotenv').config();

async function updateCardSchema() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crackjesus');
        console.log('Connected to MongoDB');

        // Update all existing cards to include new fields
        const result = await CreditCard.updateMany(
            {
                // Find cards that don't have the new fields
                $or: [
                    { 'cardDetails.bin': { $exists: false } },
                    { 'address': { $exists: false } },
                    { 'bank': { $exists: false } },
                    { 'base': { $exists: false } },
                    { 'cardDetails.cardType': { $exists: false } },
                    { 'additionalInfo': { $exists: false } },
                    { 'note': { $exists: false } }
                ]
            },
            {
                $set: {
                    'cardDetails.bin': '000000', // Default BIN
                    'address': {
                        country: '',
                        state: '',
                        city: '',
                        zip: ''
                    },
                    'bank': 'Unknown',
                    'base': 'Standard',
                    'cardDetails.cardType': 'credit',
                    'additionalInfo': '',
                    'note': ''
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} cards with new schema fields`);

        // Also update cards that have cardDetails but missing new fields
        const result2 = await CreditCard.updateMany(
            {
                'cardDetails': { $exists: true },
                $or: [
                    { 'cardDetails.bin': { $exists: false } },
                    { 'cardDetails.cardType': { $exists: false } }
                ]
            },
            {
                $set: {
                    'cardDetails.bin': '000000',
                    'cardDetails.cardType': 'credit'
                }
            }
        );

        console.log(`Updated ${result2.modifiedCount} additional cards with cardDetails fields`);

        console.log('Card schema update completed successfully');
    } catch (error) {
        console.error('Error updating card schema:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
updateCardSchema(); 