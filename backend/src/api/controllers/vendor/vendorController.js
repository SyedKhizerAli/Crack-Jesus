const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const CreditCard = require('../../../models/creditCard');
const Sale = require('../../../models/sale');
const Ticket = require('../../../models/ticket');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PaymentForwardingService = require('../../../services/PaymentForwardingService');
const RefreshToken = require('../../../models/refreshToken');
const BlacklistedToken = require('../../../models/blacklistedToken');
const CardVerificationService = require('../../../services/cardVerificationService');

// Vendor Signup
exports.signup = [
    body('username', 'Username is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    
    async (req, res) => {
        let session;
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { username, email, password } = req.body;

            // Start transaction
            session = await mongoose.startSession();
            await session.withTransaction(async () => {
                // Check both User and Vendor collections for username/email
                const [existingUser, existingVendor] = await Promise.all([
                    User.findOne({ 
                        $or: [{ email }, { username }] 
                    }).session(session),
                    Vendor.findOne({ username }).session(session)
                ]);
                
                if (existingUser) {
                    throw new Error("User with this email or username already exists");
                }

                if (existingVendor) {
                    throw new Error("Vendor with this username already exists");
                }

                const user = new User({
                    username,
                    email,
                    password,
                    role: 'vendor'
                });

                await user.save({ session });

                const vendor = new Vendor({ 
                    userId: user._id,
                    username: username,
                    email: email,
                    btcPayStore: {
                        storeId: null,
                        apiKey: null,
                        webhookSecret: null,
                        verified: false
                    },
                    status: 'active'
                });

                await vendor.save({ session });

                const accessToken = jwt.sign(
                    { id: user._id, role: user.role }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '15m' }
                );

                const refreshToken = crypto.randomBytes(40).toString('hex');
                const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                await RefreshToken.create([{
                    userId: user._id,
                    token: refreshToken,
                    expiresAt: refreshTokenExpiry
                }], { session });

                // Store response data to be sent after transaction commits
                req.signupData = {
                    accessToken,
                    refreshToken,
                    user: { 
                        id: vendor._id, 
                        username: username,
                        email: user.email,
                        role: user.role,
                        status: vendor.status,
                        btcPaySetup: false
                    }
                };
            });

            // Transaction committed successfully, send response
            res.status(201).json({
                message: "Vendor registered successfully",
                data: req.signupData
            });

        } catch (error) {
            console.error("Signup Error:", error);
            res.status(500).json({ 
                message: error.message || "Error registering vendor", 
                error: error.message 
            });
        } finally {
            if (session) {
                session.endSession();
            }
        }
    }
];

// Vendor Login
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.role !== 'vendor') {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Get vendor details
        const vendor = await Vendor.findOne({ userId: user._id });
        const btcPaySetup = vendor?.btcPayStore?.verified || false;

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { 
                id: user._id,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Save refresh token
        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
            expiresAt: refreshTokenExpiry
        });

        res.json({
            message: "Login successful",
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    btcPaySetup,
                    btcPayStore: btcPaySetup ? {
                        storeId: vendor.btcPayStore.storeId,
                        verified: vendor.btcPayStore.verified
                    } : null
                }
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Failed to log in", error: error.message });
    }
};

