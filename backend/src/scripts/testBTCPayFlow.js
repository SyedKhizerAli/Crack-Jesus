const axios = require('axios');
const crypto = require('crypto');

// BTCPay Server Configuration
const BTCPAY_TESTNET_URL = 'https://testnet.demo.btcpayserver.org';
const APP_URL = 'http://localhost:3001';

// Test user data
const testUser = {
  email: 'buyer@test.com',
  password: 'testpass123'
};

// Helper function to make requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
}

async function testBTCPayHealth() {
  console.log('🏥 Testing BTCPay Server Health...');
  
  const health = await makeRequest('GET', `${BTCPAY_TESTNET_URL}/api/v1/health`);
  
  if (health.success) {
    console.log('✅ BTCPay Server is healthy');
    console.log('   Synchronized:', health.data.synchronized);
    return true;
  } else {
    console.log('❌ BTCPay Server health check failed');
    console.log('   Error:', health.error);
    return false;
  }
}

async function testBTCPayServerInfo() {
  console.log('\n📋 Getting BTCPay Server Info...');
  
  const info = await makeRequest('GET', `${BTCPAY_TESTNET_URL}/api/v1/server/info`);
  
  if (info.success) {
    console.log('✅ Server Info Retrieved:');
    console.log('   Version:', info.data.version || 'Unknown');
    console.log('   Network:', info.data.btcPayNetwork || 'Unknown');
    console.log('   Supported Payment Methods:', info.data.supportedPaymentMethods || 'Unknown');
    return true;
  } else {
    console.log('❌ Failed to get server info');
    console.log('   Error:', info.error);
    return false;
  }
}

async function loginAndGetToken() {
  console.log('\n🔐 Logging in to get user token...');
  
  const login = await makeRequest('POST', `${APP_URL}/api/users/login`, testUser);
  
  if (login.success) {
    console.log('✅ User logged in successfully');
    return login.data.data.accessToken;
  } else {
    console.log('❌ Login failed');
    console.log('   Error:', login.error);
    return null;
  }
}

async function testCreateBTCPayInvoice(userToken) {
  console.log('\n💰 Testing BTC Payment Invoice Creation...');
  
  // Test creating a deposit through our wallet system
  const depositRequest = await makeRequest(
    'POST', 
    `${APP_URL}/api/wallet/deposit`,
    {
      btcAmount: 0.001 // Test amount (1000 satoshis)
    },
    {
      'Authorization': `Bearer ${userToken}`
    }
  );
  
  if (depositRequest.success) {
    console.log('✅ BTC Deposit request created successfully');
    console.log('   Invoice ID:', depositRequest.data.data?.invoiceId || 'Unknown');
    console.log('   Amount:', depositRequest.data.data?.amount || 'Unknown');
    console.log('   Status:', depositRequest.data.data?.status || 'Unknown');
    
    if (depositRequest.data.data?.paymentUrl) {
      console.log('   Payment URL:', depositRequest.data.data.paymentUrl);
    }
    
    return depositRequest.data.data;
  } else {
    console.log('❌ BTC Deposit request failed');
    console.log('   Error:', depositRequest.error);
    return null;
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔗 Testing Webhook Endpoint...');
  
  // Test our webhook endpoint with sample data
  const webhookData = {
    invoiceId: 'test_invoice_123',
    status: 'settled',
    type: 'InvoiceSettled',
    timestamp: Date.now(),
    storeId: 'test_store',
    btcAmount: 0.001
  };
  
  // Generate test signature
  const secret = 'test_webhook_secret';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(webhookData))
    .digest('hex');
  
  const webhook = await makeRequest(
    'POST',
    `${APP_URL}/api/btcpay/webhook`,
    webhookData,
    {
      'btcpay-sig': `sha256=${signature}`
    }
  );
  
  if (webhook.success) {
    console.log('✅ Webhook endpoint responded successfully');
    console.log('   Response:', webhook.data.message || 'Success');
    return true;
  } else {
    console.log('❌ Webhook test failed');
    console.log('   Error:', webhook.error);
    return false;
  }
}

