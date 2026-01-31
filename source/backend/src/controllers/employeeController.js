const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const redisClient = require('../config/redisClient');
const logger = require('../config/logger');
const prisma = new PrismaClient();

const CACHE_KEY = 'employees:list';

// GET /api/employees
const getAllEmployees = async (req, res) => {
    try {
        logger.info(`[GetEmployees] Request by ${req.user.username}`);

        // 1. Check Cache
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
            logger.info('[GetEmployees] Cache Hit');
            return res.json({
                code: 200,
                message: 'Success (Cache)',
                data: JSON.parse(cachedData)
            });
        }

        logger.info('[GetEmployees] Cache Miss. Querying DB...');
        // 2. Query DB
        const employees = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Set Cache (Expire after 1 hour)
        await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(employees));

        res.json({
            code: 200,
            message: 'Success',
            data: employees
        });

    } catch (error) {
        logger.error('Get Employees Error:', error);
        res.status(500).json({ code: 99500, message: 'Lỗi server' });
    }
};

// POST /api/employees
const createEmployee = async (req, res) => {
    try {
        const { username, password, fullName, email, phone, role, isActive } = req.body;
        logger.info(`[CreateEmployee] Request by ${req.user.username}. Target: ${username}, Role: ${role}`);

        if (!username || !password || !role) {
            logger.warn(`[CreateEmployee] Failed: Missing fields for ${username}`);
            return res.status(400).json({ code: 99001, message: 'Thiếu thông tin bắt buộc' });
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            logger.warn(`[CreateEmployee] Failed: Username ${username} already exists`);
            return res.status(400).json({ code: 99005, message: 'Tên đăng nhập đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                email,
                phone,
                role,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        // 4. Invalidate Cache
        await redisClient.del(CACHE_KEY);

        logger.info(`[CreateEmployee] Success. New ID: ${newUser.id}`);

        res.json({
            code: 200,
            message: 'Tạo nhân viên thành công',
            data: newUser
        });
    } catch (error) {
        logger.error('Create Employee Error:', error);
        res.status(500).json({ code: 99500, message: 'Lỗi server' });
    }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, role, password, isActive } = req.body;
        logger.info(`[UpdateEmployee] Request by ${req.user.username}. TargetID: ${id}`);

        const updateData = { fullName, email, phone, role };

        if (isActive !== undefined) updateData.isActive = isActive;

        // If password is provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // 4. Invalidate Cache
        await redisClient.del(CACHE_KEY);

        logger.info(`[UpdateEmployee] Success for ID: ${id}`);

        res.json({
            code: 200,
            message: 'Cập nhật thành công',
            data: updatedUser
        });
    } catch (error) {
        logger.error('Update Employee Error:', error);
        res.status(500).json({ code: 99500, message: 'Lỗi server' });
    }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        logger.info(`[DeleteEmployee] Request by ${req.user.username}. TargetID: ${id}`);

        // Prevent deleting self (Optional check)
        if (parseInt(id) === req.user.userId) {
            logger.warn(`[DeleteEmployee] Failed: User ${req.user.username} tried to delete self`);
            return res.status(400).json({ code: 99006, message: 'Không thể tự xóa chính mình' });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        // 4. Invalidate Cache
        await redisClient.del(CACHE_KEY);

        logger.info(`[DeleteEmployee] Success. ID: ${id} deleted`);

        res.json({
            code: 200,
            message: 'Xóa thành công'
        });
    } catch (error) {
        logger.error('Delete Employee Error:', error);
        res.status(500).json({ code: 99500, message: 'Lỗi server' });
    }
};

module.exports = { getAllEmployees, createEmployee, updateEmployee, deleteEmployee };
