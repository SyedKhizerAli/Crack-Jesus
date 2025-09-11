const Admin = require('../../../models/admin');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const CreditCard = require('../../../models/creditCard');
const Sale = require('../../../models/sale');
const Ticket = require('../../../models/ticket');
const RefreshToken = require('../../../models/refreshToken');
const BlacklistedToken = require('../../../models/blacklistedToken');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const BTCPayService = require('../../../services/BTCPayService');
const Card = require('../../../models/creditCard');
const PaymentForwardingService = require('../../../services/PaymentForwardingService');
const axios = require('axios');

// Auth & Profile
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        if (admin.status !== 'active') {
            return res.status(403).json({
                message: "Account is suspended"
            });
        }

        const isValid = await admin.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const accessToken = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await RefreshToken.create({
            userId: admin._id,
            token: refreshToken,
            expiresAt: refreshTokenExpiry
        });

        admin.lastLogin = new Date();
        await admin.save();

        res.status(200).json({
            message: "Login successful",
            data: {
                accessToken,
                refreshToken,
                admin: {
                    id: admin._id,
                    email: admin.email,
                    username: admin.username,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

// Refresh token endpoint for admins
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

        // Get admin user
        const admin = await Admin.findById(tokenDoc.userId);
        if (!admin || admin.status !== 'active') {
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            return res.status(401).json({
                message: "Admin not found or inactive"
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { 
                id: admin._id,
                role: admin.role 
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
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Admin Refresh Token Error:", error);
        res.status(500).json({
            message: "Failed to refresh token",
            error: error.message
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const admin = await Admin.findById(userId);

        if (!admin) {
            return res.status(404).json({ 
                message: "Admin not found" 
            });
        }

        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ 
                message: "Current password is incorrect" 
            });
        }

        admin.password = newPassword;
        await admin.save();

        res.status(200).json({
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({
            message: "Failed to change password",
            error: error.message
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;
        const accessToken = req.headers.authorization?.split(' ')[1];
        const { refreshToken } = req.body;

        // Verify user is an admin
        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(403).json({
                message: "Not authorized as admin"
            });
        }

        // If refresh token is provided, delete it
        if (refreshToken) {
            await RefreshToken.deleteOne({ 
                userId,
                token: refreshToken 
            });
        }

        // Always blacklist the access token
        await BlacklistedToken.create({
            token: accessToken,
            userId,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });

        res.status(200).json({
            message: "Admin logged out successfully"
        });

    } catch (error) {
        console.error("Admin Logout Error:", error);
        res.status(500).json({
            message: "Failed to logout",
            error: error.message
        });
    }
};

exports.logoutAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const accessToken = req.headers.authorization?.split(' ')[1];

        // Verify user is an admin
        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(403).json({
                message: "Not authorized as admin"
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
            message: "Admin logged out from all devices successfully"
        });

    } catch (error) {
        console.error("Admin Logout All Error:", error);
        res.status(500).json({
            message: "Failed to logout from all devices",
            error: error.message
        });
    }
};

// Dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalVendors,
            totalCards,
            totalSales,
            recentSales,
            pendingTickets
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Vendor.countDocuments({ 'btcPayStore.verified': true }),
            CreditCard.countDocuments(),
            Sale.countDocuments({ status: 'completed' }),
            Sale.find({ status: 'completed' })
                .sort({ completedAt: -1 })
                .limit(5)
                .populate('cardId vendorId buyerId'),
            Ticket.countDocuments({ status: 'open' })
        ]);

        res.status(200).json({
            message: "Dashboard stats retrieved successfully",
            data: {
                stats: {
                    users: totalUsers,
                    vendors: totalVendors,
                    cards: totalCards,
                    sales: totalSales,
                    pendingTickets
                },
                recentSales
            }
        });

    } catch (error) {
        console.error("Get Dashboard Stats Error:", error);
        res.status(500).json({
            message: "Failed to retrieve dashboard stats",
            error: error.message
        });
    }
};

// System Stats for Admin Dashboard
exports.getSystemStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalVendors,
            totalCards,
            totalSales
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Vendor.countDocuments(),
            CreditCard.countDocuments(),
            Sale.countDocuments({ status: 'completed' })
        ]);

        // Calculate total sales amount (can be customized based on your data model)
        const salesAmount = await Sale.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalSalesAmount = salesAmount.length > 0 ? salesAmount[0].total : 0;

        res.status(200).json({
            message: "System stats retrieved successfully",
            data: {
                totalUsers,
                totalVendors,
                totalCards,
                totalSales: totalSalesAmount
            }
        });

    } catch (error) {
        console.error("Get System Stats Error:", error);
        res.status(500).json({
            message: "Failed to retrieve system stats",
            error: error.message
        });
    }
};

