const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        logger.info(`[Login] Request for: ${username}`);

        if (!username || !password) {
            return res.status(400).json({
                code: 99001,
                message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
            });
        }

        // 1. Find User
        const user = await prisma.user.findFirst({
            where: { username, deletedAt: null },
        });

        if (!user) {
            return res.status(401).json({
                code: 99002,
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        // 2. Check Active
        if (!user.isActive) {
            logger.warn(`Login failed: Account ${username} is inactive`);
            return res.status(403).json({
                code: 99007,
                message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
            });
        }

        // 3. Check Password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                code: 99002,
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        // 4. Generate Token
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            type: user.type
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        logger.info(`User logged in: ${username} (${user.role})`);

        res.json({
            code: 200,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                type: user.type
            },
        });

    } catch (error) {
        logger.error('Login Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server'
        });
    }
};

module.exports = { login };
