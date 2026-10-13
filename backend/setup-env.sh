#!/bin/bash

# Setup environment variables for BTCPayServer testnet testing

echo "🔧 Setting up environment for BTCPayServer testnet testing..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.vaq2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Server Configuration
PORT=3001
NODE_ENV=development

# BTCPayServer Testnet Configuration
BTCPAY_URL=https://testnet.demo.btcpayserver.org
BTCPAY_API_KEY=your_btcpay_api_key_here
BTCPAY_STORE_ID=your_test_store_id_here

# Application Configuration
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
APP_NAME=CrackJesus

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_here

# Card Verification Service (LuxChecker)
LUXCHECKER_API_KEY=your_luxchecker_api_key_here
LUXCHECKER_URL=https://api.luxchecker.vc
EOF
    echo "✅ .env file created successfully!"
else
    echo "⚠️  .env file already exists. Please update it manually with the BTCPayServer configuration."
fi

echo ""
echo "📋 Next steps:"
echo "1. Update BTCPAY_STORE_ID in .env with your actual store ID"
echo "2. Run: npm run test-btcpay"
echo "3. Run: npm run test-payments"
echo "4. Start the server: npm start"
echo ""
echo "🔗 BTCPayServer Testnet URL: https://testnet.demo.btcpayserver.org"
echo "🔑 API Key: see .env (never print real secrets)"