// Recent Activity for Admin Dashboard
exports.getRecentActivity = async (req, res) => {
    try {
        // Fetch recent activities from various sources and combine them
        const [recentSales, recentUsers, recentVendors, recentTickets] = await Promise.all([
            // Recent sales
            Sale.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('cardId', 'cardDetails.type')
                .populate('buyerId', 'username')
                .populate('vendorId', 'username'),
            
            // Recent user registrations
            User.find({ role: 'user' })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('username email createdAt'),
            
            // Recent vendor registrations
            Vendor.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId', 'username email'),
            
            // Recent tickets
            Ticket.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId', 'username')
        ]);

        // Format the activities
        const activities = [
            ...recentSales.map(sale => ({
                type: 'card_sold',
                message: `Card ${sale.cardId?.cardDetails?.type || 'Unknown'} was purchased`,
                user: sale.buyerId?.username || 'Unknown User',
                timestamp: sale.createdAt
            })),
            ...recentUsers.map(user => ({
                type: 'user_created',
                message: 'New user registered',
                user: user.username,
                timestamp: user.createdAt
            })),
            ...recentVendors.map(vendor => ({
                type: 'vendor_created',
                message: 'New vendor registered',
                user: vendor.userId?.username || 'Unknown User',
                timestamp: vendor.createdAt
            })),
            ...recentTickets.map(ticket => ({
                type: 'ticket_created',
                message: `New support ticket: ${ticket.subject}`,
                user: ticket.userId?.username || 'Unknown User',
                timestamp: ticket.createdAt
            }))
        ];

        // Sort by timestamp, most recent first
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return the most recent 15 activities
        res.status(200).json({
            message: "Recent activity retrieved successfully",
            data: {
                activities: activities.slice(0, 15)
            }
        });

    } catch (error) {
        console.error("Get Recent Activity Error:", error);
        res.status(500).json({
            message: "Failed to retrieve recent activity",
            error: error.message
        });
    }
};

// Pending Tickets Count for Admin Dashboard
exports.getPendingTicketsCount = async (req, res) => {
    try {
        const count = await Ticket.countDocuments({ status: 'open' });
        
        res.status(200).json({
            message: "Pending tickets count retrieved successfully",
            data: {
                count
            }
        });
    } catch (error) {
        console.error("Get Pending Tickets Count Error:", error);
        res.status(500).json({
            message: "Failed to retrieve pending tickets count",
            error: error.message
        });
    }
};

