const User = require('../../../models/user');
const CreditCard = require('../../../models/creditCard');
const Sale = require('../../../models/sale');
const Ticket = require('../../../models/ticket');
const Vendor = require('../../../models/vendor');
const BTCPayService = require('../../../services/BTCPayService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Wallet = require('../../../models/Wallet');
const walletPaymentController = require('../payment/walletPaymentController');
const RefreshToken = require('../../../models/refreshToken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// User Sign Up
exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create a new user
        const user = new User({ username, email, password }); // Raw password; hashing happens in the model
        await user.save();

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { 
                id: user._id,
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '60m' }
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

        res.status(201).json({
            message: "User registered successfully",
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error("Sign Up Error:", error);
        res.status(500).json({ message: "Failed to register user", error: error.message });
    }
};

// User Login
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Check if trying to login with vendor/admin credentials
        if (user.role !== 'user') {
            return res.status(403).json({
                message: "Please use the appropriate login endpoint"
            });
        }

        // Check if user's wallet is suspended or locked
        if (user.wallet?.status !== 'active') {
            return res.status(403).json({
                message: "Account is suspended"
            });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
            expiresAt: refreshTokenExpiry
        });

        res.status(200).json({
            message: "Login successful",
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error("User Login Error:", error);
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

// Add refresh token endpoint
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

        // Get user
        const user = await User.findById(tokenDoc.userId);
        if (!user || user.status !== 'active') {
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            return res.status(401).json({
                message: "User not found or inactive"
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

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .select('-password')
            .populate({
                path: 'wallet.transactions',
                options: { sort: { 'createdAt': -1 }, limit: 10 }
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile retrieved successfully",
            data: {
                id: user._id,
                email: user.email,
                role: user.role,
                wallet: {
                    balance: user.wallet.btcBalance,
                    recentTransactions: user.wallet.transactions
                },
                createdAt: user.createdAt
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

// Get purchase history
exports.getPurchaseHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const purchases = await Sale.find({ buyerId: userId })
            .populate('cardId', 'cardDetails.type price')
            .populate('vendorId', 'email btcPayStore.storeId')
            .select('+btcPayInvoiceId +transactionHash')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Sale.countDocuments({ buyerId: userId });

        // Get wallet transactions for these purchases
        const user = await User.findById(userId)
            .select('wallet.transactions');

        const purchaseDetails = purchases.map(purchase => ({
            id: purchase._id,
            card: {
                type: purchase.cardId.cardDetails.type,
                price: purchase.cardId.price
            },
            vendor: {
                email: purchase.vendorId.email,
                storeId: purchase.vendorId.btcPayStore.storeId
            },
            payment: {
                status: purchase.status,
                btcPayInvoiceId: purchase.btcPayInvoiceId,
                transactionHash: purchase.transactionHash
            },
            walletTransaction: user.wallet.transactions.find(
                t => t.saleId?.equals(purchase._id)
            ),
            createdAt: purchase.createdAt,
            completedAt: purchase.completedAt
        }));

        res.status(200).json({
            message: "Purchase history retrieved successfully",
            data: {
                purchases: purchaseDetails,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Purchase History Error:", error);
        res.status(500).json({
            message: "Failed to retrieve purchase history",
            error: error.message
        });
    }
};

// Get available cards for sale
exports.getAvailableCards = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, minPrice, maxPrice } = req.query;

        // Build query
        const query = {
            status: 'available',  // Only show available cards
        };

        // Add optional filters
        if (type) {
            query['cardDetails.type'] = type;
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Find cards with pagination
        const cards = await CreditCard.find(query)
            .select('cardDetails.type price listedBy createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await CreditCard.countDocuments(query);

        // Format response - show only necessary info
        const formattedCards = cards.map(card => ({
            id: card._id,
            type: card.cardDetails.type,
            price: card.price,
            seller: {
                type: card.listedBy,  // 'admin' or 'vendor'
                username: card.listedBy === 'admin' ? 'Admin' : 'Vendor',
                verified: card.listedBy === 'admin' // admin is always verified
            },
            listedAt: card.createdAt
        }));

        res.status(200).json({
            message: "Available cards retrieved successfully",
            data: {
                cards: formattedCards,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                },
                filters: {
                    type,
                    minPrice,
                    maxPrice
                }
            }
        });

    } catch (error) {
        console.error("Get Available Cards Error:", error);
        res.status(500).json({
            message: "Failed to retrieve available cards",
            error: error.message
        });
    }
};

// Purchase a Card
exports.purchaseCard = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cardId } = req.body;

        // Start transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get card and user with their wallet
            const [card, user] = await Promise.all([
                CreditCard.findById(cardId).session(session),
                User.findById(userId).session(session)
            ]);

            // Validations
            if (!card) {
                throw new Error("Card not found");
            }
            if (card.status !== 'available') {
                throw new Error("Card is not available for purchase");
            }
            if (user.wallet.btcBalance < card.price) {
                throw new Error("Insufficient wallet balance");
            }

            // Create sale record
            const sale = new Sale({
                cardId: card._id,
                buyerId: userId,
                vendorId: card.vendorId,
                btcAmount: card.price,
                status: 'pending',
                paymentSource: 'system_wallet',
                createdAt: new Date()
            });
            await sale.save({ session });

            // Deduct from user's wallet and update card status
            user.wallet.btcBalance -= card.price;
            card.status = 'pending';
            card.pendingSaleId = sale._id;

            await Promise.all([
                user.save({ session }),
                card.save({ session })
            ]);

            // Don't call forwardPaymentToVendor here
            // Let the webhook handle it after confirming the payment

            await session.commitTransaction();

            res.status(200).json({
                message: "Purchase initiated successfully",
                data: {
                    saleId: sale._id,
                    amount: card.price,
                    status: 'pending'
                }
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error("Purchase Card Error:", error);
        res.status(500).json({
            message: error.message || "Failed to purchase card",
            error: error.message
        });
    }
};

// View Purchase History
exports.viewPurchaseHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const purchases = await Sale.find({ buyerId: userId })
            .populate('cardId', 'cardDetails.type price')
            .populate('vendorId', 'businessName btcPayStore.storeId')
            .select('+btcPayInvoiceId +transactionHash')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalPurchases = await Sale.countDocuments({ 
            buyerId: userId 
        });

        // Get wallet transactions for these purchases
        const user = await User.findById(userId)
            .select('wallet.transactions');

        const purchaseDetails = purchases.map(purchase => ({
            id: purchase._id,
            card: {
                type: purchase.cardId.cardDetails.type,
                price: purchase.cardId.price
            },
            vendor: {
                businessName: purchase.vendorId.businessName,
                storeId: purchase.vendorId.btcPayStore.storeId
            },
            payment: {
                status: purchase.status,
                btcPayInvoiceId: purchase.btcPayInvoiceId,
                transactionHash: purchase.transactionHash
            },
            walletTransaction: user.wallet.transactions.find(
                t => t.saleId?.equals(purchase._id)
            ),
            createdAt: purchase.createdAt,
            completedAt: purchase.completedAt
        }));

        res.status(200).json({
            message: "Purchase history retrieved successfully",
            purchases: purchaseDetails,
            pagination: {
                total: totalPurchases,
                page: Number(page),
                pages: Math.ceil(totalPurchases / limit)
            }
        });
    } catch (error) {
        console.error("View Purchase History Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve purchase history", 
            error: error.message 
        });
    }
};

// Create Ticket
exports.createTicket = async (req, res) => {
    try {
        const { subject, description } = req.body;
        const userId = req.user.id;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        // Additional validation
        if (!description || description.trim().length === 0) {
            return res.status(400).json({
                message: "Description is required and cannot be empty",
                errors: [{ type: 'field', msg: 'Description is required', path: 'description', location: 'body' }]
            });
        }

        // Create new ticket
        const ticket = new Ticket({
            userId,
            subject: subject.trim(),
            description: description.trim(),
            status: 'open',
            messages: [{
                sender: userId,
                content: description.trim(),
                senderType: 'user'
            }],
            createdAt: new Date()
        });

        await ticket.save();

        res.status(201).json({
            message: "Support ticket created successfully",
            data: {
                id: ticket._id,
                subject: ticket.subject,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });

    } catch (error) {
        console.error("Create Ticket Error:", error);
        res.status(500).json({
            message: `Failed to create support ticket: ${error.message}`,
            error: error.message
        });
    }
};

// View ticket history
exports.viewTicketHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;

        // Build query
        const query = { userId };
        if (status && ['open', 'closed', 'pending'].includes(status)) {
            query.status = status;
        }

        // Get tickets with pagination
        const tickets = await Ticket.find(query)
            .select('subject status messages createdAt updatedAt')
            .sort({ updatedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Get total count for pagination
        const total = await Ticket.countDocuments(query);

        // Format response
        const formattedTickets = tickets.map(ticket => ({
            id: ticket._id,
            subject: ticket.subject,
            status: ticket.status,
            lastMessage: ticket.messages[ticket.messages.length - 1]?.content,
            lastUpdate: ticket.updatedAt || ticket.createdAt,
            createdAt: ticket.createdAt,
            messageCount: ticket.messages.length
        }));

        res.status(200).json({
            message: "Ticket history retrieved successfully",
            data: {
                tickets: formattedTickets,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                },
                filters: {
                    status
                }
            }
        });

    } catch (error) {
        console.error("View Ticket History Error:", error);
        res.status(500).json({
            message: "Failed to retrieve ticket history",
            error: error.message
        });
    }
};

// Get single ticket details
exports.getTicketDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;

        // Find ticket
        const ticket = await Ticket.findOne({
            _id: ticketId,
            userId
        }).populate('messages.sender', 'username role');

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
                status: ticket.status,
                messages: ticket.messages.map(msg => ({
                    id: msg._id,
                    content: msg.content,
                    sender: {
                        username: msg.sender.username,
                        role: msg.sender.role
                    },
                    createdAt: msg.createdAt
                })),
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt
            }
        });

    } catch (error) {
        console.error("Get Ticket Details Error:", error);
        res.status(500).json({
            message: "Failed to retrieve ticket details",
            error: error.message
        });
    }
};

