/**
 * @module file_storage_r2
 * @SD_Ref 03_1_file_storage_r2_SD.md
 * @SD_Version SD-v1.0.5
 *
 * Cloudflare R2 Storage Provider
 *
 * Upload/xóa file trên Cloudflare R2 qua AWS S3-compatible API.
 * DB lưu full R2 URL. Backward-compatible với legacy relative path qua buildImageUrl().
 *
 * R2 key convention: {entityType}/{entityId}/uuid{ext}
 *   VD: inquiries/9/a1b2c3d4.jpg
 *       declarations/1/e5f6g7h8.jpg
 *
 * Interface:
 *   moveTempFileToStorage(tempFilePath, entityType, entityId, originalname) → Promise<string>  (full R2 URL)
 *   deleteFile(imageUrl)                                                    → Promise<void>
 *
 * Env vars cần thiết:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */
const fs   = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { buildKey } = require('./storageUtils');

const r2Client = new S3Client({
    region:   'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const CONTENT_TYPES = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.pdf':  'application/pdf',
};

const getContentType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return CONTENT_TYPES[ext] || 'application/octet-stream';
};

/**
 * Upload file từ temp path lên R2.
 * @returns {Promise<string>} Full R2 URL — VD: 'https://pub-xxx.r2.dev/inquiries/9/uuid.jpg'
 */
const moveTempFileToStorage = async (tempFilePath, entityType, entityId, originalname) => {
    const key        = buildKey(entityType, entityId, originalname);
    const fileBuffer = fs.readFileSync(tempFilePath);

    await r2Client.send(new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET_NAME,
        Key:         key,
        Body:        fileBuffer,
        ContentType: getContentType(originalname),
    }));

    return `${process.env.R2_PUBLIC_URL}/${key}`;
};

/**
 * Xóa object trên R2 theo Full R2 URL.
 * Relative path (legacy local) sẽ được bỏ qua.
 * @param {string|null} imageUrl
 */
const deleteFile = async (imageUrl) => {
    if (!imageUrl || !imageUrl.startsWith('http')) return;

    const r2PublicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    if (!r2PublicUrl || !imageUrl.startsWith(r2PublicUrl)) return;

    const key = imageUrl.slice(r2PublicUrl.length).replace(/^\//, '');
    if (!key) return;

    await r2Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key:    key,
    }));
};

module.exports = { moveTempFileToStorage, deleteFile };
