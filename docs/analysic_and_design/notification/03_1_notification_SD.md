Version: SD-v1.0.1
Base on Requirement Version: v1.0.0

---

# 1. Data Model (Database Schema)

## 1.1 Bảng `notifications`

| Cột | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| `id` | Int | ✅ | autoincrement | PK |
| `userId` | Int | ✅ | — | FK → `users.id` — người nhận |
| `content` | String | ✅ | — | JSON string `{ key, params }` hỗ trợ i18n, hoặc plain text |
| `isRead` | Boolean | ✅ | `false` | Trạng thái đã đọc |
| `type` | String? | ❌ | null | `"PRODUCT_CODE"` hoặc `"INQUIRY"` |
| `refId` | Int? | ❌ | null | ID entity liên quan (inquiryId, productCodeId...) |
| `createdAt` | DateTime | ✅ | now() | — |
| `updatedAt` | DateTime | ✅ | updatedAt | — |

**Quan hệ**: Notification N→1 User (một user có nhiều notification).

## 1.2 Notification Types

| Type | Mô tả | Content format |
|---|---|---|
| `INQUIRY` | Sự kiện trong luồng tư vấn khách hàng | JSON string `{ "key": "notification.xxx", "params": {...} }` |
| `PRODUCT_CODE` | Mã hàng của khách hàng được cập nhật lên xe | Plain text |

---

# 2. API Specification

## 2.1 Routes (tất cả yêu cầu `authMiddleware`)

### GET `/api/notifications`

Lấy danh sách thông báo **chưa đọc** của user hiện tại (dùng cho dropdown chuông).

**Response 200**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 10,
      "userId": 3,
      "content": "{\"key\":\"notification.newInquiry\",\"params\":{\"email\":\"a@b.com\"}}",
      "isRead": false,
      "type": "INQUIRY",
      "refId": 42,
      "createdAt": "2025-03-16T10:00:00Z",
      "updatedAt": "2025-03-16T10:00:00Z"
    }
  ]
}
```

**Caching**: Redis key `notifications:{userId}`, TTL 60 giây. Invalidate khi có notification mới hoặc mark as read.

**Sort**: `createdAt DESC` (mới nhất lên đầu).

---

### GET `/api/notifications/list`

Lấy **toàn bộ** lịch sử thông báo (đọc + chưa đọc) — dùng cho trang `/notification-history`.

**Query params**:
| Param | Type | Mặc định |
|---|---|---|
| `page` | number | 1 |
| `limit` | number | 20 |

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1
  }
}
```

**Sort**: `createdAt DESC`. Không cache.

---

### PUT `/api/notifications/read`

Đánh dấu **tất cả** thông báo chưa đọc của user là đã đọc.

**Response 200**: `{ "code": 200, "message": "Success" }`

**Side effects**: Invalidate Redis cache của user.

---

### PUT `/api/notifications/:id/read`

Đánh dấu **một** thông báo cụ thể là đã đọc.

**Validation**: Notification phải thuộc về user hiện tại (`userId === req.user.id`) → 403 nếu sai.

**Response 200**: `{ "code": 200, "message": "Success" }`
**Response 404**: `{ "code": 404, "message": "Notification not found" }`

**Side effects**: Invalidate Redis cache của user.

---

## 2.2 Utility Functions (Backend — không phải REST API)

### `createInquiryNotification(userIds, content, inquiryId)`

Tạo notification hàng loạt cho nhiều user trong một lần gọi.

| Param | Type | Ghi chú |
|---|---|---|
| `userIds` | `number[]` | Danh sách userId nhận notification |
| `content` | `string` | JSON string `{ key, params }` — i18n key |
| `inquiryId` | `number` | refId của inquiry liên quan |

**Hành vi**:
- Dùng `createMany()` để insert batch
- `type = "INQUIRY"`, `refId = inquiryId`, `isRead = false`
- Invalidate Redis cache của **tất cả** userId được notify (Promise.all)

### `createNotification(userId, productCodeIds)`

Tạo notification cho 1 user về việc mã hàng được cập nhật lên xe.
- `type = "PRODUCT_CODE"`, không có `refId`
- Nội dung: plain text danh sách ID mã hàng

