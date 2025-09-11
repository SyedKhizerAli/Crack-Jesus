const Admin = require('../../../models/admin');
const BTCPayService = require('../../../services/BTCPayService');
const crypto = require('crypto');

// Setup Admin's Personal BTCPay Store
exports.setupPersonalStore = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { storeId, apiKey } = req.body;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ 
                message: "Admin not found" 
            });
        }

        try {
            // Verify BTCPay store credentials using service
            const isValid = await BTCPayService.verifyStore(storeId, apiKey);
            if (!isValid) {
                throw new Error("Invalid BTCPay store credentials");
            }

            // Generate webhook secret
            const webhookSecret = crypto.randomBytes(32).toString('hex');

            // Create webhook in admin's personal store
            await BTCPayService.createWebhook({
                storeId,
                apiKey,
                webhookUrl: `${process.env.APP_URL}/api/payment/webhook/admin`,
                secret: webhookSecret,
                events: [
                    'InvoiceSettled',
                    'InvoiceExpired',
                    'InvoiceInvalid'
                ]
            });

            // Update admin's BTCPay settings
            admin.btcPaySettings = {
                ...admin.btcPaySettings,
                personalStore: {
                    storeId,
                    apiKey,
                    webhookSecret,
                    verified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            await admin.save();

            res.status(200).json({
                message: "Personal BTCPay store setup successful",
                data: {
                    storeId: admin.btcPaySettings.personalStore.storeId,
                    verified: true,
                    createdAt: admin.btcPaySettings.personalStore.createdAt
                }
            });

        } catch (error) {
            res.status(400).json({ 
                message: "Failed to setup BTCPay store",
                error: error.message
            });
        }

    } catch (error) {
        console.error("Admin Store Setup Error:", error);
        res.status(500).json({ 
            message: "Failed to setup personal store", 
            error: error.message 
        });
    }
};

// Get Admin's Personal Store Status
exports.getPersonalStoreStatus = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await Admin.findById(adminId)
            .select('btcPaySettings.personalStore');

        if (!admin?.btcPaySettings?.personalStore) {
            return res.status(200).json({
                message: "Personal BTCPay store not configured",
                data: {
                    setup: false
                }
            });
        }

        // Verify store is still active
        const isActive = await BTCPayService.verifyStore(
            admin.btcPaySettings.personalStore.storeId,
            admin.btcPaySettings.personalStore.apiKey
        );

        res.status(200).json({
            message: "Store status retrieved successfully",
            data: {
                setup: true,
                verified: admin.btcPaySettings.personalStore.verified,
                active: isActive,
                storeId: admin.btcPaySettings.personalStore.storeId,
                createdAt: admin.btcPaySettings.personalStore.createdAt,
                updatedAt: admin.btcPaySettings.personalStore.updatedAt
            }
        });

    } catch (error) {
        console.error("Get Store Status Error:", error);
        res.status(500).json({ 
            message: "Failed to get store status", 
            error: error.message 
        });
    }
};

// Verify webhook is still active
exports.verifyWebhook = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await Admin.findById(adminId);

        if (!admin?.btcPaySettings?.personalStore?.verified) {
            return res.status(400).json({ 
                message: "Personal BTCPay store not setup" 
            });
        }

        const webhooksActive = await BTCPayService.verifyWebhooks({
            storeId: admin.btcPaySettings.personalStore.storeId,
            apiKey: admin.btcPaySettings.personalStore.apiKey,
            expectedUrls: [
                `${process.env.APP_URL}/api/payment/webhook/admin`
            ]
        });

        if (!webhooksActive) {
            // Recreate webhook if missing or disabled
            await exports.setupPersonalStore(req, res);
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
        console.error("Webhook Verification Error:", error);
        res.status(500).json({ 
            message: "Failed to verify webhook", 
            error: error.message 
        });
    }
}; 