// User Management
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role } = req.query;

        const query = {};
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments(query);

        // Transform users to ensure id field exists
        const transformedUsers = users.map(user => {
            const userObj = user.toObject();
            userObj.id = userObj._id.toString();
            return userObj;
        });

        res.status(200).json({
            message: "Users retrieved successfully",
            data: {
                users: transformedUsers,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({
            message: "Failed to retrieve users",
            error: error.message
        });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

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

        // Get user's purchase history
        const purchases = await Sale.find({ buyerId: userId })
            .populate('cardId', 'cardDetails.type price')
            .select('-cardDetails.number -cardDetails.cvv')
            .sort({ createdAt: -1 })
            .limit(5);

        // Get user's tickets
        const tickets = await Ticket.find({ userId })
            .select('subject status createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(5);

        res.status(200).json({
            message: "User details retrieved successfully",
            data: {
                user,
                purchases,
                tickets
            }
        });

    } catch (error) {
        console.error("Get User Details Error:", error);
        res.status(500).json({
            message: "Failed to retrieve user details",
            error: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        await User.deleteOne({ _id: userId });

        res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({
            message: "Failed to delete user",
            error: error.message
        });
    }
};

//to be tested
exports.convertUserToVendor = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.role === 'vendor') {
            throw new Error("User is already a vendor");
        }

        const existingVendor = await Vendor.findOne({ userId }).session(session);
        if (existingVendor) {
            throw new Error("Vendor profile already exists");
        }

        user.role = 'vendor';
        await user.save({ session });

        const vendor = new Vendor({
            userId: user._id,
            username: user.username,
            btcPayStore: {
                storeId: null,
                apiKey: null,
                webhookSecret: null,
                verified: false
            },
            status: 'pending',
            btcAddress: {
                address: null,
                label: null,
                verified: false
            }
        });
        await vendor.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            message: "User converted to vendor successfully",
            data: {
                userId: user._id,
                vendorId: vendor._id,
                status: vendor.status
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        
        console.error("Convert User To Vendor Error:", error);
        res.status(500).json({
            message: error.message || "Failed to convert user to vendor",
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// Update user status (active, suspended, locked)
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        
        console.log('Update User Status - Request params:', req.params);
        console.log('Update User Status - User ID:', userId);
        console.log('Update User Status - Status:', status);
        console.log('Update User Status - Request body:', req.body);
        console.log('Update User Status - User ID type:', typeof userId);
        console.log('Update User Status - User ID length:', userId?.length);
        
        if (!userId || userId === 'undefined') {
            return res.status(400).json({
                message: "Valid User ID is required"
            });
        }

        // Try different approaches to find the user
        let user = null;
        
        // Approach 1: Try direct match first (string comparison)
        user = await User.findOne({ _id: userId });
        
        // Approach 2: If that fails, try with new ObjectId
        if (!user) {
            try {
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) });
                }
            } catch (err) {
                console.error('Error using ObjectId approach:', err.message);
            }
        }
        
        // Approach 3: Last resort - use native MongoDB string comparison
        if (!user) {
            // Get all users and find match
            const allUsers = await User.find({});
            user = allUsers.find(u => u._id.toString() === userId);
        }

        if (!user) {
            console.error('User not found with ID:', userId);
            return res.status(404).json({
                message: "User not found"
            });
        }

        console.log('Found user:', user.username, user._id);

        // Update wallet status
        user.wallet.status = status;
        await user.save();

        res.status(200).json({
            message: `User status updated to ${status} successfully`,
            data: {
                userId: user._id,
                username: user.username,
                status: user.wallet.status
            }
        });

    } catch (error) {
        console.error("Update User Status Error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
            message: "Failed to update user status",
            error: error.message
        });
    }
};

// Card Management
exports.addCard = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { cards } = req.body;

        if (!Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ 
                message: "Valid cards array required" 
            });
        }

        // Process cards
        const cardsToInsert = cards.map(card => ({
            vendorId: adminId,
            cardDetails: {
                number: card.number,
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                cvv: card.cvv,
                type: card.type.charAt(0).toUpperCase() + card.type.slice(1).toLowerCase()
            },
            price: card.price,
            status: 'available',
            listedBy: 'admin'
        }));

        const uploadedCards = await CreditCard.insertMany(cardsToInsert);

        res.status(201).json({
            message: "Cards uploaded successfully",
            data: {
                count: uploadedCards.length,
                cards: uploadedCards.map(card => ({
                    id: card._id,
                    type: card.cardDetails.type,
                    price: card.price,
                    status: card.status
                }))
            }
        });

    } catch (error) {
        console.error("Add Cards Error:", error);
        res.status(500).json({
            message: "Failed to add cards",
            error: error.message
        });
    }
};

