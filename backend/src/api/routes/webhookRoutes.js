const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const btcPayWebhook = require('../webhooks/btcPayWebhook');
const BTCPayService = require('../services/BTCPayService');

// No auth middleware for webhooks
router.post('/payment-forward', 
    express.raw({ type: 'application/json' }), // Required for signature verification
    webhookController.handlePaymentForwardWebhook
);

router.post('/btcpay/pull-payment', async (req, res) => {
    try {
        // Verify webhook signature
        if (!BTCPayService.verifyWebhookSignature(req)) {
            return res.status(401).json({ message: "Invalid signature" });
        }

        await btcPayWebhook.handlePullPaymentWebhook(req.body);
        res.status(200).json({ message: "Webhook processed" });

    } catch (error) {
        console.error("Pull Payment Webhook Route Error:", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
});

router.post('/btcpay/invoice', 
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        try {
            // Verify webhook signature
            if (!BTCPayService.verifyWebhookSignature(req)) {
                return res.status(401).json({ message: "Invalid signature" });
            }

            await btcPayWebhook.handleInvoiceWebhook(req, res);
        } catch (error) {
            console.error("Invoice Webhook Route Error:", error);
            res.status(500).json({ message: "Webhook processing failed" });
        }
    }
);

module.exports = router; 