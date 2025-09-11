const User = require('../../../models/user');
const Admin = require('../../../models/admin');
const axios = require('axios');

// Create deposit invoice in central store
exports.createDeposit = async (req, res) => {
    try {
        const { btcAmount } = req.body;
        const userId = req.user.id;

        console.log('Received btcAmount:', btcAmount, 'Type:', typeof btcAmount);

        const amount = parseFloat(btcAmount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                message: "Valid BTC amount required" 
            });
        }

        // Get admin's central store details
        const admin = await Admin.findOne();
        if (!admin?.btcPaySettings?.centralStore) {
            return res.status(400).json({ 
                message: "Payment system not configured" 
            });
        }

        // Create invoice in central store
        const invoiceData = {
            amount: btcAmount,
            currency: "BTC",
            metadata: {
                userId,
                type: 'deposit'
            },
            redirectURL: `${process.env.APP_URL}/wallet/deposit/success`,
            cancelURL: `${process.env.APP_URL}/wallet/deposit/cancel`
        };

        const response = await axios.post(
            `${process.env.BTCPAY_URL}/api/v1/stores/${admin.btcPaySettings.centralStore.storeId}/invoices`,
            invoiceData,
            {
                headers: {
                    'Authorization': `token ${admin.btcPaySettings.centralStore.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Add pending transaction to user wallet
        await User.findByIdAndUpdate(userId, {
            $push: {
                'wallet.transactions': {
                    type: 'deposit',
                    amount: btcAmount,
                    status: 'pending',
                    btcPayInvoiceId: response.data.id
                }
            }
        });

        res.status(200).json({
            message: "Deposit initiated",
            checkoutUrl: response.data.checkoutLink,
            invoiceId: response.data.id
        });

    } catch (error) {
        console.error("Create Deposit Error:", error);
        res.status(500).json({ 
            message: "Failed to create deposit", 
            error: error.message 
        });
    }
};

// Get wallet details
exports.getWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user?.wallet) {
            return res.status(404).json({ 
                message: "Wallet not found" 
            });
        }

        res.status(200).json({
            balance: user.wallet.btcBalance,
            transactions: user.wallet.transactions
        });

    } catch (error) {
        console.error("Get Wallet Error:", error);
        res.status(500).json({ 
            message: "Failed to get wallet details", 
            error: error.message 
        });
    }
};

// Get wallet balance (NEW)
exports.getBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .select('wallet.btcBalance');

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Wallet balance retrieved successfully",
            data: {
                balance: user.wallet.btcBalance
            }
        });

    } catch (error) {
        console.error("Get Balance Error:", error);
        res.status(500).json({
            message: "Failed to retrieve balance",
            error: error.message
        });
    }
};

// Get transactions (UPDATED version of getWalletTransactions)
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, type } = req.query;

        const user = await User.findById(userId)
            .select('wallet.transactions')
            .populate({
                path: 'wallet.transactions.saleId',
                select: 'cardId vendorId',
                populate: [
                    { path: 'cardId', select: 'cardDetails.type' },
                    { path: 'vendorId', select: 'username' }
                ]
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        let transactions = user.wallet.transactions;

        // Filter by type if specified
        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

        // Sort by date descending
        transactions.sort((a, b) => b.createdAt - a.createdAt);

        // Apply pagination
        const paginatedTransactions = transactions.slice(
            (page - 1) * limit,
            page * limit
        );

        res.status(200).json({
            message: "Transactions retrieved successfully",
            data: {
                transactions: paginatedTransactions.map(t => ({
                    id: t._id,
                    type: t.type,
                    amount: t.amount,
                    status: t.status,
                    createdAt: t.createdAt,
                    completedAt: t.completedAt,
                    sale: t.saleId ? {
                        cardType: t.saleId.cardId?.cardDetails.type,
                        vendor: t.saleId.vendorId?.username
                    } : null
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(transactions.length / limit),
                    totalItems: transactions.length
                }
            }
        });

    } catch (error) {
        console.error("Get Transactions Error:", error);
        res.status(500).json({
            message: "Failed to retrieve transactions",
            error: error.message
        });
    }
};

// Get deposit status
exports.getDepositStatus = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.id;

        // Find user's transaction with this invoice ID
        const user = await User.findOne({
            _id: userId,
            'wallet.transactions.btcPayInvoiceId': invoiceId
        });

        if (!user) {
            return res.status(404).json({
                message: "Deposit not found"
            });
        }

        const transaction = user.wallet.transactions.find(
            t => t.btcPayInvoiceId === invoiceId
        );

        res.status(200).json({
            message: "Deposit status retrieved",
            data: {
                status: transaction.status,
                amount: transaction.amount,
                createdAt: transaction.createdAt,
                completedAt: transaction.completedAt
            }
        });

    } catch (error) {
        console.error("Get Deposit Status Error:", error);
        res.status(500).json({
            message: "Failed to get deposit status",
            error: error.message
        });
    }
};

// Consolidated deposit/top-up function with environment-based testing
exports.topUp = async (req, res) => {
    try {
        const btcAmount = req.body.btcAmount;
        const userId = req.user.id;

        console.log('Received btcAmount:', btcAmount, 'Type:', typeof btcAmount);

        const amount = parseFloat(btcAmount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                message: "Valid BTC amount required" 
            });
        }

        // DEVELOPMENT MODE: Skip actual BTCPay API call
        if (process.env.NODE_ENV === 'development' && process.env.MOCK_PAYMENTS === 'true') {
            // Generate a fake invoice ID
            const fakeInvoiceId = 'TEST-' + Date.now();
            
            // Add pending transaction to user's wallet
            const user = await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        'wallet.transactions': {
                            type: 'deposit',
                            amount: btcAmount,
                            status: 'pending',
                            btcPayInvoiceId: fakeInvoiceId,
                            createdAt: new Date(),
                            isTest: true
                        }
                    }
                },
                { new: true }
            );

            // For testing: Auto-complete the transaction after 5 seconds
            if (process.env.AUTO_COMPLETE_TEST_PAYMENTS === 'true') {
                setTimeout(async () => {
                    try {
                        await User.updateOne(
                            { 
                                _id: userId,
                                'wallet.transactions.btcPayInvoiceId': fakeInvoiceId
                            },
                            {
                                $set: {
                                    'wallet.transactions.$.status': 'completed',
                                    'wallet.transactions.$.completedAt': new Date()
                                },
                                $inc: {
                                    'wallet.btcBalance': btcAmount
                                }
                            }
                        );
                        console.log(`Auto-completed test payment ${fakeInvoiceId}`);
                    } catch (error) {
                        console.error('Auto-complete payment error:', error);
                    }
                }, 5000);
            }

            // Return fake checkout data
            return res.status(200).json({
                message: "Test deposit initiated",
                checkoutUrl: `http://localhost:3000/test-checkout?id=${fakeInvoiceId}`,
                invoiceId: fakeInvoiceId,
                testMode: true,
                autoComplete: process.env.AUTO_COMPLETE_TEST_PAYMENTS === 'true'
            });
        }

        // PRODUCTION MODE: Real BTCPay integration
        // Get admin's central store details
        const admin = await Admin.findOne();
        if (!admin?.btcPaySettings?.centralStore) {
            return res.status(400).json({ 
                message: "Payment system not configured" 
            });
        }

        // Create invoice in central store
        const invoiceData = {
            amount: btcAmount,
            currency: "BTC",
            metadata: {
                userId,
                type: 'deposit'
            },
            redirectURL: `${process.env.APP_URL}/wallet/deposit/success`,
            cancelURL: `${process.env.APP_URL}/wallet/deposit/cancel`
        };

        const response = await axios.post(
            `${process.env.BTCPAY_URL}/api/v1/stores/${admin.btcPaySettings.centralStore.storeId}/invoices`,
            invoiceData,
            {
                headers: {
                    'Authorization': `token ${admin.btcPaySettings.centralStore.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Add pending transaction to user's wallet
        await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    'wallet.transactions': {
                        type: 'deposit',
                        amount: btcAmount,
                        status: 'pending',
                        btcPayInvoiceId: response.data.id,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        );

        res.status(200).json({
            message: "Deposit initiated",
            checkoutUrl: response.data.checkoutLink,
            invoiceId: response.data.id
        });

    } catch (error) {
        console.error("Deposit Error:", error);
        res.status(500).json({ 
            message: "Failed to create deposit", 
            error: error.message 
        });
    }
};

// Withdraw (for vendors only)
exports.withdraw = async (req, res) => {
    // ... existing withdraw implementation ...
}; 