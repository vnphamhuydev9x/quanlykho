Version: v1.0.7

# Functional Requirements

## 1. Landing Page công khai (Guest)

### 1.1 Form gửi câu hỏi

Khách hàng vãng lai gửi câu hỏi tư vấn qua form công khai. Các trường thông tin:

| Trường | Bắt buộc (BE) | Ẩn với CHUNG_TU | Ghi chú |
|---|---|---|---|
| **Email** | ✅ | ✅ | Địa chỉ nhận phản hồi — trường duy nhất BE validate |
| **Tên khách hàng** | ❌ | ✅ | Thông tin nhận diện khách hàng |
| **Ngành nghề kinh doanh** | ❌ | ✅ | |
| **Số điện thoại** | ❌ | ✅ | |
| Tên sản phẩm | ❌ | ❌ | |
| Chất liệu | ❌ | ❌ | |
| Công dụng | ❌ | ❌ | |
| Kích thước / kích cỡ | ❌ | ❌ | |
| Nhãn hàng | ❌ | ❌ | Ghi "không hiệu" nếu không có |
| Thông tin đặc thù | ❌ | ❌ | Ví dụ: có pin, điện áp, áp suất... |
| Thông số kỹ thuật / catalogue / tem etiket | ❌ | ❌ | Khuyến khích nếu là hàng máy móc |
| Nhu cầu | ❌ | ❌ | Ví dụ: CSNK, giá khai... |
| **Ảnh sản phẩm** | ❌ | ❌ | Upload tối đa 1 ảnh |

### 1.2 Response sau khi gửi

Hệ thống trả về `id` và toàn bộ nội dung câu hỏi vừa tạo. FE hiển thị màn hình xác nhận với **đầy đủ tất cả các trường** khách hàng đã điền, bao gồm: Tên sản phẩm, Chất liệu, Công dụng, Kích thước, Nhãn hàng, Thông tin đặc thù, Thông số kỹ thuật, Nhu cầu, **Ảnh sản phẩm** (nếu có), **Tên khách hàng**, **Ngành nghề kinh doanh**, **Số điện thoại** (nếu có).

### 1.3 Hotline

Trên landing page hiển thị số hotline. Số hotline phải được **cấu hình qua env var** (không hardcode trong code).

---

## 2. Menu "Tư vấn khách hàng" (Admin Portal)

### 2.1 Vị trí và điều hướng

- Menu ở **vị trí đầu tiên** trong sidebar navigation.
- Path URL: `/customer-inquiry`.
- Có **link đến landing page** nằm **cạnh title "Tư vấn khách hàng"** (không phải sublink riêng) — dạng button/icon inline. URL cấu hình qua env var `VITE_LANDING_PAGE_URL` (configable cho dev/production).

### 2.2 Danh sách câu hỏi

- Table hiển thị đầy đủ các cột: ID, Email khách hàng (ẩn với CHUNG_TU), Tên khách hàng (ẩn với CHUNG_TU), Ngành nghề kinh doanh (ẩn với CHUNG_TU), Số điện thoại (ẩn với CHUNG_TU), Tên sản phẩm, Chất liệu, Công dụng, Kích thước, Nhãn hàng, Nhu cầu, **Ảnh sản phẩm** (thumbnail, hiển thị với tất cả vai trò), Trạng thái, Thời gian gửi, Thời gian chờ.
- **Cột thời gian chờ** (real-time, FE cập nhật mỗi giây, không gọi API):
  - < 24h: hiển thị `Xg Yp Zs`
  - ≥ 24h: hiển thị `N ngày` (chỉ đơn vị ngày, không có tuần/tháng/năm)
- **Nút xem chi tiết**: dùng icon mắt (EyeOutlined). **Chỉ click vào icon mắt mới mở popup chi tiết** — click vào dòng table (row click) không kích hoạt bất kỳ hành động nào.
- **Phân biệt dòng**: Không dùng zebra striping (màu xen kẽ trắng/xám gây rối mắt khi kết hợp với hover). Sử dụng Ant Design default hover highlight để phân biệt dòng khi di chuột.
- **Preview ảnh thumbnail**: Click vào ảnh thumbnail trong table phải hiển thị image preview với **nền tối mờ (dark overlay)** và đầy đủ các nút điều hướng (đóng, xoay, zoom) — đồng nhất với trải nghiệm preview ảnh trong modal chi tiết.
- **Phân trang** server-side; default 20 items/trang; page size options: `[20, 30, 40, 50]`.

