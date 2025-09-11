const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/payment/webhookController');
const walletPaymentController = require('../controllers/payment/walletPaymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// Wallet payment routes
router.post('/wallet/pay', 
    authMiddleware(['user']),
    body('cardId').isMongoId(),
    walletPaymentController.createWalletPayment
);

router.get('/wallet/:saleId/status',
    authMiddleware(['user']),
    walletPaymentController.getPaymentStatus
);

// Webhook routes (no auth required)
router.post('/webhook/deposit', 
    express.raw({ type: 'application/json' }), 
    webhookController.handleDepositWebhook
);

router.post('/webhook/payment',
    express.raw({ type: 'application/json' }),
    webhookController.handlePaymentWebhook
);

module.exports = router; 