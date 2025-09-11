const axios = require('axios');
const { btcPayConfig } = require('../config/btcpayConfig');
const crypto = require('crypto');
const Admin = require('../models/admin');

class BTCPayService {
    // Verify store credentials
    static async verifyStore(storeId, apiKey) {
        try {
            const response = await axios.get(
                `${btcPayConfig.baseUrl}/api/v1/stores/${storeId}`,
                {
                    headers: { 
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return !!response.data;
        } catch (error) {
            console.error('Store Verification Error:', error);
            return false;
        }
    }

    // Create webhook
    static async createWebhook({ storeId, apiKey, webhookUrl, secret, events }) {
        try {
            const response = await axios.post(
                `${btcPayConfig.baseUrl}${btcPayConfig.endpoints.createWebhook(storeId)}`,
                {
                    url: webhookUrl,
                    secret,
                    enabled: true,
                    authorizedEvents: {
                        everything: false,
                        specificEvents: events || btcPayConfig.webhookEvents.payment
                    }
                },
                {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Create Webhook Error:', error);
            throw new Error(`Failed to create webhook: ${error.message}`);
        }
    }

    // Verify webhooks
    static async verifyWebhooks({ storeId, apiKey, expectedUrls }) {
        try {
            const response = await axios.get(
                `${btcPayConfig.baseUrl}${btcPayConfig.endpoints.getWebhooks(storeId)}`,
                {
                    headers: {
                        'Authorization': `token ${apiKey}`
                    }
                }
            );

            const webhooks = response.data;
            return expectedUrls.every(url => 
                webhooks.some(w => w.url === url && w.enabled)
            );
        } catch (error) {
            console.error('Verify Webhooks Error:', error);
            return false;
        }
    }

    // Create invoice
    static async createInvoice({ storeId, apiKey, amount, metadata, redirectUrl }) {
        try {
            const response = await axios.post(
                `${btcPayConfig.baseUrl}${btcPayConfig.endpoints.createInvoice(storeId)}`,
                {
                    amount,
                    currency: 'BTC',
                    metadata,
                    checkout: btcPayConfig.defaultInvoiceOptions.checkout,
                    expirationMinutes: btcPayConfig.defaultInvoiceOptions.expirationMinutes,
                    monitoringMinutes: btcPayConfig.defaultInvoiceOptions.monitoringMinutes,
                    redirectURL: redirectUrl
                },
                {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Create Invoice Error:', error);
            throw new Error(`Failed to create invoice: ${error.message}`);
        }
    }

    // Get invoice
    static async getInvoice({ storeId, apiKey, invoiceId }) {
        try {
            const response = await axios.get(
                `${btcPayConfig.baseUrl}${btcPayConfig.endpoints.getInvoice(storeId, invoiceId)}`,
                {
                    headers: {
                        'Authorization': `token ${apiKey}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get Invoice Error:', error);
            throw new Error(`Failed to get invoice: ${error.message}`);
        }
    }

    // Get store balance
    static async getCentralStoreBalance({ storeId, apiKey }) {
        try {
            const response = await axios.get(
                `${btcPayConfig.baseUrl}${btcPayConfig.endpoints.getBalance(storeId)}`,
                {
                    headers: {
                        'Authorization': `token ${apiKey}`
                    }
                }
            );
            return {
                confirmedBalance: response.data.confirmedBalance,
                unconfirmedBalance: response.data.unconfirmedBalance
            };
        } catch (error) {
            console.error('Get Balance Error:', error);
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    // Verify webhook signature
    static verifyWebhookSignature(req) {
        try {
            const signature = req.headers['btcpay-sig'];
            const rawBody = req.rawBody;

            if (!signature || !rawBody) {
                throw new Error('Missing signature or payload');
            }

            const computedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            const expectedSignature = signature.split('=')[1];
            return computedSignature === expectedSignature;
        } catch (error) {
            console.error('Webhook Signature Verification Error:', error);
            return false;
        }
    }

    // Create vendor payment
    static async createVendorPayment({ amount, vendorStoreId, saleId, cardId }) {
        try {
            return await this.createInvoice({
                storeId: vendorStoreId,
                amount,
                metadata: {
                    saleId,
                    cardId,
                    type: 'vendor_payment'
                },
                redirectUrl: `${process.env.APP_URL}/vendor/payment/success`
            });
        } catch (error) {
            console.error('Create Vendor Payment Error:', error);
            throw new Error(`Failed to create vendor payment: ${error.message}`);
        }
    }

    static async setupAdminStore(storeId, apiKey, storeType) {
        try {
            // Verify store exists and credentials are valid
            const storeResponse = await axios.get(
                `${process.env.BTCPAY_URL}/api/v1/stores/${storeId}`,
                {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Setup webhook for the store
            const webhookSecret = crypto.randomBytes(32).toString('hex');
            await axios.post(
                `${process.env.BTCPAY_URL}/api/v1/stores/${storeId}/webhooks`,
                {
                    url: `${process.env.API_URL}/webhooks/btcpay/${storeType}`,
                    secret: webhookSecret,
                    enabled: true,
                    automaticRedelivery: true,
                    events: ['InvoiceSettled', 'InvoiceExpired', 'InvoiceInvalid']
                },
                {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                storeId,
                webhookSecret,
                verified: true
            };

        } catch (error) {
            console.error('BTCPay Store Setup Error:', error);
            throw new Error('Failed to setup BTCPay store');
        }
    }

    static async createCentralStoreInvoice(amount, metadata) {
        try {
            const admin = await Admin.findOne();
            if (!admin?.btcPaySettings?.centralStore?.verified) {
                throw new Error('Central store not configured');
            }

            const invoiceData = {
                amount,
                currency: 'BTC',
                metadata,
                checkout: {
                    redirectURL: `${process.env.APP_URL}/wallet/deposit/success`,
                    cancelURL: `${process.env.APP_URL}/wallet/deposit/cancel`
                }
            };

            const response = await axios.post(
                `${process.env.BTCPAY_URL}/api/v1/stores/${admin.btcPaySettings.centralStore.storeId}/invoices`,
                invoiceData,
                {
                    headers: {
                        'Authorization': `token ${admin.btcPaySettings.centralStore.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('Create Central Store Invoice Error:', error);
            throw new Error('Failed to create invoice');
        }
    }
}

module.exports = BTCPayService; 