// Refresh Token for Vendor
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                message: "Refresh token is required"
            });
        }

        // Find valid refresh token
        const tokenDoc = await RefreshToken.findOne({
            token: refreshToken,
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            return res.status(401).json({
                message: "Invalid or expired refresh token"
            });
        }

        // Get user and verify vendor role
        const user = await User.findById(tokenDoc.userId);
        if (!user || user.status !== 'active' || user.role !== 'vendor') {
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            return res.status(401).json({
                message: "User not found or not a vendor"
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { 
                id: user._id,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Generate new refresh token (optional - rotation for better security)
        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Update the token document with the new token
        tokenDoc.token = newRefreshToken;
        tokenDoc.expiresAt = refreshTokenExpiry;
        await tokenDoc.save();

        res.status(200).json({
            message: "Token refreshed successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.status(500).json({
            message: "Failed to refresh token",
            error: error.message
        });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password does not match" });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Failed to change password", error: error.message });
    }
};

// Upload Cards
exports.uploadCards = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { cards } = req.body;

        if (!Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ 
                message: "Valid cards array required" 
            });
        }

        // Verify vendor has BTCPay setup
        const vendor = await Vendor.findOne({ userId: vendorId });
        if (!vendor?.btcPayStore?.verified) {
            return res.status(400).json({ 
                message: "Please setup BTCPay store first" 
            });
        }

        // Verify cards before inserting
        const verifiedCards = [];
        const failedCards = [];

        for (const card of cards) {
            try {
                // Verify the card
                const verificationResult = await CardVerificationService.verifyCard({
                    number: card.number,
                    expiryMonth: card.expiryMonth,
                    expiryYear: card.expiryYear,
                    cvv: card.cvv
                });

                // Check 3DS status
                const threeDSResult = await CardVerificationService.check3DS({
                    number: card.number
                });

                if (verificationResult.approved) {
                    verifiedCards.push({
                        ...card,
                        verification: {
                            verified: true,
                            message: verificationResult.message,
                            has3DS: threeDSResult.is3dsEnabled
                        }
                    });
                } else {
                    failedCards.push({
                        ...card,
                        verification: {
                            verified: false,
                            message: verificationResult.message
                        }
                    });
                }
            } catch (error) {
                failedCards.push({
                    ...card,
                    verification: {
                        verified: false,
                        message: error.message
                    }
                });
            }
        }

        // Only insert verified cards
        if (verifiedCards.length === 0) {
            return res.status(400).json({
                message: "No valid cards to upload",
                failedCards
            });
        }

        // Process cards - fix the mapping and capitalize card type
        const cardsToInsert = verifiedCards.map(card => ({
            vendorId: vendor._id,
            cardDetails: {
                number: card.number,
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                cvv: card.cvv,
                type: card.type.charAt(0).toUpperCase() + card.type.slice(1).toLowerCase(),
                has3DS: card.verification.has3DS
            },
            price: card.price,
            status: 'available',
            listedBy: 'vendor',
            createdAt: new Date()
        }));

        const uploadedCards = await CreditCard.insertMany(cardsToInsert);

        res.status(201).json({
            message: "Cards uploaded successfully",
            count: uploadedCards.length,
            cards: uploadedCards.map(card => ({
                id: card._id,
                type: card.cardDetails.type,
                price: card.price,
                has3DS: card.cardDetails.has3DS
            })),
            failedCards: failedCards.length > 0 ? failedCards : undefined
        });

    } catch (error) {
        console.error("Upload Cards Error:", error);
        res.status(500).json({ 
            message: "Failed to upload cards", 
            error: error.message 
        });
    }
};

// Update Card
exports.updateCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user.id;

        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Debug logs
        console.log('Looking for card with:', {
            cardId,
            vendorId: vendor._id.toString()  // Convert to string for comparison
        });

        // First check if card exists at all
        const cardExists = await CreditCard.findById(cardId);
        console.log('Card exists:', cardExists);

        // Then try to find with vendor ID
        const card = await CreditCard.findOne({
            _id: cardId,
            vendorId: vendor._id  // This should match the vendorId in your card data
        });

        console.log('Found card with vendor:', card);

        if (!card) {
            return res.status(404).json({
                message: "Card not found or not owned by vendor"
            });
        }

        // Update allowed fields
        const allowedUpdates = ['price', 'status'];
        const updates = req.body;

        Object.keys(updates).forEach(update => {
            if (allowedUpdates.includes(update)) {
                card[update] = updates[update];
            }
        });

        await card.save();

        res.status(200).json({
            message: "Card updated successfully",
            data: {
                id: card._id,
                type: card.cardDetails.type,
                price: card.price,
                status: card.status
            }
        });

    } catch (error) {
        console.error("Update Card Error:", error);
        res.status(500).json({
            message: "Failed to update card",
            error: error.message
        });
    }
};

