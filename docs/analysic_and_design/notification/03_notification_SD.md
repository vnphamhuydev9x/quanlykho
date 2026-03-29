Version: SD-v1.0.0
Base on Requirement Version: 1.0.0

---

# 1. Data Model (Database Schema)

## Bảng & Trường

**Bảng:** `notifications`

| Field | Kiểu | Nullable | Default | Mô tả |
|-------|------|----------|---------|-------|
| `id` | Int | No | autoincrement | Primary key |
| `userId` | Int | No | — | FK → `users.id` (người nhận) |
| `content` | String | No | — | Nội dung thông báo. Hỗ trợ 2 format: plain text hoặc JSON `{ "key": "i18n.key", "params": {} }` |
| `isRead` | Boolean | No | `false` | Trạng thái đọc |
| `type` | String | Yes | `null` | Loại thông báo: `PRODUCT_CODE` hoặc `INQUIRY` |
| `refId` | Int | Yes | `null` | ID tham chiếu đến entity liên quan (ví dụ: `inquiryId`) |
| `createdAt` | DateTime | No | `now()` | Thời điểm tạo |
| `updatedAt` | DateTime | No | auto | Thời điểm cập nhật cuối |

**Quan hệ:**
- `Notification` belongs to `User` (relation name: `UserNotifications`, FK: `userId`)
- `User` has many `Notification`

> ⚠️ **Lưu ý:** Schema trong `integration_tests/prisma/schema.prisma` thiếu 2 field `type` và `refId` — cần đồng bộ khi có thời gian.

## Database Indexing Strategy

| Index | Fields | Loại | Lý do |
|-------|--------|------|-------|
| _(chưa có explicit index)_ | `(userId, isRead)` | Composite (đề xuất) | Polling mỗi 5s query `WHERE userId = ? AND isRead = false` — nên thêm index để tối ưu hiệu năng |

> Index hiện tại: chỉ có PK `id`. Trong scope hiện tại (số user nhỏ) chưa ảnh hưởng nghiêm trọng.

---

# 2. API Specification

## GET `/api/notifications`
Lấy danh sách thông báo **chưa đọc** của user hiện tại.

**Auth:** JWT (authMiddleware)

**Response 200:**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "userId": 10,
      "content": "{\"key\":\"notification.productCode\",\"params\":{\"ids\":\"123 124\"}}",
      "isRead": false,
      "type": "PRODUCT_CODE",
      "refId": null,
      "createdAt": "2026-03-29T10:00:00.000Z",
      "updatedAt": "2026-03-29T10:00:00.000Z"
    }
  ]
}
```

**Response 200 (cached):** `"message": "Success (Cached)"`

**Lưu ý:** Kết quả được cache Redis 60 giây (key: `notifications:<userId>`).

---

## GET `/api/notifications/list`
Lấy **tất cả** thông báo (đọc + chưa đọc), có pagination.

**Auth:** JWT (authMiddleware)

**Query params:**
| Param | Kiểu | Default | Mô tả |
|-------|------|---------|-------|
| `page` | Int | 1 | Trang hiện tại (min: 1) |
| `limit` | Int | 20 | Số item mỗi trang (min: 1) |

**Response 200:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [...],
    "total": 45,
    "page": 1
  }
}
```

**Lưu ý:** Không có cache. Sắp xếp `createdAt DESC`.

---

## PUT `/api/notifications/read`
Đánh dấu **tất cả** thông báo chưa đọc của user là đã đọc.

**Auth:** JWT (authMiddleware)

**Response 200:**
```json
{ "code": 200, "message": "Success" }
```

**Side effect:** Xóa cache Redis key `notifications:<userId>`.

---

## PUT `/api/notifications/:id/read`
Đánh dấu **1** thông báo cụ thể là đã đọc.

**Auth:** JWT (authMiddleware)

**Path param:** `id` — notification ID (Int)

**Response:**
| Code | Mô tả |
|------|-------|
| 200 | Thành công (kể cả nếu đã đọc rồi — idempotent) |
| 400 | `id` không hợp lệ — `{ "code": 99011, "message": "Invalid id" }` |
| 403 | Notification không thuộc user này — `{ "code": 99021, "message": "Forbidden" }` |
| 404 | Notification không tồn tại — `{ "code": 404, "message": "Notification not found" }` |
| 500 | Lỗi server — `{ "code": 99500, "message": "Internal Server Error" }` |

