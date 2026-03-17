## Version Code BE-v1.0.0 | Base on SD SD-v1.0.0

**Date**: 2026-03-17

### Files Updated
- `source/backend/src/controllers/notificationController.js` — Thêm `@SD_Version SD-v1.0.0` tag; thêm entrance logging cho tất cả 4 handler; fix `markOneAsRead` trả đúng HTTP 403 khi notification tồn tại nhưng không thuộc user (thay vì 404 trước đó); cập nhật response body 404 thành `"Notification not found"` đúng theo SD §2.1.
- `source/backend/src/utils/notification.js` — Thêm `@SD_Version SD-v1.0.0` tag; logic `createNotification` và `createInquiryNotification` đã đúng theo SD §2.2.
- `source/backend/src/routes/notificationRoute.js` — Thêm `@SD_Version SD-v1.0.0` tag; route đã đúng theo SD §2.1.
- `source/backend/prisma/schema.prisma` — Model `Notification` đã có đầy đủ fields (id, userId, content, isRead, type, refId, createdAt, updatedAt) theo SD §1.1. Không cần thay đổi.
