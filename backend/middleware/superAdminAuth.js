const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

const protectSuperAdmin = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.superadmin = await SuperAdmin.findById(decoded.id).select('-password');

            if (!req.superadmin) {
                return res.status(401).json({ message: 'Not authorized, super admin not found' });
            }

            if (!req.superadmin.isActive) {
                return res.status(401).json({ message: 'Not authorized, super admin account deactivated' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protectSuperAdmin };
