const mongoose = require('mongoose');

async function createVendorRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking for vendor1 user and vendor record...');
    
    // Find the vendor1 user
    const user = await db.collection('users').findOne({ email: 'vendor1@test.com' });
    console.log('User found:', user ? 'YES' : 'NO');
    
    if (user) {
      // Check if vendor record exists
      const vendor = await db.collection('vendors').findOne({ email: 'vendor1@test.com' });
      console.log('Vendor record exists:', vendor ? 'YES' : 'NO');
      
      if (!vendor) {
        // Create vendor record
        const vendorRecord = {
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          role: 'vendor',
          wallet: { btcBalance: 50, status: 'active', transactions: [] },
          btcPayStore: { verified: false },
          verification: { status: 'pending' },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await db.collection('vendors').insertOne(vendorRecord);
        console.log('✅ Created vendor record:', result.insertedId);
      } else {
        console.log('✅ Vendor record already exists');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

createVendorRecord(); 