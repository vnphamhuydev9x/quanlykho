const winston = require('winston');
const path = require('path');

// Spring Sleuth style format: YYYY-MM-DD HH:mm:ss.SSS  INFO [service-name] : message
const customFormat = winston.format.printf(({ level, message, timestamp, service, stack }) => {
    const ts = timestamp.slice(0, 19).replace('T', ' '); // Simple formatting or use moment behavior
    // For production/file, we might want JSON, but user asked for "Spring Sleuth style".
    // Usually file logs in microservices are JSON for ELK, but user specifically asked for this format.
    // I will use this format for Console, and keep File as combined (JSON or Text? User said "in ra cả console và vào file").
    // If user wants readability in file too, I'll apply it to file as well.

    // Check if there is a stack trace (for errors)
    const msg = stack || message;
    return `${timestamp}  ${level.toUpperCase().padEnd(5)} [${service}] : ${msg}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        customFormat
    ),
    defaultMeta: { service: 'quanlykho-backend' },
    transports: [
        // File: Error Log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        // File: Combined Log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        }),
    ],
});

// Dev Environment: Console + File
// Prod Environment: File Only
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), // Colorize Level (INFO in green, ERROR in red)
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.printf(({ level, message, timestamp, service, stack }) => {
                const msg = stack || message;
                // Console format with colors
                return `${timestamp}  ${level} [${service}] : ${msg}`;
            })
        ),
    }));
}

module.exports = logger;
