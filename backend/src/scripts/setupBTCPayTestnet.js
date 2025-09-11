require('dotenv').config();
const mongoose = require('mongoose');
const BTCPayService = require('../services/BTCPayService');
const Admin = require('../models/admin');

// Test BTCPayServer configuration
const testBTCPayConfig = {
    baseUrl: 'https://testnet.demo.btcpayserver.org',
    apiKey: 'oiOoh7VlOHCloDpQL7Coi0OdUI7Wk0d7RbyLQhpvbvr',
    storeId: process.env.BTCPAY_STORE_ID || 'your_test_store_id_here'
};

async function testBTCPayConnection() {
    try {
        console.log('🔗 Testing BTCPayServer connection...');
        
        // Test 1: Verify store credentials
        console.log('\n📋 Test 1: Verifying store credentials...');
        const storeVerified = await BTCPayService.verifyStore(
            testBTCPayConfig.storeId, 
            testBTCPayConfig.apiKey
        );
        console.log('Store verification result:', storeVerified ? '✅ SUCCESS' : '❌ FAILED');
        
        if (!storeVerified) {
            console.log('⚠️  Store verification failed. Please check your store ID and API key.');
            return;
        }
        
        // Test 2: Create a test invoice
        console.log('\n💰 Test 2: Creating test invoice...');
        const testInvoice = await BTCPayService.createInvoice({
            storeId: testBTCPayConfig.storeId,
            apiKey: testBTCPayConfig.apiKey,
            amount: 0.001, // 0.001 BTC (testnet)
            metadata: {
                test: true,
                description: 'Test invoice for CrackJesus'
            },
            redirectUrl: 'http://localhost:3000/test/success'
        });
        console.log('✅ Test invoice created successfully!');
        console.log('Invoice ID:', testInvoice.id);
        console.log('Invoice URL:', testInvoice.checkoutLink);
        
        // Test 3: Get invoice details
        console.log('\n📄 Test 3: Getting invoice details...');
        const invoiceDetails = await BTCPayService.getInvoice({
            storeId: testBTCPayConfig.storeId,
            apiKey: testBTCPayConfig.apiKey,
            invoiceId: testInvoice.id
        });
        console.log('✅ Invoice details retrieved successfully!');
        console.log('Status:', invoiceDetails.status);
        console.log('Amount:', invoiceDetails.amount);
        
        // Test 4: Setup webhook
        console.log('\n🔔 Test 4: Setting up webhook...');
        const webhookSecret = require('crypto').randomBytes(32).toString('hex');
        const webhook = await BTCPayService.createWebhook({
            storeId: testBTCPayConfig.storeId,
            apiKey: testBTCPayConfig.apiKey,
            webhookUrl: 'http://localhost:3001/api/webhooks/btcpay/test',
            secret: webhookSecret,
            events: ['InvoiceSettled', 'InvoiceExpired', 'InvoiceInvalid']
        });
        console.log('✅ Webhook created successfully!');
        console.log('Webhook ID:', webhook.id);
        
        // Test 5: Verify webhooks
        console.log('\n🔍 Test 5: Verifying webhooks...');
        const webhooksVerified = await BTCPayService.verifyWebhooks({
            storeId: testBTCPayConfig.storeId,
            apiKey: testBTCPayConfig.apiKey,
            expectedUrls: ['http://localhost:3001/api/webhooks/btcpay/test']
        });
        console.log('Webhook verification result:', webhooksVerified ? '✅ SUCCESS' : '❌ FAILED');
        
        console.log('\n🎉 All BTCPayServer tests completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update your .env file with the correct store ID');
        console.log('2. Start your backend server');
        console.log('3. Test the payment flow through your frontend');
        
    } catch (error) {
        console.error('❌ BTCPayServer test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check if your API key is correct');
        console.log('2. Verify your store ID exists');
        console.log('3. Ensure your BTCPayServer instance is running');
        console.log('4. Check network connectivity to testnet.demo.btcpayserver.org');
    }
}

async function setupAdminBTCPay() {
    try {
        console.log('\n👤 Setting up admin BTCPay configuration...');
        
        // Find or create admin
        let admin = await Admin.findOne();
        if (!admin) {
            console.log('No admin found. Please create an admin first.');
            return;
        }
        
        // Update admin with BTCPay settings
        admin.btcPaySettings = {
            centralStore: {
                storeId: testBTCPayConfig.storeId,
                apiKey: testBTCPayConfig.apiKey,
                verified: true,
                webhookSecret: require('crypto').randomBytes(32).toString('hex')
            },
            personalStore: {
                storeId: testBTCPayConfig.storeId,
                apiKey: testBTCPayConfig.apiKey,
                verified: true,
                webhookSecret: require('crypto').randomBytes(32).toString('hex')
            }
        };
        
        await admin.save();
        console.log('✅ Admin BTCPay configuration updated successfully!');
        
    } catch (error) {
        console.error('❌ Failed to setup admin BTCPay:', error.message);
    }
}

async function main() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Run tests
        await testBTCPayConnection();
        await setupAdminBTCPay();
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { testBTCPayConnection, setupAdminBTCPay };

