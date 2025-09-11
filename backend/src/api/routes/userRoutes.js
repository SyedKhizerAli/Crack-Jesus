const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, query } = require('express-validator');
const walletController = require('../controllers/user/walletController');
const { validate } = require('../middlewares/validationMiddleware');

// Authentication routes (no auth required)
router.post('/signup', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('username').notEmpty()
], userController.signup);

router.post('/login', [
    body('email').isEmail(),
    body('password').notEmpty()
], userController.login);

// Protected routes
router.use(authMiddleware(['user']));

// User profile
router.get('/profile', userController.getProfile);

// Card routes - note the order!
router.get('/cards/purchased', userController.getPurchasedCards);
router.get('/cards/purchased/:cardId', userController.getPurchasedCardDetails);
router.get('/cards', [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['Visa', 'Mastercard', 'Amex']),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }).custom((value, { req }) => {
        if (req.query.minPrice && Number(value) < Number(req.query.minPrice)) {
            throw new Error('Maximum price cannot be less than minimum price');
        }
        return true;
    }),
    validate
], userController.getAvailableCards);
router.get('/cards/:cardId', userController.viewSingleCard);

// Purchase routes
router.post('/cards/buy', [
    body('cardId').notEmpty()
], userController.purchaseCard);
router.get('/purchases', userController.getPurchaseHistory);
router.post('/purchases/:purchaseId/refund', userController.requestRefund);

// Support tickets
router.post('/tickets', [
    body('subject').notEmpty().trim(),
    body('description').notEmpty().trim()
], userController.createTicket);
router.get('/tickets', userController.viewTicketHistory);
router.get('/tickets/:ticketId', userController.getTicketDetails);
router.post('/tickets/:ticketId/messages', [
    body('message').notEmpty().trim()
], userController.addTicketMessage);

// Auth management
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', userController.logout);
router.post('/logout-all', userController.logoutAll);

// Add these routes
router.post('/change-password', [
    body('oldPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], userController.changePassword);

// Top-up should be in walletRoutes.js
router.post('/wallet/deposit', [
    body('btcAmount').isFloat({ min: 0.00001 }).withMessage('Valid BTC amount required')
], walletController.createDeposit);

router.get('/wallet/deposit/:invoiceId/status', walletController.getDepositStatus);

module.exports = router;
