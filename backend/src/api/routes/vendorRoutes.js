const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor/vendorController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const vendorVerificationMiddleware = require('../middlewares/vendorVerificationMiddleware');

// Auth routes (no auth required)
router.post('/signup', [
    body('username', 'Username is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], vendorController.signup);

router.post('/login', [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').notEmpty()
], vendorController.login);

// All routes below require vendor authentication
router.use(authMiddleware(['vendor']));

// Profile management
router.get('/profile', vendorController.getProfile);
router.put('/profile', vendorController.updateProfile);
router.put('/vacation-mode', [
    body('vacationMode', 'Vacation mode must be a boolean').isBoolean()
], vendorController.toggleVacationMode);

// Password management
router.post('/change-password', [
    body('oldPassword', 'Current password is required').notEmpty(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
], vendorController.changePassword);

// Store management
router.post('/store/setup', [
    body('storeId', 'BTCPay Store ID is required').notEmpty(),
    body('apiKey', 'BTCPay API Key is required').notEmpty()
], vendorController.setupBTCPayStore);

router.get('/store/status', vendorController.getBTCPayStatus);
router.get('/store/stats', vendorController.getStoreStats);

// BTC Address management
router.post('/btc-address', [
    body('btcAddress', 'Valid BTC address is required').notEmpty(),
    body('label').optional().isString()
], vendorController.updateBtcAddress);

// Card management - only needs BTCPay verification
router.post('/cards/upload', [
    authMiddleware(['vendor']),
    body('cards', 'Valid cards array is required').isArray().notEmpty(),
    body('cards.*.number', 'Card number is required').notEmpty(),
    body('cards.*.expiryMonth', 'Valid expiry month required').isInt({ min: 1, max: 12 }),
    body('cards.*.expiryYear', 'Valid expiry year required').isInt({ min: 2024 }),
    body('cards.*.cvv', 'Valid CVV required').isLength({ min: 3, max: 4 }),
    body('cards.*.type', 'Card type is required').isIn(['Visa', 'Mastercard', 'Amex']),
    body('cards.*.price', 'Valid price is required').isFloat({ min: 0 })
], vendorController.uploadCards);

router.get('/cards', vendorController.viewCards);
router.put('/cards/:cardId', vendorController.updateCard);
router.delete('/cards/:cardId', vendorController.deleteCard);

// Sales
router.get('/sales', vendorController.getSalesHistory);

// Tickets
router.post('/tickets', [
    body('subject', 'Subject is required').notEmpty(),
    body('description', 'Description is required').notEmpty()
], vendorController.createTicket);

router.get('/tickets', vendorController.viewTickets);
router.get('/tickets/:ticketId', vendorController.getTicketDetails);

router.post('/logout', authMiddleware(['vendor']), vendorController.logout);
router.post('/logout-all', authMiddleware(['vendor']), vendorController.logoutAll);

module.exports = router;
