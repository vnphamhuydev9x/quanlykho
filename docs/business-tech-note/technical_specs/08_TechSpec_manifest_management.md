
# Tài liệu kỹ thuật: Module Quản lý Xếp xe (Manifest)

## 1. Tổng quan
Module **Quản lý Xếp xe (Manifest)** dùng để quản lý các chuyến xe vận chuyển hàng hóa từ TQ về VN. Một chuyến xe chứa nhiều mã hàng (Product Code).
- **Mục tiêu**: Gom nhóm Product Codes thành các chuyến xe (Manifests), theo dõi trạng thái chuyến xe và thống kê khối lượng/trọng lượng.
- **Đối tượng**: Admin, Sale/User. (Customer KHÔNG có quyền truy cập).

## 2. Thiết kế Database (Prisma)

Sử dụng 2 Models chính: `Manifest` và `ProductCode` (có quan hệ 1-N).

### 2.1 Model `Manifest` (Chuyến xe)

| Trường (Prisma) | Kiểu dữ liệu | Default | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `Int` | Tự tăng | PK |
| `name` | `String` | | Tên chuyến xe (Vd: "Chuyến HN 02/02") |
| `date` | `DateTime` | `now()` | Ngày xếp xe |
| `status` | `String` | `OPEN` | Enum: `OPEN`, `CLOSED`, `SHIPPED` |
| `note` | `String?`| | Ghi chú |
| `productCodes` | `ProductCode[]`| | Relation (1-N) |
| `createdAt` | `DateTime` | `now()` | |
| `updatedAt` | `DateTime` | | Auto update |
| `deletedAt` | `DateTime?`| | Soft delete |

### 2.2 Model `ProductCode` (Cột liên quan tới Manifest)
- `manifestId` (`Int?`): Foreign key trỏ tới `Manifest.id`.
- `status` (`String?`): Cần cập nhật thành `CHO_XEP_XE` hoặc `DA_XEP_XE` tùy thuộc vào việc có nằm trong Manifest hay không.

## 3. Đặc tả API (API Specification)

Base URL: `/api/manifests`

### 3.1 Caching Strategy (Server-side Redis)
1.  **List (`GET /`)**:
    *   **TTL**: **5 phút**.
    *   Invalidate: `POST`, `PUT`, `DELETE` delete keys `manifests:list:*`.
2.  **Detail (`GET /:id`)**:
    *   **TTL**: **10 phút**.
    *   Invalidate: `PUT`, `DELETE` đúng ID đó -> Xóa key.
3.  **Lưu ý**: Khách hàng không truy cập nên dữ liệu này ít bị request đồng thời lớn, Cache chủ yếu để giảm tải Dashboard/Navigation nội bộ.

### 3.2 Endpoints (CRUD)

#### GET / - Danh sách chuyến xe
- **Logic**: 
  - Trả về danh sách `Manifest`.
  - Dùng `_count` của Prisma để lấy tổng số `productCodes` trong từng chuyến xe.
  - Sắp xếp: Gần nhất (`createdAt` DESC).

#### POST / - Tạo mới
- **Quyền**: `ADMIN`, `SALE`, `USER`.
- **Logic**: Tạo `Manifest` với `name`, `date` (mặc định hôm nay), `note`. Trạng thái mặc định `OPEN`.

#### PUT /:id - Cập nhật
- **Logic**: Cập nhật `name`, `date`, `note`, `status` (`OPEN`, `CLOSED`, `SHIPPED`).

#### DELETE /:id - Xóa chuyến xe
- **Logic quan trọng**:
  1. Transaction (Giao dịch DB):
  2. Lấy danh sách `productId` thuộc `Manifest` này.
  3. Cập nhật các ProductCode đó: `manifestId = null`, `status = 'CHO_XEP_XE'`.
  4. Đánh dấu `deletedAt` cho `Manifest` này.
  5. **Notification**: Gửi thông báo cho các Customers có hàng trong chuyến vừa bị trả về trạng thái `CHO_XEP_XE`.

### 3.3 Endpoints (Quản lý hàng trong chuyến)

#### GET /:id/products - Danh sách hàng hóa trong chuyến
- **Logic**:
  - Trả về `ProductCode` có `manifestId = :id`.
  - Kèm theo thông tin Summary: `Tổng kiện` (`packageCount`), `Tổng Trọng lượng` (`weight`), `Tổng Khối lượng` (`volume`) tính toán qua `aggregate`.

#### GET /available-products - Danh sách hàng CHỜ XẾP XE
- **Logic**: Lấy danh sách `ProductCode` thỏa mãn điều kiện `manifestId = null` AND `status = 'CHO_XEP_XE'`.

#### POST /:id/products - Thêm hàng vào chuyến
- **Body**: `{ productIds: [1, 2, 3] }`
- **Logic**: 
  1. Validate trạng thái của các `productIds` phải là `CHO_XEP_XE` và `manifestId == null`.
  2. Transaction: Update các `ProductCode` với `manifestId = :id` và `status = 'DA_XEP_XE'`.
  3. **Notification**: Thông báo cho Customer (hàng đã được xếp).

#### DELETE /:id/products/:productId - Rút hàng khỏi chuyến
- **Logic**:
  1. Transaction: Update `ProductCode` với `manifestId = null` và `status = 'CHO_XEP_XE'`.
  2. **Notification**: Thông báo cho Customer (hàng bị rút khỏi chuyến).

#### GET /:id/export - Xuất Excel
- **Logic**: Xuất tất cả các hàng trong chuyến ra file `XepXe_{manifest.name}.xlsx`. Map 8 cột (Khách hàng, Tên hàng, Mã đơn, Số kiện, Đóng gói, TL, KL, Trạng thái ảnh).

## 4. Frontend Logic & Performance

### 4.1 UI Layout
- Màn hình chia thành **Danh sách Master** (Chuyến xe) và **Màn Chi tiết Detail** (Hàng hóa trong chuyến xe).
- Trong màn Detail, có Table danh sách hiện tại và Popup (Modal) chứa Table chọn hàng `CHO_XEP_XE`.

### 4.2 State Management
- FE không dùng Client-side stale cache lâu dài, mỗi lần action Thêm/Xóa kiện hàng đều fetch lại Summary Report (Tổng kiện, TL, KL) hoặc tự +/- số liệu realtime trên Local State trước khi re-fetch để UX mượt.
- **Status Tags**: Hiển thị rõ màu sắc trực quan (Open: Green, Closed: Blue, Shipped: Orange).

### 4.3 Thông báo
- Vì backend sẽ Trigger Notification, FE nên cập nhật UI (Icon Chuông) nếu có Role nhận được (dù Role Employee ít bị ảnh hưởng của notification hơn Customer).
