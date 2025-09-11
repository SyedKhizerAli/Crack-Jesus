const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/user');
const CreditCard = require('../models/creditCard');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

// Test user credentials
const testUsers = [
  {
    username: 'test_buyer1',
    email: 'buyer1@test.com',
    password: 'testpass123'
  },
  {
    username: 'test_buyer2', 
    email: 'buyer2@test.com',
    password: 'testpass123'
  }
];

// Test scenarios
const scenarios = [
  {
    name: 'Successful Purchase Flow',
    description: 'User with sufficient balance purchases a card'
  },
  {
    name: 'Insufficient Funds',
    description: 'User tries to purchase without enough balance'
  },
  {
    name: 'Card Verification Flow',
    description: 'Test card verification after purchase'
  }
];

async function createTestUser(userData) {
  try {
    const response = await axios.post(`${API_URL}/users/signup`, userData);
    console.log(`✅ Created user: ${userData.username}`);
    return response.data;
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log(`ℹ️  User ${userData.username} already exists, logging in...`);
      const loginResponse = await axios.post(`${API_URL}/users/login`, {
        email: userData.email,
        password: userData.password
      });
      return loginResponse.data;
    }
    throw error;
  }
}

async function addBalance(token, amount = 100) {
  try {
    // Direct database update for testing (simulating admin action)
    const decoded = JSON.parse(atob(token.split('.')[1]));
    await User.findByIdAndUpdate(decoded.id, {
      $set: { 'wallet.btcBalance': amount }
    });
    console.log(`✅ Added $${amount} to user wallet`);
  } catch (error) {
    console.error('❌ Failed to add balance:', error.message);
  }
}

async function getAvailableCards() {
  try {
    const response = await axios.get(`${API_URL}/cards/list`);
    return response.data.data.cards;
  } catch (error) {
    console.error('❌ Failed to get cards:', error.message);
    return [];
  }
}

async function purchaseCard(token, cardId) {
  try {
    const response = await axios.post(
      `${API_URL}/users/purchases`,
      { cardId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Purchase successful');
    return response.data;
  } catch (error) {
    console.error('❌ Purchase failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function verifyCard(token, cardDetails) {
  try {
    const response = await axios.post(
      `${API_URL}/cards/verification/verify`,
      {
        cardNumber: cardDetails.number,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        cvv: cardDetails.cvv
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Card verification completed');
    return response.data;
  } catch (error) {
    console.error('❌ Card verification failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testScenario1() {
  console.log('\n🧪 Testing Scenario 1: Successful Purchase Flow');
  console.log('=' .repeat(50));

  // Create test user
  const userData = await createTestUser(testUsers[0]);
  const token = userData.data?.token || userData.token;

  // Add balance
  await addBalance(token, 100);

  // Get available cards
  const cards = await getAvailableCards();
  if (cards.length === 0) {
    console.log('❌ No cards available for testing');
    return;
  }

  // Purchase first available card
  const cardToPurchase = cards[0];
  console.log(`🛒 Attempting to purchase ${cardToPurchase.type} card for $${cardToPurchase.price}`);
  
  const purchase = await purchaseCard(token, cardToPurchase.id);
  
  if (purchase) {
    console.log('✅ Scenario 1 PASSED: Purchase successful');
    
    // Test verification if purchase has card details
    if (purchase.data?.cardDetails) {
      console.log('🔍 Testing card verification...');
      await verifyCard(token, purchase.data.cardDetails);
    }
  } else {
    console.log('❌ Scenario 1 FAILED: Purchase failed');
  }
}

async function testScenario2() {
  console.log('\n🧪 Testing Scenario 2: Insufficient Funds');
  console.log('=' .repeat(50));

  // Create test user
  const userData = await createTestUser(testUsers[1]);
  const token = userData.data?.token || userData.token;

  // Add small balance (insufficient for most cards)
  await addBalance(token, 5);

  // Get available cards
  const cards = await getAvailableCards();
  if (cards.length === 0) {
    console.log('❌ No cards available for testing');
    return;
  }

  // Try to purchase expensive card
  const expensiveCard = cards.find(card => card.price > 10) || cards[0];
  console.log(`🛒 Attempting to purchase ${expensiveCard.type} card for $${expensiveCard.price} with insufficient funds`);
  
  const purchase = await purchaseCard(token, expensiveCard.id);
  
  if (!purchase) {
    console.log('✅ Scenario 2 PASSED: Purchase correctly failed due to insufficient funds');
  } else {
    console.log('❌ Scenario 2 FAILED: Purchase should have failed');
  }
}

async function testFilteringAndSearch() {
  console.log('\n🧪 Testing Filtering and Search');
  console.log('=' .repeat(50));

  try {
    // Test BIN search
    console.log('🔍 Testing BIN search...');
    const binResponse = await axios.get(`${API_URL}/cards/list?bin=491605`);
    console.log(`✅ BIN search returned ${binResponse.data.data.cards.length} cards`);

    // Test country filter
    console.log('🔍 Testing country filter...');
    const countryResponse = await axios.get(`${API_URL}/cards/list?country=Marshall`);
    console.log(`✅ Country search returned ${countryResponse.data.data.cards.length} cards`);

    // Test price range
    console.log('🔍 Testing price range...');
    const priceResponse = await axios.get(`${API_URL}/cards/list?minPrice=20&maxPrice=40`);
    console.log(`✅ Price range search returned ${priceResponse.data.data.cards.length} cards`);

    // Test ordering
    console.log('🔍 Testing price ordering...');
    const orderResponse = await axios.get(`${API_URL}/cards/list?ordering=price_asc`);
    console.log(`✅ Price ordering returned ${orderResponse.data.data.cards.length} cards`);

  } catch (error) {
    console.error('❌ Filtering test failed:', error.message);
  }
}

async function runAllTests() {
  try {
    // Connect to MongoDB for direct database operations
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crackjesus');
    console.log('Connected to MongoDB');

    console.log('🚀 Starting Transaction Flow Tests');
    console.log('=' .repeat(50));

    await testScenario1();
    await testScenario2(); 
    await testFilteringAndSearch();

    console.log('\n🎉 All tests completed!');
    console.log('\nTest Summary:');
    console.log('- Successful purchase flow tested');
    console.log('- Insufficient funds handling tested');  
    console.log('- Card filtering and search tested');
    console.log('\nYou can now:');
    console.log('1. Check your database for the test data');
    console.log('2. Login to the frontend with test users');
    console.log('3. Manually test the UI flows');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run all tests
runAllTests();
