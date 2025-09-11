const Vendor = require('../../models/vendor');

const vendorVerificationMiddleware = (requiredVerifications = []) => {
    return async (req, res, next) => {
        try {
            const vendorId = req.user.id;
            const vendor = await Vendor.findOne({ userId: vendorId });

            if (!vendor) {
                return res.status(404).json({
                    message: "Vendor not found"
                });
            }

            const verificationErrors = [];

            // Check BTCPay verification
            if (requiredVerifications.includes('btcpay') && !vendor.btcPayStore?.verified) {
                verificationErrors.push('BTCPay store not verified');
            }

            // Check business verification
            if (requiredVerifications.includes('business') && !vendor.businessDetails?.verified) {
                verificationErrors.push('Business details not verified');
            }

            // Check documents verification
            if (requiredVerifications.includes('documents') && !vendor.compliance?.documentsSubmitted) {
                verificationErrors.push('Required documents not submitted');
            }

            if (verificationErrors.length > 0) {
                return res.status(403).json({
                    message: "Vendor verification incomplete",
                    errors: verificationErrors,
                    required: requiredVerifications
                });
            }

            next();

        } catch (error) {
            console.error("Vendor Verification Error:", error);
            res.status(500).json({
                message: "Failed to verify vendor status",
                error: error.message
            });
        }
    };
};

module.exports = vendorVerificationMiddleware; 