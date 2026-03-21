# Task Board: file_storage_r2
> Triage lần cuối: 2026-03-21 (comment 6) | SD cập nhật: 2026-03-21 | SD-Version: SD-v1.2.0 | Draft: 01_file_storage_r2_draft_requirement.md

---

## [SD] Tasks — Cần /gen-SD xử lý
<!-- Thay đổi cần cập nhật vào System Design (schema, API spec, business logic, cache strategy...) -->
- [v] Thiết kế Strategy Pattern cho file storage: định nghĩa interface chung + 2 provider (localStorageProvider, r2StorageProvider); method nhận provider parameter thay vì hardcode từ config (comment 3)
- [v] Cập nhật file path convention: tổ chức folder ảnh theo `{type}/{id}/uuid.ext` (comment 2)
- [v] Thêm field `storageProvider` (enum: LOCAL, CLOUDFLARE_R2) vào model Image trong schema (comment 4 thứ 2)
- [v] Cập nhật schema ImageDeletionQueue: thêm field `provider` (comment 5)
- [v] Cập nhật data model Image: `storageProvider` lưu cùng image URL trong bảng images — không lưu ở entity declaration/inquiry; provider được set ngay sau khi gọi moveTempFileToStorage (comment 5)
- [v] Thiết kế bảng `images` mới (PostgreSQL proper): tách image data ra khỏi `Declaration.images` JSON và `CustomerInquiry.image` JSON — bảng riêng có FK reference về Declaration/CustomerInquiry, mỗi row là 1 image object {url, provider} (comment 6)

## [BE] Tasks — Cần /gen-BE xử lý
<!-- Backend implementation, refactor, fix bug server... -->
- [v] Implement upload ảnh lên Cloudflare R2 trong fileStorageService.js (comment 1)
- [v] Sửa buildImageUrl() trả về R2 URL trực tiếp (comment 1)
- [v] Implement Strategy Pattern: tạo interface + localStorageProvider + r2StorageProvider; cập nhật các method hiện tại nhận provider parameter (comment 3)
- [v] Refactor buildKey thành shared utility dùng chung ở cả 2 provider; kiểm tra và tạo coding rule về DRY nếu chưa có (comment 4 đầu)
- [v] Xóa hàm saveFile khỏi interface và tất cả provider (comment 4 đầu)
- [v] Đổi tên hàm moveTempFile → moveTempFileToStorage (comment 4 đầu)
- [v] Thêm enum FILE_STORAGE_PROVIDER (LOCAL, CLOUDFLARE_R2) vào enums.js backend (comment 4 thứ 2)
- [v] Đọc process.env.FILE_STORAGE_PROVIDER để chọn storage provider khi khởi tạo (comment 4 thứ 2)
- [v] Fix deleteDeclaration: thay hardcode status bằng enum (comment 4 thứ 2)
- [v] Cập nhật ImageDeletionQueue migration/query: thêm field provider sau khi SD cập nhật schema (comment 5)
- [v] Sửa nội dung rule ## 9 trong coding rules: làm đơn giản, bỏ từ ngữ "Provider/Implementation" không rõ nghĩa (comment 5)
- [v] Handle null provider: fallback về local (comment 5)
- [v] Cập nhật flow upload: set provider ngay sau moveTempFileToStorage, lưu provider cùng image URL trong bảng images (comment 5)

- [v] Migrate dữ liệu từ `Declaration.images` JSON và `CustomerInquiry.image` JSON sang bảng `images` mới; cập nhật toàn bộ controller/query để CRUD qua bảng images thay vì JSON field (comment 6)

## [FE] Tasks — Cần /gen-FE xử lý
<!-- Frontend implementation, fix UI, thay đổi component... -->
