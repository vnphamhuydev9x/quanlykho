const logger = require('../config/logger');

/**
 * Middleware to check if the user has one of the allowed roles.
 * @param {string[]} allowedRoles - Array of roles allowed to access the route.
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                code: 99003,
                message: 'Unauthorized: No user info found'
            });
        }

        const userRole = req.user.role;

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            logger.warn(`[RBAC] Access Denied. User: ${req.user.username}, Role: ${userRole}. Required: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                code: 99008, // Forbidden
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }
    };
};

module.exports = authorize;
