const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const prisma = new PrismaClient();

// GET /api/user/profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const CACHE_KEY = `user:profile:${userId}`;
        logger.info(`[GetProfile] Request by UserID: ${userId}`);

        // 1. Check Cache
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
            logger.info(`[GetProfile] Cache Hit: ${CACHE_KEY}`);
            return res.json({
                code: 200,
                message: 'Success (Cache)',
                data: JSON.parse(cachedData)
            });
        }

        logger.info(`[GetProfile] Cache Miss: ${CACHE_KEY}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true
                // Exclude password
            }
        });

        // Cache 1 hour
        if (user) {
            await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(user));
        }

        if (!user) {
            return res.status(404).json({
                code: 99002,
                message: 'User not found'
            });
        }

        res.json({
            code: 200,
            message: 'Success',
            data: user
        });
    } catch (error) {
        logger.error('Get Profile Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server'
        });
    }
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
    try {
        const { userId, role } = req.user; // Get role from token
        const { fullName, email, phone } = req.body;
        logger.info(`[UpdateProfile] Request by UserID: ${userId}. Role: ${role}`);

        const updateData = { email, phone };

        // Only Admin can update fullName
        if (role === 'ADMIN' && fullName) {
            updateData.fullName = fullName;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true
            }
        });

        // Invalidate Cache
        await redisClient.del(`user:profile:${userId}`);

        res.json({
            code: 200,
            message: 'Cập nhật thành công',
            data: updatedUser
        });
    } catch (error) {
        logger.error('Update Profile Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server khi cập nhật'
        });
    }
};

// POST /api/user/change-password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        logger.info(`[ChangePassword] Request by UserID: ${userId}`);

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                code: 99001,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            logger.warn(`[ChangePassword] Failed: Incorrect current password for UserID: ${userId}`);
            return res.status(400).json({
                code: 99002,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        // Invalidate Cache
        await redisClient.del(`user:profile:${userId}`);

        res.json({
            code: 200,
            message: 'Đổi mật khẩu thành công'
        });

    } catch (error) {
        logger.error('Change Password Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server'
        });
    }
};

module.exports = { getProfile, updateProfile, changePassword };
