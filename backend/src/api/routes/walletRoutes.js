const express = require('express');
const router = express.Router();
const walletController = require('../controllers/user/walletController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// All routes require authentication
router.use(authMiddleware(['user']));

// Create deposit
router.post('/deposit', [
    body('btcAmount').isFloat({ min: 0.00001 }).withMessage('Valid BTC amount required')
], walletController.topUp);

// Get deposit status
router.get('/deposit/:invoiceId/status', walletController.getDepositStatus);

// Get wallet details
router.get('/', walletController.getWallet);

// Get wallet balance
router.get('/balance', walletController.getBalance);

// Get transactions
router.get('/transactions', walletController.getTransactions);

module.exports = router; 