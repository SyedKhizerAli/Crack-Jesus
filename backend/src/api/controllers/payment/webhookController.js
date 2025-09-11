const User = require('../../../models/user');
const Sale = require('../../../models/sale');
const CreditCard = require('../../../models/creditCard');
const BTCPayService = require('../../../services/BTCPayService');
const mongoose = require('mongoose');

// Handle deposit webhook
exports.handleDepositWebhook = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        const event = req.body;
        const signature = req.headers['btcpay-sig'];

        // Verify webhook signature
        const isValid = await BTCPayService.verifyWebhook(event, signature);
        if (!isValid) {
            return res.status(401).json({
                message: "Invalid webhook signature"
            });
        }

        await session.startTransaction();

        const { invoiceId, status, metadata } = event;
        const { userId, transactionId } = metadata;

        // Find user
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error("User not found");
        }

        // Find transaction in user's wallet
        const transaction = user.wallet.transactions.id(transactionId);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        switch (status) {
            case 'confirmed':
                // Update transaction status
                transaction.status = 'completed';
                transaction.completedAt = new Date();
                
                // Add balance to user's wallet
                user.wallet.btcBalance += transaction.amount;
                
                await user.save({ session });
                break;

            case 'invalid':
            case 'expired':
                transaction.status = 'failed';
                transaction.completedAt = new Date();
                await user.save({ session });
                break;

            default:
                // Log unhandled status
                console.log(`Unhandled deposit status: ${status}`);
                break;
        }

        await session.commitTransaction();
        res.status(200).json({ received: true });

    } catch (error) {
        await session.abortTransaction();
        console.error("Deposit Webhook Error:", error);
        res.status(500).json({
            message: "Failed to process deposit webhook",
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// Handle payment webhook
exports.handlePaymentWebhook = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        const event = req.body;
        const signature = req.headers['btcpay-sig'];

        // Verify webhook signature
        const isValid = await BTCPayService.verifyWebhook(event, signature);
        if (!isValid) {
            return res.status(401).json({
                message: "Invalid webhook signature"
            });
        }

        await session.startTransaction();

        const { invoiceId, status, metadata } = event;
        const { saleId } = metadata;

        // Find sale
        const sale = await Sale.findById(saleId).session(session);
        if (!sale) {
            throw new Error("Sale not found");
        }

        switch (status) {
            case 'confirmed':
                // Update sale status
                sale.status = 'completed';
                sale.completedAt = new Date();
                await sale.save({ session });

                // Update card status
                await CreditCard.updateOne(
                    { _id: sale.cardId },
                    { 
                        $set: { 
                            status: 'sold',
                            soldTo: sale.buyerId,
                            soldAt: new Date()
                        }
                    },
                    { session }
                );

                // If it's a wallet payment, ensure vendor receives payment
                if (sale.paymentType === 'wallet') {
                    const vendor = await User.findById(sale.vendorId).session(session);
                    if (vendor) {
                        vendor.wallet.btcBalance += sale.btcAmount;
                        vendor.wallet.transactions.push({
                            type: 'sale',
                            amount: sale.btcAmount,
                            status: 'completed',
                            saleId: sale._id,
                            createdAt: new Date(),
                            completedAt: new Date()
                        });
                        await vendor.save({ session });
                    }
                }
                break;

            case 'invalid':
            case 'expired':
                // Update sale status
                sale.status = 'failed';
                await sale.save({ session });

                // If it's a wallet payment, refund the buyer
                if (sale.paymentType === 'wallet') {
                    const buyer = await User.findById(sale.buyerId).session(session);
                    if (buyer) {
                        buyer.wallet.btcBalance += sale.btcAmount;
                        buyer.wallet.transactions.push({
                            type: 'refund',
                            amount: sale.btcAmount,
                            status: 'completed',
                            saleId: sale._id,
                            createdAt: new Date(),
                            completedAt: new Date()
                        });
                        await buyer.save({ session });
                    }
                }

                // Reset card status
                await CreditCard.updateOne(
                    { _id: sale.cardId },
                    { 
                        $set: { 
                            status: 'available',
                            pendingSaleId: null
                        }
                    },
                    { session }
                );
                break;

            default:
                console.log(`Unhandled payment status: ${status}`);
                break;
        }

        await session.commitTransaction();
        res.status(200).json({ received: true });

    } catch (error) {
        await session.abortTransaction();
        console.error("Payment Webhook Error:", error);
        res.status(500).json({
            message: "Failed to process payment webhook",
            error: error.message
        });
    } finally {
        session.endSession();
    }
}; 