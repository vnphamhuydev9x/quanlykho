const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { v4: uuidv4 } = require('uuid');

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get declarationId from request params or body
        const declarationId = req.params.id || req.body.declarationId || 'temp';

        // Create folder structure: uploads/declarations/{year}/{month}/{declarationId}/
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const uploadPath = path.join(
            __dirname,
            '../../uploads/declarations',
            String(year),
            String(month),
            String(declarationId)
        );

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename using UUID
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 3 // Maximum 3 files
    }
});

module.exports = upload;
