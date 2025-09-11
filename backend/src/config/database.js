const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Try to connect to MongoDB Atlas first
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crackjesus';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        
        // If Atlas connection fails, try local MongoDB
        if (process.env.MONGODB_URI) {
            console.log('Trying local MongoDB as fallback...');
            try {
                await mongoose.connect('mongodb://localhost:27017/crackjesus', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                console.log('Connected to local MongoDB');
            } catch (localErr) {
                console.error('Local MongoDB connection also failed:', localErr);
                console.log('Please ensure MongoDB is running locally or fix your Atlas connection');
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
}

module.exports = connectDB;
