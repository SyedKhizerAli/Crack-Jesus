const express = require('express');
const router = express.Router();
const centralStoreController = require('../controllers/admin/centralStoreController');
const authMiddleware = require('../middlewares/authMiddleware');
const { query } = require('express-validator');

// All routes require admin authentication
router.use(authMiddleware(['admin']));

// Central store management
router.get('/balance', 
    centralStoreController.getBalance
);

router.get('/transactions', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString()
], centralStoreController.getTransactions);

// Internal routes (used by other controllers)
router.post('/deposits/handle', 
    centralStoreController.handleDeposits
);

// Note: forwardPaymentToVendor is called internally, not via HTTP route

module.exports = router; 