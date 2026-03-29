# Draft Requirement: notification
> Tạo bởi: /reverse-draft | Ngày: 2026-03-29
> Nguồn: Reverse-engineered từ code hiện tại
> Trạng thái: Chờ review & triage

---

# Hiện trạng feature (suy ra từ code)

## Actor & Phân quyền

| Actor | Điều kiện | Quyền hạn |
|-------|-----------|-----------|
| **CUSTOMER** (userType = CUSTOMER) | Bất kỳ role nào | Nhận notification loại `PRODUCT_CODE`, xem badge đếm số chưa đọc ở menu Product Codes, đánh dấu tất cả đã đọc |
| **ADMIN** | role = ADMIN | Nhận notification loại `INQUIRY`, xem bell icon trên header, xem dropdown preview, đánh dấu đã đọc từng cái / tất cả, xem trang lịch sử |
| **SALE** | role = SALE | Như ADMIN (nhận INQUIRY notification) |
| **CHUNG_TU** | role = CHUNG_TU | Như ADMIN (nhận INQUIRY notification) |

> Tất cả endpoint đều yêu cầu `authMiddleware` (JWT). Không có phân biệt role tại tầng API — việc phân quyền ai nhận loại notification nào được xử lý ở tầng business logic khi tạo notification (utility functions), không phải ở route.

---

## Các màn hình / luồng hiện tại

### A. Bell Icon (Header — dành cho ADMIN/SALE/CHUNG_TU)
- Icon chuông `BellOutlined` hiển thị ở góc phải header, có badge đếm số notification **chưa đọc** (loại `INQUIRY`).
- Khi click vào bell → mở **Dropdown panel** (width 380px, max-height 520px):
  - Header panel: tiêu đề "Thông báo" + nút "Đánh dấu tất cả đã đọc" (chỉ hiện khi có notification chưa đọc).
  - Body scrollable: danh sách 10 notification gần nhất (đọc + chưa đọc), nhóm theo ngày (Hôm nay / Hôm qua / DD/MM/YYYY).
  - Notification chưa đọc: nền xanh nhạt `#e6f4ff`, text in đậm.
  - Click vào 1 notification → đánh dấu cái đó đã đọc → navigate đến `/admin/customer-inquiry?inquiryId=<refId>` (hoặc `/admin/customer-inquiry` nếu không có refId).
  - Footer: nút "Xem tất cả" → navigate đến `/admin/notification-history`.
- Polling tự động: mỗi **5 giây** gọi `GET /notifications` để cập nhật số chưa đọc.
- Side-effect quan trọng: khi phát hiện có notification INQUIRY mới → dispatch `CustomEvent('inquiry:refresh')` để InquiryPage tự re-fetch (không reload trang).

### B. Product Code Badge (Menu — dành cho CUSTOMER)
- Trong sidebar menu mục "Tất cả" của Product Codes: hiển thị `Badge` đếm số notification loại `PRODUCT_CODE` chưa đọc.
- Hover vào menu item → hiển thị `Tooltip` nội dung tất cả notification chưa đọc.
- Click vào menu item "Tất cả" → tự động đánh dấu **tất cả** đã đọc, navigate đến `/admin/product-codes`.
- Hover vào menu item ≥ 1 giây + rời chuột (mouseLeave) → cũng tự động đánh dấu tất cả đã đọc (timer 1000ms).
- Browser tab title: cập nhật thành `(N) 3T Group Management` khi có N notification chưa đọc.
- Polling tự động: mỗi **5 giây** (cùng interval với staff bell).

### C. Trang lịch sử Notification (`/admin/notification-history` → `NotificationPage`)
- Hiển thị **tất cả** notification (đọc + chưa đọc) với pagination **load more** (20 items/trang).
- Nhóm theo ngày (Hôm nay / Hôm qua / DD/MM/YYYY).
- Notification chưa đọc: nền xanh nhạt, có tag "Chưa đọc".
- Click vào 1 notification:
  - Nếu chưa đọc → đánh dấu cái đó đã đọc (optimistic update).
  - Nếu type = `INQUIRY` và có `refId` → navigate đến `/customer-inquiry?inquiryId=<refId>`.
  - Nếu type = `PRODUCT_CODE` → không navigate (cursor: default).
- Không có nút "Đánh dấu tất cả đã đọc" trên trang này.

---

## API Endpoints đang có

