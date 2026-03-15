# Yêu cầu chức năng: Landing Page & Tư vấn khách hàng

## 1. Tổng quan

Xây dựng một landing page công khai cho phép khách hàng vãng lai gửi câu hỏi tư vấn (kèm địa chỉ email). Đội ngũ nội bộ (admin, sale, nhân viên chứng từ) sẽ xử lý và phản hồi qua email sau khi trải qua quy trình review nội bộ.

---

## 2. Landing Page (Public)

### 2.1 Form gửi câu hỏi

Khách hàng điền form với các trường thông tin riêng biệt sau:

| Trường | Bắt buộc (BE) | Ghi chú |
|---|---|---|
| **Email** | ✅ | Địa chỉ nhận phản hồi — trường duy nhất BE validate |
| **Tên sản phẩm** | ❌ | FE nên khuyến khích điền |
| **Chất liệu** | ❌ | |
| **Công dụng** | ❌ | |
| **Kích thước / kích cỡ** | ❌ | |
| **Nhãn hàng** | ❌ | Ghi "không hiệu" nếu không có |
| **Thông tin đặc thù** | ❌ | Ví dụ: có pin, điện áp, áp suất... |
| **Thông số kỹ thuật / catalogue / tem etiket** | ❌ | Khuyến khích nếu là hàng máy móc |
| **Nhu cầu** | ❌ | Ví dụ: CSNK, giá khai... |

### 2.2 Response sau khi gửi

Sau khi khách hàng submit thành công, hệ thống trả về `id` và toàn bộ nội dung câu hỏi vừa tạo.

### 2.3 URL landing page

Public URL: `/consulting` (không cần auth, không nằm trong MainLayout)

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
                                    ↓ (CHUNG_TU click notification hoặc tìm trong list)
                              PENDING_SEND  ←  Chứng từ submit lại
```

### 3.2 Danh sách trạng thái (InquiryStatus)

| Status | Mô tả |
|---|---|
| `PENDING_REVIEW` | Khách vừa gửi, chờ admin/sale review lần 1 |
| `QUESTION_REJECTED` | Admin/Sale reject câu hỏi (lần 1) |
| `PENDING_ANSWER` | Admin approve, chờ chứng từ trả lời |
| `ANSWER_REJECTED` | Admin/Sale reject câu trả lời (lần 2), chứng từ cần sửa lại |
| `PENDING_SEND` | Chứng từ đã có câu trả lời, chờ admin review lần 2 |
| `EMAIL_SENT` | Đã gửi email phản hồi khách |

### 3.3 Phân quyền theo vai trò

| Hành động | Admin / Sale | Nhân viên chứng từ |
|---|---|---|
| Xem toàn bộ câu hỏi (kể cả chưa review) | ✅ | ❌ |
| Review và approve/reject câu hỏi (lần 1) | ✅ | ❌ |
| Soạn / sửa câu trả lời | ❌ | ✅ (+ ADMIN) |
| Review và approve/reject câu trả lời (lần 2) | ✅ | ❌ |
| Kích hoạt gửi email phản hồi | ✅ (sau approve lần 2) | ❌ |

### 3.4 Visibility của Nhân viên chứng từ trong danh sách

Nhân viên chứng từ chỉ nhìn thấy những câu hỏi đã được admin/sale approve lần 1. Họ **không biết** sự tồn tại của các câu hỏi bị reject hoặc chưa qua review.

| Status | Chứng từ thấy trong danh sách? | Ghi chú |
|---|---|---|
| `PENDING_REVIEW` | ❌ | Chưa qua review lần 1, chứng từ không biết |
| `QUESTION_REJECTED` | ❌ | Bị reject trước khi chứng từ tham gia |
| `PENDING_ANSWER` | ✅ | Cần chứng từ trả lời |
| `ANSWER_REJECTED` | ✅ | Câu trả lời bị reject, chứng từ vào sửa lại |
| `PENDING_SEND` | ✅ | Đã trả lời, đang chờ admin duyệt |
| `EMAIL_SENT` | ✅ | Đã gửi email khách |

> **Lưu ý**: Chứng từ nhìn thấy trạng thái thực của câu hỏi (bao gồm `ANSWER_REJECTED`) để chủ động vào sửa lại câu trả lời. Chỉ có **email khách hàng** là bị ẩn ở BE — chứng từ không được biết thông tin liên lạc của khách.

---

## 4. Menu "Tư vấn khách hàng" (Admin Portal)

### 4.1 Danh sách câu hỏi (Table view)

Hiển thị tất cả câu hỏi với các cột:
- ID
- Email khách hàng (ẩn với CHUNG_TU)
- Tên sản phẩm
- Chất liệu
- Công dụng
- Kích thước
- Nhãn hàng
- Nhu cầu
- Trạng thái
- Thời gian gửi
- **Thời gian chờ** (real-time, tính từ lúc gửi đến khi có phản hồi — cập nhật mỗi giây trên FE, không cần gọi API)
  - Dưới 24h: hiển thị dạng `Xg Yp Zs`
  - Từ 24h trở lên: hiển thị dạng `N ngày` (chỉ đơn vị ngày, không có tuần/tháng/năm)

Trong popup chi tiết câu hỏi, có trường **Ghi chú nội bộ** (`internalNote`) cho phép tất cả nhân viên nội bộ ghi chú. Trường này:
- **Không được đưa vào email** gửi khách hàng — chỉ lưu nội bộ
- Cần có **tooltip** giải thích rõ điều này trên giao diện
- Có thể chỉnh sửa bất cứ lúc nào qua `PUT /:id/note` (ADMIN/SALE/CHUNG_TU)

**Quy tắc sắp xếp mặc định:**
1. Theo trạng thái — ưu tiên: `PENDING_REVIEW` → `PENDING_ANSWER` → `PENDING_SEND` → `EMAIL_SENT` → `ANSWER_REJECTED` → `QUESTION_REJECTED`
2. Trong cùng trạng thái: câu hỏi cũ hơn (createdAt nhỏ hơn) lên trước

**Filter và tìm kiếm:**

FE: Search bar full-width ở trên (Input với prefix icon), filter status dropdown ở dưới, nút "Tìm kiếm" và "Xóa lọc" căn phải. Layout responsive dùng `Row/Col` (Ant Design).

BE: `GET /api/inquiries` hỗ trợ thêm query params:
- `search` (string): tìm kiếm không phân biệt hoa/thường (`mode: insensitive`) trên tất cả text fields — productName, material, usage, size, brand, specialInfo, demand, techSpec, email (ẩn với CHUNG_TU). Nếu `search` là số nguyên dương → thêm tìm theo `id`.
- `status` (number): lọc theo trạng thái cụ thể (CHUNG_TU không thể lọc sang trạng thái bị ẩn).

Khi có `search` hoặc `status` → **bỏ qua Redis cache** và query DB trực tiếp. Cache chỉ áp dụng cho request không filter.

**Phân trang (Pagination):**
- Request: `GET /api/inquiries?page=1&limit=20&search=abc&status=1`
- Default: `page=1`, `limit=20`
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
- FE dùng Ant Design `Table` với server-side pagination, page size options `[20, 30, 40, 50]`

### 4.2 Link đến Landing Page

Nằm cạnh title "Tư vấn khách hàng" trên trang danh sách — dạng `Button type="link"` với icon `LinkOutlined`. Click mở landing page trong tab mới (`window.open(..., '_blank')`).

URL landing page được cấu hình qua env var `VITE_LANDING_PAGE_URL`:
- Dev: `/consulting` (cùng origin với admin portal)
- Production: có thể là domain riêng, ví dụ `https://3tgroup.vn`

