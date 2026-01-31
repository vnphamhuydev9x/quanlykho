const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const logger = require('./config/logger');

dotenv.config();

const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');
const employeeRoutes = require('./routes/employeeRoute');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Disabled per user request for cleaner logs

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/employees', employeeRoutes);

app.get('/', (req, res) => {
    res.send('Kho Manager Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