// Add message to ticket
exports.addTicketMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.params;
        const { message } = req.body;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array()
            });
        }

        // Find and update ticket
        const ticket = await Ticket.findOne({
            _id: ticketId,
            userId
        });

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        if (ticket.status === 'closed') {
            return res.status(400).json({
                message: "Cannot add message to closed ticket"
            });
        }

        // Add new message
        ticket.messages.push({
            sender: userId,
            content: message.trim(),
            senderType: 'user',
            createdAt: new Date()
        });

        // Update ticket status if it was 'pending'
        if (ticket.status === 'pending') {
            ticket.status = 'open';
        }

        await ticket.save();

        res.status(200).json({
            message: "Message added successfully",
            data: {
                ticketId: ticket._id,
                status: ticket.status,
                messageCount: ticket.messages.length
            }
        });

    } catch (error) {
        console.error("Add Ticket Message Error:", error);
        res.status(500).json({
            message: "Failed to add message",
            error: error.message
        });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both old and new passwords are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        user.password = newPassword; // Hashing handled in the model's pre-save hook
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Failed to update password", error: error.message });
    }
};

// View Single Card
exports.viewSingleCard = async (req, res) => {
    try {
        const { cardId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(cardId)) {
            return res.status(400).json({ message: "Invalid card ID" });
        }

        const card = await CreditCard.findOne({ 
            _id: cardId, 
            status: 'available' 
        })
        .populate('vendorId', 'username btcPayStore.verified')
        .select('cardDetails.number cardDetails.holderName price listedDate');

        if (!card) {
            return res.status(404).json({ 
                message: "Card not found or not available" 
            });
        }

        // Check if vendor's BTCPay is set up
        if (!card.vendorId.btcPayStore?.verified) {
            return res.status(400).json({ 
                message: "Card payment not configured" 
            });
        }

        res.status(200).json({
            message: "Card retrieved successfully",
            card: {
                id: card._id,
                number: card.cardDetails.number,
                holderName: card.cardDetails.holderName,
                price: card.price,
                listedDate: card.listedDate,
                vendor: {
                    username: card.vendorId.username,
                    btcPayVerified: card.vendorId.btcPayStore.verified
                }
            },
        });
    } catch (error) {
        console.error("View Single Card Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve card details", 
            error: error.message 
        });
    }
};

