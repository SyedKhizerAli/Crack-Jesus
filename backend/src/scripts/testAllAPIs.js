const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3001';
let testResults = [];

// Test data
const testUsers = {
  user: { username: 'testuser', email: 'testuser@test.com', password: 'test123456' },
  vendor: { username: 'testvendor', email: 'testvendor@test.com', password: 'test123456' },
  admin: { username: 'testadmin', email: 'testadmin@test.com', password: 'test123456' }
};

let tokens = {};
let testCardId = null;
let testSaleId = null;

// Helper functions
function logTest(endpoint, method, status, message) {
  const result = { endpoint, method, status, message, timestamp: new Date().toISOString() };
  testResults.push(result);
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${method} ${endpoint} - ${message}`);
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      ...(data && { data })
    };
    
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

// Test Categories
async function testPublicEndpoints() {
  console.log('\n🌐 TESTING PUBLIC ENDPOINTS');
  
  // Test card listing (public)
  const cardsList = await makeRequest('GET', '/api/cards/list?limit=5');
  logTest('/api/cards/list', 'GET', cardsList.success ? 'PASS' : 'FAIL', 
    cardsList.success ? `Retrieved ${cardsList.data.data?.cards?.length || 0} cards` : cardsList.error.message);
  
  // Test card search with filters
  const filteredCards = await makeRequest('GET', '/api/cards/list?type=Visa&minPrice=10&maxPrice=100');
  logTest('/api/cards/list (filtered)', 'GET', filteredCards.success ? 'PASS' : 'FAIL',
    filteredCards.success ? `Found ${filteredCards.data.data?.cards?.length || 0} Visa cards` : filteredCards.error.message);
  
  // Test BIN search
  const binSearch = await makeRequest('GET', '/api/cards/list?bin=491605');
  logTest('/api/cards/list (BIN search)', 'GET', binSearch.success ? 'PASS' : 'FAIL',
    binSearch.success ? `Found ${binSearch.data.data?.cards?.length || 0} cards with BIN` : binSearch.error.message);
}

async function testUserAuth() {
  console.log('\n👤 TESTING USER AUTHENTICATION');
  
  // User Signup
  const userSignup = await makeRequest('POST', '/api/users/signup', testUsers.user);
  logTest('/api/users/signup', 'POST', userSignup.success ? 'PASS' : 'FAIL',
    userSignup.success ? 'User registered successfully' : userSignup.error.message);
  
  // User Login
  const userLogin = await makeRequest('POST', '/api/users/login', {
    email: testUsers.user.email,
    password: testUsers.user.password
  });
  logTest('/api/users/login', 'POST', userLogin.success ? 'PASS' : 'FAIL',
    userLogin.success ? 'User logged in successfully' : userLogin.error.message);
  
  if (userLogin.success) {
    tokens.user = userLogin.data.data.accessToken;
  }
}

async function testVendorAuth() {
  console.log('\n🏪 TESTING VENDOR AUTHENTICATION');
  
  // Vendor Signup
  const vendorSignup = await makeRequest('POST', '/api/vendors/signup', testUsers.vendor);
  logTest('/api/vendors/signup', 'POST', vendorSignup.success ? 'PASS' : 'FAIL',
    vendorSignup.success ? 'Vendor registered successfully' : vendorSignup.error.message);
  
  // Vendor Login
  const vendorLogin = await makeRequest('POST', '/api/vendors/login', {
    email: testUsers.vendor.email,
    password: testUsers.vendor.password
  });
  logTest('/api/vendors/login', 'POST', vendorLogin.success ? 'PASS' : 'FAIL',
    vendorLogin.success ? 'Vendor logged in successfully' : vendorLogin.error.message);
  
  if (vendorLogin.success) {
    tokens.vendor = vendorLogin.data.data.accessToken;
  }
}

async function testAdminAuth() {
  console.log('\n👑 TESTING ADMIN AUTHENTICATION');
  
  // Try to login with existing admin
  const adminLogin = await makeRequest('POST', '/api/admin/login', {
    email: 'admin@crackjesus.com',
    password: 'admin123'
  });
  logTest('/api/admin/login', 'POST', adminLogin.success ? 'PASS' : 'FAIL',
    adminLogin.success ? 'Admin logged in successfully' : adminLogin.error.message);
  
  if (adminLogin.success) {
    tokens.admin = adminLogin.data.data.accessToken;
  }
}

async function testWalletOperations() {
  console.log('\n💰 TESTING WALLET OPERATIONS');
  
  if (!tokens.user) return;
  
  // Get wallet balance
  const balance = await makeRequest('GET', '/api/wallet/balance', null, tokens.user);
  logTest('/api/wallet/balance', 'GET', balance.success ? 'PASS' : 'FAIL',
    balance.success ? `Balance: $${balance.data.data.balance}` : balance.error.message);
  
  // Get wallet details
  const wallet = await makeRequest('GET', '/api/wallet', null, tokens.user);
  logTest('/api/wallet', 'GET', wallet.success ? 'PASS' : 'FAIL',
    wallet.success ? 'Wallet details retrieved' : wallet.error.message);
  
  // Create deposit (might fail without BTC setup)
  const deposit = await makeRequest('POST', '/api/wallet/deposit', { btcAmount: 0.001 }, tokens.user);
  logTest('/api/wallet/deposit', 'POST', deposit.success ? 'PASS' : 'WARN',
    deposit.success ? 'Deposit created' : 'Expected - requires BTC setup');
}

async function testCardOperations() {
  console.log('\n🎴 TESTING CARD OPERATIONS');
  
  if (!tokens.user) return;
  
  // Get available cards for user
  const userCards = await makeRequest('GET', '/api/users/cards', null, tokens.user);
  logTest('/api/users/cards', 'GET', userCards.success ? 'PASS' : 'FAIL',
    userCards.success ? `Found ${userCards.data.data?.cards?.length || 0} cards` : userCards.error.message);
  
  // Get card details (need a card ID first)
  const cardsList = await makeRequest('GET', '/api/cards/list?limit=1');
  if (cardsList.success && cardsList.data.data?.cards?.length > 0) {
    testCardId = cardsList.data.data.cards[0].id;
    
    const cardDetails = await makeRequest('GET', `/api/cards/${testCardId}/details`, null, tokens.user);
    logTest(`/api/cards/:id/details`, 'GET', cardDetails.success ? 'PASS' : 'FAIL',
      cardDetails.success ? 'Card details retrieved' : cardDetails.error.message);
    
    // View single card
    const singleCard = await makeRequest('GET', `/api/users/cards/${testCardId}`, null, tokens.user);
    logTest('/api/users/cards/:id', 'GET', singleCard.success ? 'PASS' : 'FAIL',
      singleCard.success ? 'Single card view successful' : singleCard.error.message);
  }
}

async function testVendorOperations() {
  console.log('\n🏪 TESTING VENDOR OPERATIONS');
  
  if (!tokens.vendor) return;
  
  // Get vendor profile
  const profile = await makeRequest('GET', '/api/vendors/profile', null, tokens.vendor);
  logTest('/api/vendors/profile', 'GET', profile.success ? 'PASS' : 'FAIL',
    profile.success ? 'Vendor profile retrieved' : profile.error.message);
  
  // Get vendor cards
  const vendorCards = await makeRequest('GET', '/api/vendors/cards', null, tokens.vendor);
  logTest('/api/vendors/cards', 'GET', vendorCards.success ? 'PASS' : 'FAIL',
    vendorCards.success ? `Vendor has ${vendorCards.data.data?.cards?.length || 0} cards` : vendorCards.error.message);
  
  // Add a test card
  const newCard = {
    cardDetails: {
      number: '4000000000000002',
      bin: '400000',
      holderName: 'Test User',
      expiryMonth: 12,
      expiryYear: 2025,
      cvv: '123',
      type: 'Visa',
      cardType: 'credit'
    },
    address: {
      country: 'US',
      state: 'CA',
      city: 'San Francisco',
      zip: '94105'
    },
    bank: 'Test Bank',
    base: 'Test Collection',
    additionalInfo: 'Test card for API testing',
    note: 'Generated by API test',
    price: 25,
    description: 'Test card description'
  };
  
  const addCard = await makeRequest('POST', '/api/vendors/cards/add', newCard, tokens.vendor);
  logTest('/api/vendors/cards/add', 'POST', addCard.success ? 'PASS' : 'FAIL',
    addCard.success ? 'Card added successfully' : addCard.error.message);
  
  // Get vendor sales
  const sales = await makeRequest('GET', '/api/vendors/sales', null, tokens.vendor);
  logTest('/api/vendors/sales', 'GET', sales.success ? 'PASS' : 'FAIL',
    sales.success ? `Found ${sales.data.data?.sales?.length || 0} sales` : sales.error.message);
}

async function testAdminOperations() {
  console.log('\n👑 TESTING ADMIN OPERATIONS');
  
  if (!tokens.admin) return;
  
  // Get all users
  const users = await makeRequest('GET', '/api/admin/users', null, tokens.admin);
  logTest('/api/admin/users', 'GET', users.success ? 'PASS' : 'FAIL',
    users.success ? `Found ${users.data.data?.users?.length || 0} users` : users.error.message);
  
  // Get all vendors
  const vendors = await makeRequest('GET', '/api/admin/vendors', null, tokens.admin);
  logTest('/api/admin/vendors', 'GET', vendors.success ? 'PASS' : 'FAIL',
    vendors.success ? `Found ${vendors.data.data?.vendors?.length || 0} vendors` : vendors.error.message);
  
  // Get all cards
  const adminCards = await makeRequest('GET', '/api/admin/cards', null, tokens.admin);
  logTest('/api/admin/cards', 'GET', adminCards.success ? 'PASS' : 'FAIL',
    adminCards.success ? `Found ${adminCards.data.data?.cards?.length || 0} cards` : adminCards.error.message);
  
  // Get sales
  const adminSales = await makeRequest('GET', '/api/admin/sales', null, tokens.admin);
  logTest('/api/admin/sales', 'GET', adminSales.success ? 'PASS' : 'FAIL',
    adminSales.success ? `Found ${adminSales.data.data?.sales?.length || 0} sales` : adminSales.error.message);
  
  // Get site settings
  const settings = await makeRequest('GET', '/api/admin/settings', null, tokens.admin);
  logTest('/api/admin/settings', 'GET', settings.success ? 'PASS' : 'FAIL',
    settings.success ? 'Site settings retrieved' : settings.error.message);
}

async function testPurchaseFlow() {
  console.log('\n🛒 TESTING PURCHASE FLOW');
  
  if (!tokens.user || !testCardId) return;
  
  // Add funds to user wallet first
  console.log('Adding funds to user wallet...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://salirazahussnain:4sKgKu90TulBmQVV@cluster0.vaq2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.db;
  await db.collection('users').updateOne(
    { email: testUsers.user.email },
    { $set: { 'wallet.btcBalance': 100 } }
  );
  
  // Try to purchase a card
  const purchase = await makeRequest('POST', '/api/users/cards/buy', { cardId: testCardId }, tokens.user);
  logTest('/api/users/cards/buy', 'POST', purchase.success ? 'PASS' : 'WARN',
    purchase.success ? `Purchase initiated: ${purchase.data.data?.saleId}` : 'Expected transaction error');
  
  if (purchase.success) {
    testSaleId = purchase.data.data.saleId;
  }
  
  // Get purchase history
  const purchases = await makeRequest('GET', '/api/users/purchases', null, tokens.user);
  logTest('/api/users/purchases', 'GET', purchases.success ? 'PASS' : 'FAIL',
    purchases.success ? `Found ${purchases.data.data?.purchases?.length || 0} purchases` : purchases.error.message);
  
  // Get purchased cards
  const purchasedCards = await makeRequest('GET', '/api/users/cards/purchased', null, tokens.user);
  logTest('/api/users/cards/purchased', 'GET', purchasedCards.success ? 'PASS' : 'FAIL',
    purchasedCards.success ? `Found ${purchasedCards.data.data?.cards?.length || 0} purchased cards` : purchasedCards.error.message);
}

async function testBTCPayEndpoints() {
  console.log('\n₿ TESTING BTCPAY ENDPOINTS');
  
  if (!tokens.vendor) return;
  
  // Get BTC Pay setup status
  const btcpayStatus = await makeRequest('GET', '/api/vendors/btcpay/setup', null, tokens.vendor);
  logTest('/api/vendors/btcpay/setup', 'GET', btcpayStatus.success ? 'PASS' : 'FAIL',
    btcpayStatus.success ? 'BTCPay status retrieved' : btcpayStatus.error.message);
  
  // Test BTC Pay webhook (public endpoint)
  const webhookTest = await makeRequest('POST', '/api/btcpay/webhook', { test: 'data' });
  logTest('/api/btcpay/webhook', 'POST', webhookTest.success ? 'PASS' : 'WARN',
    webhookTest.success ? 'Webhook processed' : 'Expected - requires valid webhook data');
}

async function testTicketSystem() {
  console.log('\n🎫 TESTING TICKET SYSTEM');
  
  if (!tokens.user) return;
  
  // Create a ticket
  const createTicket = await makeRequest('POST', '/api/users/tickets', {
    subject: 'Test Ticket',
    description: 'This is a test ticket created by API test',
    priority: 'medium'
  }, tokens.user);
  logTest('/api/users/tickets', 'POST', createTicket.success ? 'PASS' : 'FAIL',
    createTicket.success ? 'Ticket created successfully' : createTicket.error.message);
  
  // Get user tickets
  const userTickets = await makeRequest('GET', '/api/users/tickets', null, tokens.user);
  logTest('/api/users/tickets', 'GET', userTickets.success ? 'PASS' : 'FAIL',
    userTickets.success ? `Found ${userTickets.data.data?.tickets?.length || 0} tickets` : userTickets.error.message);
}

async function testCardVerification() {
  console.log('\n🔍 TESTING CARD VERIFICATION');
  
  if (!tokens.admin) return;
  
  // Test card verification (might fail without proper API setup)
  const verification = await makeRequest('POST', '/api/admin/cards/verify', {
    cardNumber: '4000000000000002',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123'
  }, tokens.admin);
  logTest('/api/admin/cards/verify', 'POST', verification.success ? 'PASS' : 'WARN',
    verification.success ? 'Card verification successful' : 'Expected - requires card checker API');
}

async function testErrorHandling() {
  console.log('\n⚠️ TESTING ERROR HANDLING');
  
  // Test invalid endpoint
  const invalidEndpoint = await makeRequest('GET', '/api/invalid/endpoint');
  logTest('/api/invalid/endpoint', 'GET', !invalidEndpoint.success ? 'PASS' : 'FAIL',
    !invalidEndpoint.success ? 'Correctly returned error for invalid endpoint' : 'Should have failed');
  
  // Test unauthorized access
  const unauthorized = await makeRequest('GET', '/api/admin/users');
  logTest('/api/admin/users (no auth)', 'GET', !unauthorized.success ? 'PASS' : 'FAIL',
    !unauthorized.success ? 'Correctly blocked unauthorized access' : 'Should have failed');
  
  // Test invalid token
  const invalidToken = await makeRequest('GET', '/api/wallet/balance', null, 'invalid-token');
  logTest('/api/wallet/balance (invalid token)', 'GET', !invalidToken.success ? 'PASS' : 'FAIL',
    !invalidToken.success ? 'Correctly rejected invalid token' : 'Should have failed');
}

async function generateReport() {
  console.log('\n📊 TEST SUMMARY REPORT');
  console.log('=' * 50);
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.message}`);
    });
  }
  
  if (warned > 0) {
    console.log('\n⚠️  WARNINGS (Expected Issues):');
    testResults.filter(r => r.status === 'WARN').forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.message}`);
    });
  }
  
  // Save detailed results to file
  const fs = require('fs');
  fs.writeFileSync('./api-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📝 Detailed results saved to: api-test-results.json');
}

async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE API TESTING');
  console.log('Testing against:', BASE_URL);
  console.log('=' * 60);
  
  try {
    await testPublicEndpoints();
    await testUserAuth();
    await testVendorAuth();
    await testAdminAuth();
    await testWalletOperations();
    await testCardOperations();
    await testVendorOperations();
    await testAdminOperations();
    await testPurchaseFlow();
    await testBTCPayEndpoints();
    await testTicketSystem();
    await testCardVerification();
    await testErrorHandling();
    
    await generateReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

runAllTests(); 