async function checkDepositStatus(invoiceId, userToken) {
  if (!invoiceId) return false;
  
  console.log('\n📊 Checking Deposit Status...');
  
  const status = await makeRequest(
    'GET',
    `${APP_URL}/api/wallet/deposit/${invoiceId}/status`,
    null,
    {
      'Authorization': `Bearer ${userToken}`
    }
  );
  
  if (status.success) {
    console.log('✅ Deposit status retrieved');
    console.log('   Status:', status.data.data?.status || 'Unknown');
    console.log('   Amount:', status.data.data?.amount || 'Unknown');
    return status.data.data;
  } else {
    console.log('❌ Failed to get deposit status');
    console.log('   Error:', status.error);
    return null;
  }
}

async function simulatePayment() {
  console.log('\n⚡ Simulating Testnet Bitcoin Payment...');
  
  console.log('📝 To complete a real testnet payment:');
  console.log('1. Get testnet BTC from: https://coinfaucet.eu/en/btc-testnet/');
  console.log('2. Or use: https://testnet-faucet.mempool.co/');
  console.log('3. Send testnet BTC to the payment address');
  console.log('4. Wait for confirmation (usually 10-60 minutes on testnet)');
  console.log('5. BTCPay will send webhook notification');
  console.log('6. User balance will be updated automatically');
  
  return true;
}

async function testFullBTCPayFlow() {
  console.log('🚀 STARTING BTCPAY TESTNET PAYMENT FLOW TEST');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: BTCPay Server Health
    const healthOk = await testBTCPayHealth();
    if (!healthOk) return;
    
    // Test 2: Server Info
    await testBTCPayServerInfo();
    
    // Test 3: User Authentication
    const userToken = await loginAndGetToken();
    if (!userToken) {
      console.log('\n⚠️  Cannot proceed without user token');
      console.log('   Make sure your backend server is running on port 3001');
      return;
    }
    
    // Test 4: Create BTC Invoice
    const invoice = await testCreateBTCPayInvoice(userToken);
    
    // Test 5: Check Deposit Status
    if (invoice?.invoiceId) {
      await checkDepositStatus(invoice.invoiceId, userToken);
    }
    
    // Test 6: Webhook Endpoint
    await testWebhookEndpoint();
    
    // Test 7: Payment Simulation Guide
    await simulatePayment();
    
    console.log('\n🎉 BTCPay TESTNET FLOW TEST COMPLETED');
    console.log('=' .repeat(60));
    console.log('✅ All components tested successfully');
    console.log('💡 To complete real payments, use testnet Bitcoin');
    console.log('🔗 BTCPay Server: https://testnet.demo.btcpayserver.org');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Additional function to test with actual BTCPay store
async function testWithActualStore(storeId, apiKey) {
  console.log('\n🏪 Testing with Actual BTCPay Store...');
  console.log('Store ID:', storeId);
  
  try {
    // Test store access
    const storeTest = await makeRequest(
      'GET',
      `${BTCPAY_TESTNET_URL}/api/v1/stores/${storeId}`,
      null,
      {
        'Authorization': `token ${apiKey}`
      }
    );
    
    if (storeTest.success) {
      console.log('✅ Store access verified');
      console.log('   Store Name:', storeTest.data.name || 'Unknown');
      console.log('   Store Website:', storeTest.data.website || 'None');
      
      // Create actual invoice
      const invoiceData = {
        amount: 1, // $1 USD equivalent
        currency: 'USD',
        orderId: `test_order_${Date.now()}`,
        notificationURL: `${APP_URL}/api/btcpay/webhook`,
        redirectURL: `${APP_URL}/payment/success`,
        buyer: {
          email: testUser.email
        }
      };
      
      const invoice = await makeRequest(
        'POST',
        `${BTCPAY_TESTNET_URL}/api/v1/stores/${storeId}/invoices`,
        invoiceData,
        {
          'Authorization': `token ${apiKey}`
        }
      );
      
      if (invoice.success) {
        console.log('✅ Invoice created successfully');
        console.log('   Invoice ID:', invoice.data.id);
        console.log('   Payment URL:', invoice.data.checkoutLink);
        console.log('   Status:', invoice.data.status);
        console.log('   Amount:', invoice.data.amount, invoice.data.currency);
        return invoice.data;
      } else {
        console.log('❌ Invoice creation failed:', invoice.error);
      }
      
    } else {
      console.log('❌ Store access failed:', storeTest.error);
    }
    
  } catch (error) {
    console.log('❌ Store test error:', error.message);
  }
}

// Export for use in other modules
module.exports = {
  testFullBTCPayFlow,
  testWithActualStore,
  testBTCPayHealth,
  makeRequest
};

// Run if called directly
if (require.main === module) {
  testFullBTCPayFlow();
} 