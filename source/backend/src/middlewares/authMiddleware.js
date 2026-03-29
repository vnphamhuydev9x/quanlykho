const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            code: 99003, // Token Missing
            message: 'No token provided'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, user) => {
        if (err) {
            return res.status(403).json({
                code: 99004, // Token Invalid
                message: 'Invalid or expired token'
            });
        }

        try {
            // Check User Status in Redis
            const redisKey = `user:status:${user.userId}`;
            const cachedStatus = await redisClient.get(redisKey);

            if (cachedStatus) {
                if (cachedStatus === 'INACTIVE') {
                    return res.status(403).json({
                        code: 99007,
                        message: 'Account is disabled'
                    });
                }
                // ACTIVE -> Proceed
                req.user = user;
                return next();
            }

            // Cache Miss -> Query DB
            const dbUser = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { isActive: true }
            });

            if (!dbUser) {
                return res.status(401).json({
                    code: 99002,
                    message: 'User not found'
                });
            }

            if (!dbUser.isActive) {
                await redisClient.setEx(redisKey, 3600, 'INACTIVE');
                return res.status(403).json({
                    code: 99007,
                    message: 'Account is disabled'
                });
            }

            // User is Active -> Cache and Proceed
            await redisClient.setEx(redisKey, 3600, 'ACTIVE');
            req.user = user;
            next();

        } catch (error) {
            logger.error('Auth Middleware Error:', error);
            return res.status(500).json({
                code: 99500,
                message: 'Internal server error'
            });
        }
    });
};

module.exports = authenticateToken;
