/**
 * @module file_storage_r2
 * @SD_Ref 03_1_file_storage_r2_SD.md
 * @SD_Version SD-v1.0.5
 *
 * Local Disk Storage Provider
 *
 * Lưu file vào thư mục uploads/ trên disk.
 * Dùng cho môi trường dev/test khi không có R2 credentials.
 *
 * Interface:
 *   moveTempFileToStorage(tempFilePath, entityType, entityId, originalname) → Promise<string>  (relative path)
 *   deleteFile(imageUrl)                                                    → Promise<void>
 */
const fs = require('fs');
const path = require('path');
const { buildKey } = require('./storageUtils');

const UPLOADS_ROOT = path.join(__dirname, '../../../uploads');

/**
 * Di chuyển file từ temp lên disk tại uploads/{entityType}/{entityId}/uuid.ext
 * @returns {Promise<string>} Relative path — VD: '/uploads/inquiries/9/uuid.jpg'
 */
const moveTempFileToStorage = async (tempFilePath, entityType, entityId, originalname) => {
    const key = buildKey(entityType, entityId, originalname);
    const fullDir = path.join(UPLOADS_ROOT, `${entityType}/${entityId}`);

    fs.mkdirSync(fullDir, { recursive: true });

    const finalPath = path.join(UPLOADS_ROOT, key);
    // copy + unlink thay vì rename để tránh lỗi cross-device (temp và uploads khác ổ đĩa)
    fs.copyFileSync(tempFilePath, finalPath);

    return `/uploads/${key}`;
};

/**
 * Xóa file trên disk theo relative path.
 * Full URL (http) sẽ được bỏ qua — không phải local file.
 * @param {string|null} imageUrl
 */
const deleteFile = async (imageUrl) => {
    if (!imageUrl) return;
    if (imageUrl.startsWith('http')) return; // R2 URL — không xử lý ở đây

    const fullPath = path.join(UPLOADS_ROOT, imageUrl.replace(/^\/uploads\//, ''));
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

module.exports = { moveTempFileToStorage, deleteFile };
