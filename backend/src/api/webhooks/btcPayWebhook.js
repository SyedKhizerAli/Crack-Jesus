// Add necessary model imports at the top
const Sale = require('../../models/sale');
const Vendor = require('../../models/vendor');
const Admin = require('../../models/admin');
const CreditCard = require('../../models/creditCard');
const BTCPayService = require('../../services/BTCPayService');
const mongoose = require('mongoose');

exports.handleInvoicePayment = async (invoiceId, status) => {
    try {
        // Find user with this invoice
        const user = await User.findOne({
            'wallet.transactions.btcPayInvoiceId': invoiceId
        });

        if (!user) {
            throw new Error(`No user found for invoice ${invoiceId}`);
        }

        // Find the transaction
        const transactionIndex = user.wallet.transactions.findIndex(
            t => t.btcPayInvoiceId === invoiceId
        );

        if (transactionIndex === -1) {
            throw new Error(`No transaction found for invoice ${invoiceId}`);
        }

        const transaction = user.wallet.transactions[transactionIndex];

        // Handle different payment statuses
        switch (status) {
            case 'Completed':
                // Update wallet balance
                user.wallet.btcBalance += transaction.amount;
                
                // Update transaction status
                user.wallet.transactions[transactionIndex].status = 'completed';
                user.wallet.transactions[transactionIndex].completedAt = new Date();
                
                await user.save();
                break;

            case 'Invalid':
            case 'Expired':
                // Mark transaction as failed
                user.wallet.transactions[transactionIndex].status = 'failed';
                user.wallet.transactions[transactionIndex].error = status;
                
                await user.save();
                break;

            // Other statuses like 'New', 'Processing' don't require action
            default:
                break;
        }

    } catch (error) {
        console.error('BTCPay Webhook Error:', error);
        // You might want to notify admin or retry later
    }
};

exports.handleAdminCentralStoreWebhook = async (payload, signature) => {
    try {
        const { invoiceId, status } = payload;
        
        // Find user with this invoice
        const user = await User.findOne({
            'wallet.transactions.btcPayInvoiceId': invoiceId
        });

        if (!user) {
            throw new Error(`No user found for invoice ${invoiceId}`);
        }

        // Update user's wallet based on payment status
        await handleUserWalletUpdate(user, invoiceId, status);

    } catch (error) {
        console.error('Admin Central Store Webhook Error:', error);
        // Notify admin about the error
    }
};

exports.handleAdminPersonalStoreWebhook = async (payload, signature) => {
    try {
        const { invoiceId, status } = payload;
        
        // Find admin's transaction
        const admin = await Admin.findOne({
            'wallet.transactions.btcPayInvoiceId': invoiceId
        });

        if (!admin) {
            throw new Error(`No admin found for invoice ${invoiceId}`);
        }

        // Update admin's wallet based on payment status
        const transactionIndex = admin.wallet.transactions.findIndex(
            t => t.btcPayInvoiceId === invoiceId
        );

        if (status === 'Completed') {
            const transaction = admin.wallet.transactions[transactionIndex];
            admin.wallet.btcBalance += transaction.amount;
            admin.wallet.transactions[transactionIndex].status = 'completed';
            admin.wallet.transactions[transactionIndex].completedAt = new Date();
            await admin.save();
        }

    } catch (error) {
        console.error('Admin Personal Store Webhook Error:', error);
        // Log error for admin review
    }
};

