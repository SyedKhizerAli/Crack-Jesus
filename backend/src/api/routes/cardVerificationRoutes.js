const express = require('express');
const router = express.Router();
const cardVerificationController = require('../controllers/cardVerificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// All routes require authentication
router.use(authMiddleware(['admin', 'vendor', 'user'])); // Allow users to verify cards too

// Basic card verification
router.post('/verify', [
  body('cardNumber').isString().isLength({ min: 13, max: 19 }),
  body('expiryMonth').isString().isLength({ min: 1, max: 2 }),
  body('expiryYear').isString().isLength({ min: 2, max: 4 }),
  body('cvv').isString().isLength({ min: 3, max: 4 })
], cardVerificationController.verifyCard);

// 3D Secure check
router.post('/3ds', [
  body('cardNumber').isString().isLength({ min: 13, max: 19 })
], cardVerificationController.check3DS);

// Balance check
router.post('/balance', [
  body('cardNumber').isString().isLength({ min: 13, max: 19 }),
  body('expiryMonth').isString().isLength({ min: 1, max: 2 }),
  body('expiryYear').isString().isLength({ min: 2, max: 4 }),
  body('cvv').isString().isLength({ min: 3, max: 4 }),
  body('amount').isFloat({ min: 0.01, max: 10000 })
], cardVerificationController.checkBalance);

// AVS check
router.post('/avs', [
  body('cardNumber').isString().isLength({ min: 13, max: 19 }),
  body('expiryMonth').isString().isLength({ min: 1, max: 2 }),
  body('expiryYear').isString().isLength({ min: 2, max: 4 }),
  body('cvv').isString().isLength({ min: 3, max: 4 }),
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('address').isString().notEmpty(),
  body('city').isString().notEmpty(),
  body('state').isString().notEmpty(),
  body('zip').isString().notEmpty(),
  body('country').isString().isLength({ min: 2, max: 2 })
], cardVerificationController.checkAVS);

module.exports = router; 