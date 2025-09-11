const Vendor = require('../../../models/vendor');
const BTCPayService = require('../../../services/BTCPayService');
const axios = require('axios');
const crypto = require('crypto');

// Setup vendor's BTCPay store
exports.setupBTCPayStore = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { storeId, apiKey } = req.body;

        if (!storeId || !apiKey) {
            return res.status(400).json({ 
                message: "Store ID and API Key are required" 
            });
        }

        // Verify BTCPay store credentials
        try {
            // Use BTCPayService for store verification
            const isValid = await BTCPayService.verifyStore(storeId, apiKey);
            if (!isValid) {
                throw new Error("Invalid BTCPay store credentials");
            }

            // Generate webhook secret
            const webhookSecret = crypto.randomBytes(32).toString('hex');

            // Create webhook in vendor's BTCPay store
            await BTCPayService.createWebhook({
                storeId,
                apiKey,
                webhookUrl: `${process.env.APP_URL}/api/payment/webhook/payment`,
                secret: webhookSecret,
                events: [
                    'InvoiceSettled',
                    'InvoiceExpired',
                    'InvoiceInvalid'
                ]
            });

            // Create deposit webhook
            await BTCPayService.createWebhook({
                storeId,
                apiKey,
                webhookUrl: `${process.env.APP_URL}/api/payment/webhook/deposit`,
                secret: webhookSecret,
                events: [
                    'InvoiceSettled',
                    'InvoiceExpired',
                    'InvoiceInvalid'
                ]
            });

            // Update vendor with BTCPay details
            const vendor = await Vendor.findOneAndUpdate(
                { userId: vendorId },
                {
                    btcPayStore: {
                        storeId,
                        apiKey,
                        webhookSecret,
                        verified: true,
                        createdAt: new Date()
                    }
                },
                { new: true }
            );

            res.status(200).json({
                message: "BTCPay store setup successful",
                data: {
                    storeId: vendor.btcPayStore.storeId,
                    verified: true,
                    createdAt: vendor.btcPayStore.createdAt
                }
            });

        } catch (error) {
            res.status(400).json({ 
                message: "Invalid BTCPay store credentials", 
                error: error.message 
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

// Get vendor's BTCPay store status
exports.getBTCPayStatus = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const vendor = await Vendor.findOne({ userId: vendorId })
            .select('btcPayStore.verified btcPayStore.storeId btcPayStore.createdAt');

        if (!vendor) {
            return res.status(404).json({ 
                message: "Vendor not found" 
            });
        }

        res.status(200).json({
            message: "BTCPay status retrieved successfully",
            data: {
                verified: vendor.btcPayStore?.verified || false,
                storeId: vendor.btcPayStore?.storeId,
                createdAt: vendor.btcPayStore?.createdAt
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

// Verify webhook is still active
exports.verifyWebhook = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const vendor = await Vendor.findOne({ userId: vendorId });

        if (!vendor?.btcPayStore?.verified) {
            return res.status(400).json({ 
                message: "BTCPay store not setup" 
            });
        }

        try {
            const webhooksActive = await BTCPayService.verifyWebhooks({
                storeId: vendor.btcPayStore.storeId,
                apiKey: vendor.btcPayStore.apiKey,
                expectedUrls: [
                    `${process.env.APP_URL}/api/payment/webhook/payment`,
                    `${process.env.APP_URL}/api/payment/webhook/deposit`
                ]
            });

            if (!webhooksActive) {
                // Recreate webhooks if missing or disabled
                await exports.setupBTCPayStore(req, res);
                return;
            }

            res.status(200).json({
                message: "Webhook verification successful",
                data: {
                    active: true,
                    verifiedAt: new Date()
                }
            });

        } catch (error) {
            res.status(400).json({ 
                message: "Failed to verify webhook", 
                error: error.message 
            });
        }

    } catch (error) {
        console.error("Webhook Verification Error:", error);
        res.status(500).json({ 
            message: "Failed to verify webhook", 
            error: error.message 
        });
    }
};