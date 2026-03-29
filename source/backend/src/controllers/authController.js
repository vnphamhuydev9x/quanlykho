const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const logger = require('../config/logger');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        logger.info(`[Login] Request for: ${username}`);

        if (!username || !password) {
            return res.status(400).json({
                code: 99001,
                message: 'Username and password are required'
            });
        }

        // 1. Find User
        const user = await prisma.user.findFirst({
            where: { username, deletedAt: null },
        });

        if (!user) {
            return res.status(401).json({
                code: 99002,
                message: 'Invalid username or password'
            });
        }

        // 2. Check Active
        if (!user.isActive) {
            logger.warn(`Login failed: Account ${username} is inactive`);
            return res.status(403).json({
                code: 99007,
                message: 'Account is disabled'
            });
        }

        // 3. Check Password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                code: 99002,
                message: 'Invalid username or password'
            });
        }

        // 4. Generate Token
        const payload = {
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
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
            message: 'Login successful',
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
            message: 'Internal server error'
        });
    }
};

module.exports = { login };