// User Logout
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user.id;

        // Delete the refresh token from database
        await RefreshToken.deleteOne({ 
            userId,
            token: refreshToken 
        });

        res.status(200).json({
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout Error:", error);
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

        // Delete all refresh tokens for this user
        await RefreshToken.deleteMany({ userId });

        res.status(200).json({
            message: "Logged out from all devices successfully"
        });

    } catch (error) {
        console.error("Logout All Error:", error);
        res.status(500).json({
            message: "Failed to logout from all devices",
            error: error.message
        });
    }
};

// Get purchased cards
exports.getPurchasedCards = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        // Find all sales where user is the buyer and status is completed
        const purchases = await Sale.find({ 
            buyerId: userId,
            status: 'completed'
        })
        .populate({
            path: 'cardId',
            select: 'cardDetails price soldAt',
            // Only include necessary card details
            transform: (doc) => ({
                id: doc._id,
                type: doc.cardDetails.type,
                number: doc.cardDetails.number,
                expiryMonth: doc.cardDetails.expiryMonth,
                expiryYear: doc.cardDetails.expiryYear,
                cvv: doc.cardDetails.cvv,
                price: doc.price,
                purchaseDate: doc.soldAt
            })
        })
        .populate('vendorId', 'username email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

        const total = await Sale.countDocuments({ 
            buyerId: userId,
            status: 'completed'
        });

        res.status(200).json({
            message: "Purchased cards retrieved successfully",
            data: {
                cards: purchases.map(purchase => ({
                    id: purchase.cardId.id,
                    type: purchase.cardId.type,
                    number: purchase.cardId.number,
                    expiryMonth: purchase.cardId.expiryMonth,
                    expiryYear: purchase.cardId.expiryYear,
                    cvv: purchase.cardId.cvv,
                    price: purchase.cardId.price,
                    purchaseDate: purchase.cardId.purchaseDate,
                    vendor: {
                        username: purchase.vendorId.username,
                        email: purchase.vendorId.email
                    },
                    saleId: purchase._id
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Purchased Cards Error:", error);
        res.status(500).json({
            message: "Failed to retrieve purchased cards",
            error: error.message
        });
    }
};

// Get single purchased card details
exports.getPurchasedCardDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cardId } = req.params;

        // Find the sale record
        const purchase = await Sale.findOne({
            buyerId: userId,
            cardId: cardId,
            status: 'completed'
        })
        .populate('cardId')
        .populate('vendorId', 'username email');

        if (!purchase) {
            return res.status(404).json({
                message: "Purchased card not found"
            });
        }

        res.status(200).json({
            message: "Card details retrieved successfully",
            data: {
                id: purchase.cardId._id,
                cardDetails: {
                    type: purchase.cardId.cardDetails.type,
                    number: purchase.cardId.cardDetails.number,
                    expiryMonth: purchase.cardId.cardDetails.expiryMonth,
                    expiryYear: purchase.cardId.cardDetails.expiryYear,
                    cvv: purchase.cardId.cardDetails.cvv,
                    holderName: purchase.cardId.cardDetails.holderName
                },
                price: purchase.btcAmount,
                purchaseDate: purchase.cardId.soldAt,
                vendor: {
                    username: purchase.vendorId.username,
                    email: purchase.vendorId.email
                },
                saleId: purchase._id,
                transactionDetails: {
                    status: purchase.status,
                    createdAt: purchase.createdAt,
                    completedAt: purchase.completedAt
                }
            }
        });

    } catch (error) {
        console.error("Get Purchased Card Details Error:", error);
        res.status(500).json({
            message: "Failed to retrieve card details",
            error: error.message
        });
    }
};

// Request refund for purchase
exports.requestRefund = async (req, res) => {
    try {
        const userId = req.user.id;
        const { purchaseId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
            return res.status(400).json({ message: "Invalid purchase ID" });
        }
        
        // Get the purchase with card details
        const purchase = await Sale.findOne({
            _id: purchaseId,
            buyerId: userId
        }).populate('cardId');
        
        if (!purchase) {
            return res.status(404).json({ message: "Purchase not found" });
        }
        
        // Check if purchase is eligible for refund
        const purchaseTime = new Date(purchase.createdAt).getTime();
        const currentTime = new Date().getTime();
        const timeDiffMinutes = (currentTime - purchaseTime) / (1000 * 60);
        
        if (timeDiffMinutes > 5) {
            return res.status(400).json({ 
                message: "Refund window expired. Refunds must be requested within 5 minutes of purchase." 
            });
        }
        
        // Check if already refunded
        if (purchase.status === 'refunded') {
            return res.status(400).json({ message: "This purchase has already been refunded" });
        }
        
        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Update sale status
            purchase.status = 'refunded';
            await purchase.save({ session });
            
            // Get buyer
            const buyer = await User.findById(userId).session(session);
            
            if (!buyer) {
                throw new Error("Buyer not found");
            }
            
            // Add refund transaction to buyer's wallet
            buyer.wallet.btcBalance += purchase.btcAmount;
            buyer.wallet.transactions.push({
                type: 'refund',
                amount: purchase.btcAmount,
                description: `Refund for card purchase #${purchase._id}`,
                saleId: purchase._id,
                status: 'completed',
                createdAt: new Date(),
                completedAt: new Date()
            });
            
            await buyer.save({ session });
            
            // Update card status back to available
            const card = await CreditCard.findById(purchase.cardId).session(session);
            if (card) {
                card.status = 'available';
                card.pendingSaleId = null;
                await card.save({ session });
            }
            
            // Commit transaction
            await session.commitTransaction();
            session.endSession();
            
            res.status(200).json({
                message: "Refund processed successfully",
                data: {
                    purchase: {
                        id: purchase._id,
                        status: purchase.status,
                        amount: purchase.btcAmount,
                        refundDate: new Date()
                    }
                }
            });
        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Refund Error:", error);
        res.status(500).json({ 
            message: "Failed to process refund", 
            error: error.message 
        });
    }
};
