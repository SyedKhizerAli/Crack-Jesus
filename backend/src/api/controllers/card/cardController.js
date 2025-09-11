const CreditCard = require('../../../models/creditCard');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');

// List available cards with filters
exports.listCards = async (req, res) => {
    try {
        const { 
            type, 
            cardType,
            bin,
            country,
            state,
            zip,
            city,
            seller,
            base,
            bank,
            minPrice, 
            maxPrice,
            ordering,
            page = 1, 
            limit = 10 
        } = req.query;

        // Build query
        const query = { 
            status: 'available',
            vendorId: { $exists: true, $ne: null }
        };
        
        if (type) {
            query['cardDetails.type'] = type;
        }

        if (cardType) {
            query['cardDetails.cardType'] = cardType;
        }

        if (bin) {
            query['cardDetails.bin'] = { $regex: bin, $options: 'i' };
        }

        if (country) {
            query['address.country'] = { $regex: country, $options: 'i' };
        }

        if (state) {
            query['address.state'] = { $regex: state, $options: 'i' };
        }

        if (zip) {
            query['address.zip'] = { $regex: zip, $options: 'i' };
        }

        if (city) {
            query['address.city'] = { $regex: city, $options: 'i' };
        }

        if (seller) {
            query['vendorId.username'] = { $regex: seller, $options: 'i' };
        }

        if (base) {
            query.base = { $regex: base, $options: 'i' };
        }

        if (bank) {
            query.bank = { $regex: bank, $options: 'i' };
        }
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Build sort object
        let sort = { createdAt: -1 }; // default sort
        if (ordering) {
            switch (ordering) {
                case 'date_desc':
                    sort = { createdAt: -1 };
                    break;
                case 'date_asc':
                    sort = { createdAt: 1 };
                    break;
                case 'price_asc':
                    sort = { price: 1 };
                    break;
                case 'price_desc':
                    sort = { price: -1 };
                    break;
                default:
                    sort = { createdAt: -1 };
            }
        }

        // Execute query with pagination
        const cards = await CreditCard.find(query)
            .select('-cardDetails.number -cardDetails.cvv')
            .populate('vendorId', 'username role')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));
            
        console.log('Debug - Found cards:', cards.length);
        cards.forEach((card, index) => {
            console.log(`Debug - Card ${index}: vendorId=`, card.vendorId);
        });

        const total = await CreditCard.countDocuments(query);

        res.status(200).json({
            message: "Cards retrieved successfully",
            data: {
                cards: cards.map(card => ({
                    id: card._id,
                    type: card.cardDetails.type,
                    cardType: card.cardDetails.cardType,
                    bin: card.cardDetails.bin,
                    holderName: card.cardDetails.holderName,
                    expiryMonth: card.cardDetails.expiryMonth,
                    expiryYear: card.cardDetails.expiryYear,
                    address: card.address,
                    bank: card.bank,
                    base: card.base,
                    additionalInfo: card.additionalInfo,
                    note: card.note,
                    price: card.price,
                    vendor: {
                        username: card.vendorId?.username || 'Unknown',
                        verified: card.vendorId?.role === 'vendor'
                    },
                    createdAt: card.createdAt
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("List Cards Error:", error);
        res.status(500).json({ 
            message: "Failed to list cards", 
            error: error.message 
        });
    }
};

// Get single card details (for purchase)
exports.getCardDetails = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user.id;

        const card = await CreditCard.findOne({
            _id: cardId,
            status: 'available'
        })
        .populate('vendorId', 'username role');

        if (!card) {
            return res.status(404).json({ 
                message: "Card not available" 
            });
        }

        // Check if vendor is active and verified
        if (card.vendorId.role !== 'vendor') {
            return res.status(400).json({ 
                message: "Card vendor is not currently active" 
            });
        }

        // Check if user has sufficient balance
        const user = await User.findById(userId);
        const hasBalance = user.wallet.btcBalance >= card.price;

        res.status(200).json({
            message: "Card details retrieved successfully",
            data: {
                card: {
                    id: card._id,
                    type: card.cardDetails.type,
                    cardType: card.cardDetails.cardType || 'credit',
                    bin: card.cardDetails.bin || '',
                    holderName: card.cardDetails.holderName || '',
                    expiryMonth: card.cardDetails.expiryMonth,
                    expiryYear: card.cardDetails.expiryYear,
                    address: card.address || {
                        country: '',
                        state: '',
                        city: '',
                        zip: ''
                    },
                    bank: card.bank || 'Unknown',
                    base: card.base || 'Standard',
                    additionalInfo: card.additionalInfo || '',
                    note: card.note || '',
                    price: card.price,
                    status: card.status,
                    createdAt: card.createdAt,
                    vendor: {
                        username: card.vendorId?.username || 'Unknown',
                        verified: card.vendorId?.role === 'vendor'
                    }
                },
                purchase: {
                    canPurchase: hasBalance,
                    requiredBalance: card.price,
                    currentBalance: user.wallet.btcBalance
                }
            }
        });

    } catch (error) {
        console.error("Get Card Details Error:", error);
        res.status(500).json({ 
            message: "Failed to get card details", 
            error: error.message 
        });
    }
};

// Search cards (with aggregation for better performance)
exports.searchCards = async (req, res) => {
    try {
        const { 
            type, 
            minPrice, 
            maxPrice, 
            page = 1, 
            limit = 10 
        } = req.query;

        // Build aggregation pipeline
        const pipeline = [
            // Match stage
            {
                $match: {
                    status: 'available'
                }
            },
            // Lookup vendors
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'vendorId',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            // Filter active and verified vendors
            {
                $match: {
                    'vendor.status': 'active',
                    'vendor.btcPayStore.verified': true
                }
            }
        ];

        if (type) {
            pipeline[0].$match['cardDetails.type'] = type;
        }

        if (minPrice || maxPrice) {
            pipeline[0].$match.price = {};
            if (minPrice) pipeline[0].$match.price.$gte = Number(minPrice);
            if (maxPrice) pipeline[0].$match.price.$lte = Number(maxPrice);
        }

        // Add pagination
        pipeline.push(
            { $sort: { price: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: Number(limit) }
        );

        const cards = await CreditCard.aggregate(pipeline);
        const total = await CreditCard.countDocuments(pipeline[0].$match);

        res.status(200).json({
            message: "Search completed successfully",
            data: {
                cards: cards.map(card => ({
                    id: card._id,
                    type: card.cardDetails.type,
                    price: card.price,
                    vendor: {
                        username: card.vendor[0].username,
                        verified: card.vendor[0].btcPayStore.verified
                    },
                    createdAt: card.createdAt
                })),
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });

    } catch (error) {
        console.error("Search Cards Error:", error);
        res.status(500).json({ 
            message: "Failed to search cards", 
            error: error.message 
        });
    }
}; 