# Yêu cầu chức năng: Hệ thống thông báo (Notification) — Triển khai thực tế

## 1. Kiến trúc tổng quan

Tái sử dụng bảng `Notification` và cơ chế cũ (vốn dùng cho notification mã hàng). Thêm `type = 'INQUIRY'` và `refId = inquiry.id` để phân biệt.

**Các events sinh notification:**

| Sự kiện | Nhận notification | Nội dung (i18n key) |
|---|---|---|
| Khách gửi câu hỏi mới | ADMIN, SALE | `notification.newInquiry` |
| Admin approve lần 1 (→ PENDING_ANSWER) | CHUNG_TU | `notification.inquiryNeedsAnswer` |
| CHUNG_TU submit câu trả lời (→ PENDING_SEND) | ADMIN, SALE | `notification.inquiryAnswered` |
| Admin reject câu trả lời (→ ANSWER_REJECTED) | CHUNG_TU | `notification.answerRejected` |

---

## 2. Nội dung thông báo đa ngôn ngữ (i18n)

**Vấn đề**: Notification được lưu vào DB tại thời điểm tạo, nhưng người dùng có thể xem ở ngôn ngữ khác (vi/zh).

**Giải pháp**: BE lưu nội dung theo dạng JSON key thay vì plain text:

```json
{ "key": "notification.newInquiry", "params": { "email": "nguyen.a@gmail.com" } }
```

FE parse JSON tại thời điểm render và dùng `t(key, params)` để dịch sang ngôn ngữ hiện tại. Fallback về plain text nếu parse lỗi (tương thích ngược với notification cũ).

**i18n keys** (trong `locales/vi/translation.json` và `locales/zh/translation.json`):
```json
"notification": {
  "newInquiry": "Câu hỏi mới từ {{email}}",
  "inquiryNeedsAnswer": "Câu hỏi từ {{email}} cần trả lời",
  "inquiryAnswered": "Câu hỏi từ {{email}} đã có câu trả lời, chờ duyệt",
  "answerRejected": "Câu trả lời cho câu hỏi #{{id}} bị từ chối, cần sửa lại",
  "pageTitle": "Lịch sử thông báo",
  "viewAll": "Xem tất cả",
  "unread": "Chưa đọc",
  "loadMore": "Tải thêm",
  "noMore": "Đã hiển thị tất cả",
  "empty": "Không có thông báo"
}
```

---

## 3. Badge count — Polling chưa đọc

FE polling `GET /notifications` mỗi **5 giây** để lấy danh sách notification **chưa đọc** (`isRead: false`) của user hiện tại.

- Số lượng chưa đọc hiển thị dưới dạng badge đỏ trên icon chuông trong header
- Đồng thời cập nhật **browser tab title**: `(N) 3T Group Management` (N = số chưa đọc); về lại `3T Group Management` khi không còn unread
- Chỉ áp dụng cho roles: ADMIN, SALE, CHUNG_TU

**API**: `GET /api/notifications` → trả về array các notification chưa đọc

---

## 4. Bell dropdown — Hiển thị khi click chuông

Khi người dùng mở dropdown chuông, FE gọi riêng `GET /notifications/list?page=1&limit=10` để lấy **tất cả** notification (đọc + chưa đọc), sắp xếp mới nhất trước.

**Hiển thị trong dropdown:**
- Grouped theo ngày: "Hôm nay", "Hôm qua", "DD/MM/YYYY"
- Notification chưa đọc: nền `#e6f4ff` (xanh nhạt), icon màu xanh `#1677ff`
- Notification đã đọc: nền trắng, icon xám
- Footer: link "Xem tất cả" → `/notification-history`
- Nút "Đánh dấu tất cả đã đọc" gọi `PUT /notifications/read`

**Lưu ý**: Badge count (polling) và dropdown items dùng **hai API riêng biệt**. Badge dùng `/notifications` (chỉ unread, nhẹ). Dropdown dùng `/notifications/list` (full list, chỉ fetch khi mở).

---

## 5. Click notification — Điều hướng & mark as read

Khi click một notification có `type = INQUIRY` và `refId`:
1. Điều hướng đến `/customer-inquiry?inquiryId=<refId>`
2. Trang `/customer-inquiry` đọc `inquiryId` từ URL, fetch inquiry, tự động mở popup modal
3. Notification được đánh dấu đã đọc (qua `PUT /notifications/read` — mark all)
4. Local state cập nhật ngay lập tức không cần reload

**Lưu ý kỹ thuật**: `useEffect` ở `InquiryPage` phải có `searchParams` trong dependency array để re-run khi người dùng đang ở trang này và click notification thứ hai.

---

## 6. Trang Lịch sử thông báo (`/notification-history`)

Trang riêng hiển thị toàn bộ lịch sử notification của user.

**Tính năng:**
- Grouped theo ngày với label "Hôm nay / Hôm qua / DD/MM/YYYY" (dùng `dayjs`)
- Phân biệt đọc/chưa đọc: nền `#e6f4ff` + Tag "Chưa đọc" + icon xanh cho unread
- Hiển thị giờ cụ thể (`HH:mm:ss`) dưới mỗi item
- **Load more**: mỗi lần tải 20 item, click "Tải thêm" để load trang tiếp theo; hiển thị "Đã hiển thị tất cả" khi hết
- Click item chưa đọc → gọi `markAllAsRead()` + cập nhật local state (tất cả thành đã đọc) + navigate đến inquiry

**API pagination:**
```
GET /api/notifications/list?page=1&limit=20
→ { code: 200, data: { items: [...], total: N, page: 1 } }
```

---

## 7. Backend API notifications

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/notifications` | Lấy danh sách chưa đọc (dùng cho polling badge) |
| `GET` | `/notifications/list` | Lấy tất cả (đọc + chưa đọc), có pagination |
| `PUT` | `/notifications/read` | Mark tất cả là đã đọc |

`GET /notifications/list` không cache Redis (data thay đổi thường xuyên).
