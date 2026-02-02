const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const redisClient = require('../config/redisClient');
const prisma = new PrismaClient();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            code: 99003, // Token Missing
            message: 'Không tìm thấy Token'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, user) => {
        if (err) {
            return res.status(403).json({
                code: 99004, // Token Invalid
                message: 'Token không hợp lệ hoặc hết hạn'
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
                        message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
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
                    message: 'Người dùng không tồn tại'
                });
            }

            if (!dbUser.isActive) {
                await redisClient.setEx(redisKey, 3600, 'INACTIVE');
                return res.status(403).json({
                    code: 99007,
                    message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
                });
            }

            // User is Active -> Cache and Proceed
            await redisClient.setEx(redisKey, 3600, 'ACTIVE');
            req.user = user;
            next();

        } catch (error) {
            console.error('Auth Middleware Error:', error);
            return res.status(500).json({
                code: 99500,
                message: 'Lỗi server (Auth)'
            });
        }
    });
};

module.exports = authenticateToken;
