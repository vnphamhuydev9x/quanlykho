/**
 * @module file_storage_r2
 * @SD_Ref 03_1_file_storage_r2_SD.md
 * @SD_Version SD-v1.0.5
 *
 * Shared utilities dùng chung cho tất cả storage provider.
 * Không phụ thuộc provider cụ thể (local/R2).
 */
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Build storage key theo format chuẩn: {entityType}/{entityId}/uuid{ext}
 * VD: inquiries/9/a1b2c3d4.jpg | declarations/1/e5f6g7h8.png
 *
 * @param {string} entityType  - Loại entity (VD: 'inquiries', 'declarations')
 * @param {number|string} entityId - ID của entity
 * @param {string} originalname    - Tên file gốc (để lấy extension)
 * @returns {string} storage key
 */
const buildKey = (entityType, entityId, originalname) => {
    const ext      = path.extname(originalname);
    const filename = `${uuidv4()}${ext}`;
    return `${entityType}/${entityId}/${filename}`;
};

module.exports = { buildKey };
