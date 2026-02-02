const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

const prisma = new PrismaClient();

const getProfile = async (req, res) => {
    try {
        const { userId } = req.user;

        const profile = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                type: true,
                isActive: true,
                customerCode: true,
                address: true
            }
        });

        if (!profile) {
            return res.status(404).json({
                code: 99006,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        if (profile.type === 'CUSTOMER') {
            delete profile.role;
        }

        res.json({
            code: 200,
            message: 'Lấy thông tin thành công',
            data: profile
        });
    } catch (error) {
        logger.error('Get Profile Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server'
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { userId, type } = req.user;
        const { fullName, email, phone, address } = req.body; // Allow address update

        // Customers are NOT allowed to update profile info, only password
        if (type === 'CUSTOMER') {
            return res.status(403).json({
                code: 99008,
                message: 'Bạn không có quyền thực hiện thao tác này.'
            });
        }

        // Prevent updating sensitive fields like role, type, isActive, username here

        const updatedProfile = await prisma.user.update({
            where: { id: userId },
            data: {
                fullName,
                email,
                phone,
                address
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                type: true,
                address: true
            }
        });

        res.json({
            code: 200,
            message: 'Cập nhật thông tin thành công',
            data: updatedProfile
        });
    } catch (error) {
        logger.error('Update Profile Error:', error);
        res.status(500).json({
            code: 99500,
            message: 'Lỗi server'
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                code: 99001,
                message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ code: 99006, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                code: 99002,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

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
