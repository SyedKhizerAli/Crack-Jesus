const Sale = require('../../models/sale');
const BTCPayService = require('../../services/BTCPayService');
const Vendor = require('../../models/vendor');

exports.handlePaymentForwardWebhook = async (req, res) => {
    try {
        // Verify webhook signature
        if (!BTCPayService.verifyWebhookSignature(req)) {
            return res.status(401).json({ message: "Invalid signature" });
        }

        const { invoiceId, status } = req.body;
        const metadata = req.body.metadata || {};
        const { saleId, recipientType, recipientId } = metadata;

        // Find the sale
        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        // Handle payment status
        switch (status) {
            case 'confirmed':
            case 'complete':
                // Update forwarding status
                sale.forwardingStatus = 'completed';
                sale.forwardingCompletedAt = new Date();
                
                // Record forwarding transaction
                if (recipientType === 'vendor') {
                    await Vendor.findByIdAndUpdate(recipientId, {
                        $inc: { 'statistics.totalEarnings': sale.btcAmount }
                    });
                }
                
                await sale.save();
                break;

            case 'invalid':
            case 'expired':
                sale.forwardingStatus = 'failed';
                sale.failureReason = `Forwarding ${status}`;
                await sale.save();
                break;
        }

        res.status(200).json({ message: "Webhook processed" });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
}; 