**Thứ tự sắp xếp mặc định:**
1. Theo trạng thái — ưu tiên: `PENDING_REVIEW` → `PENDING_ANSWER` → `PENDING_SEND` → `EMAIL_SENT` → `ANSWER_REJECTED` → `QUESTION_REJECTED`
2. Trong cùng trạng thái: câu hỏi cũ hơn (createdAt nhỏ hơn) lên trước.

**Filter và tìm kiếm:**

- Filter theo trạng thái: dropdown hiển thị các trạng thái **theo đúng thứ tự sort priority** (`PENDING_REVIEW` → `PENDING_ANSWER` → `PENDING_SEND` → `EMAIL_SENT` → `ANSWER_REJECTED` → `QUESTION_REJECTED`).
- Full-text search theo ID và nội dung câu hỏi (không phân biệt hoa/thường trên tất cả các text field).
- CHUNG_TU không thể filter theo các trạng thái bị ẩn (`PENDING_REVIEW`, `QUESTION_REJECTED`).
- **UI layout**: Search bar full-width ở trên (Input với prefix icon), filter status dropdown ở dưới, nút "Tìm kiếm" và "Xóa lọc" căn phải. Layout responsive dùng `Row/Col` (Ant Design), CSS đồng nhất với menu Khách hàng.

### 2.3 Trường ghi chú nội bộ

Mỗi câu hỏi có trường **Ghi chú nội bộ** (`internalNote`):
- **Không được đưa vào email** gửi khách hàng — chỉ lưu nội bộ.
- Có **tooltip** giải thích rõ điều này trên giao diện.
- Tất cả nhân viên nội bộ có thể chỉnh sửa bất cứ lúc nào.

---

## 3. Quy trình xử lý nội bộ

### 3.1 Luồng xử lý tổng quát

```
Khách gửi câu hỏi  →  PENDING_REVIEW
       ↓
Admin/Sale review lần 1
  ├── Approve  →  PENDING_ANSWER  →  [Notify CHUNG_TU]  →  Chứng từ soạn trả lời
  └── Reject   →  QUESTION_REJECTED  (chứng từ không biết, không nhìn thấy)
                              ↓
              PENDING_SEND  ←  Chứng từ submit câu trả lời
                              ↓
              Admin/Sale review câu trả lời (lần 2)
                ├── Approve  →  EMAIL_SENT  →  Hệ thống gửi email khách
                └── Reject   →  ANSWER_REJECTED  →  [Notify CHUNG_TU sửa lại]
                                    ↓
                              PENDING_SEND  ←  Chứng từ submit lại
```

### 3.2 Danh sách trạng thái (InquiryStatus)

| Status | Mô tả |
|---|---|
| `PENDING_REVIEW` | Khách vừa gửi, chờ admin/sale review lần 1 |
| `QUESTION_REJECTED` | Admin/Sale reject câu hỏi (lần 1) |
| `PENDING_ANSWER` | Admin approve, chờ chứng từ trả lời |
| `PENDING_SEND` | Chứng từ đã trả lời, chờ admin review lần 2 |
| `ANSWER_REJECTED` | Admin/Sale reject câu trả lời (lần 2), chứng từ cần sửa lại |
| `EMAIL_SENT` | Đã gửi email phản hồi khách |

### 3.3 Phân quyền theo vai trò

| Hành động | Admin / Sale | CHUNG_TU |
|---|---|---|
| Xem toàn bộ câu hỏi (kể cả chưa review) | ✅ | ❌ |
| Review và approve/reject câu hỏi (lần 1) | ✅ | ❌ |
| Soạn / sửa câu trả lời | ❌ | ✅ (+ ADMIN) |
| Review và approve/reject câu trả lời (lần 2) | ✅ | ❌ |
| Kích hoạt gửi email phản hồi | ✅ (sau approve lần 2) | ❌ |

### 3.4 Visibility của CHUNG_TU trong danh sách

