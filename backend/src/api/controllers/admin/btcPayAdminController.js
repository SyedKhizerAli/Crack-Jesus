const Admin = require('../../../models/admin');
const CreditCard = require('../../../models/creditCard');
const Sale = require('../../../models/sale');
const BTCPayService = require('../../../services/BTCPayService');
const mongoose = require('mongoose');

// Setup BTCPay stores for admin
exports.setupBTCPayStores = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        const adminId = req.user.id;
        const { centralStore, personalStore } = req.body;

        // Validate store credentials
        if (!centralStore?.storeId || !centralStore?.apiKey || 
            !personalStore?.storeId || !personalStore?.apiKey) {
            throw new Error("Both central and personal store details are required");
        }

        // Verify both stores
        await Promise.all([
            BTCPayService.verifyStore(centralStore.storeId, centralStore.apiKey),
            BTCPayService.verifyStore(personalStore.storeId, personalStore.apiKey)
        ]);

        // Setup webhooks for both stores
        await Promise.all([
            BTCPayService.createWebhook({
                storeId: centralStore.storeId,
                apiKey: centralStore.apiKey,
                webhookUrl: `${process.env.APP_URL}/api/payment/webhook/central`,
                events: ['InvoiceSettled', 'InvoiceExpired', 'InvoiceInvalid']
            }),
            BTCPayService.createWebhook({
                storeId: personalStore.storeId,
                apiKey: personalStore.apiKey,
                webhookUrl: `${process.env.APP_URL}/api/payment/webhook/admin`,
                events: ['InvoiceSettled', 'InvoiceExpired', 'InvoiceInvalid']
            })
        ]);

        // Update admin BTCPay settings
        const admin = await Admin.findByIdAndUpdate(
            adminId,
            {
                btcPaySettings: {
                    centralStore: {
                        storeId: centralStore.storeId,
                        apiKey: centralStore.apiKey,
                        verified: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    personalStore: {
                        storeId: personalStore.storeId,
                        apiKey: personalStore.apiKey,
                        verified: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            },
            { new: true, session }
        );

        await session.commitTransaction();

        res.status(200).json({
            message: "BTCPay stores setup successful",
            data: {
                centralStore: {
                    storeId: admin.btcPaySettings.centralStore.storeId,
                    verified: true,
                    createdAt: admin.btcPaySettings.centralStore.createdAt
                },
                personalStore: {
                    storeId: admin.btcPaySettings.personalStore.storeId,
                    verified: true,
                    createdAt: admin.btcPaySettings.personalStore.createdAt
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Admin BTCPay Setup Error:", error);
        res.status(500).json({ 
            message: "Failed to setup BTCPay stores", 
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Get BTCPay status
exports.getBTCPayStatus = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await Admin.findById(adminId)
            .select('btcPaySettings');

        if (!admin?.btcPaySettings) {
            return res.status(404).json({ 
                message: "BTCPay settings not found" 
            });
        }

        // Verify both stores are still active
        const [centralStoreActive, personalStoreActive] = await Promise.all([
            BTCPayService.verifyStore(
                admin.btcPaySettings.centralStore.storeId,
                admin.btcPaySettings.centralStore.apiKey
            ),
            BTCPayService.verifyStore(
                admin.btcPaySettings.personalStore.storeId,
                admin.btcPaySettings.personalStore.apiKey
            )
        ]).catch(() => [false, false]);

        res.status(200).json({
            message: "BTCPay status retrieved successfully",
            data: {
                centralStore: {
                    storeId: admin.btcPaySettings.centralStore.storeId,
                    verified: admin.btcPaySettings.centralStore.verified,
                    active: centralStoreActive,
                    createdAt: admin.btcPaySettings.centralStore.createdAt,
                    updatedAt: admin.btcPaySettings.centralStore.updatedAt
                },
                personalStore: {
                    storeId: admin.btcPaySettings.personalStore.storeId,
                    verified: admin.btcPaySettings.personalStore.verified,
                    active: personalStoreActive,
                    createdAt: admin.btcPaySettings.personalStore.createdAt,
                    updatedAt: admin.btcPaySettings.personalStore.updatedAt
                }
            }
        });

    } catch (error) {
        console.error("Get BTCPay Status Error:", error);
        res.status(500).json({ 
            message: "Failed to get BTCPay status", 
            error: error.message 
        });
    }
};

// Get admin sales
exports.getAdminSales = async (req, res) => {
    try {
        const admin = await Admin.findOne();
        const { page = 1, limit = 10, status } = req.query;

        const query = { vendorId: admin._id };
        if (status) {
            query.status = status;
        }

        const [sales, totalSales] = await Promise.all([
            Sale.find(query)
                .populate('cardId', 'cardDetails.type price')
                .populate('buyerId', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Sale.countDocuments(query)
        ]);

        res.status(200).json({
            message: "Admin sales retrieved successfully",
            data: {
                sales: sales.map(sale => ({
                    id: sale._id,
                    card: {
                        type: sale.cardId.cardDetails.type,
                        price: sale.cardId.price
                    },
                    buyer: {
                        username: sale.buyerId.username,
                        email: sale.buyerId.email
                    },
                    status: sale.status,
                    btcAmount: sale.btcAmount,
                    createdAt: sale.createdAt,
                    completedAt: sale.completedAt
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(totalSales / limit),
                    totalItems: totalSales
                }
            }
        });

    } catch (error) {
        console.error("Get Admin Sales Error:", error);
        res.status(500).json({ 
            message: "Failed to get admin sales", 
            error: error.message 
        });
    }
};

// Removed createAdminCardPayment as it's now handled by walletPaymentController

module.exports = exports;
