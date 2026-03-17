const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

/**
 * Cũ: Lưu file buffer xuống disk tại subDir.
 * Chuyển sang moveTempFile để tối ưu hiệu suất với diskStorage.
 */
const saveFile = (buffer, subDir, originalname) => {
    const ext = path.extname(originalname);
    const filename = `${uuidv4()}${ext}`;
    const fullDir = path.join(UPLOADS_ROOT, subDir);
    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(path.join(fullDir, filename), buffer);
    return `/uploads/${subDir.replace(/\\/g, '/')}/${filename}`;
};

/**
 * MỚI: Di chuyển file từ thư mục temp sang đích đến trong uploads/
 * @param {string} tempFilePath - đường dẫn file tạo bởi multer (req.file.path)
 * @param {string} subDir       - VD: 'inquiries/2025/03/42' hay 'declarations/2026/03/1'
 * @param {string} originalname - tên file gốc
 * @returns {string} imageUrl   - VD: '/uploads/inquiries/2025/03/42/uuid.jpg'
 */
const moveTempFile = (tempFilePath, subDir, originalname) => {
    const ext = path.extname(originalname);
    const filename = `${uuidv4()}${ext}`;
    const fullDir = path.join(UPLOADS_ROOT, subDir);
    fs.mkdirSync(fullDir, { recursive: true });

    const finalPath = path.join(fullDir, filename);
    // Dùng copy và unlink thay vì fs.renameSync để tránh lỗi Cross-Device khi temp/ và uploads/ ở 2 ổ đĩa khác nhau
    fs.copyFileSync(tempFilePath, finalPath);
    return `/uploads/${subDir.replace(/\\/g, '/')}/${filename}`;
};

/**
 * Xóa file trên disk theo imageUrl.
 * @param {string|null} imageUrl - VD: '/uploads/inquiries/2025/03/42/uuid.jpg'
 */
const deleteFile = (imageUrl) => {
    if (!imageUrl) return;
    const fullPath = path.join(UPLOADS_ROOT, imageUrl.replace(/^\/uploads\//, ''));
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

/**
 * Hỗ trợ dọn dẹp (xóa) file tạm ở block finally
 * @param {Array|Object} files - Có thể nhận vào req.files (mảng) hoặc req.file (object)
 */
const deleteTempFiles = (files) => {
    if (!files) return;

    // Đưa về dạng mảng để xử lý chung
    const fileArray = Array.isArray(files) ? files : [files];

    fileArray.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (e) {
                console.error(`[fileStorageService] block finally - Failed to delete temp file: ${e.message}`);
            }
        }
    });
};

/**
 * Build absolute URL từ stored path.
 * - LOCAL storage: DB lưu relative path ('/uploads/...') → prepend BE_HOST
 * - S3 storage: DB lưu full URL ('https://...') → return as-is
 * - BE_rules: Luôn dùng hàm này khi trả imageUrl trong response, không trả raw path.
 * @param {string|null} storedPath
 * @returns {string|null}
 */
const buildImageUrl = (storedPath) => {
    if (!storedPath) return null;
    if (storedPath.startsWith('http')) return storedPath;
    return `${process.env.BE_HOST || ''}${storedPath}`;
};

module.exports = { saveFile, moveTempFile, deleteFile, deleteTempFiles, buildImageUrl };
