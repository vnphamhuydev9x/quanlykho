/**
 * @module file_storage_r2
 * @SD_Ref 03_1_file_storage_r2_SD.md
 * @SD_Version SD-v1.1.0
 *
 * Facade — chọn storage provider dựa vào FILE_STORAGE_PROVIDER env var:
 *   - FILE_STORAGE_PROVIDER=CLOUDFLARE_R2 → dùng r2StorageProvider (Cloudflare R2)
 *   - FILE_STORAGE_PROVIDER=LOCAL (hoặc không set) → dùng localStorageProvider (local disk, dev/test)
 *
 * Public API:
 *   moveTempFileToStorage(tempFilePath, entityType, entityId, originalname) → Promise<ImageObject>
 *   deleteFile(imageUrl)                                                    → Promise<void>
 *   deleteTempFiles(files)                                                  → void
 *   buildImageUrl(imageData)                                                → string|null
 *
 * ImageObject: { url: string, provider: string }
 */
const fs = require('fs');
const { STORAGE_PROVIDER } = require('../constants/enums');

// ─── Provider selection ───────────────────────────────────────────────────────
const isR2 = STORAGE_PROVIDER.CLOUDFLARE_R2 === process.env.FILE_STORAGE_PROVIDER;

const provider = isR2
    ? require('./storage/r2StorageProvider')
    : require('./storage/localStorageProvider');

const activeProvider = isR2 ? STORAGE_PROVIDER.CLOUDFLARE_R2 : STORAGE_PROVIDER.LOCAL;

// ─── Storage operations ───────────────────────────────────────────────────────

/**
 * Di chuyển file tạm lên storage. Trả về ImageObject { url, provider }.
 * Caller không cần đọc process.env.FILE_STORAGE_PROVIDER thêm.
 * @returns {Promise<{url: string, provider: string}>}
 */
const moveTempFileToStorage = async (tempFilePath, entityType, entityId, originalname) => {
    const url = await provider.moveTempFileToStorage(tempFilePath, entityType, entityId, originalname);
    return { url, provider: activeProvider };
};

const deleteFile = (imageUrl) =>
    provider.deleteFile(imageUrl);

// ─── Shared utilities (không phụ thuộc provider) ─────────────────────────────

/**
 * Dọn dẹp file tạm ở block finally.
 * Multer luôn ghi temp ra disk dù dùng provider nào → luôn cần xóa ở đây.
 * @param {Array|Object} files - req.files (mảng) hoặc req.file (object)
 */
const deleteTempFiles = (files) => {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    fileArray.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (e) {
                console.error(`[fileStorageService] Failed to delete temp file: ${e.message}`);
            }
        }
    });
};

/**
 * Build absolute URL từ imageData.
 * - ImageObject { url, provider }: dùng provider để build absolute URL
 * - string (legacy): fallback detect bằng startsWith('http')
 * - null provider trong ImageObject: fallback về LOCAL
 * @param {Object|string|null} imageData
 * @returns {string|null}
 */
const buildImageUrl = (imageData) => {
    if (!imageData) return null;

    // New format: ImageObject { url, provider }
    if (typeof imageData === 'object' && imageData !== null) {
        const { url, provider: imgProvider } = imageData;
        if (!url) return null;
        const effectiveProvider = imgProvider ?? STORAGE_PROVIDER.LOCAL;
        if (STORAGE_PROVIDER.CLOUDFLARE_R2 === effectiveProvider) return url;
        return `${process.env.BE_HOST || ''}${url}`;
    }

    // Legacy format: raw string (relative path hoặc full URL)
    if (typeof imageData === 'string') {
        if (imageData.startsWith('http')) return imageData;
        return `${process.env.BE_HOST || ''}${imageData}`;
    }

    return null;
};

module.exports = { moveTempFileToStorage, deleteFile, deleteTempFiles, buildImageUrl };
