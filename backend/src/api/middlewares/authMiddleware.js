const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const Admin = require('../../models/admin');
const RefreshToken = require('../../models/refreshToken');
const BlacklistedToken = require('../../models/blacklistedToken');

const authMiddleware = (allowedRoles = []) => async (req, res, next) => {
    try {
        // Validate roles configuration
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
            throw new Error('Invalid roles configuration');
        }

        // Check authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: "Authentication required",
                error: "No token provided or invalid format"
            });
        }

        // Verify token
        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: "Token has been invalidated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({ 
                message: "Invalid token",
                error: "Token payload missing user ID"
            });
        }

        let user = null;

        // Check for admin access
        if (allowedRoles.includes('admin')) {
            user = await Admin.findById(decoded.id)
                .select('-password -btcPaySettings.apiKey');
                
            if (user) {
                req.user = user;
                req.userType = 'admin';
                return next();
            }
        }

        // Check for user/vendor access
        if (allowedRoles.includes('user') || allowedRoles.includes('vendor')) {
            user = await User.findById(decoded.id)
                .select('-password -btcPayStore.apiKey');

            if (!user) {
                return res.status(401).json({ 
                    message: "Authentication failed",
                    error: "User not found"
                });
            }

            // Vendor role check
            if (allowedRoles.includes('vendor') && !allowedRoles.includes('user')) {
                if (user.role !== 'vendor') {
                    return res.status(403).json({ 
                        message: "Access denied",
                        error: "Vendor privileges required"
                    });
                }
            }

            req.user = user;
            req.userType = user.role;
            return next();
        }

        return res.status(403).json({ 
            message: "Access denied",
            error: "Insufficient privileges"
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: "Authentication failed",
                error: "Invalid token"
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: "Authentication failed",
                error: "Token expired",
                code: "TOKEN_EXPIRED"
            });
        }

        console.error('Auth Middleware Error:', error);
        res.status(500).json({ 
            message: "Authentication error",
            error: error.message
        });
    }
};

module.exports = authMiddleware;
