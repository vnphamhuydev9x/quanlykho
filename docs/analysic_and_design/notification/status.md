# Feature Status: notification
> Cập nhật lần cuối: 2026-03-29

## Tổng trạng thái: ✅ Done

## Requirements
> Version: 1.0.0 — `02_notification_requirement_rephrase.md`

- [ ] FR: Polling thông báo thời gian thực mỗi 5 giây
- [ ] FR: Bell Icon cho ADMIN/SALE/CHUNG_TU — xem, đánh dấu đã đọc, điều hướng
- [ ] FR: Product Code Badge cho CUSTOMER — badge, tooltip, tự động đánh dấu đã đọc
- [ ] FR: Trang lịch sử thông báo — load more, nhóm theo ngày, điều hướng theo type
- [ ] FR: Tạo thông báo từ module khác (PRODUCT_CODE, INQUIRY)
- [ ] Business Rule: Ownership check khi mark one as read
- [ ] Business Rule: Idempotent mark as read
- [ ] NFR: Hỗ trợ i18n nội dung thông báo (vi/zh)
- [ ] NFR: Cache 60 giây cho danh sách chưa đọc

## System Design
> SD-v1.0.0 — `03_notification_SD.md`

- **Data Model:** Bảng `notifications` (8 fields), quan hệ với `User`
- **Indexing:** Chưa có explicit index — đề xuất composite `(userId, isRead)`
- **API:** 4 endpoints (GET unread, GET list paginated, PUT all read, PUT one read)
- **Cache:** Redis key `notifications:<userId>`, TTL 60s, invalidation on write
- **Business Logic:** Fire-and-forget creation, ownership check, idempotent mark, polling 5s, INQUIRY auto-refresh

## Implementation Status

| Layer | Dựa trên SD  | Trạng thái   | Cập nhật lần cuối |
|-------|-------------|-------------|-------------------|
| BE    | SD-v1.0.0   | ✅ Done     | 2026-03-29        |
| FE    | SD-v1.0.0   | ✅ Done     | 2026-03-29        |

## Pending Tasks
<!-- Sync từ task_board.md — không sửa tay -->
- [v] [SD] Xây dựng tài liệu System Design (SD) ban đầu từ file Draft và code hiện hành để làm Source of Truth.
- [v] [BE] Đổi content notification PRODUCT_CODE trong `utils/notification.js` từ plain text hardcoded tiếng Việt sang format JSON `{ key, params }` để hỗ trợ i18n đa ngôn ngữ (vi/zh).
- [v] [FE] Refactor MainLayout: gộp `markNotificationsAsRead` và `markAllAsRead` thành 1 function duy nhất, xóa alias không cần thiết.
- [v] [FE] Fix NotificationPage: khi click notification loại INQUIRY, đổi route navigate từ `/customer-inquiry?inquiryId=X` sang `/admin/customer-inquiry?inquiryId=X` để khớp với hành vi bell dropdown.
