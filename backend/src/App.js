const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const vendorRoutes = require('./api/routes/vendorRoutes'); // Import the vendor routes
const adminRoutes = require('./api/routes/adminRoutes');
const userRoutes = require('./api/routes/userRoutes');
const adminStoreRoutes = require('./api/routes/adminStoreRoutes');      // Admin's personal store management
const centralStoreRoutes = require('./api/routes/centralStoreRoutes');   // Central store management
const btcPayAdminRoutes = require('./api/routes/btcPayAdminRoutes');    // BTCPay admin operations
const cardRoutes = require('./api/routes/cardRoutes');
const paymentRoutes = require('./api/routes/paymentRoutes');
const walletRoutes = require('./api/routes/walletRoutes');
const btcPayRoutes = require('./api/routes/btcPayRoutes');
const cardVerificationRoutes = require('./api/routes/cardVerificationRoutes');
require('dotenv').config(); // Ensure that environment variables are loaded

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle raw body for BTCPay webhooks
app.use((req, res, next) => {
    if (req.path.includes('/webhook') && req.headers['content-type'] === 'application/json') {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            req.rawBody = data;
            next();
        });
    } else {
        next();
    }
});

// Add this before routes
app.use((req, res, next) => {
    console.log('Request URL:', req.method, req.url);
    next();
});

// Routes
app.use('/api/vendors', vendorRoutes); // Setup routes for vendor operations
app.use('/api/admin', adminRoutes); // Admin  routes
// User Routes
app.use('/api/users', userRoutes);

// Admin Routes
app.use('/api/admin/store', adminStoreRoutes);      // Admin's personal store management
app.use('/api/admin/central', centralStoreRoutes);   // Central store management
app.use('/api/admin/btcpay', btcPayAdminRoutes);    // BTCPay admin operations

// API Routes
app.use('/api/cards', cardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/btcpay', btcPayRoutes);
app.use('/api/cards/verification', cardVerificationRoutes);

// Server listening on a port from the environment variable or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

module.exports = app;
