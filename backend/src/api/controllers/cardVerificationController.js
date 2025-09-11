const CardVerificationService = require('../../services/cardVerificationService');
const { validationResult } = require('express-validator');

// Verify a card (basic check)
exports.verifyCard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cardNumber, expiryMonth, expiryYear, cvv } = req.body;

    const result = await CardVerificationService.verifyCard({
      number: cardNumber,
      expiryMonth,
      expiryYear,
      cvv
    });

    res.status(200).json({
      message: "Card verification completed",
      data: result
    });
  } catch (error) {
    console.error("Card Verification Error:", error);
    res.status(500).json({
      message: "Card verification failed",
      error: error.message
    });
  }
};

// Check 3D Secure status
exports.check3DS = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {E
      return res.status(400).json({ errors: errors.array() });
    }

    const { cardNumber } = req.body;

    const result = await CardVerificationService.check3DS({
      number: cardNumber
    });

    res.status(200).json({
      message: "3DS check completed",
      data: result
    });
  } catch (error) {
    console.error("3DS Check Error:", error);
    res.status(500).json({
      message: "3DS check failed",
      error: error.message
    });
  }
};

// Check card balance
exports.checkBalance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cardNumber, expiryMonth, expiryYear, cvv, amount } = req.body;

    const result = await CardVerificationService.checkBalance({
      number: cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      amount
    });

    res.status(200).json({
      message: "Balance check completed",
      data: result
    });
  } catch (error) {
    console.error("Balance Check Error:", error);
    res.status(500).json({
      message: "Balance check failed",
      error: error.message
    });
  }
};

// Check AVS (Address Verification)
exports.checkAVS = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      cardNumber, expiryMonth, expiryYear, cvv,
      firstName, lastName, address, city, state, zip, country
    } = req.body;

    const result = await CardVerificationService.checkAVS({
      number: cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      firstName,
      lastName,
      address,
      city,
      state,
      zip,
      country
    });

    res.status(200).json({
      message: "AVS check completed",
      data: result
    });
  } catch (error) {
    console.error("AVS Check Error:", error);
    res.status(500).json({
      message: "AVS check failed",
      error: error.message
    });
  }
}; 