exports.updateCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const updates = req.body;

        const card = await CreditCard.findById(cardId);
        if (!card) {
            return res.status(404).json({
                message: "Card not found"
            });
        }

        if (updates.cardDetails) {
            Object.assign(card.cardDetails, updates.cardDetails);
        }
        if (updates.price) card.price = updates.price;
        if (updates.status) card.status = updates.status;

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

exports.deleteCard = async (req, res) => {
    try {
        const { cardId } = req.params;

        const card = await CreditCard.findById(cardId);
        if (!card) {
            return res.status(404).json({
                message: "Card not found"
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

exports.getCards = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = { listedBy: 'admin' };
        if (status) {
            query.status = status;
        }

        const cards = await CreditCard.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await CreditCard.countDocuments(query);

        res.status(200).json({
            message: "Cards retrieved successfully",
            data: {
                cards: cards.map(card => ({
                    id: card._id,
                    type: card.cardDetails.type,
                    number: card.cardDetails.number,
                    status: card.status,
                    price: card.price,
                    createdAt: card.createdAt,
                    soldAt: card.soldAt
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Cards Error:", error);
        res.status(500).json({
            message: "Failed to retrieve cards",
            error: error.message
        });
    }
};

// Sales Management
exports.getSales = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = status ? { status } : {};

        const sales = await Sale.find(query)
            .populate('cardId', 'cardDetails.type price')
            .populate('vendorId', 'email btcPayStore')
            .populate('buyerId', 'email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Sale.countDocuments(query);

        res.status(200).json({
            message: "Sales retrieved successfully",
            data: {
                sales,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Sales Error:", error);
        res.status(500).json({
            message: "Failed to retrieve sales",
            error: error.message
        });
    }
};

exports.getVendorSales = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        // Build query
        const query = {};
        if (vendorId) {
            // Verify vendor exists if vendorId is provided
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                return res.status(404).json({
                    message: "Vendor not found"
                });
            }
            query.vendorId = vendorId;
        }
        if (status) {
            query.status = status;
        }

        const sales = await Sale.find(query)
            .populate('cardId', 'cardDetails.type price')
            .populate('vendorId', 'username email')  // Add vendor details
            .populate('buyerId', 'username email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Sale.countDocuments(query);

        res.status(200).json({
            message: "Vendor sales retrieved successfully",
            data: {
                sales: sales.map(sale => ({
                    id: sale._id,
                    vendor: {  // Add vendor info
                        id: sale.vendorId._id,
                        username: sale.vendorId.username,
                        email: sale.vendorId.email
                    },
                    card: {
                        id: sale.cardId._id,
                        type: sale.cardId.cardDetails.type,
                        price: sale.cardId.price
                    },
                    buyer: {
                        username: sale.buyerId.username,
                        email: sale.buyerId.email
                    },
                    amount: sale.btcAmount,
                    status: sale.status,
                    createdAt: sale.createdAt,
                    completedAt: sale.completedAt,
                    commissionSplit: sale.commissionSplit
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Vendor Sales Error:", error);
        res.status(500).json({
            message: "Failed to retrieve vendor sales",
            error: error.message
        });
    }
};

exports.getAllVendorSales = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, vendorId } = req.query;

        // Build query
        const query = {};
        if (status) {
            query.status = status;
        }
        if (vendorId) {
            query.vendorId = vendorId;
        }

        const sales = await Sale.find(query)
            .populate('cardId', 'cardDetails.type price')
            .populate('vendorId', 'username email')
            .populate('buyerId', 'username email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Sale.countDocuments(query);

        res.status(200).json({
            message: sales.length ? "All vendor sales retrieved successfully" : "No sales found",
            data: {
                sales: sales.map(sale => ({
                    id: sale._id,
                    vendor: sale.vendorId ? {
                        id: sale.vendorId._id,
                        username: sale.vendorId.username,
                        email: sale.vendorId.email
                    } : null,
                    card: sale.cardId ? {
                        id: sale.cardId._id,
                        type: sale.cardId.cardDetails.type,
                        price: sale.cardId.price
                    } : null,
                    buyer: sale.buyerId ? {
                        username: sale.buyerId.username,
                        email: sale.buyerId.email
                    } : null,
                    amount: sale.btcAmount,
                    status: sale.status,
                    createdAt: sale.createdAt,
                    completedAt: sale.completedAt,
                    commissionSplit: sale.commissionSplit
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get All Vendor Sales Error:", error);
        res.status(500).json({
            message: "Failed to retrieve vendor sales",
            error: error.message
        });
    }
};

// Ticket Management
exports.getTickets = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }

        // Debug logs
        console.log('Query:', query);

        const tickets = await Ticket.find(query)
            .populate('userId', 'username email role')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Debug logs
        console.log('Tickets found:', tickets.length);
        if (tickets.length > 0) {
            console.log('Sample ticket:', tickets[0]);
        }

        const total = await Ticket.countDocuments(query);

        res.status(200).json({
            message: tickets.length ? "Tickets retrieved successfully" : "No tickets found",
            data: {
                tickets: tickets.map(ticket => ({
                    id: ticket._id,
                    subject: ticket.subject,
                    status: ticket.status,
                    user: ticket.userId ? {
                        username: ticket.userId.username,
                        email: ticket.userId.email,
                        role: ticket.userId.role
                    } : null,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Tickets Error:", error);
        res.status(500).json({
            message: "Failed to retrieve tickets",
            error: error.message
        });
    }
};

exports.getTicketDetails = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        const ticket = await Ticket.findById(ticketId)
            .populate('userId', 'username email role');

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
                user: {
                    username: ticket.userId.username,
                    email: ticket.userId.email,
                    role: ticket.userId.role
                },
                messages: ticket.messages,
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

exports.updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        if (status) ticket.status = status;
        await ticket.save();

        res.status(200).json({
            message: "Ticket updated successfully",
            data: {
                id: ticket._id,
                status: ticket.status,
                updatedAt: ticket.updatedAt
            }
        });

    } catch (error) {
        console.error("Update Ticket Error:", error);
        res.status(500).json({
            message: "Failed to update ticket",
            error: error.message
        });
    }
};

exports.deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        await Ticket.deleteOne({ _id: ticketId });

        res.status(200).json({
            message: "Ticket deleted successfully"
        });

    } catch (error) {
        console.error("Delete Ticket Error:", error);
        res.status(500).json({
            message: "Failed to delete ticket",
            error: error.message
        });
    }
};

// Store Management
exports.setupCentralStore = async (req, res) => {
    try {
        const { storeId, apiKey } = req.body;
        const adminId = req.user.id;

        // Verify store credentials with BTCPay
        try {
            // First verify BTC address format
            if (!storeId || !apiKey) {
                throw new Error('Store ID and API Key are required');
            }

            // Verify store exists and credentials are valid
            const btcPayHost = process.env.BTCPAY_HOST || 'https://testnet.demo.btcpayserver.org';
            const response = await axios.get(`${btcPayHost}/api/v1/stores/${storeId}`, {
                headers: {
                    'Authorization': `token ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error('Invalid store credentials');
            }
        } catch (error) {
            if (error.response) {
                // BTCPay server responded with error
                return res.status(400).json({
                    message: "Failed to verify BTCPay store",
                    error: error.response.data?.message || error.message
                });
            }
            return res.status(400).json({
                message: "Failed to verify BTCPay store",
                error: error.message
            });
        }

        // Generate webhook secret
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        // Update admin with store details
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        // Initialize btcPaySettings if it doesn't exist
        if (!admin.btcPaySettings) {
            admin.btcPaySettings = {
                centralStore: { verified: false },
                personalStore: { verified: false }
            };
        }

        // Update central store settings
        admin.btcPaySettings.centralStore = {
            storeId,
            apiKey,
            webhookSecret,
            verified: true,
            verifiedAt: new Date(),
            btcAddress: {
                address: null,
                label: null,
                verified: false,
                verifiedAt: null
            }
        };

        await admin.save();

        res.status(200).json({
            message: "Central store setup successful",
            data: {
                storeId,
                verified: true
            }
        });

    } catch (error) {
        console.error("Setup Central Store Error:", error);
        res.status(500).json({
            message: "Failed to setup central store",
            error: error.message
        });
    }
};

exports.setupPersonalStore = async (req, res) => {
    try {
        const { storeId, apiKey } = req.body;
        const adminId = req.user.id;

        // Verify store credentials with BTCPay
        try {
            // First verify BTC address format
            if (!storeId || !apiKey) {
                throw new Error('Store ID and API Key are required');
            }

            // Verify store exists and credentials are valid
            const btcPayHost = process.env.BTCPAY_HOST || 'https://testnet.demo.btcpayserver.org';
            const response = await axios.get(`${btcPayHost}/api/v1/stores/${storeId}`, {
                headers: {
                    'Authorization': `token ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error('Invalid store credentials');
            }
        } catch (error) {
            if (error.response) {
                // BTCPay server responded with error
                return res.status(400).json({
                    message: "Failed to verify BTCPay store",
                    error: error.response.data?.message || error.message
                });
            }
            return res.status(400).json({
                message: "Failed to verify BTCPay store",
                error: error.message
            });
        }

        // Generate webhook secret
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        // Update admin with store details
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        // Initialize btcPaySettings if it doesn't exist
        if (!admin.btcPaySettings) {
            admin.btcPaySettings = {
                centralStore: { verified: false },
                personalStore: { verified: false }
            };
        }

        // Update personal store settings
        admin.btcPaySettings.personalStore = {
            storeId,
            apiKey,
            webhookSecret,
            verified: true,
            verifiedAt: new Date(),
            btcAddress: {
                address: null,
                label: null,
                verified: false,
                verifiedAt: null
            }
        };

        await admin.save();

        res.status(200).json({
            message: "Personal store setup successful",
            data: {
                storeId,
                verified: true
            }
        });

    } catch (error) {
        console.error("Setup Personal Store Error:", error);
        res.status(500).json({
            message: "Failed to setup personal store",
            error: error.message
        });
    }
};

exports.getBTCPayStatus = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);

        // Debug logs
        console.log('BTCPay Settings:', admin.btcPaySettings);

        // Check if btcPaySettings exists
        if (!admin.btcPaySettings) {
            admin.btcPaySettings = {
                centralStore: { verified: false },
                personalStore: { verified: false }
            };
        }

        res.status(200).json({
            message: "BTCPay status retrieved successfully",
            data: {
                centralStore: {
                    setup: !!admin?.btcPaySettings?.centralStore?.verified,
                    storeId: admin?.btcPaySettings?.centralStore?.storeId || null
                },
                personalStore: {
                    setup: !!admin?.btcPaySettings?.personalStore?.verified,
                    storeId: admin?.btcPaySettings?.personalStore?.storeId || null
                }
            }
        });

    } catch (error) {
        console.error("Get BTCPay Status Error:", error);
        res.status(500).json({
            message: "Failed to get BTCPay status",
            error: error.message
        });
    }
};

exports.updatePersonalBtcAddress = async (req, res) => {
    try {
        const { btcAddress, label } = req.body;
        const adminId = req.user.id;

        const admin = await Admin.findById(adminId);
        if (!admin?.btcPaySettings?.personalStore?.verified) {
            return res.status(400).json({
                message: "Personal BTCPay store must be set up first"
            });
        }

        await PaymentForwardingService.verifyBtcAddress(
            btcAddress, 
            admin.btcPaySettings.personalStore.storeId,
            admin.btcPaySettings.personalStore.apiKey
        );

        admin.btcPaySettings.personalStore.btcAddress = {
            address: btcAddress,
            label: label || null,
            verified: true,
            verifiedAt: new Date()
        };

        await admin.save();

        res.status(200).json({
            message: "Personal BTC address updated successfully",
            data: admin.btcPaySettings.personalStore.btcAddress
        });

    } catch (error) {
        console.error("Update Personal BTC Address Error:", error);
        res.status(500).json({
            message: "Failed to update personal BTC address",
            error: error.message
        });
    }
};

exports.updateCentralBtcAddress = async (req, res) => {
    try {
        const { btcAddress, label } = req.body;
        const adminId = req.user.id;

        const admin = await Admin.findById(adminId);
        if (!admin?.btcPaySettings?.centralStore?.verified) {
            return res.status(400).json({
                message: "Central BTCPay store must be set up first"
            });
        }

        await PaymentForwardingService.verifyBtcAddress(
            btcAddress, 
            admin.btcPaySettings.centralStore.storeId,
            admin.btcPaySettings.centralStore.apiKey
        );

        admin.btcPaySettings.centralStore.btcAddress = {
            address: btcAddress,
            label: label || null,
            verified: true,
            verifiedAt: new Date()
        };

        await admin.save();

        res.status(200).json({
            message: "Central BTC address updated successfully",
            data: admin.btcPaySettings.centralStore.btcAddress
        });

    } catch (error) {
        console.error("Update Central BTC Address Error:", error);
        res.status(500).json({
            message: "Failed to update central BTC address",
            error: error.message
        });
    }
};

// Vendor Management
exports.getVendors = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, verified, search } = req.query;

        // Build query object
        const query = {};
        if (status) {
            query.status = status;
        }
        
        // Handle verification filtering
        if (verified === 'true') {
            query['businessDetails.verified'] = true;
        } else if (verified === 'false') {
            query['businessDetails.verified'] = false;
        }
        
        // Handle search
        if (search) {
            // Try to find users matching the search criteria
            const userIds = await User.find({
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            
            if (userIds.length > 0) {
                query.userId = { $in: userIds.map(u => u._id) };
            } else {
                // No matching users found, return empty results
                return res.status(200).json({
                    message: "No vendors found matching search criteria",
                    data: {
                        vendors: [],
                        pagination: {
                            currentPage: Number(page),
                            totalPages: 0,
                            totalItems: 0
                        }
                    }
                });
            }
        }

        console.log('Vendor query:', query);

        // Find vendors with pagination
        const vendors = await Vendor.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        console.log('Found vendors:', vendors.length);

        // Transform vendors to ensure each has an id field and all required fields
        const transformedVendors = vendors.map(vendor => {
            const vendorObj = vendor.toObject();
            
            // Ensure ID field
            vendorObj.id = vendorObj._id.toString();
            
            // Ensure businessDetails exists
            if (!vendorObj.businessDetails) {
                vendorObj.businessDetails = { verified: false };
            }
            
            // Ensure btcPayStore exists
            if (!vendorObj.btcPayStore) {
                vendorObj.btcPayStore = { verified: false };
            }
            
            // Make sure we're returning these from the populate
            if (!vendorObj.userId || typeof vendorObj.userId !== 'object') {
                vendorObj.userId = { 
                    username: vendor.username || 'Unknown',
                    email: vendor.email || 'No Email' 
                };
            }
            
            return vendorObj;
        });

        const total = await Vendor.countDocuments(query);

        res.status(200).json({
            message: "Vendors retrieved successfully",
            data: {
                vendors: transformedVendors,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Get Vendors Error:", error);
        res.status(500).json({
            message: "Failed to retrieve vendors",
            error: error.message
        });
    }
};

exports.getVendorDetails = async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Make sure the vendorId is valid
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                message: "Invalid vendor ID format"
            });
        }

        // Find the vendor
        const vendor = await Vendor.findById(vendorId)
            .populate('userId', '-password');

        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Get vendor's sales stats
        const salesStats = await Sale.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
            { $group: {
                _id: "$status",
                count: { $sum: 1 },
                total: { $sum: "$amount" }
            }}
        ]);

        // Get vendor's card stats
        const cardStats = await Card.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
            { $group: {
                _id: "$status",
                count: { $sum: 1 }
            }}
        ]);

        // Get recent sales
        const recentSales = await Sale.find({ vendorId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('cardId', 'cardDetails.type price')
            .populate('buyerId', 'username email');

        // Transform the vendor object to ensure it has an id field
        const vendorObj = vendor.toObject();
        vendorObj.id = vendorObj._id.toString();

        res.status(200).json({
            message: "Vendor details retrieved successfully",
            data: {
                vendor: vendorObj,
                stats: {
                    sales: salesStats,
                    cards: cardStats
                },
                recentSales
            }
        });

    } catch (error) {
        console.error("Get Vendor Details Error:", error);
        res.status(500).json({
            message: "Failed to retrieve vendor details",
            error: error.message
        });
    }
};

exports.verifyVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Make sure the vendorId is valid
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                message: "Invalid vendor ID format"
            });
        }

        // Find the vendor
        const vendor = await Vendor.findById(vendorId);

        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Update vendor's business verification status
        vendor.businessDetails = vendor.businessDetails || {};
        vendor.businessDetails.verified = true;
        vendor.businessDetails.verifiedAt = new Date();
        vendor.businessDetails.verifiedBy = req.user.id;

        // If vendor was pending and has both business and BTC verified, activate them
        if (vendor.status === 'pending' && vendor.btcPayStore.verified) {
            vendor.status = 'active';
        }

        await vendor.save();

        res.status(200).json({
            message: "Vendor verified successfully",
            data: {
                vendorId: vendor._id,
                businessVerified: vendor.businessDetails.verified,
                status: vendor.status
            }
        });

    } catch (error) {
        console.error("Verify Vendor Error:", error);
        res.status(500).json({
            message: "Failed to verify vendor",
            error: error.message
        });
    }
};

exports.updateVendorStatus = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status } = req.body;

        // Make sure the vendorId is valid
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({
                message: "Invalid vendor ID format"
            });
        }

        // Find the vendor
        const vendor = await Vendor.findById(vendorId);

        if (!vendor) {
            return res.status(404).json({
                message: "Vendor not found"
            });
        }

        // Update vendor status
        vendor.status = status;
        
        // If suspending the vendor, also flag the account
        if (status === 'suspended') {
            vendor.suspendedAt = new Date();
            vendor.suspendedBy = req.user.id;
            
            // Also update the User's status if we have a linked user
            if (vendor.userId) {
                const user = await User.findById(vendor.userId);
                if (user) {
                    user.wallet.status = 'suspended';
                    await user.save();
                }
            }
        }
        
        // If activating the vendor, clear flags
        if (status === 'active') {
            vendor.suspendedAt = null;
            vendor.suspendedBy = null;
            
            // Also update the User's status if we have a linked user
            if (vendor.userId) {
                const user = await User.findById(vendor.userId);
                if (user) {
                    user.wallet.status = 'active';
                    await user.save();
                }
            }
        }

        await vendor.save();

        res.status(200).json({
            message: `Vendor status updated to ${status} successfully`,
            data: {
                vendorId: vendor._id,
                status: vendor.status
            }
        });

    } catch (error) {
        console.error("Update Vendor Status Error:", error);
        res.status(500).json({
            message: "Failed to update vendor status",
            error: error.message
        });
    }
};
