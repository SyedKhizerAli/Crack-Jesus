const mongoose = require('mongoose');
const User = require('../../../models/user');
const Admin = require('../../../models/admin');
const Vendor = require('../../../models/vendor');
const CreditCard = require('../../../models/creditCard');
const Sale = require('../../../models/sale');
const BTCPayService = require('../../../services/BTCPayService');
const axios = require('axios');

// Process wallet payment
exports.createWalletPayment = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        const { cardId } = req.body;
        const buyerId = req.user.id;
        
        await session.startTransaction();

        // Get buyer's wallet and card details
        const [buyer, card] = await Promise.all([
            User.findById(buyerId).session(session),
            CreditCard.findOne({ 
                _id: cardId, 
                status: 'available' 
            }).session(session)
        ]);

        if (!card) {
            throw new Error("Card not available");
        }

        // Check sufficient balance
        if (buyer.wallet.btcBalance < card.price) {
            throw new Error("Insufficient balance");
        }

        // Get seller's BTCPay store details
        const isAdminSale = card.vendorId.equals(await Admin.findOne()._id);
        let sellerStore;
        
        if (isAdminSale) {
            const admin = await Admin.findOne().session(session);
            sellerStore = admin.btcPaySettings.personalStore;
        } else {
            const vendor = await Vendor.findOne({ userId: card.vendorId }).session(session);
            sellerStore = vendor.btcPayStore;
        }

        if (!sellerStore?.verified) {
            throw new Error("Seller payment setup not complete");
        }

        // Create BTCPay invoice
        const invoice = await BTCPayService.createInvoice({
            storeId: sellerStore.storeId,
            apiKey: sellerStore.apiKey,
            amount: card.price,
            metadata: {
                buyerId,
                cardId: card._id.toString(),
                isAdminSale,
                isSystemPayment: true
            }
        });

        // Create sale record
        const sale = new Sale({
            cardId: card._id,
            buyerId,
            vendorId: card.vendorId,
            btcAmount: card.price,
            btcPayInvoiceId: invoice.id,
            paymentType: 'wallet',
            status: 'processing',
            createdAt: new Date()
        });

        await sale.save({ session });

        // Update buyer's wallet
        buyer.wallet.btcBalance -= card.price;
        buyer.wallet.transactions.push({
            type: 'purchase',
            amount: -card.price,
            status: 'completed',
            saleId: sale._id,
            createdAt: new Date()
        });

        await buyer.save({ session });

        // Update card status
        card.status = 'pending';
        card.pendingSaleId = sale._id;
        await card.save({ session });

        // Get admin for store credentials
        const admin = await Admin.findOne();
        
        // Schedule payment forwarding
        schedulePaymentForwarding(sale._id, admin._id, sellerStore);

        await session.commitTransaction();

        res.status(200).json({
            message: "Payment processed successfully",
            data: {
                saleId: sale._id,
                cardId: card._id,
                amount: card.price,
                status: 'processing'
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Wallet Payment Error:", error);
        res.status(error.message === "Insufficient balance" ? 400 : 500).json({ 
            message: error.message || "Failed to process payment",
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
    try {
        const { saleId } = req.params;
        const userId = req.user.id;

        const sale = await Sale.findOne({
            _id: saleId,
            buyerId: userId
        }).populate('cardId', 'cardDetails.type price')
          .populate('vendorId', 'username');

        if (!sale) {
            return res.status(404).json({ 
                message: "Payment not found" 
            });
        }

        res.status(200).json({
            message: "Payment status retrieved successfully",
            data: {
                status: sale.status,
                amount: sale.btcAmount,
                card: {
                    type: sale.cardId.cardDetails.type,
                    price: sale.cardId.price
                },
                vendor: sale.vendorId.username,
                createdAt: sale.createdAt,
                completedAt: sale.completedAt
            }
        });

    } catch (error) {
        console.error("Get Payment Status Error:", error);
        res.status(500).json({ 
            message: "Failed to get payment status", 
            error: error.message 
        });
    }
};

// Add this function to handle delayed payment forwarding
const schedulePaymentForwarding = async (saleId, adminId, storeSettings) => {
    try {
        // Get site settings for commission split configuration
        const SiteSettings = mongoose.model('SiteSettings');
        const siteSettings = await SiteSettings.getSettings();
        const holdPeriodMinutes = siteSettings.paymentHoldPeriodMinutes || 5;
        const holdPeriodMs = holdPeriodMinutes * 60 * 1000;

        // Set a timeout for the configured hold period (default: 5 minutes)
        setTimeout(async () => {
            try {
                // Check if sale still exists and hasn't been refunded
                const sale = await Sale.findById(saleId);
                if (!sale || sale.status === 'refunded' || sale.status === 'failed') {
                    console.log(`Payment forwarding cancelled for sale ${saleId}: Status is ${sale ? sale.status : 'deleted'}`);
                    return;
                }

                // Find admin for store credentials
                const admin = await Admin.findById(adminId);
                if (!admin) {
                    console.error(`Cannot forward payment: Admin not found`);
                    return;
                }

                // Get card and vendor details
                const card = await CreditCard.findById(sale.cardId);
                const vendor = await Vendor.findById(sale.vendorId);
                
                if (!card || !vendor) {
                    console.error(`Cannot forward payment: Card or vendor not found`);
                    return;
                }

                // Check if commission split is enabled
                const splitEnabled = siteSettings.commissionSplitEnabled;
                const splitPercentage = siteSettings.commissionSplitPercentage || 50;
                
                // Calculate amounts
                const totalAmount = card.price;
                let vendorAmount = totalAmount;
                let adminAmount = 0;
                
                if (splitEnabled) {
                    adminAmount = (totalAmount * splitPercentage) / 100;
                    vendorAmount = totalAmount - adminAmount;
                    
                    console.log(`Commission split enabled: Admin: ${adminAmount} (${splitPercentage}%), Vendor: ${vendorAmount}`);
                    
                    // Credit admin's wallet with their share
                    await Admin.findByIdAndUpdate(adminId, {
                        $inc: { 'wallet.btcBalance': adminAmount },
                        $push: {
                            'wallet.transactions': {
                                type: 'commission',
                                amount: adminAmount,
                                description: `Commission from sale #${sale._id}`,
                                saleId: sale._id,
                                status: 'completed',
                                createdAt: new Date()
                            }
                        }
                    });
                }

                // Only forward vendor's share to vendor
                if (vendorAmount > 0) {
                    await BTCPayService.forwardPayment({
                        fromStoreId: admin.btcPaySettings?.centralStore?.storeId,
                        fromApiKey: admin.btcPaySettings?.centralStore?.apiKey,
                        toStoreId: storeSettings.storeId,
                        amount: vendorAmount, // Only forward vendor's share
                        metadata: {
                            saleId: sale._id.toString(),
                            cardId: card._id.toString(),
                            splitApplied: splitEnabled,
                            vendorShare: vendorAmount,
                            adminShare: adminAmount
                        }
                    });
                }

                // Update sale with split information if applied
                if (splitEnabled) {
                    sale.commissionSplit = {
                        applied: true,
                        adminAmount: adminAmount,
                        vendorAmount: vendorAmount,
                        percentage: splitPercentage
                    };
                }

                // Update forwarding status
                sale.forwardingStatus = 'completed';
                await sale.save();
                
                console.log(`Payment processed for sale ${saleId} after ${holdPeriodMinutes}-minute holding period`);
            } catch (error) {
                console.error(`Error in delayed payment forwarding for sale ${saleId}:`, error);
            }
        }, holdPeriodMs);
        
        console.log(`Payment forwarding scheduled for sale ${saleId} in ${holdPeriodMinutes} minutes`);
    } catch (error) {
        console.error(`Error scheduling payment forwarding:`, error);
    }
};

module.exports = exports; 