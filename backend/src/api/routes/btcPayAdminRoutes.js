const express = require('express');
const router = express.Router();
const btcPayAdminController = require('../controllers/admin/btcPayAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, query } = require('express-validator');

// All routes require admin authentication
router.use(authMiddleware(['admin']));

// BTCPay store setup and status
router.post('/setup', [
    body('centralStore.storeId').notEmpty().withMessage('Central store ID is required'),
    body('centralStore.apiKey').notEmpty().withMessage('Central store API key is required'),
    body('personalStore.storeId').notEmpty().withMessage('Personal store ID is required'),
    body('personalStore.apiKey').notEmpty().withMessage('Personal store API key is required')
], btcPayAdminController.setupBTCPayStores);

router.get('/status', 
    btcPayAdminController.getBTCPayStatus
);

// Admin sales
router.get('/sales', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'completed', 'failed'])
], btcPayAdminController.getAdminSales);

module.exports = router;
