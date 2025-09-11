const BTCPayService = require('./BTCPayService');

class BalanceService {
    static async checkCentralStoreBalance(requiredAmount) {
        try {
            const balance = await BTCPayService.getCentralStoreBalance();
            
            if (!balance || balance.confirmedBalance < requiredAmount) {
                throw new Error("Insufficient central store balance");
            }

            return {
                sufficient: true,
                balance: balance.confirmedBalance
            };

        } catch (error) {
            console.error("Balance Check Error:", error);
            throw new Error(`Failed to check balance: ${error.message}`);
        }
    }

    // Add to PaymentForwardingService
    static async forwardPaymentWithBalanceCheck({ saleId, recipientId, recipientType, amount, cardId }) {
        try {
            // Check balance first
            await BalanceService.checkCentralStoreBalance(amount);
            
            // Proceed with payment forwarding
            return await PaymentForwardingService.forwardPayment({
                saleId,
                recipientId,
                recipientType,
                amount,
                cardId
            });

        } catch (error) {
            console.error("Payment Forwarding Balance Check Error:", error);
            throw new Error(`Failed to forward payment: ${error.message}`);
        }
    }
}

module.exports = BalanceService; 