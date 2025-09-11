const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Get the User collection
        const User = mongoose.model('User');
        
        // Drop all existing indexes except _id
        await User.collection.dropIndexes();
        
        // Create only necessary indexes
        await User.collection.createIndex({ username: 1 }, { unique: true });
        await User.collection.createIndex({ email: 1 }, { unique: true });
        
        console.log('Indexes recreated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error recreating indexes:', error);
        process.exit(1);
    }
}

createIndexes(); 