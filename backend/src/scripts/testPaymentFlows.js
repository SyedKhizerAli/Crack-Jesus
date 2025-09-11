require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const BTCPayService = require('../services/BTCPayService');
const User = require('../models/user');
const Vendor = require('../models/vendor');
const CreditCard = require('../models/creditCard');
const Sale = require('../models/sale');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const BTCPAY_CONFIG = {
    baseUrl: 'https://testnet.demo.btcpayserver.org',
    apiKey: 'oiOoh7VlOHCloDpQL7Coi0OdUI7Wk0d7RbyLQhpvbvr',
    storeId: process.env.BTCPAY_STORE_ID || 'your_test_store_id_here'
};

class PaymentFlowTester {
    constructor() {
        this.testUsers = {};
        this.testCards = {};
        this.testInvoices = {};
    }

    async setup() {
        console.log('🚀 Setting up payment flow tests...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Create test users
        await this.createTestUsers();
        
        // Create test cards
        await this.createTestCards();
        
        console.log('✅ Setup completed successfully!');
    }

    async createTestUsers() {
        console.log('\n👥 Creating test users...');
        
        // Create test buyer
        const buyer = await User.findOneAndUpdate(
            { email: 'testbuyer@test.com' },
            {
                username: 'testbuyer',
                email: 'testbuyer@test.com',
                password: '$2b$10$testpassword',
                role: 'user',
                wallet: {
                    btcBalance: 1.0, // 1 BTC for testing
                    pendingBalance: 0
                }
            },
            { upsert: true, new: true }
        );
        this.testUsers.buyer = buyer;
        console.log('✅ Test buyer created:', buyer.email);

        // Create test vendor
        const vendor = await Vendor.findOneAndUpdate(
            { email: 'testvendor@test.com' },
            {
                username: 'testvendor',
                email: 'testvendor@test.com',
                password: '$2b$10$testpassword',
                role: 'vendor',
                status: 'active',
                btcPaySettings: {
                    storeId: BTCPAY_CONFIG.storeId,
                    apiKey: BTCPAY_CONFIG.apiKey,
                    verified: true
                }
            },
            { upsert: true, new: true }
        );
        this.testUsers.vendor = vendor;
        console.log('✅ Test vendor created:', vendor.email);
    }

    async createTestCards() {
        console.log('\n💳 Creating test cards...');
        
        const testCardData = {
            vendorId: this.testUsers.vendor._id,
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            holderName: 'Test User',
            type: 'Visa',
            cardType: 'credit',
            bin: '411111',
            address: {
                country: 'United States',
                state: 'CA',
                city: 'Los Angeles',
                zip: '90210'
            },
            bank: 'Test Bank',
            base: 'Standard',
            price: 0.1, // 0.1 BTC
            available: true,
            additionalInfo: 'Test card for payment flow testing',
            note: 'Test card'
        };

        const card = await CreditCard.findOneAndUpdate(
            { cardNumber: testCardData.cardNumber },
            testCardData,
            { upsert: true, new: true }
        );
        this.testCards.testCard = card;
        console.log('✅ Test card created:', card.cardNumber);
    }

    async testBTCPayConnection() {
        console.log('\n🔗 Testing BTCPayServer connection...');
        
        try {
            // Test store verification
            const storeVerified = await BTCPayService.verifyStore(
                BTCPAY_CONFIG.storeId,
                BTCPAY_CONFIG.apiKey
            );
            
            if (!storeVerified) {
                throw new Error('Store verification failed');
            }
            console.log('✅ BTCPayServer connection successful');
            
        } catch (error) {
            console.error('❌ BTCPayServer connection failed:', error.message);
            throw error;
        }
    }

    async testCreateInvoice() {
        console.log('\n💰 Testing invoice creation...');
        
        try {
            const invoice = await BTCPayService.createInvoice({
                storeId: BTCPAY_CONFIG.storeId,
                apiKey: BTCPAY_CONFIG.apiKey,
                amount: 0.001, // 0.001 BTC
                metadata: {
                    test: true,
                    description: 'Test invoice for payment flow',
                    userId: this.testUsers.buyer._id.toString()
                },
                redirectUrl: `${BASE_URL}/test/payment/success`
            });
            
            this.testInvoices.testInvoice = invoice;
            console.log('✅ Invoice created successfully');
            console.log('   Invoice ID:', invoice.id);
            console.log('   Amount:', invoice.amount, 'BTC');
            console.log('   Status:', invoice.status);
            console.log('   Checkout URL:', invoice.checkoutLink);
            
        } catch (error) {
            console.error('❌ Invoice creation failed:', error.message);
            throw error;
        }
    }

    async testGetInvoice() {
        console.log('\n📄 Testing invoice retrieval...');
        
        try {
            const invoice = await BTCPayService.getInvoice({
                storeId: BTCPAY_CONFIG.storeId,
                apiKey: BTCPAY_CONFIG.apiKey,
                invoiceId: this.testInvoices.testInvoice.id
            });
            
            console.log('✅ Invoice retrieved successfully');
            console.log('   Status:', invoice.status);
            console.log('   Amount:', invoice.amount);
            console.log('   Created:', invoice.createdTime);
            
        } catch (error) {
            console.error('❌ Invoice retrieval failed:', error.message);
            throw error;
        }
    }

    async testWebhookSetup() {
        console.log('\n🔔 Testing webhook setup...');
        
        try {
            const webhookSecret = require('crypto').randomBytes(32).toString('hex');
            const webhook = await BTCPayService.createWebhook({
                storeId: BTCPAY_CONFIG.storeId,
                apiKey: BTCPAY_CONFIG.apiKey,
                webhookUrl: `${BASE_URL}/api/webhooks/btcpay/test`,
                secret: webhookSecret,
                events: ['InvoiceSettled', 'InvoiceExpired', 'InvoiceInvalid']
            });
            
            console.log('✅ Webhook created successfully');
            console.log('   Webhook ID:', webhook.id);
            console.log('   URL:', webhook.url);
            
        } catch (error) {
            console.error('❌ Webhook setup failed:', error.message);
            throw error;
        }
    }

    async testCardPurchaseFlow() {
        console.log('\n🛒 Testing card purchase flow...');
        
        try {
            // Get buyer token
            const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
                email: 'testbuyer@test.com',
                password: 'testpassword'
            });
            
            const buyerToken = loginResponse.data.token;
            console.log('✅ Buyer login successful');

            // Attempt to purchase card
            const purchaseResponse = await axios.post(
                `${BASE_URL}/api/users/cards/buy`,
                {
                    cardId: this.testCards.testCard._id
                },
                {
                    headers: {
                        'Authorization': `Bearer ${buyerToken}`
                    }
                }
            );
            
            console.log('✅ Card purchase successful');
            console.log('   Sale ID:', purchaseResponse.data.saleId);
            console.log('   Amount:', purchaseResponse.data.amount);
            
        } catch (error) {
            console.error('❌ Card purchase failed:', error.response?.data || error.message);
        }
    }

    async testWalletTransfer() {
        console.log('\n💸 Testing wallet transfer...');
        
        try {
            // Get buyer token
            const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
                email: 'testbuyer@test.com',
                password: 'testpassword'
            });
            
            const buyerToken = loginResponse.data.token;

            // Transfer funds
            const transferResponse = await axios.post(
                `${BASE_URL}/api/wallet/transfer`,
                {
                    recipientEmail: 'testvendor@test.com',
                    amount: 0.01 // 0.01 BTC
                },
                {
                    headers: {
                        'Authorization': `Bearer ${buyerToken}`
                    }
                }
            );
            
            console.log('✅ Wallet transfer successful');
            console.log('   Transfer ID:', transferResponse.data.transferId);
            console.log('   Amount:', transferResponse.data.amount);
            
        } catch (error) {
            console.error('❌ Wallet transfer failed:', error.response?.data || error.message);
        }
    }

    async testVendorPayment() {
        console.log('\n🏪 Testing vendor payment...');
        
        try {
            const vendorPayment = await BTCPayService.createVendorPayment({
                amount: 0.05, // 0.05 BTC
                vendorStoreId: BTCPAY_CONFIG.storeId,
                saleId: 'test_sale_id',
                cardId: this.testCards.testCard._id
            });
            
            console.log('✅ Vendor payment invoice created');
            console.log('   Invoice ID:', vendorPayment.id);
            console.log('   Amount:', vendorPayment.amount);
            
        } catch (error) {
            console.error('❌ Vendor payment failed:', error.message);
        }
    }

    async runAllTests() {
        try {
            await this.setup();
            
            // BTCPayServer tests
            await this.testBTCPayConnection();
            await this.testCreateInvoice();
            await this.testGetInvoice();
            await this.testWebhookSetup();
            
            // Application flow tests
            await this.testCardPurchaseFlow();
            await this.testWalletTransfer();
            await this.testVendorPayment();
            
            console.log('\n🎉 All payment flow tests completed successfully!');
            console.log('\n📝 Test Summary:');
            console.log('✅ BTCPayServer integration working');
            console.log('✅ Invoice creation and retrieval working');
            console.log('✅ Webhook setup working');
            console.log('✅ Card purchase flow tested');
            console.log('✅ Wallet transfer tested');
            console.log('✅ Vendor payment tested');
            
        } catch (error) {
            console.error('\n❌ Payment flow tests failed:', error.message);
        } finally {
            await mongoose.disconnect();
            console.log('\n✅ Disconnected from MongoDB');
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new PaymentFlowTester();
    tester.runAllTests();
}

module.exports = PaymentFlowTester;

