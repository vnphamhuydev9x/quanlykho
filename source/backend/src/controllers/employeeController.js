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
            where: { type: 'EMPLOYEE' },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true
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
        logger.info(`[CreateEmployee] Request by ${req.user.username}. Target: ${username}`);

        if (!username || !password || !role) {
            return res.status(400).json({ code: 99001, message: 'Thiếu thông tin bắt buộc' });
        }

        // Check if username exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ code: 99005, message: 'Tên đăng nhập đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newEmployee = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                email,
                phone,
                role,
                type: 'EMPLOYEE',
                isActive: isActive !== undefined ? isActive : true
            }
        });

        // Invalidate Cache
        await redisClient.del(CACHE_KEY);

        logger.info(`[CreateEmployee] Success. New ID: ${newEmployee.id}`);

        res.json({
            code: 200,
            message: 'Tạo nhân viên thành công',
            data: {
                id: newEmployee.id,
                username: newEmployee.username,
                fullName: newEmployee.fullName
            }
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
        const empId = parseInt(id);
        const { fullName, email, phone, role, password, isActive } = req.body;
        logger.info(`[UpdateEmployee] Request by ${req.user.username}. TargetID: ${id}`);

        const updateData = { fullName, email, phone, role };
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: empId },
            data: updateData
        });

        // Invalidate Cache
        await redisClient.del(CACHE_KEY);

        logger.info(`[UpdateEmployee] Success for ID: ${id}`);

        res.json({
            code: 200,
            message: 'Cập nhật thành công'
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
        const empId = parseInt(id);
        logger.info(`[DeleteEmployee] Request by ${req.user.username}. TargetID: ${id}`);

        if (empId === req.user.userId) {
            return res.status(400).json({ code: 99006, message: 'Không thể tự xóa chính mình' });
        }

        await prisma.user.delete({
            where: { id: empId }
        });

        // Invalidate Cache
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