**Side effect:** Xóa cache Redis key `notifications:<userId>` (chỉ khi thực sự cập nhật từ `isRead=false` → `true`).

---

# 3. Cache Strategy (Redis)

| Cache Key | TTL | Nội dung | Invalidation |
|-----------|-----|----------|-------------|
| `notifications:<userId>` | 60 giây | Mảng notification chưa đọc của user | Xóa khi: tạo notification mới cho user, `markAllAsRead`, `markOneAsRead` (nếu trạng thái thay đổi) |

**Lưu ý:**
- Endpoint `GET /notifications/list` **không có cache**.
- Redis error được xử lý silent (chỉ log) — không ảnh hưởng flow chính.

---

# 4. Core Business Logic & Workflows

## §4.1 Tạo Notification

### PRODUCT_CODE (1 user)
**Function:** `createNotification(userId, productCodeIds)` — `src/utils/notification.js`

**Flow:**
1. Validate: `userId` và `productCodeIds` không rỗng.
2. Tạo record `Notification` với:
   - `type = PRODUCT_CODE`
   - `content` = ⚠️ **Hiện tại: plain text hardcoded tiếng Việt** — cần đổi sang JSON `{ key, params }` (xem BE Task).
   - `refId = null`
3. Xóa cache Redis `notifications:<userId>`.
4. **Fire-and-forget:** Toàn bộ logic trong try/catch — lỗi chỉ log, không throw.

### INQUIRY (nhiều users)
**Function:** `createInquiryNotification(userIds, content, inquiryId)` — `src/utils/notification.js`

**Flow:**
1. Validate: `userIds` không rỗng.
2. Dùng `prisma.notification.createMany()` tạo notification cho tất cả `userIds` cùng lúc:
   - `type = INQUIRY`
   - `refId = inquiryId`
   - `content` = truyền vào từ caller (dạng JSON i18n).
3. Xóa cache Redis cho **tất cả** `userIds`.
4. **Fire-and-forget:** Như trên.

---

## §4.2 Mark As Read

### Mark All (`PUT /notifications/read`)
- `updateMany` tất cả `{ userId, isRead: false }` → `isRead: true`.
- Xóa cache Redis.

### Mark One (`PUT /notifications/:id/read`)
- **Ownership check:** `notification.userId === req.user.userId` → nếu không khớp, trả 403.
- **Idempotent:** Chỉ update DB nếu `isRead === false`. Nếu đã đọc → trả 200 không làm gì.
- Xóa cache Redis (chỉ khi có update thực sự).

---

## §4.3 Frontend Polling & Realtime Behavior

**Polling interval:** 5 giây (HTTP polling, không dùng WebSocket/SSE).

**Các role có polling:**
- `CUSTOMER` (userType = CUSTOMER)
- `ADMIN`, `SALE`, `CHUNG_TU` (staff roles với `isStaffWithNotif`)

**Side effect INQUIRY detection:**
- Khi polling phát hiện số notification INQUIRY tăng so với lần trước → dispatch `window.CustomEvent('inquiry:refresh')` để `InquiryPage` re-fetch data.
- Dùng `prevNotifCountRef` (useRef, init = -1) để tránh false-positive lần đầu load trang.

**Browser tab title:** `(N) 3T Group Management` khi N > 0, `3T Group Management` khi N = 0.

---

## §4.4 Content Format

Trường `content` hỗ trợ 2 format:

| Format | Ví dụ | Cách hiển thị |
|--------|-------|---------------|
| Plain text | `"Hàng hóa của bạn vừa được cập nhật (ID: 123)"` | Hiển thị trực tiếp |
| JSON i18n | `{"key":"notification.productCode","params":{"ids":"123 124"}}` | `t(parsed.key, parsed.params)` |

Frontend (`parseNotifContent`) đã hỗ trợ cả 2 format — `try JSON.parse()`, nếu lỗi thì dùng content as-is.

---

## §4.5 Notification Type Rules

| Type | Tạo khi | refId | Điều hướng khi click |
|------|---------|-------|---------------------|
| `PRODUCT_CODE` | Hàng hóa của CUSTOMER được cập nhật | `null` | Không navigate (chỉ đánh dấu đã đọc) |
| `INQUIRY` | Sự kiện trong flow xử lý yêu cầu khách hàng | `inquiryId` | `/admin/customer-inquiry?inquiryId=<refId>` |
