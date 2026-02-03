const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./config/logger');

dotenv.config();

const authRoutes = require('./routes/authRoute');
const profileRoutes = require('./routes/profileRoute');
const employeeRoutes = require('./routes/employeeRoute');
const customerRoutes = require('./routes/customerRoute');
const warehouseRoutes = require('./routes/warehouseRoute');
const categoryRoutes = require('./routes/categoryRoute');
const transactionRoutes = require('./routes/transactionRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
    res.send('Kho Manager Backend is running');
});

module.exports = app;
