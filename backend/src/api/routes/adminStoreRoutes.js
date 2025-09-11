const express = require('express');
const router = express.Router();
const adminStoreController = require('../controllers/admin/adminStoreController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// All routes require admin authentication
router.use(authMiddleware(['admin']));

// Personal store management
router.post('/personal/setup', [
    body('storeId').notEmpty().withMessage('Store ID is required'),
    body('apiKey').notEmpty().withMessage('API Key is required')
], adminStoreController.setupPersonalStore);

router.get('/personal/status', 
    adminStoreController.getPersonalStoreStatus
);

router.get('/personal/webhook/verify',
    adminStoreController.verifyWebhook
);

module.exports = router; 