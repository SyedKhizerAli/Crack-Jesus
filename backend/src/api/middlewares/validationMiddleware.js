const { validationResult } = require('express-validator');

// Base validation handler
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array()
        });
    }
    next();
};

exports.validatePagination = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    
    // Convert to numbers
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Validate
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
            success: false,
            message: "Page must be a positive number"
        });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            success: false,
            message: "Limit must be between 1 and 100"
        });
    }

    // Add validated values to req
    req.pagination = {
        page: pageNum,
        limit: limitNum,
        skip: (pageNum - 1) * limitNum
    };

    next();
};

exports.validatePriceRange = async (req, res, next) => {
    const { minPrice, maxPrice } = req.query;

    if (minPrice) {
        const min = Number(minPrice);
        if (isNaN(min) || min < 0) {
            return res.status(400).json({
                success: false,
                message: "Minimum price must be a positive number"
            });
        }
        req.priceRange = { ...req.priceRange, min };
    }

    if (maxPrice) {
        const max = Number(maxPrice);
        if (isNaN(max) || max < 0) {
            return res.status(400).json({
                success: false,
                message: "Maximum price must be a positive number"
            });
        }
        if (minPrice && max < Number(minPrice)) {
            return res.status(400).json({
                success: false,
                message: "Maximum price cannot be less than minimum price"
            });
        }
        req.priceRange = { ...req.priceRange, max };
    }

    next();
};

exports.validateCardType = async (req, res, next) => {
    const { type } = req.query;
    const validTypes = ['Visa', 'Mastercard', 'Amex'];

    if (type && !validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            message: `Card type must be one of: ${validTypes.join(', ')}`
        });
    }

    next();
};

exports.validateUserConversion = handleValidation;

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array()
        });
    }
    next();
};