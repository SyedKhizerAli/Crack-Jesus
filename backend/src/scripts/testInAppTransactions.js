const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://salirazahussnain:4sKgKu90TulBmQVV@cluster0.vaq2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Test users for transaction flows
const testUsers = {
  buyer1: { username: 'buyer1', email: 'buyer1@test.com', password: 'test123456' },
  buyer2: { username: 'buyer2', email: 'buyer2@test.com', password: 'test123456' },
  vendor1: { username: 'vendor1', email: 'vendor1@test.com', password: 'test123456' },
  system: { username: 'system_account', email: 'system@crackjesus.com', password: 'system123456' }
};

let tokens = {};
let userIds = {};
let testCardId = null;

// Helper functions
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

async function directDBOperation(operation) {
  await mongoose.connect(MONGODB_URI);
  const result = await operation(mongoose.connection.db);
  return result;
}

async function logBalances(title) {
  console.log(`\n💰 ${title}`);
  console.log('='.repeat(50));
  
  const balances = await directDBOperation(async (db) => {
    const users = await db.collection('users').find({
      email: { $in: Object.values(testUsers).map(u => u.email) }
    }).toArray();
    
    return users.map(user => ({
      username: user.username,
      email: user.email,
      balance: user.wallet?.btcBalance || 0
    }));
  });
  
  let totalBalance = 0;
  balances.forEach(user => {
    console.log(`${user.username}: $${user.balance}`);
    totalBalance += user.balance;
  });
  console.log(`TOTAL SYSTEM BALANCE: $${totalBalance}`);
  
  return { balances, totalBalance };
}

async function setupTestUsers() {
  console.log('\n👥 SETTING UP TEST USERS');
  console.log('='.repeat(50));
  
  for (const [key, userData] of Object.entries(testUsers)) {
    // Create user
    const signup = await makeRequest('POST', '/api/users/signup', userData);
    
    if (signup.success) {
      console.log(`✅ Created user: ${userData.username}`);
      
      // Login to get token
      const login = await makeRequest('POST', '/api/users/login', {
        email: userData.email,
        password: userData.password
      });
      
      if (login.success) {
        tokens[key] = login.data.data.accessToken;
        userIds[key] = login.data.data.user.id;
        console.log(`✅ Logged in: ${userData.username}`);
      }
    } else {
      // User might already exist, try to login
      const login = await makeRequest('POST', '/api/users/login', {
        email: userData.email,
        password: userData.password
      });
      
      if (login.success) {
        tokens[key] = login.data.data.accessToken;
        userIds[key] = login.data.data.user.id;
        console.log(`✅ Existing user logged in: ${userData.username}`);
      }
    }
  }
}

async function fundTestWallets() {
  console.log('\n💵 FUNDING TEST WALLETS');
  console.log('='.repeat(50));
  
  // Fund wallets directly in database
  await directDBOperation(async (db) => {
    for (const [key, userData] of Object.entries(testUsers)) {
      const fundAmount = key === 'buyer1' ? 200 : key === 'buyer2' ? 150 : 50;
      
      await db.collection('users').updateOne(
        { email: userData.email },
        { $set: { 'wallet.btcBalance': fundAmount } }
      );
      
      console.log(`✅ Funded ${userData.username}: $${fundAmount}`);
    }
  });
  
  await logBalances('INITIAL WALLET BALANCES');
}

