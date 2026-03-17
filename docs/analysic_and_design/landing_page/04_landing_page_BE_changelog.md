## Version Code BE-v1.0.3 | Base on SD SD-v1.0.5

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/backend/.env` | Config | Đổi tên `APP_URL` → `BE_HOST` — thống nhất canonical env var cho host BE toàn dự án |
| `source/backend/src/controllers/declarationController.js` | Refactor | Xóa local constant `APP_URL`; import `buildImageUrl` từ `fileStorageService`; cập nhật `formatImagesArray` dùng `buildImageUrl(img)` thay vì tự ghép host |
| `source/backend/src/controllers/inquiryController.js` | Tag | Bump `@SD_Version SD-v1.0.5` |
| `source/backend/src/routes/inquiryRoute.js` | Tag | Bump `@SD_Version SD-v1.0.5` |

## Version Code BE-v1.0.2 | Base on SD SD-v1.0.4

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/backend/src/services/fileStorageService.js` | Feature | Thêm hàm `buildImageUrl(storedPath)` — build absolute URL từ relative path bằng cách prepend `BE_HOST`; tự detect S3 URL (bắt đầu bằng `http`) và return as-is |
| `source/backend/src/controllers/inquiryController.js` | Fix + Tag | Bump `@SD_Version SD-v1.0.4`; import `buildImageUrl`; thêm helper `withAbsoluteImageUrl`; áp dụng cho cả 3 endpoint trả inquiry data: `submitInquiry` (response 201), `getInquiries` (trước khi cache + respond), `getInquiryById` (trước khi respond) |
| `source/backend/src/routes/inquiryRoute.js` | Tag | Bump `@SD_Version SD-v1.0.4` |
| `docs/rules/BE_rules.md` | Rule | Thêm §8 "Image URL — Luôn trả Absolute URL" — quy tắc DB lưu relative path, BE build absolute URL trước khi respond, dùng `buildImageUrl()`, FE không ghép host |

## Version Code BE-v1.0.1 | Base on SD SD-v1.0.3

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/backend/src/controllers/inquiryController.js` | Tag | Bump `@SD_Version SD-v1.0.3`; không có logic thay đổi (SD-v1.0.3 chỉ thêm §3.10/§3.11 là FE-only — BE đã trả đủ fields trong response 201) |
| `source/backend/src/routes/inquiryRoute.js` | Tag | Bump `@SD_Version SD-v1.0.3` |

## Version Code BE-v1.0.0 | Base on SD SD-v1.0.2

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/backend/prisma/schema.prisma` | Schema | Thêm 3 fields mới vào model `CustomerInquiry`: `customerName String?`, `businessType String?`, `phoneNumber String?` (SD §1.1 SD-v1.0.2) |
| `source/backend/src/controllers/inquiryController.js` | Tag + Fix (3) | Thêm `@SD_Version SD-v1.0.2`; (1) `maskInquiryForChungTu` cập nhật ẩn 4 trường `email, customerName, businessType, phoneNumber`; (2) `submitInquiry` bổ sung 3 fields mới vào destructure + Prisma create data; (3) `getInquiries` full-text search bổ sung 3 fields mới cho ADMIN/SALE |
| `source/backend/src/routes/inquiryRoute.js` | Tag | Thêm `@SD_Version SD-v1.0.2`; routes đã đúng theo SD §2.2 & §2.3 |
