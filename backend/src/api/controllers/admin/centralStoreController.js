const Admin = require('../../../models/admin');
const User = require('../../../models/user');
const Sale = require('../../../models/sale');
const BTCPayService = require('../../../services/BTCPayService');
const mongoose = require('mongoose');
const axios = require('axios');

// Handle deposits to central store
exports.handleDeposits = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        const { invoiceId } = req.body;
        const admin = await Admin.findOne().session(session);

        if (!admin?.btcPaySettings?.centralStore?.verified) {
            throw new Error("Central store not configured");
        }

        // Verify invoice in BTCPay
        const invoice = await BTCPayService.getInvoice({
            storeId: admin.btcPaySettings.centralStore.storeId,
            apiKey: admin.btcPaySettings.centralStore.apiKey,
            invoiceId
        });

        if (invoice.status !== 'Settled') {
            throw new Error("Invoice not settled");
        }

        // Update user wallet
        const userId = invoice.metadata.userId;
        const user = await User.findById(userId).session(session);
        
        if (!user) {
            throw new Error("User not found");
        }

        user.wallet.btcBalance += invoice.amount;
        user.wallet.transactions.push({
            type: 'deposit',
            amount: invoice.amount,
            status: 'completed',
            btcPayInvoiceId: invoiceId,
            createdAt: new Date(),
            completedAt: new Date()
        });

        await user.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            message: "Deposit processed successfully",
            data: {
                userId,
                amount: invoice.amount,
                status: 'completed'
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Handle Deposit Error:", error);
        res.status(500).json({ 
            message: "Failed to process deposit", 
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Forward payment to vendor
exports.forwardPaymentToVendor = async (saleId) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        const sale = await Sale.findById(saleId)
            .populate('vendorId', 'btcPayStore')
            .populate('cardId')
            .session(session);

        if (!sale) {
            throw new Error("Sale not found");
        }

        if (!sale.vendorId.btcPayStore?.verified) {
            throw new Error("Vendor BTCPay store not verified");
        }

        // Create payment to vendor's store
        const payment = await BTCPayService.createVendorPayment({
            amount: sale.btcAmount,
            vendorStoreId: sale.vendorId.btcPayStore.storeId,
            saleId: sale._id,
            cardId: sale.cardId._id
        });

        // Update sale with payment details
        sale.btcPayInvoiceId = payment.id;
        sale.forwardingStatus = 'pending';
        await sale.save({ session });

        await session.commitTransaction();
        return payment;

    } catch (error) {
        await session.abortTransaction();
        console.error("Forward Payment Error:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

// Get central store balance
exports.getBalance = async (req, res) => {
    try {
        const admin = await Admin.findOne();
        
        if (!admin?.btcPaySettings?.centralStore?.verified) {
            return res.status(400).json({ 
                message: "Central store not configured" 
            });
        }

        const balance = await BTCPayService.getCentralStoreBalance({
            storeId: admin.btcPaySettings.centralStore.storeId,
            apiKey: admin.btcPaySettings.centralStore.apiKey
        });

        res.status(200).json({
            message: "Balance retrieved successfully",
            data: {
                confirmed: balance.confirmedBalance,
                unconfirmed: balance.unconfirmedBalance,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error("Get Balance Error:", error);
        res.status(500).json({ 
            message: "Failed to get balance", 
            error: error.message 
        });
    }
};

// Get central store transactions
exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, type } = req.query;
        const admin = await Admin.findOne();

        if (!admin?.btcPaySettings?.centralStore?.verified) {
            return res.status(400).json({ 
                message: "Central store not configured" 
            });
        }

        const transactions = await BTCPayService.getCentralStoreTransactions({
            storeId: admin.btcPaySettings.centralStore.storeId,
            apiKey: admin.btcPaySettings.centralStore.apiKey,
            type
        });

        const paginatedTransactions = transactions
            .slice((page - 1) * limit, page * limit)
            .map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                status: tx.status,
                createdAt: tx.timestamp
            }));

        res.status(200).json({
            message: "Transactions retrieved successfully",
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(transactions.length / limit),
                    totalItems: transactions.length
                }
            }
        });

    } catch (error) {
        console.error("Get Transactions Error:", error);
        res.status(500).json({ 
            message: "Failed to get transactions", 
            error: error.message 
        });
    }
};

module.exports = exports; 