exports.handlePullPaymentWebhook = async (payload) => {
    try {
        const { pullPaymentId, status } = payload;

        // Find sale with this pull payment
        const sale = await Sale.findOne({ 'payment.pullPaymentId': pullPaymentId })
            .populate('cardId')
            .populate('sellerId');

        if (!sale) {
            throw new Error(`No sale found for pull payment ${pullPaymentId}`);
        }

        // Update sale status
        sale.payment.forwardingStatus = status;

        if (status === 'completed') {
            sale.payment.forwardedAt = new Date();
            sale.status = 'completed';

            // Update recipient's wallet
            if (sale.sellerId.role === 'vendor') {
                await Vendor.findByIdAndUpdate(sale.sellerId._id, {
                    $inc: { 'wallet.btcBalance': sale.btcAmount },
                    $push: {
                        'wallet.transactions': {
                            type: 'sale',
                            amount: sale.btcAmount,
                            status: 'completed',
                            saleId: sale._id,
                            completedAt: new Date()
                        }
                    }
                });
            } else {
                // Handle admin earnings
                await Admin.findByIdAndUpdate(sale.sellerId._id, {
                    $inc: { 'wallet.btcBalance': sale.btcAmount },
                    $push: {
                        'wallet.transactions': {
                            type: 'earning',
                            amount: sale.btcAmount,
                            status: 'completed',
                            saleId: sale._id,
                            completedAt: new Date()
                        }
                    }
                });
            }
        } else if (status === 'failed') {
            sale.payment.failureReason = 'Payment forwarding failed';
            sale.status = 'failed';
        }

        await sale.save();

    } catch (error) {
        console.error("Pull Payment Webhook Error:", error);
        // Should implement admin notification system for failed forwards
    }
};

// Add or update the invoice webhook handler to handle split payments
exports.handleInvoiceWebhook = async (req, res) => {
    try {
        const { invoiceId, status } = req.body;
        const metadata = req.body.metadata || {};
        const { saleId, splitApplied, vendorShare, adminShare } = metadata;

        // Find the sale
        const sale = await Sale.findOne({ btcPayInvoiceId: invoiceId });
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        // Handle payment status
        if (status === 'confirmed' || status === 'complete') {
            // Update sale status
            sale.status = 'completed';
            sale.completedAt = new Date();

            // Check if commission split was applied during forwarding
            if (splitApplied) {
                // Update split information if not already set
                if (!sale.commissionSplit || !sale.commissionSplit.applied) {
                    sale.commissionSplit = {
                        applied: true,
                        adminAmount: adminShare || 0,
                        vendorAmount: vendorShare || sale.btcAmount,
                        percentage: adminShare ? (adminShare / sale.btcAmount) * 100 : 0
                    };
                }
                
                // If this is vendor's portion of payment, update vendor wallet
                if (vendorShare > 0) {
                    await Vendor.findByIdAndUpdate(sale.vendorId, {
                        $inc: { 'wallet.btcBalance': vendorShare },
                        $push: {
                            'wallet.transactions': {
                                type: 'sale',
                                amount: vendorShare,
                                status: 'completed',
                                saleId: sale._id,
                                description: `Sale income after platform commission (${sale.commissionSplit.percentage}%)`,
                                completedAt: new Date()
                            }
                        }
                    });
                }
            } else {
                // No split, full amount goes to vendor
                await Vendor.findByIdAndUpdate(sale.vendorId, {
                    $inc: { 'wallet.btcBalance': sale.btcAmount },
                    $push: {
                        'wallet.transactions': {
                            type: 'sale',
                            amount: sale.btcAmount,
                            status: 'completed',
                            saleId: sale._id,
                            completedAt: new Date()
                        }
                    }
                });
            }
            
            // Update card status to sold
            await CreditCard.findByIdAndUpdate(sale.cardId, {
                status: 'sold',
                soldAt: new Date(),
                pendingSaleId: null
            });
        } else if (status === 'invalid' || status === 'expired') {
            // Handle failed payment
            sale.status = 'failed';
            sale.failureReason = `Payment ${status}`;
            
            // Reset card status to available
            await CreditCard.findByIdAndUpdate(sale.cardId, {
                status: 'available',
                pendingSaleId: null
            });
        }
        
        await sale.save();
        res.status(200).json({ message: "Webhook processed" });
        
    } catch (error) {
        console.error("Invoice Webhook Error:", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
}; 