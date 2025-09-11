const PaymentForwardingService = require('../../../services/PaymentForwardingService');
const BTCPayService = require('../../../services/BTCPayService');
const BalanceService = require('../../../services/BalanceService');

class BTCPayWebhookController {
    // ... existing webhook methods ...

    /**
     * Handle pull payment webhooks from BTCPay
     */
    static async handlePullPaymentWebhook(req, res) {
        try {
            // Verify webhook signature
            if (!BTCPayService.verifyWebhookSignature(req)) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid webhook signature"
                });
            }

            const { pullPaymentId, status, metadata } = req.body;
            
            // Handle different pull payment statuses
            switch (status) {
                case 'completed':
                case 'failed':
                    await PaymentForwardingService.handleForwardedPayment({
                        pullPaymentId,
                        status,
                        metadata
                    });
                    break;
                    
                case 'processing':
                    // Update sale status to reflect processing state
                    await PaymentForwardingService.handleForwardedPayment({
                        pullPaymentId,
                        status: 'processing',
                        metadata
                    });
                    break;
                    
                default:
                    console.warn(`Unhandled pull payment status: ${status}`);
            }

            res.status(200).json({
                success: true,
                message: "Pull payment webhook processed successfully"
            });

        } catch (error) {
            console.error("Pull Payment Webhook Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to process pull payment webhook",
                error: error.message
            });
        }
    }
}

module.exports = BTCPayWebhookController; 