async function createTestCard() {
  console.log('\n🎴 CREATING TEST CARD FOR PURCHASE');
  console.log('='.repeat(50));
  
  // Create a test card directly in database
  const cardData = await directDBOperation(async (db) => {
    // Find vendor1's vendor record
    const vendor = await db.collection('vendors').findOne({ email: testUsers.vendor1.email });
    if (!vendor) {
      console.log('❌ Vendor1 not found, creating vendor record...');
      // Create vendor signup would be needed here
      return null;
    }
    
    const card = {
      cardDetails: {
        number: '4000000000000001',
        bin: '400000',
        holderName: 'Test Purchase Card',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
        type: 'Visa',
        cardType: 'credit'
      },
      address: {
        country: 'US',
        state: 'CA',
        city: 'Test City',
        zip: '12345'
      },
      bank: 'Test Bank',
      base: 'Transaction Test',
      additionalInfo: 'Card for testing internal transactions',
      note: 'Test transaction flow card',
      price: 75, // Test price
      status: 'available',
      vendorId: vendor._id,
      listedBy: 'vendor',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('creditcards').insertOne(card);
    console.log(`✅ Created test card: $${card.price}`);
    return result.insertedId;
  });
  
  testCardId = cardData;
  return cardData;
}

async function testCardPurchaseFlow() {
  console.log('\n🛒 TESTING CARD PURCHASE TRANSACTION FLOW');
  console.log('='.repeat(50));
  
  if (!testCardId) {
    console.log('❌ No test card available');
    return;
  }
  
  // Record balances before purchase
  const beforePurchase = await logBalances('BEFORE PURCHASE');
  
  // Buyer1 purchases the card
  console.log('\n🔄 Attempting card purchase...');
  const purchase = await makeRequest('POST', '/api/users/cards/buy', 
    { cardId: testCardId.toString() }, 
    tokens.buyer1
  );
  
  if (purchase.success) {
    console.log('✅ Purchase initiated successfully');
    console.log('   Sale ID:', purchase.data.data?.saleId);
    console.log('   Amount:', purchase.data.data?.amount);
    console.log('   Status:', purchase.data.data?.status);
    
    // Check balances after purchase
    setTimeout(async () => {
      const afterPurchase = await logBalances('AFTER PURCHASE');
      
      // Check if money moved correctly
      const buyer1Before = beforePurchase.balances.find(u => u.username === 'buyer1').balance;
      const buyer1After = afterPurchase.balances.find(u => u.username === 'buyer1').balance;
      const difference = buyer1Before - buyer1After;
      
      console.log(`\n📊 TRANSACTION ANALYSIS:`);
      console.log(`   Buyer1 balance change: $${buyer1Before} → $${buyer1After} (Difference: -$${difference})`);
      console.log(`   Expected deduction: $75`);
      console.log(`   Transaction ${difference === 75 ? 'SUCCESSFUL' : 'INCOMPLETE/FAILED'}`);
      
      // Check sale record
      await checkSaleRecord(purchase.data.data?.saleId);
      
    }, 2000); // Wait 2 seconds for transaction to process
    
  } else {
    console.log('❌ Purchase failed');
    console.log('   Error:', purchase.error.message || purchase.error);
    
    // Check if it's the transaction number error
    if (purchase.error.message && purchase.error.message.includes('transaction number')) {
      console.log('   This is a MongoDB transaction concurrency error');
      console.log('   Checking if balance was rolled back...');
      
      setTimeout(async () => {
        await logBalances('AFTER FAILED PURCHASE (checking rollback)');
      }, 1000);
    }
  }
}

async function checkSaleRecord(saleId) {
  if (!saleId) return;
  
  console.log('\n📋 CHECKING SALE RECORD');
  console.log('='.repeat(30));
  
  const saleRecord = await directDBOperation(async (db) => {
    const sale = await db.collection('sales').findOne({ 
      _id: new mongoose.Types.ObjectId(saleId) 
    });
    return sale;
  });
  
  if (saleRecord) {
    console.log('✅ Sale record found:');
    console.log('   Sale ID:', saleRecord._id);
    console.log('   Amount:', saleRecord.btcAmount);
    console.log('   Status:', saleRecord.status);
    console.log('   Payment Source:', saleRecord.paymentSource);
    console.log('   Forwarding Status:', saleRecord.forwardingStatus);
    console.log('   Created:', saleRecord.createdAt);
  } else {
    console.log('❌ Sale record not found');
  }
}

async function testWalletToWalletTransfer() {
  console.log('\n🔄 TESTING WALLET-TO-WALLET TRANSFER');
  console.log('='.repeat(50));
  
  // This would test direct wallet transfers if implemented
  console.log('💡 Direct wallet-to-wallet transfers would test:');
  console.log('   1. Send money from buyer1 to buyer2');
  console.log('   2. Verify atomic transaction');
  console.log('   3. Check both balances update correctly');
  console.log('   4. Ensure no money is lost in the system');
  
  // For now, let's simulate with database operations
  const beforeTransfer = await logBalances('BEFORE WALLET TRANSFER');
  
  await directDBOperation(async (db) => {
    const transferAmount = 25;
    
    // Simulate transfer from buyer1 to buyer2
    await db.collection('users').updateOne(
      { email: testUsers.buyer1.email },
      { $inc: { 'wallet.btcBalance': -transferAmount } }
    );
    
    await db.collection('users').updateOne(
      { email: testUsers.buyer2.email },
      { $inc: { 'wallet.btcBalance': transferAmount } }
    );
    
    console.log(`✅ Simulated transfer: $${transferAmount} from buyer1 to buyer2`);
  });
  
  const afterTransfer = await logBalances('AFTER WALLET TRANSFER');
  
  // Verify conservation of money
  const totalBefore = beforeTransfer.totalBalance;
  const totalAfter = afterTransfer.totalBalance;
  
  console.log(`\n🔍 CONSERVATION CHECK:`);
  console.log(`   Total before: $${totalBefore}`);
  console.log(`   Total after: $${totalAfter}`);
  console.log(`   Conservation: ${totalBefore === totalAfter ? '✅ PASSED' : '❌ FAILED'}`);
}

async function testVendorCommissionFlow() {
  console.log('\n💼 TESTING VENDOR COMMISSION FLOW');
  console.log('='.repeat(50));
  
  console.log('🔄 Testing commission distribution...');
  
  // Check if vendor receives money from sales
  const vendorBalanceCheck = await directDBOperation(async (db) => {
    const vendor = await db.collection('users').findOne({ email: testUsers.vendor1.email });
    return vendor?.wallet?.btcBalance || 0;
  });
  
  console.log(`   Vendor1 current balance: $${vendorBalanceCheck}`);
  
  // Check pending sales for this vendor
  const pendingSales = await directDBOperation(async (db) => {
    const vendor = await db.collection('vendors').findOne({ email: testUsers.vendor1.email });
    if (!vendor) return [];
    
    const sales = await db.collection('sales').find({
      vendorId: vendor._id,
      status: 'pending'
    }).toArray();
    
    return sales;
  });
  
  console.log(`   Pending sales for vendor: ${pendingSales.length}`);
  
  if (pendingSales.length > 0) {
    console.log('   📋 Pending sales details:');
    pendingSales.forEach((sale, index) => {
      console.log(`      ${index + 1}. Amount: $${sale.btcAmount}, Status: ${sale.status}, Forwarding: ${sale.forwardingStatus}`);
    });
  }
}

async function testFullTransactionFlow() {
  console.log('🚀 STARTING COMPREHENSIVE IN-APP TRANSACTION TESTING');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Setup
    await setupTestUsers();
    await fundTestWallets();
    
    // Step 2: Create test card
    await createTestCard();
    
    // Step 3: Test card purchase flow
    await testCardPurchaseFlow();
    
    // Wait for any async operations
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Test wallet transfers
    await testWalletToWalletTransfer();
    
    // Step 5: Test vendor commission
    await testVendorCommissionFlow();
    
    // Final balance check
    await logBalances('FINAL SYSTEM BALANCES');
    
    console.log('\n🎉 IN-APP TRANSACTION TESTING COMPLETED');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Transaction testing failed:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// Export functions for individual testing
module.exports = {
  testFullTransactionFlow,
  setupTestUsers,
  fundTestWallets,
  testCardPurchaseFlow,
  testWalletToWalletTransfer,
  logBalances,
  makeRequest
};

// Run if called directly
if (require.main === module) {
  testFullTransactionFlow();
} 