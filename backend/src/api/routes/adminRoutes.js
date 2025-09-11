const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const siteSettingsController = require('../controllers/admin/siteSettingsController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');

// Auth routes (no auth required)
router.post('/login', [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], adminController.login);

router.post('/refresh-token', [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
], adminController.refreshToken);

// All routes below require admin authentication
router.use(authMiddleware(['admin']));

// Site Settings
router.get('/settings', siteSettingsController.getSettings);
router.put('/settings', siteSettingsController.updateSettings);

// Password Management
router.post('/change-password', [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], adminController.changePassword);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/stats', adminController.getSystemStats);
router.get('/activity', adminController.getRecentActivity);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:userId', [
    param('userId').isMongoId().withMessage('Valid User ID is required')
], adminController.getUserDetails);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/convert-to-vendor', [
    param('userId').isMongoId().withMessage('Valid User ID is required'),
], adminController.convertUserToVendor);
router.patch('/users/:userId/status', [
    param('userId')
        .notEmpty().withMessage('User ID is required')
        .custom((value) => {
            console.log('Validating userId parameter:', value);
            console.log('userId type:', typeof value);
            console.log('userId length:', value?.length);
            
            if (!value || value === 'undefined') {
                throw new Error('Invalid User ID provided');
            }
            
            // We'll handle the ObjectId validation in the controller
            return true;
        }),
    body('status')
        .isIn(['active', 'suspended', 'locked']).withMessage('Status must be active, suspended, or locked')
], adminController.updateUserStatus);

// Sales Management
router.get('/sales', adminController.getSales);

// Vendor Management
router.get('/vendors', adminController.getVendors);
// Add vendor sales routes first (these use specific patterns)
router.get('/vendors/sales', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'completed', 'failed'])
], adminController.getAllVendorSales);

// Then add specific vendor routes
router.get('/vendors/:vendorId', [
    param('vendorId').isMongoId().withMessage('Valid Vendor ID is required')
], adminController.getVendorDetails);
router.post('/vendors/:vendorId/verify', [
    param('vendorId').isMongoId().withMessage('Valid Vendor ID is required')
], adminController.verifyVendor);
router.patch('/vendors/:vendorId/status', [
    param('vendorId').isMongoId().withMessage('Valid Vendor ID is required'),
    body('status').isIn(['active', 'suspended', 'pending']).withMessage('Status must be active, suspended, or pending')
], adminController.updateVendorStatus);
// Keep existing route for specific vendor sales
router.get('/vendors/:vendorId/sales', [
    param('vendorId').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'completed', 'failed'])
], adminController.getVendorSales);

// Ticket Management
router.get('/tickets', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['open', 'closed', 'pending'])
], adminController.getTickets);

router.get('/tickets/pending', adminController.getPendingTicketsCount);

router.get('/tickets/:ticketId', [
    param('ticketId').isMongoId()
], adminController.getTicketDetails);

router.put('/tickets/:ticketId', [
    param('ticketId').isMongoId(),
    body('status').optional().isIn(['open', 'closed', 'in-progress']).withMessage('Status must be open, closed, or in-progress'),
    body('adminNote').optional().isString()
], adminController.updateTicket);

router.delete('/tickets/:ticketId', [
    param('ticketId').isMongoId()
], adminController.deleteTicket);

// Card Management
router.post('/cards', [
    body('cardDetails.number').isLength({ min: 16, max: 16 }).withMessage('Card number must be 16 digits'),
    body('cardDetails.expiryMonth').isInt({ min: 1, max: 12 }).withMessage('Expiry month must be between 1 and 12'),
    body('cardDetails.expiryYear').isInt({ min: 2024 }).withMessage('Expiry year must be 2024 or later'),
    body('cardDetails.cvv').isLength({ min: 3, max: 4 }).withMessage('CVV must be 3 or 4 digits'),
    body('cardDetails.type').isIn(['Visa', 'Mastercard', 'Amex']).withMessage('Card type must be Visa, Mastercard, or Amex'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
], adminController.addCard);

router.put('/cards/:cardId', [
    body('cardDetails.number').optional().isLength({ min: 16, max: 16 }).withMessage('Card number must be 16 digits'),
    body('cardDetails.expiryMonth').optional().isInt({ min: 1, max: 12 }).withMessage('Expiry month must be between 1 and 12'),
    body('cardDetails.expiryYear').optional().isInt({ min: 2024 }).withMessage('Expiry year must be 2024 or later'),
    body('cardDetails.cvv').optional().isLength({ min: 3, max: 4 }).withMessage('CVV must be 3 or 4 digits'),
    body('cardDetails.type').optional().isIn(['Visa', 'Mastercard', 'Amex']).withMessage('Card type must be Visa, Mastercard, or Amex'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('status').optional().isIn(['available', 'hidden', 'sold']).withMessage('Status must be available, hidden, or sold')
], adminController.updateCard);

router.delete('/cards/:cardId', adminController.deleteCard);
router.get('/cards', adminController.getCards);

// BTCPay Store Management
router.post('/store/central/setup', [
    body('storeId', 'BTCPay Store ID is required').notEmpty(),
    body('apiKey', 'BTCPay API Key is required').notEmpty()
], adminController.setupCentralStore);

router.post('/store/personal/setup', [
    body('storeId', 'BTCPay Store ID is required').notEmpty(),
    body('apiKey', 'BTCPay API Key is required').notEmpty()
], adminController.setupPersonalStore);

router.get('/store/status', adminController.getBTCPayStatus);

// BTC Address Management
router.post('/btc-address/personal', [
    body('btcAddress', 'Valid BTC address is required').notEmpty(),
    body('label').optional().isString()
], adminController.updatePersonalBtcAddress);

router.post('/btc-address/central', [
    body('btcAddress', 'Valid BTC address is required').notEmpty(),
    body('label').optional().isString()
], adminController.updateCentralBtcAddress);

// These routes should be after the authMiddleware
router.post('/logout', authMiddleware(['admin']), adminController.logout);
router.post('/logout-all', authMiddleware(['admin']), adminController.logoutAll);

module.exports = router;