// View Cards
exports.viewCards = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;

        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        const query = { vendorId: vendor._id };  // Use vendor._id instead of userId
        if (status) {
            query.status = status;
        }

        const cards = await CreditCard.find(query)
            .select('-cardDetails.number -cardDetails.cvv')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await CreditCard.countDocuments(query);

        res.status(200).json({
            message: "Cards retrieved successfully",
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            cards
        });

    } catch (error) {
        console.error("View Cards Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve cards", 
            error: error.message 
        });
    }
};

// Delete Card
exports.deleteCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user.id;

        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Find the card and verify ownership
        const card = await CreditCard.findOne({
            _id: cardId,
            vendorId: vendor._id
        });

        if (!card) {
            return res.status(404).json({ 
                message: "Card not found or not owned by vendor" 
            });
        }

        if (card.status === 'sold') {
            return res.status(400).json({ 
                message: "Cannot delete a sold card" 
            });
        }

        await CreditCard.deleteOne({ _id: cardId });

        res.status(200).json({
            message: "Card deleted successfully"
        });

    } catch (error) {
        console.error("Delete Card Error:", error);
        res.status(500).json({ 
            message: "Failed to delete card", 
            error: error.message 
        });
    }
};

// to be tested
// View Sales History
exports.getSalesHistory = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

        const query = { vendorId };
        
        if (status) {
            query.status = status;
        }
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const sales = await Sale.find(query)
            .populate('cardId', 'cardDetails.type price')
            .populate('buyerId', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Sale.countDocuments(query);

        // Calculate total BTC for completed sales
        const totalBTC = await Sale.aggregate([
            { $match: { ...query, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$btcAmount' } } }
        ]);

        res.status(200).json({
            message: "Sales history retrieved successfully",
            data: {
                total,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit)
                },
                stats: {
                    totalBTC: totalBTC[0]?.total || 0
                },
                sales: sales.map(sale => ({
                    id: sale._id,
                    cardType: sale.cardId.cardDetails.type,
                    price: sale.btcAmount,
                    buyer: sale.buyerId.username,
                    status: sale.status,
                    paymentSource: sale.paymentSource,
                    manuallyMarked: sale.manuallyMarked,
                    createdAt: sale.createdAt,
                    completedAt: sale.completedAt
                }))
            }
        });
    } catch (error) {
        console.error("Get Sales History Error:", error);
        res.status(500).json({ 
            message: "Failed to get sales history", 
            error: error.message 
        });
    }
};

// Create Ticket
exports.createTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subject, description } = req.body;

        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        const ticket = new Ticket({ 
            userId,  // User ID for authentication
            vendorId: vendor._id,  // Add vendor ID for reference
            subject, 
            description, 
            status: 'open' 
        });
        await ticket.save();

        res.status(201).json({ 
            message: "Ticket created successfully", 
            ticket 
        });
    } catch (error) {
        console.error("Create Ticket Error:", error);
        res.status(500).json({ 
            message: "Failed to create ticket", 
            error: error.message 
        });
    }
};

// View Tickets
exports.viewTickets = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({ 
                message: "Vendor not found" 
            });
        }

        // Retrieve tickets using userId instead of vendorId
        const tickets = await Ticket.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({ 
            message: tickets.length ? "Tickets retrieved successfully" : "No tickets found", 
            tickets,
            count: tickets.length
        });

    } catch (error) {
        console.error("View Tickets Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve tickets", 
            error: error.message 
        });
    }
};

