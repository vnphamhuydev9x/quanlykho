const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

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

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                code: 99002, // Invalid Credentials
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            code: 200,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            code: 99500, // Server Error
            message: 'Lỗi server'
        });
    }
};



module.exports = { login };