---

# 3. Core Business Logic & Workflows

## 3.1 Caching Strategy

| Redis key | TTL | Nội dung | Invalidate khi |
|---|---|---|---|
| `notifications:{userId}` | 60s | Danh sách noti chưa đọc | `createInquiryNotification`, `createNotification`, `markAsRead`, `markOneAsRead` |

**Lưu ý**: Chỉ GET unread (`/api/notifications`) được cache. Endpoint list history (`/list`) không cache.

## 3.2 Mark as Read — Constraint quan trọng

- **`PUT /read`** (mark all): Dùng `updateMany({ where: { userId, isRead: false } })` — chỉ ảnh hưởng notification của chính user đó.
- **`PUT /:id/read`** (mark one): Phải validate `notification.userId === req.user.id` trước khi update — **chỉ đánh dấu đúng 1 notification được chỉ định**, không ảnh hưởng các notification khác. Đây là constraint bắt buộc để tránh bug "click 1 noti → tất cả bị đánh dấu đã đọc".

## 3.3 i18n Content Format

Notification loại `INQUIRY` lưu content là JSON string để FE có thể dịch theo ngôn ngữ người dùng:

```json
{ "key": "notification.newInquiry", "params": { "email": "customer@example.com" } }
```

FE parse content → nếu là JSON hợp lệ thì render bằng `i18next.t(key, params)`, ngược lại render plain text. Hỗ trợ vi/zh.

**Các i18n key của INQUIRY**:

| Key | Người nhận | Trigger |
|---|---|---|
| `notification.newInquiry` | ADMIN, SALE | Khách gửi câu hỏi mới |
| `notification.inquiryNeedsAnswer` | CHUNG_TU | Admin/Sale approve câu hỏi lần 1 |
| `notification.inquiryAnswered` | ADMIN, SALE | Chứng từ submit câu trả lời |
| `notification.answerRejected` | CHUNG_TU | Admin/Sale reject câu trả lời lần 2 |

## 3.4 FE Polling & Real-time Badge

- FE poll `GET /api/notifications` mỗi **5 giây**.
- Khi số lượng noti chưa đọc > 0: hiển thị badge đỏ trên icon chuông + cập nhật document title thành `(N) 3T Group Management`.
- Khi phát hiện có noti mới loại `INQUIRY`: đồng thời fetch lại danh sách inquiry (`GET /api/inquiries`).
- **Initialization Guard**: Lần poll **đầu tiên** khi component khởi tạo KHÔNG trigger inquiry refresh — dùng sentinel value (ví dụ `-1`) để phân biệt trạng thái "chưa khởi tạo" với "đã có 0 noti". Chỉ từ lần poll thứ 2 trở đi mới so sánh count tăng lên để kích hoạt re-fetch.

## 3.5 Dropdown UI — Constraints

- Dropdown có **chiều cao đủ lớn** (tránh quá ngắn, user phải scroll nhiều).
- Danh sách thông báo sorted mới nhất lên đầu, **nhóm theo ngày**.
- Nút **"Xem tất cả"** được **sticky ở dưới cùng** dropdown — luôn hiển thị, không bị che bởi danh sách dù list dài.
- Màu nền phân biệt chưa đọc / đã đọc.

## 3.6 Trang Lịch Sử Thông Báo (`/notification-history`)

- Phân trang server-side, mặc định 20 items/trang, có nút **load more**.
- Sort: `createdAt DESC`.
- Nhóm theo ngày (FE xử lý grouping từ data API).
- Phân biệt đã đọc / chưa đọc bằng màu nền.
- Click noti chưa đọc → gọi `PUT /api/notifications/:id/read` → đánh dấu đã đọc → điều hướng đến nội dung liên quan (nếu là INQUIRY: `/customer-inquiry?inquiryId={refId}`).

## 3.7 Phân quyền

Tất cả API notification chỉ yêu cầu `authMiddleware` (không cần roleMiddleware). Mỗi user chỉ thấy và thao tác được notification của chính họ — enforcement ở `WHERE userId = req.user.id`.
