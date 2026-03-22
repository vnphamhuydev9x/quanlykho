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
const declarationRoutes = require('./routes/declarationRoute');
const productCodeRoutes = require('./routes/productCodeRoute');
const notificationRoutes = require('./routes/notificationRoute');
const merchandiseConditionRoutes = require('./routes/merchandiseConditionRoute');

const exportOrderRoutes = require('./routes/exportOrderRoutes');
const debtRoutes = require('./routes/debtRoutes');
const inquiryRoutes = require('./routes/inquiryRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
const featureToggle = require('./middlewares/featureToggle');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/customers', featureToggle('FEATURE_CUSTOMERS'), customerRoutes);
app.use('/api/warehouses', featureToggle('FEATURE_SETTINGS'), warehouseRoutes);
app.use('/api/categories', featureToggle('FEATURE_SETTINGS'), categoryRoutes);
app.use('/api/declarations', featureToggle('FEATURE_DECLARATIONS'), declarationRoutes);
app.use('/api/product-codes', featureToggle('FEATURE_INVENTORY'), productCodeRoutes);
app.use('/api/transactions', featureToggle('FEATURE_TRANSACTIONS'), transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/manifests', featureToggle('FEATURE_INVENTORY'), require('./routes/manifestRoutes'));
app.use('/api/merchandise-conditions', featureToggle('FEATURE_SETTINGS'), merchandiseConditionRoutes);
app.use('/api/short-declarations', featureToggle('FEATURE_DECLARATIONS'), require('./routes/shortDeclaration.routes'));
app.use('/api/export-orders', featureToggle('FEATURE_INVENTORY'), exportOrderRoutes);
app.use('/api/debts', featureToggle('FEATURE_TRANSACTIONS'), debtRoutes);
app.use('/api/inquiries', inquiryRoutes);

app.get('/', (req, res) => {
    res.send('Kho Manager Backend is running');
});

module.exports = app;