| Status | CHUNG_TU thấy? | Ghi chú |
|---|---|---|
| `PENDING_REVIEW` | ❌ | Chưa qua review lần 1 |
| `QUESTION_REJECTED` | ❌ | Bị reject trước khi chứng từ tham gia |
| `PENDING_ANSWER` | ✅ | Cần chứng từ trả lời |
| `PENDING_SEND` | ✅ | Đã trả lời, đang chờ admin duyệt |
| `ANSWER_REJECTED` | ✅ | Câu trả lời bị reject — chứng từ nhìn thấy trạng thái thực để chủ động sửa lại |
| `EMAIL_SENT` | ✅ | Đã gửi email khách |

> **Lưu ý**: CHUNG_TU thấy trạng thái thực (kể cả `ANSWER_REJECTED`) để chủ động vào sửa lại. **Các trường thông tin khách hàng (email, tên khách hàng, ngành nghề kinh doanh, số điện thoại) bị ẩn ở BE** — CHUNG_TU không được biết thông tin liên lạc của khách. CHUNG_TU chỉ nhìn thấy **duy nhất menu "Tư vấn khách hàng"**, không thấy các menu khác. CHUNG_TU không có option filter theo `PENDING_REVIEW` và `QUESTION_REJECTED`.

---

## 4. Email phản hồi khách hàng

Sau khi admin/sale approve câu trả lời lần 2, hệ thống tự động gửi email:

```
Từ: 3T Group

Câu hỏi của quý khách:
[Nội dung câu hỏi tổng hợp từ các trường]

Phản hồi từ chúng tôi:
[Nội dung trả lời]
```

---

# Nonfunctional Requirements

## 1. Hệ thống Notification

### 1.1 Giao diện

- Icon **chuông** cạnh avatar người dùng.
- Số lượng noti chưa đọc hiển thị trên **tab browser**.
- Click chuông → dropdown danh sách noti:
  - Sorted mới nhất lên đầu.
  - Màu nền phân biệt **chưa đọc** / **đã đọc**.
  - **Gộp thông báo theo từng ngày** (ở cả dropdown và trang lịch sử).
  - Nút "Đã đọc tất cả".
- Click noti câu hỏi → điều hướng đến `/customer-inquiry?inquiryId=<id>` → tự động mở popup → đánh dấu đã đọc; đồng thời fetch lại danh sách câu hỏi.

### 1.2 Trang lịch sử thông báo

- Path: `/notification-history`.
- Phân trang, có nút **load more**.
- Sorted mới nhất lên đầu; màu nền phân biệt đã đọc / chưa đọc.
- Gộp thông báo **theo từng ngày**.

### 1.3 Polling

- FE scan **5 giây/lần** để kiểm tra noti mới. Khi có noti mới về inquiry → fetch lại danh sách câu hỏi.

### 1.4 Phân loại noti theo vai trò

| Sự kiện | Admin / Sale | CHUNG_TU |
|---|---|---|
| Câu hỏi mới từ khách | ✅ | ❌ |
| Câu hỏi được approve lần 1 | ❌ | ✅ |
| Chứng từ submit câu trả lời | ✅ | ❌ |
| Câu trả lời bị reject (ANSWER_REJECTED) | ❌ | ✅ |
| Câu trả lời được approve, email đã gửi | ✅ | ❌ |

### 1.5 Đa ngôn ngữ

- Nội dung notification hỗ trợ **Tiếng Việt** và **Tiếng Trung**.
- FE hiển thị theo ngôn ngữ hiện tại của người dùng.

## 3. Image URL

- Tất cả `imageUrl` trả về trong API response phải là **absolute URL bao gồm host** (ví dụ: `https://api.example.com/uploads/...`), không phải relative path.
- **BE có trách nhiệm** xây dựng URL đầy đủ trước khi trả response. Client (FE) không cần và không được tự ghép host.

## 2. Phân trang (Pagination)

- Danh sách câu hỏi phân trang server-side.
- Default: 20 items/trang; page size options: `[20, 30, 40, 50]`.
- Request: `GET /api/inquiries?page=1&limit=20&search=abc&status=1`.
- Response format:
  ```json
  {
    "code": 200,
    "data": {
      "items": [...],
      "total": 100,
      "page": 1,
      "totalPages": 5
    }
  }
  ```
