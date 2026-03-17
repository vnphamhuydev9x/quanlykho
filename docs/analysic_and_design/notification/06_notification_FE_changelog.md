## Version Code FE-v1.0.1 | Base on SD SD-v1.0.1

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/layouts/MainLayout.jsx` | Tag | Cập nhật `@SD_Version` → `SD-v1.0.1`; logic Initialization Guard (`prevNotifCountRef = useRef(-1)`) đã được implement từ FE-v1.0.0, đúng với SD §3.4 |
| `source/frontend/src/pages/notification/NotificationPage.jsx` | Tag | Cập nhật `@SD_Version` → `SD-v1.0.1` |
| `source/frontend/src/services/notificationService.js` | Tag | Cập nhật `@SD_Version` → `SD-v1.0.1` |

---

## Version Code FE-v1.0.0 | Base on SD SD-v1.0.0

**Date**: 2026-03-17

### Files Updated / Created

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/services/notificationService.js` | Tag | Thêm `@SD_Version SD-v1.0.0`; service đã đủ 4 method theo SD §2.1 |
| `source/frontend/src/pages/notification/NotificationPage.jsx` | Tag + Fix | Thêm `@SD_Version SD-v1.0.0`; fix `handleItemClick` đổi từ `markAllAsRead()` → `markOneAsRead(item.id)` để tuân theo SD §3.6 (chỉ đánh dấu đúng noti được click, không ảnh hưởng các noti khác) |
| `source/frontend/src/layouts/MainLayout.jsx` | Tag + Feature | Thêm `@SD_Version SD-v1.0.0`; thêm logic dispatch `inquiry:refresh` event khi polling phát hiện có INQUIRY notification mới (SD §3.4) |
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Feature | Thêm event listener `inquiry:refresh` để tự động re-fetch danh sách inquiry khi nhận được event từ MainLayout (SD §3.4) |

### I18n
- `vi/translation.json` và `zh/translation.json`: Đã đủ tất cả keys (`notification.*`) — không cần thêm key mới.

### Route
- `/notification-history` → `NotificationPage` đã có trong `App.jsx` — không cần thay đổi.
