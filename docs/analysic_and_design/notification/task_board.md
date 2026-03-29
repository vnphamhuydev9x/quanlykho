# Task Board: notification
> Triage lần cuối: 2026-03-29 | SD cập nhật: 2026-03-29 | SD-Version: SD-v1.0.0
> Draft: 01_notification_draft_requirement.md | File: task_board.md

---

## [SD] Tasks — Cần /gen-SD xử lý
<!-- Thay đổi cần cập nhật vào System Design (schema, API spec, business logic, cache strategy...) -->
- [v] Xây dựng tài liệu System Design (SD) ban đầu từ file Draft và code hiện hành để làm Source of Truth.

## [BE] Tasks — Cần /gen-BE xử lý
<!-- Backend implementation, refactor, fix bug server... -->
- [v] Đổi content notification PRODUCT_CODE trong `utils/notification.js` từ plain text hardcoded tiếng Việt sang format JSON `{ key, params }` để hỗ trợ i18n đa ngôn ngữ (vi/zh).

## [FE] Tasks — Cần /gen-FE xử lý
<!-- Frontend implementation, fix UI, thay đổi component... -->
- [v] Refactor MainLayout: gộp `markNotificationsAsRead` và `markAllAsRead` thành 1 function duy nhất, xóa alias không cần thiết.
- [v] Fix NotificationPage: khi click notification loại INQUIRY, đổi route navigate từ `/customer-inquiry?inquiryId=X` sang `/admin/customer-inquiry?inquiryId=X` để khớp với hành vi bell dropdown.
