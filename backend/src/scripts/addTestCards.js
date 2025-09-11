const mongoose = require('mongoose');
const CreditCard = require('../models/creditCard');
const User = require('../models/user');
require('dotenv').config();

const testCards = [
  {
    issuer: "VISA",
    cardNumber: "4916055618877616",
    expiryMonth: "11",
    expiryYear: "2025",
    cvv: 887,
    name: "Wendell Pollich",
    address: "48346 Maybelle Inlet",
    country: "Marshall Islands",
    zipcode: "47846-9520"
  },
  {
    issuer: "MasterCard",
    cardNumber: "2221398553715886",
    expiryMonth: "11", 
    expiryYear: "2025",
    cvv: 344,
    name: "Perry Murray",
    address: "8244 Raleigh Pines",
    country: "Liberia",
    zipcode: "03913"
  },
  {
    issuer: "MasterCard",
    cardNumber: "5556773303626229",
    expiryMonth: "10",
    expiryYear: "2025", 
    cvv: 544,
    name: "Augusta Hettinger",
    address: "8353 Koelpin Stravenue",
    country: "Nauru",
    zipcode: "09620"
  }
];

async function addTestCards() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crackjesus');
    console.log('Connected to MongoDB');

    // Find a vendor to assign cards to (or create a test vendor)
    let vendor = await User.findOne({ role: 'vendor' });
    
    if (!vendor) {
      // Create a test vendor if none exists
      vendor = new User({
        username: 'test_vendor',
        email: 'vendor@test.com',
        password: 'hashedpassword',
        role: 'vendor',
        wallet: {
          btcBalance: 0,
          pendingBalance: 0
        }
      });
      await vendor.save();
      console.log('Created test vendor:', vendor.username);
    }

    console.log('Using vendor:', vendor.username);

    // Add each test card
    for (let i = 0; i < testCards.length; i++) {
      const cardData = testCards[i];
      
      // Extract BIN (first 6 digits) from card number
      const bin = cardData.cardNumber.substring(0, 6);
      
      // Map issuer to type
      const type = cardData.issuer === 'VISA' ? 'Visa' : 'Mastercard';
      
      const card = new CreditCard({
        cardDetails: {
          number: cardData.cardNumber,
          bin: bin,
          holderName: cardData.name,
          expiryMonth: parseInt(cardData.expiryMonth),
          expiryYear: parseInt(cardData.expiryYear),
          cvv: cardData.cvv.toString(),
          type: type,
          cardType: 'credit'
        },
        address: {
          country: cardData.country,
          state: '',
          city: '',
          zip: cardData.zipcode
        },
        bank: cardData.issuer === 'VISA' ? 'Visa Bank' : 'MasterCard Bank',
        base: 'Test Collection',
        additionalInfo: `Test card #${i + 1} - ${cardData.issuer}`,
        note: `Generated for testing transaction flows`,
        price: Math.floor(Math.random() * 50) + 10, // Random price between $10-60
        status: 'available',
        vendorId: vendor._id,
        listedBy: 'admin'
      });

      await card.save();
      console.log(`✅ Added ${type} card ending in ${cardData.cardNumber.slice(-4)} - $${card.price}`);
    }

    console.log('\n🎉 All test cards added successfully!');
    console.log('\nYou can now test transaction flows with these cards:');
    console.log('1. Login as a user');
    console.log('2. Add balance to your wallet');
    console.log('3. Browse and purchase these test cards');
    console.log('4. Test card verification flows');

  } catch (error) {
    console.error('Error adding test cards:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addTestCards();
 