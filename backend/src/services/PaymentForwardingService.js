const BTCPayService = require('./BTCPayService');
const Admin = require('../models/admin');
const Vendor = require('../models/vendor');
const Sale = require('../models/sale');
const axios = require('axios');

class PaymentForwardingService {
    static async forwardPayment({ saleId, recipientId, recipientType, amount, cardId }) {
        try {
            // 1. Get the sale details
            const sale = await Sale.findById(saleId)
                .populate('cardId')
                .populate('vendorId');
            
            if (!sale) {
                throw new Error('Sale not found');
            }

            // 2. Get recipient's BTC address
            let recipientAddress;
            if (recipientType === 'vendor') {
                const vendor = await Vendor.findById(recipientId);
                if (!vendor?.btcAddress?.verified) {
                    throw new Error('Vendor BTC address not verified');
                }
                recipientAddress = vendor.btcAddress.address;
            } else if (recipientType === 'admin') {
                const admin = await Admin.findById(recipientId);
                if (!admin?.btcAddress?.verified) {
                    throw new Error('Admin BTC address not verified');
                }
                recipientAddress = admin.btcAddress.address;
            }

            // 3. Create pull payment
            const btcPayService = new BTCPayService();
            const pullPayment = await btcPayService.createPullPayment({
                amount,
                destinationAddress: recipientAddress,
                metadata: {
                    saleId,
                    cardId,
                    recipientType,
                    recipientId
                }
            });

            // 4. Update sale with forwarding details
            sale.forwardingStatus = 'pending';
            sale.pullPaymentId = pullPayment.id;
            sale.forwardingAttemptedAt = new Date();
            await sale.save();

            return {
                success: true,
                pullPaymentId: pullPayment.id
            };

        } catch (error) {
            console.error('Payment Forwarding Error:', error);
            throw error;
        }
    }

    static async verifyBtcAddress(address, storeId, apiKey) {
        try {
            // Enhanced BTC address validation including testnet addresses
            const isValid = address.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{39,59}$|^tb1[a-z0-9]{39,59}$/);
            if (!isValid) {
                throw new Error("Invalid BTC address format");
            }

            // Determine if we're using testnet or mainnet
            const isTestnet = address.startsWith('tb1') || address.startsWith('2') || 
                             address.startsWith('m') || address.startsWith('n');
            
            // Check address on appropriate blockchain
            try {
                const response = await axios.get(
                    `https://${isTestnet ? 'blockstream.info/testnet' : 'blockstream.info'}/api/address/${address}`,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                // If we get a response, the address exists on the blockchain
                return true;
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    // Address not found on blockchain
                    throw new Error("Address not found on blockchain");
                }
                throw new Error(`Blockchain validation failed: ${error.message}`);
            }

        } catch (error) {
            console.error("BTC Address Verification Error:", error);
            throw new Error(`Invalid BTC address: ${error.message}`);
        }
    }

    static async handleForwardedPayment({ pullPaymentId, status }) {
        try {
            const sale = await Sale.findOne({ pullPaymentId })
                .populate('vendorId');

            if (!sale) {
                throw new Error("Sale not found for pull payment");
            }

            switch (status) {
                case 'completed':
                    sale.forwardingStatus = 'completed';
                    sale.forwardingCompletedAt = new Date();
                    
                    // Update vendor statistics if applicable
                    if (sale.vendorId) {
                        await Vendor.findByIdAndUpdate(sale.vendorId._id, {
                            $inc: { 'statistics.totalEarnings': sale.btcAmount }
                        });
                    }
                    break;

                case 'failed':
                    sale.forwardingStatus = 'failed';
                    sale.failureReason = 'Payment forwarding failed';
                    break;
            }

            await sale.save();
            return sale;

        } catch (error) {
            console.error("Handle Forwarded Payment Error:", error);
            throw error;
        }
    }

    static async handlePaymentStatus(saleId, status) {
        // Single method to handle all payment status updates
        // Called by webhook handler
    }

    static async forwardPayment(saleId) {
        // Single method to handle payment forwarding
    }
}

module.exports = PaymentForwardingService; 