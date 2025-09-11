const crypto = require('crypto');
const Admin = require('../models/admin');
const Vendor = require('../models/vendor');

/**
 * Verify BTCPay webhook signature
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>}
 */
exports.verifyWebhookSignature = async (req) => {
    try {
        // Validate request headers and body
        const signature = req.headers['btcpay-sig'];
        const rawBody = req.rawBody;
        const storeId = req.body?.storeId;
        const metadata = req.body?.metadata || {};

        if (!signature) {
            throw new Error('Missing BTCPay signature header');
        }

        if (!rawBody) {
            throw new Error('Missing raw request body');
        }

        if (!storeId) {
            throw new Error('Missing store ID in webhook payload');
        }

        // Get webhook secret based on store type
        const webhookSecret = await getWebhookSecret(storeId, metadata);

        // Verify signature
        const computedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        const expectedSignature = signature.split('=')[1];

        if (!expectedSignature || computedSignature !== expectedSignature) {
            throw new Error('Invalid webhook signature');
        }

        return true;

    } catch (error) {
        console.error('Webhook Signature Verification Error:', {
            error: error.message,
            storeId: req.body?.storeId,
            type: req.body?.metadata?.type
        });
        throw error;
    }
};

/**
 * Get webhook secret for store
 * @param {string} storeId - BTCPay store ID
 * @param {Object} metadata - Webhook metadata
 * @returns {Promise<string>}
 */
async function getWebhookSecret(storeId, metadata) {
    try {
        // Check webhook type from metadata
        if (metadata.type === 'deposit') {
            // Central store webhook
            const admin = await Admin.findOne()
                .select('btcPaySettings.centralStore.webhookSecret');

            if (!admin?.btcPaySettings?.centralStore?.webhookSecret) {
                throw new Error('Central store webhook secret not found');
            }

            return admin.btcPaySettings.centralStore.webhookSecret;
        }

        // Check for vendor store
        const vendor = await Vendor.findOne({ 'btcPayStore.storeId': storeId })
            .select('btcPayStore.webhookSecret');

        if (vendor?.btcPayStore?.webhookSecret) {
            return vendor.btcPayStore.webhookSecret;
        }

        // Check for admin's personal store
        const admin = await Admin.findOne()
            .select('btcPaySettings.personalStore.webhookSecret');

        if (!admin?.btcPaySettings?.personalStore?.webhookSecret) {
            throw new Error('Store webhook secret not found');
        }

        return admin.btcPaySettings.personalStore.webhookSecret;

    } catch (error) {
        console.error('Get Webhook Secret Error:', {
            error: error.message,
            storeId,
            type: metadata.type
        });
        throw error;
    }
}

/**
 * Generate webhook secret for new store setup
 * @returns {string}
 */
exports.generateWebhookSecret = () => {
    try {
        return crypto.randomBytes(32).toString('hex');
    } catch (error) {
        console.error('Generate Webhook Secret Error:', error);
        throw new Error('Failed to generate webhook secret');
    }
};

/**
 * Validate webhook payload
 * @param {Object} payload - Webhook payload
 * @returns {boolean}
 */
exports.validateWebhookPayload = (payload) => {
    const requiredFields = ['id', 'storeId', 'type', 'timestamp'];
    
    return requiredFields.every(field => {
        const hasField = payload.hasOwnProperty(field);
        if (!hasField) {
            console.error(`Missing required webhook field: ${field}`);
        }
        return hasField;
    });
};

module.exports = exports; 