// Setup BTCPay Store
exports.setupBTCPayStore = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { storeId, apiKey } = req.body;

        const vendor = await Vendor.findOne({ userId: vendorId });
        if (!vendor) {
            return res.status(404).json({ 
                message: "Vendor not found" 
            });
        }

        // Verify BTCPay store credentials
        try {
            const response = await axios.get(
                `${process.env.BTCPAY_URL}/api/v1/stores/${storeId}`,
                {
                    headers: { 
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("BTCPay Response:", response.data);

            vendor.btcPayStore = {
                storeId,
                apiKey,
                verified: true,
                webhookSecret: crypto.randomBytes(32).toString('hex')
            };
            vendor.status = 'active';

            await vendor.save();

            res.status(200).json({
                message: "BTCPay store setup successful",
                btcPayStore: {
                    storeId: vendor.btcPayStore.storeId,
                    verified: vendor.btcPayStore.verified
                }
            });

        } catch (error) {
            console.error("BTCPay verification error:", error.response?.data || error.message);
            res.status(400).json({ 
                message: "Invalid BTCPay store credentials" 
            });
        }

    } catch (error) {
        console.error("BTCPay Setup Error:", error);
        res.status(500).json({ 
            message: "Failed to setup BTCPay store", 
            error: error.message 
        });
    }
};

// Get BTCPay Store Status
exports.getBTCPayStatus = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const vendor = await Vendor.findOne({ userId: vendorId });

        if (!vendor?.btcPayStore) {
            return res.status(200).json({
                setup: false,
                message: "BTCPay store not configured"
            });
        }

        res.status(200).json({
            setup: true,
            verified: vendor.btcPayStore.verified,
            storeId: vendor.btcPayStore.storeId
        });

    } catch (error) {
        console.error("Get BTCPay Status Error:", error);
        res.status(500).json({ 
            message: "Failed to get BTCPay status", 
            error: error.message 
        });
    }
};

// Get store stats
exports.getStoreStats = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Get card stats
        const cardStats = await CreditCard.aggregate([
            { $match: { vendorId } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);

        // Get sales stats
        const salesStats = await Sale.aggregate([
            { $match: { vendorId } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalBTC: { $sum: '$btcAmount' }
            }}
        ]);

        res.status(200).json({
            message: "Store stats retrieved successfully",
            cards: cardStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
            sales: salesStats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    btcAmount: stat.totalBTC
                };
                return acc;
            }, {})
        });

    } catch (error) {
        console.error("Get Store Stats Error:", error);
        res.status(500).json({ 
            message: "Failed to get store stats", 
            error: error.message 
        });
    }
};

// Get single ticket details
exports.getTicketDetails = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user.id;

        // Find vendor first
        const vendor = await Vendor.findOne({ userId });
        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Find ticket with both userId and ticketId
        const ticket = await Ticket.findOne({
            _id: ticketId,
            userId
        }).populate('responses.adminId', 'username email');

        if (!ticket) {
            return res.status(404).json({ 
                message: "Ticket not found" 
            });
        }

        res.status(200).json({
            message: "Ticket details retrieved successfully",
            data: {
                id: ticket._id,
                subject: ticket.subject,
                description: ticket.description,
                status: ticket.status,
                responses: ticket.responses,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt
            }
        });

    } catch (error) {
        console.error("Get Ticket Details Error:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: "Invalid ticket ID format"
            });
        }
        res.status(500).json({ 
            message: "Failed to get ticket details", 
            error: error.message 
        });
    }
};

// Update BTC Address
exports.updateBtcAddress = async (req, res) => {
    try {
        const { btcAddress, label } = req.body;
        
        // Get vendor with BTCPay store details
        const vendor = await Vendor.findOne({ userId: req.user.id });
        
        if (!vendor?.btcPayStore?.verified) {
            return res.status(400).json({
                message: "BTCPay store must be set up first"
            });
        }

        // Get store credentials from vendor record
        const { storeId, apiKey } = vendor.btcPayStore;
        
        // Verify address with BTCPay
        try {
            await PaymentForwardingService.verifyBtcAddress(btcAddress, storeId, apiKey);
        } catch (error) {
            return res.status(400).json({
                message: "BTC address verification failed",
                error: error.message
            });
        }

        // Update vendor BTC address
        vendor.btcAddress = {
            address: btcAddress,
            label: label || null,
            verified: true,
            verifiedAt: new Date()
        };

        await vendor.save();

        res.status(200).json({
            message: "BTC address updated successfully",
            data: vendor.btcAddress
        });

    } catch (error) {
        console.error("Update BTC Address Error:", error);
        res.status(500).json({
            message: "Failed to update BTC address",
            error: error.message
        });
    }
};

