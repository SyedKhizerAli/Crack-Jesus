const BTCPayClient = require('btcpay');

// Load environment variables if not already loaded
require('dotenv').config();

// Default values for development
const defaults = {
    BTCPAY_URL: 'https://testnet.demo.btcpayserver.org',
    APP_URL: 'http://localhost:3000',
    APP_NAME: 'CrackJesus'
};

// Get environment variable with fallback to default
const getEnvVar = (key) => process.env[key] || defaults[key];

const btcPayConfig = {
    baseUrl: getEnvVar('BTCPAY_URL'),
    
    // Redirect URLs
    redirectUrls: {
        success: `${getEnvVar('APP_URL')}/api/vendor/btcpay/callback`,
        cancel: `${getEnvVar('APP_URL')}/vendor/dashboard`,
        error: `${getEnvVar('APP_URL')}/vendor/error`
    },
    
    // Required permissions
    requiredPermissions: {
        vendor: [
            'btcpay.store.cancreateinvoice',
            'btcpay.store.canviewinvoices',
            'btcpay.store.webhooks.canmodifywebhooks',
            'btcpay.store.canviewstoresettings'
        ],
        admin: [
            'btcpay.store.cancreateinvoice',
            'btcpay.store.canviewinvoices',
            'btcpay.store.webhooks.canmodifywebhooks',
            'btcpay.store.canviewstoresettings',
            'btcpay.store.canmodifystoresettings'
        ]
    },

    // Webhook events
    webhookEvents: {
        payment: [
            'InvoiceSettled',
            'InvoiceExpired',
            'InvoiceInvalid'
        ],
        deposit: [
            'InvoiceSettled',
            'InvoiceExpired',
            'InvoiceInvalid'
        ]
    },

    // API endpoints
    endpoints: {
        createInvoice: (storeId) => `/api/v1/stores/${storeId}/invoices`,
        getInvoice: (storeId, invoiceId) => `/api/v1/stores/${storeId}/invoices/${invoiceId}`,
        createWebhook: (storeId) => `/api/v1/stores/${storeId}/webhooks`,
        getWebhooks: (storeId) => `/api/v1/stores/${storeId}/webhooks`,
        getBalance: (storeId) => `/api/v1/stores/${storeId}/payment-methods/BTC/onchain/balance`
    },

    // Default invoice options
    defaultInvoiceOptions: {
        expirationMinutes: 30,
        monitoringMinutes: 60,
        paymentMethods: ['BTC'],
        checkout: {
            speedPolicy: 'MediumSpeed',
            paymentMethods: ['BTC'],
            defaultLanguage: 'en'
        }
    }
};

// Generate authorization URL
const generateAuthUrl = (userId, role = 'vendor') => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!['vendor', 'admin'].includes(role)) {
        throw new Error('Invalid role specified');
    }

    const params = new URLSearchParams({
        permissions: btcPayConfig.requiredPermissions[role].join('&permissions='),
        redirect: btcPayConfig.redirectUrls.success,
        applicationName: process.env.APP_NAME,
        selectiveStores: 'false',
        strict: 'true',
        userId: userId // Add user ID to track authorization
    });

    return `${btcPayConfig.baseUrl}/api-keys/authorize?${params.toString()}`;
};

// Create BTCPay client instance
const createClient = (apiKey) => {
    if (!apiKey) {
        throw new Error('API key is required');
    }

    return new BTCPayClient(btcPayConfig.baseUrl, apiKey);
};

module.exports = {
    btcPayConfig,
    generateAuthUrl,
    createClient
}; 