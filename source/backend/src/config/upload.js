const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const TEMP_ROOT = path.join(__dirname, '../../temp');

const DEFAULT_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Cấu hình Multer lưu file tạm ra đĩa cứng (diskStorage)
 * File sẽ được lưu vào: temp/YYYY/MM/DD/uuid_v4.ext
 *
 * @param {object}   options
 * @param {number}   [options.maxFiles]      - mặc định 1
 * @param {number}   [options.maxSize]       - bytes, mặc định 5MB
 * @param {string[]} [options.allowedMimes]  - mặc định images
 */
const createTempUpload = ({
    maxFiles = 1,
    maxSize = 5 * 1024 * 1024,
    allowedMimes = DEFAULT_ALLOWED_MIMES,
} = {}) => {
    const storage = multer.diskStorage({
        destination: (req, _file, cb) => {
            const now = new Date();
            const year = String(now.getFullYear());
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            // Cấu trúc: temp/YYYY/MM/DD
            const uploadPath = path.join(TEMP_ROOT, year, month, day);
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${uuidv4()}${ext}`);
        },
    });

    const fileFilter = (_req, file, cb) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
        }
    };

    return multer({ storage, fileFilter, limits: { fileSize: maxSize, files: maxFiles } });
};

module.exports = createTempUpload;