// Vendor Logout
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user.id;
        const accessToken = req.headers.authorization?.split(' ')[1];

        // Verify user is a vendor
        const user = await User.findById(userId);
        if (!user || user.role !== 'vendor') {
            return res.status(403).json({
                message: "Not authorized as vendor"
            });
        }

        // Delete the refresh token
        await RefreshToken.deleteOne({ 
            userId,
            token: refreshToken 
        });

        // Add token to blacklist if you want to invalidate access token immediately
        await BlacklistedToken.create({
            token: accessToken,
            userId,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });

        res.status(200).json({
            message: "Vendor logged out successfully"
        });

    } catch (error) {
        console.error("Vendor Logout Error:", error);
        res.status(500).json({
            message: "Failed to logout",
            error: error.message
        });
    }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const accessToken = req.headers.authorization?.split(' ')[1];

        // Verify user is a vendor
        const user = await User.findById(userId);
        if (!user || user.role !== 'vendor') {
            return res.status(403).json({
                message: "Not authorized as vendor"
            });
        }

        // Delete all refresh tokens
        await RefreshToken.deleteMany({ userId });

        // Blacklist current access token
        await BlacklistedToken.create({
            token: accessToken,
            userId,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });

        res.status(200).json({
            message: "Vendor logged out from all devices successfully"
        });

    } catch (error) {
        console.error("Vendor Logout All Error:", error);
        res.status(500).json({
            message: "Failed to logout from all devices",
            error: error.message
        });
    }
};

// Toggle Vacation Mode
exports.toggleVacationMode = async (req, res) => {
    try {
        const { vacationMode } = req.body;
        
        if (typeof vacationMode !== 'boolean') {
            return res.status(400).json({ 
                message: "Invalid request. vacationMode must be a boolean value." 
            });
        }
        
        const userId = req.user.id;
        const vendor = await Vendor.findOne({ userId });
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        vendor.vacationMode = vacationMode;
        await vendor.save();
        
        res.status(200).json({
            message: `Vacation mode ${vacationMode ? 'enabled' : 'disabled'} successfully`,
            data: {
                vacationMode: vendor.vacationMode
            }
        });
    } catch (error) {
        console.error("Vacation Mode Toggle Error:", error);
        res.status(500).json({ 
            message: "Failed to update vacation mode", 
            error: error.message 
        });
    }
};

// Get Vendor Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const vendor = await Vendor.findOne({ userId });
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        res.status(200).json({
            message: "Profile retrieved successfully",
            data: {
                profile: {
                    username: vendor.username,
                    email: vendor.email,
                    businessName: vendor.businessName || '',
                    description: vendor.description || '',
                    contactEmail: vendor.contactEmail || '',
                    contactPhone: vendor.contactPhone || '',
                    btcPayServerUrl: vendor.btcPayServerUrl || '',
                    vacationMode: vendor.vacationMode || false,
                    createdAt: vendor.createdAt
                }
            }
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve profile", 
            error: error.message 
        });
    }
};

// Update Vendor Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;
        
        // Remove fields that shouldn't be updated this way
        const allowedFields = ['businessName', 'description', 'contactEmail', 
                               'contactPhone', 'btcPayServerUrl'];
        
        Object.keys(updateData).forEach(key => {
            if (!allowedFields.includes(key)) {
                delete updateData[key];
            }
        });
        
        const vendor = await Vendor.findOneAndUpdate(
            { userId }, 
            { $set: updateData },
            { new: true }
        );
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        res.status(200).json({
            message: "Profile updated successfully",
            data: {
                profile: {
                    username: vendor.username,
                    email: vendor.email,
                    businessName: vendor.businessName || '',
                    description: vendor.description || '',
                    contactEmail: vendor.contactEmail || '',
                    contactPhone: vendor.contactPhone || '',
                    btcPayServerUrl: vendor.btcPayServerUrl || '',
                    vacationMode: vendor.vacationMode || false,
                    createdAt: vendor.createdAt
                }
            }
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ 
            message: "Failed to update profile", 
            error: error.message 
        });
    }
};