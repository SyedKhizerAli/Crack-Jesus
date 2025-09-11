const Sale = require('../models/sale');
const User = require('../models/user');
const axios = require('axios');
const cron = require('node-cron');
const { recoverStuckTransactions } = require('../utils/errorRecovery');
const BTCPayService = require('../services/BTCPayService');
const mongoose = require('mongoose');

/**
 * Recover stuck transactions
 * @returns {Promise<void>}
 */
exports.recoverStuckTransactions = async () => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        // Find pending sales older than 1 hour
        const stuckSales = await Sale.find({
            status: 'pending',
            purchaseDate: { 
                $lt: new Date(Date.now() - 60 * 60 * 1000) 
            }
        })
        .populate('vendorId', 'btcPayStore')
        .populate('buyerId')
        .session(session);

        console.log(`Found ${stuckSales.length} stuck transactions`);

        for (const sale of stuckSales) {
            try {
                // Check BTCPay invoice status
                const invoice = await BTCPayService.getInvoice({
                    storeId: sale.vendorId.btcPayStore.storeId,
                    apiKey: sale.vendorId.btcPayStore.apiKey,
                    invoiceId: sale.btcPayInvoiceId
                });

                // Update sale based on actual status
                switch (invoice.status) {
                    case 'Settled':
                        sale.status = 'completed';
                        sale.paymentStatus = 'completed';
                        sale.completedAt = new Date();
                        break;

                    case 'Expired':
                    case 'Invalid':
                        sale.status = 'failed';
                        sale.paymentStatus = 'failed';
                        sale.failureReason = invoice.status;
                        // Process refund
                        await refundUserWallet(sale, session);
                        break;

                    default:
                        console.log(`Unexpected invoice status: ${invoice.status} for sale ${sale._id}`);
                }

                sale.lastCheckedAt = new Date();
                await sale.save({ session });

            } catch (error) {
                console.error('Sale Recovery Error:', {
                    saleId: sale._id,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        }

        await session.commitTransaction();
        console.log('Transaction recovery completed successfully');

    } catch (error) {
        await session.abortTransaction();
        console.error('Transaction Recovery Error:', {
            error: error.message,
            timestamp: new Date()
        });
    } finally {
        session.endSession();
    }
};

/**
 * Refund user wallet for failed transactions
 * @param {Object} sale - Sale document
 * @param {Object} session - Mongoose session
 * @returns {Promise<void>}
 */
async function refundUserWallet(sale, session) {
    try {
        const user = await User.findById(sale.buyerId).session(session);
        if (!user) {
            throw new Error(`User not found: ${sale.buyerId}`);
        }

        // Check if refund already processed
        const refundExists = user.wallet.transactions.some(
            t => t.type === 'refund' && t.saleId?.equals(sale._id)
        );

        if (!refundExists) {
            user.wallet.btcBalance += sale.btcAmount;
            user.wallet.transactions.push({
                type: 'refund',
                amount: sale.btcAmount,
                status: 'completed',
                saleId: sale._id,
                createdAt: new Date(),
                completedAt: new Date(),
                description: `Refund for failed transaction: ${sale.btcPayInvoiceId}`
            });

            await user.save({ session });
            console.log(`Refund processed for sale ${sale._id}`);
        }
    } catch (error) {
        console.error('Refund Processing Error:', {
            saleId: sale._id,
            userId: sale.buyerId,
            error: error.message,
            timestamp: new Date()
        });
        throw error; // Propagate error to trigger transaction rollback
    }
}

/**
 * Verify and correct wallet balance
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
exports.verifyWalletBalance = async (userId) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Calculate balance from completed transactions
        const calculatedBalance = user.wallet.transactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => {
                switch (t.type) {
                    case 'deposit':
                    case 'refund':
                        return sum + t.amount;
                    case 'payment':
                        return sum - t.amount;
                    default:
                        console.warn(`Unknown transaction type: ${t.type}`);
                        return sum;
                }
            }, 0);

        // Fix if mismatch found
        if (calculatedBalance !== user.wallet.btcBalance) {
            console.warn('Balance Mismatch:', {
                userId,
                stored: user.wallet.btcBalance,
                calculated: calculatedBalance,
                difference: user.wallet.btcBalance - calculatedBalance
            });

            user.wallet.btcBalance = calculatedBalance;
            user.wallet.lastVerifiedAt = new Date();
            await user.save({ session });
            
            console.log(`Balance corrected for user ${userId}`);
        }

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        console.error('Balance Verification Error:', {
            userId,
            error: error.message,
            timestamp: new Date()
        });
    } finally {
        session.endSession();
    }
};

// Schedule recovery tasks
const scheduleRecoveryTasks = () => {
    // Run transaction recovery every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Starting scheduled transaction recovery...');
        await exports.recoverStuckTransactions();
    });

    // Run balance verification daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Starting scheduled balance verification...');
        const users = await User.find({}, '_id');
        for (const user of users) {
            await exports.verifyWalletBalance(user._id);
        }
    });
};

// Initialize recovery tasks
scheduleRecoveryTasks();

module.exports = exports; 