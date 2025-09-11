const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card/cardController');
const authMiddleware = require('../middlewares/authMiddleware');
const { query } = require('express-validator');

// Public routes (no auth required)
router.get('/list', [
    query('type').optional().isString(),
    query('cardType').optional().isIn(['debit', 'credit', 'charge', 'other']),
    query('bin').optional().isString(),
    query('country').optional().isString(),
    query('state').optional().isString(),
    query('zip').optional().isString(),
    query('city').optional().isString(),
    query('seller').optional().isString(),
    query('base').optional().isString(),
    query('bank').optional().isString(),
    query('minPrice').optional().isNumeric(),
    query('maxPrice').optional().isNumeric(),
    query('ordering').optional().isIn(['date_desc', 'date_asc', 'price_asc', 'price_desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], cardController.listCards);

router.get('/search', [
    query('type').optional().isString(),
    query('cardType').optional().isIn(['debit', 'credit', 'charge', 'other']),
    query('bin').optional().isString(),
    query('country').optional().isString(),
    query('state').optional().isString(),
    query('zip').optional().isString(),
    query('city').optional().isString(),
    query('seller').optional().isString(),
    query('base').optional().isString(),
    query('bank').optional().isString(),
    query('minPrice').optional().isNumeric(),
    query('maxPrice').optional().isNumeric(),
    query('ordering').optional().isIn(['date_desc', 'date_asc', 'price_asc', 'price_desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], cardController.searchCards);

// Protected routes (user auth required)
router.get('/:cardId/details', 
    authMiddleware(['user']), 
    cardController.getCardDetails
);

module.exports = router; 