> **Lưu ý deployment**: Nếu admin portal và landing page deploy trên 2 domain khác nhau thì phải set `VITE_LANDING_PAGE_URL` thành URL đầy đủ trong build production. Nếu cùng domain thì giữ nguyên path tương đối `/consulting`.

### 4.3 Action "Xem chi tiết"

Nút xem chi tiết dùng icon `EyeOutlined` (Ant Design), kiểu `Button type="text"`, có `Tooltip`. Click mở modal popup chi tiết câu hỏi.

### 4.3 Tự động mở popup qua URL

Khi người dùng điều hướng đến `/customer-inquiry?inquiryId=<id>` (ví dụ: từ click notification), trang sẽ tự động fetch inquiry theo `id` và mở modal popup tương ứng. Sau khi mở, `inquiryId` được xóa khỏi URL (`replace: true`) để tránh reopen khi F5.

**Lưu ý kỹ thuật**: `useEffect` phải có `searchParams` trong dependency array để re-run khi người dùng đang ở trang này và click notification thứ hai.

---

## 5. Email phản hồi khách hàng

Sau khi admin/sale approve câu trả lời lần 2, hệ thống tự động gửi email:

```
Từ: 3T Group

Câu hỏi của quý khách:
[Nội dung câu hỏi tổng hợp từ các trường]

Phản hồi từ chúng tôi:
[Nội dung trả lời]
```

---

## 6. Ghi chú kỹ thuật

- Tái sử dụng và mở rộng cơ chế notification hiện có (đang dùng cho tính năng cập nhật mã hàng)
- Khác biệt so với notification hiện tại: cách hiển thị và type thông báo mới
- Giữ nguyên kiến trúc: Redis cache + đối tượng `Notification`
- Menu "Tư vấn khách hàng" ở **vị trí đầu tiên** trong sidebar navigation
- Path nội bộ: `/customer-inquiry` (admin portal), `/consulting` (public landing page), `/notification-history` (lịch sử thông báo)
