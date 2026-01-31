const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        logger.info(`[Login] Request for user: ${username}`);

        if (!username || !password) {
            return res.status(400).json({
                code: 99001, // Missing Input
                message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(401).json({
                code: 99002, // Invalid Credentials
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        if (!user.isActive) {
            logger.warn(`Login failed: User ${username} is inactive`);
            return res.status(403).json({
                code: 99007, // Account Inactive
                message: 'Account is inactive'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.warn(`Login failed: Invalid password for user ${username}`);
            return res.status(401).json({
                code: 99002, // Invalid Credentials
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        logger.info(`User logged in: ${username}`);
        res.json({
            code: 200,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                mustChangePassword: user.mustChangePassword
            },
        });
    } catch (error) {
        logger.error('Login Error:', error);
        res.status(500).json({
            code: 99500, // Server Error
            message: 'Lỗi server'
        });
    }
};



module.exports = { login };
