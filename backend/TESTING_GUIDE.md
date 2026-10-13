# BTCPayServer Testnet Testing Guide

This guide will help you set up and test the BTCPayServer integration using the testnet environment.

## 🚀 Quick Start

### 1. Environment Setup

Run the setup script to create the necessary environment variables:

```bash
./setup-env.sh
```

This will create a `.env` file with the following configuration:

```env
# BTCPayServer Testnet Configuration
BTCPAY_URL=https://testnet.demo.btcpayserver.org
BTCPAY_API_KEY=your_btcpay_api_key_here
BTCPAY_STORE_ID=your_test_store_id_here
```

### 2. Update Store ID

You need to replace `your_test_store_id_here` in the `.env` file with your actual BTCPayServer store ID.

To find your store ID:
1. Go to https://testnet.demo.btcpayserver.org
2. Log in to your account
3. Navigate to your store
4. The store ID will be in the URL or store settings

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Tests

#### Test BTCPayServer Connection
```bash
npm run test-btcpay
```

This will:
- Test the connection to BTCPayServer
- Verify store credentials
- Create a test invoice
- Set up webhooks
- Configure admin settings

#### Test Payment Flows
```bash
npm run test-payments
```

This will:
- Create test users (buyer and vendor)
- Create test cards
- Test card purchase flow
- Test wallet transfers
- Test vendor payments

#### Run All Tests
```bash
npm run setup-testnet
```

### 5. Start the Server

```bash
npm start
```

The server will start on port 3001.

## 🔧 Manual Testing

### Test BTCPayServer API Directly

You can test the BTCPayServer API directly using curl:

```bash
# Test store verification
curl -X GET "https://testnet.demo.btcpayserver.org/api/v1/stores/YOUR_STORE_ID" \
  -H "Authorization: token YOUR_BTCPAY_API_KEY"

# Create a test invoice
curl -X POST "https://testnet.demo.btcpayserver.org/api/v1/stores/YOUR_STORE_ID/invoices" \
  -H "Authorization: token YOUR_BTCPAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.001,
    "currency": "BTC",
    "metadata": {
      "test": true,
      "description": "Test invoice"
    }
  }'
```

### Test Application APIs

Once the server is running, you can test the application APIs:

```bash
# Create a test user
curl -X POST "http://localhost:3001/api/users/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST "http://localhost:3001/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Use the returned token for authenticated requests
TOKEN="your_jwt_token_here"

# Get user wallet
curl -X GET "http://localhost:3001/api/wallet/balance" \
  -H "Authorization: Bearer $TOKEN"
```

## 🧪 Test Scenarios

### 1. Card Purchase Flow

1. **Setup**: Create a vendor with BTCPayServer integration
2. **Add Card**: Vendor adds a card to the marketplace
3. **Purchase**: User purchases the card
4. **Payment**: BTCPayServer processes the payment
5. **Completion**: Card is transferred to user, vendor receives payment

### 2. Wallet Deposit Flow

1. **Create Invoice**: User requests to deposit funds
2. **BTCPay Invoice**: System creates BTCPayServer invoice
3. **Payment**: User pays via BTCPayServer
4. **Webhook**: BTCPayServer notifies system of payment
5. **Credit**: User's wallet is credited

### 3. Vendor Payment Flow

1. **Sale**: Card is sold
2. **Commission**: System calculates vendor commission
3. **Invoice**: BTCPayServer invoice created for vendor
4. **Payment**: Vendor receives payment via BTCPayServer

## 🔍 Troubleshooting

### Common Issues

1. **Store Verification Failed**
   - Check if the store ID is correct
   - Verify the API key has proper permissions
   - Ensure the store exists in BTCPayServer

2. **Webhook Setup Failed**
   - Check if the webhook URL is accessible
   - Verify the webhook secret is properly configured
   - Ensure the server is running and accessible

3. **Invoice Creation Failed**
   - Check the amount format (should be in BTC)
   - Verify the metadata format
   - Ensure the store is active

4. **Payment Processing Issues**
   - Check if the invoice is still valid (not expired)
   - Verify the payment amount matches the invoice
   - Check webhook delivery status

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=btcpay:*
```

### Logs

Check the server logs for detailed error information:

```bash
npm start 2>&1 | tee server.log
```

## 📊 Test Data

The test scripts create the following test data:

- **Test Buyer**: testbuyer@test.com (1 BTC balance)
- **Test Vendor**: testvendor@test.com (BTCPayServer integrated)
- **Test Card**: Visa card with 0.1 BTC price

## 🔐 Security Notes

- The testnet environment uses test Bitcoin (no real value)
- Never commit real API keys or secrets to source control; use environment variables and a secrets manager
- All transactions are simulated
- No real financial data is processed

## 📚 Additional Resources

- [BTCPayServer Documentation](https://docs.btcpayserver.org/)
- [BTCPayServer API Reference](https://docs.btcpayserver.org/API/Greenfield/v1/)
- [Testnet Bitcoin Faucet](https://testnet-faucet.mempool.co/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the server logs for error details
3. Verify your BTCPayServer configuration
4. Test the BTCPayServer API directly
5. Check the test scripts for expected behavior