| Method | Path | Middleware | Mô tả |
|--------|------|------------|-------|
| GET | `/api/notifications` | authMiddleware | Lấy danh sách notification **chưa đọc** (`isRead=false`) của user hiện tại, sắp xếp mới nhất. Có Redis cache 60s. |
| GET | `/api/notifications/list` | authMiddleware | Lấy **tất cả** notification (đọc + chưa đọc), sắp xếp mới nhất, hỗ trợ pagination (`page`, `limit`). Không cache. |
| PUT | `/api/notifications/read` | authMiddleware | Đánh dấu **tất cả** notification chưa đọc của user là đã đọc. Xóa cache Redis. |
| PUT | `/api/notifications/:id/read` | authMiddleware | Đánh dấu **1** notification cụ thể là đã đọc. Kiểm tra ownership (userId phải khớp). Xóa cache Redis. |

---

## Data Model hiện tại

**Bảng:** `notifications`

| Field | Kiểu | Ghi chú |
|-------|------|---------|
| `id` | Int (PK, auto) | |
| `userId` | Int (FK → User) | Người nhận notification |
| `content` | String | Nội dung thông báo — có thể là plain text hoặc JSON `{ key, params }` (dùng cho i18n) |
| `isRead` | Boolean | Mặc định `false` |
| `type` | String? | `PRODUCT_CODE` hoặc `INQUIRY`. Nullable. |
| `refId` | Int? | ID tham chiếu đến entity liên quan (ví dụ: inquiryId). Nullable. |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Quan hệ:** `User` có nhiều `Notification` (relation name: `UserNotifications`).

> **Lưu ý schema không đồng bộ:** Model trong `integration_tests/prisma/schema.prisma` **thiếu** 2 field `type` và `refId` so với production schema.

---

## Business Rules đang implement

1. **Tạo notification PRODUCT_CODE:** Gọi từ utility `createNotification(userId, productCodeIds)`. Nội dung: `"Hàng hóa của bạn vừa được cập nhật (ID: X Y Z)"` — plain text hardcoded tiếng Việt.

2. **Tạo notification INQUIRY:** Gọi từ utility `createInquiryNotification(userIds, content, inquiryId)`. Gửi cho **nhiều user cùng lúc** (`createMany`). Content truyền vào từ nơi gọi (không hardcode trong utility).

3. **Cache invalidation:** Mỗi khi tạo hoặc đánh dấu đã đọc notification → xóa cache Redis key `notifications:<userId>`. Với `createInquiryNotification` → xóa cache của tất cả userIds nhận.

4. **Ownership check** (`markOneAsRead`): Trước khi update, kiểm tra `notification.userId === req.user.userId`. Nếu không khớp → 403 Forbidden (code 99021).

5. **Idempotent mark-as-read:** `markOneAsRead` chỉ thực sự update DB nếu `isRead === false`. Nếu đã đọc rồi thì vẫn trả 200 nhưng không update.

6. **Auto-refresh InquiryPage:** Khi polling phát hiện số INQUIRY notification tăng → dispatch `window.CustomEvent('inquiry:refresh')` — pattern này coupling MainLayout với InquiryPage.

7. **Role-based polling:** Chỉ CUSTOMER và ADMIN/SALE/CHUNG_TU mới start interval polling 5s. Các role khác (nếu có) không nhận notification.

---

## Cache hiện tại

| Cache Key | TTL | Mô tả |
|-----------|-----|-------|
| `notifications:<userId>` | 60 giây | Cache kết quả `GET /notifications` (chỉ chưa đọc). Bị xóa khi có notification mới hoặc khi đánh dấu đã đọc. |

> `GET /notifications/list` **không có cache**.

---

# comment 1 [Triaged]

- Cần đổi content notification PRODUCT_CODE từ plain text hardcoded tiếng Việt sang format JSON `{ key, params }` để hỗ trợ i18n đa ngôn ngữ (vi/zh).
- Cần refactor để chỉ dùng 1 function thay cho cặp `markNotificationsAsRead` + `markAllAsRead` trong MainLayout, xóa alias đi.

# comment 2 [Triaged]
- tôi đang gặp lỗi như sau: xem lịch sử thông báo ở /admin/notification-history -> click vào 1 thông báo "Câu hỏi tư vấn mới từ ab@abv.com" -> ra trang /consulting. expect là nó mở ra popup chgi tiết câu hỏi như tôi click vào noti trong list của cái chuông