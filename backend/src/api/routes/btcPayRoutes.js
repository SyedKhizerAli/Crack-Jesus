const express = require('express');
const router = express.Router();
const BTCPayController = require('../controllers/BTCPay/BTCPayController');
const authMiddleware = require('../middlewares/authMiddleware');
const BTCPayWebhookController = require('../controllers/BTCPay/BTCPayWebhookController');

// BTCPay store setup and management
router.post('/store/setup', 
    authMiddleware(['vendor']), 
    BTCPayController.setupBTCPayStore
);

router.get('/store/status', 
    authMiddleware(['vendor']), 
    BTCPayController.getBTCPayStatus
);

router.get('/store/webhook/verify', 
    authMiddleware(['vendor']), 
    BTCPayController.verifyWebhook
);

// Pull payment webhook route
router.post('/webhook/pull-payment',
    express.raw({ type: 'application/json' }),
    BTCPayWebhookController.handlePullPaymentWebhook
);

module.exports = router;
