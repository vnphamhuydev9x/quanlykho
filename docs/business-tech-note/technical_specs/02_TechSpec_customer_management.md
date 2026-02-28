
# Tài liệu kỹ thuật: Module Quản lý Khách hàng

## 1. Tổng quan
Tài liệu này phác thảo thiết kế kỹ thuật cho module **Quản lý Khách hàng**, dựa trên BRD đã chốt.
- **Mục tiêu**: Quản lý khách hàng, thông tin cá nhân và người phụ trách.
- **Đối tượng**: Admin (Toàn quyền).

## 2. Thiết kế Database (Prisma)

Sử dụng model `User` với `UserType.CUSTOMER`.

### 2.1 Phân tích Schema
Ánh xạ dữ liệu Khách hàng vào bảng `User`:

| Trường BRD | Trường Prisma | Ghi chú |
| :--- | :--- | :--- |
| **ID** | `id` | PK |
| **Mã khách hàng** | `username` | Dùng `username` để làm mã khách hàng và đăng nhập. `customerCode` có thể dùng để lưu trữ thêm nếu cần, nhưng BRD yêu cầu Mã KH là Tên đăng nhập -> Dùng `username`. |
| **Mật khẩu** | `password` | Hashed |
| **Họ và tên** | `fullName` | |
| **Số điện thoại** | `phone` | |
| **Địa chỉ** | `address` | |
| **Nhân viên phụ trách** | `saleId` | Quan hệ N-1 với bảng `User` (Sale). |
| **Trạng thái** | `isActive` | |
| **Loại TK** | `type` | Luôn set là `CUSTOMER` |
| **Tổng tiền** | (Calculated) | Tính tổng `amount` từ bảng `Transaction` có `customerId=User.id` và `status=SUCCESS`. |

### 2.2 Index Strategy
- **Index `type`**: Để lọc nhanh danh sách khách hàng (`type=CUSTOMER`).
- **Index `saleId`**: Để lọc khách hàng theo nhân viên phụ trách.
- **Composite Index**: `(type, saleId, isActive)` cho các bộ lọc phổ biến.

## 3. Đặc tả API (API Specification)

Base URL: `/api/customers`

### 3.1 Danh sách khách hàng
- **Endpoint**: `GET /`
- **Quyền**: `ADMIN`
- **Query Params**:
  - `page`, `limit`
  - `search`: Tìm theo `fullName`, `username`, `phone`.
  - `status`: `active` | `inactive`.
  - `saleId`: ID nhân viên phụ trách.
- **Response**:
  - Trả về danh sách User có `type=CUSTOMER`.
  - Field `totalPaid`: Backend tính toán (aggregate sum từ bảng `Transaction`) hoặc Frontend gọi API riêng nếu cần tối ưu.
    - *Giải pháp*: Nên include `transactions` (có filter status=SUCCESS) và tính tổng ở Backend trước khi trả về, hoặc dùng `_sum` aggregate của Prisma.

### 3.2 Tạo mới khách hàng
- **Endpoint**: `POST /`
- **Quyền**: `ADMIN`
- **Body**:
  ```json
  {
    "username": "KH001",
    "password": "123",
    "fullName": "Khach A",
    "phone": "...",
    "address": "...",
    "saleId": 5, // ID nhân viên sale
    "isActive": true
  }
  ```
- **Logic**:
  - Set `type = CUSTOMER`.
  - Set `role = user` (hoặc cấu hình mặc định).
  - Validate `username` unique.

### 3.3 Chi tiết khách hàng
- **Endpoint**: `GET /:id`
- **Logic**: Trả về thông tin user + thông tin Sale phụ trách (`sale: { select: { fullName, ... } }`).

### 3.4 Cập nhật khách hàng
- **Endpoint**: `PUT /:id`
- **Body**: `fullName`, `phone`, `address`, `saleId`, `isActive`.
- **Logic**: Không cho sửa `username`.

### 3.5 Reset mật khẩu
- **Endpoint**: `POST /:id/reset-password`
- **Logic**: Set password = hash("123").

### 3.6 Xóa khách hàng
- **Endpoint**: `DELETE /:id`
- **Logic**: Soft delete (`deletedAt`).

### 3.7 Xuất Excel
- **Endpoint**: `POST /export`
- **Body**: `{ ids: [1, 2, 3] }` (Danh sách ID khách hàng cần xuất).
- **Process**:
  - Query DB lấy thông tin các ID này.
  - Sử dụng thư viện `exceljs` để tạo file buffer.
  - Trả về file stream với header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### 3.8 Logic tính `totalPaid`
Ở giai đoạn này với quy mô vừa phải, chúng ta nên dùng **Real-time Query (On-the-fly Calculation)** thay vì lưu cứng vào bảng `User` để đảm bảo dữ liệu luôn chính xác (Single Source of Truth). PostgreSQL xử lý aggregation rất nhanh.

#### Khi lấy Chi tiết Khách hàng (`GET /:id`)
- Thực hiện thêm 1 query aggregate:
  ```javascript
  const totalPaid = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { customerId: id, status: 'SUCCESS' }
  });
  ```

#### Khi lấy Danh sách Khách hàng (`GET /`)
- **Bước 1**: Lấy danh sách khách hàng theo phân trang.
- **Bước 2**: Lấy danh sách `id` của khách hàng vừa tìm được.
- **Bước 3**: Group By Transaction để tính tổng tiền cho danh sách ID này.
  ```javascript
  const totals = await prisma.transaction.groupBy({
    by: ['customerId'],
    _sum: { amount: true },
    where: {
      customerId: { in: customerIds },
      status: 'SUCCESS'
    }
  });
  ```
- **Bước 4**: Map ngược lại `totalPaid` vào danh sách khách hàng để trả về.

## 4. Frontend Logic
- **Export Excel**:
  - Client gom các ID đã check.
  - Gọi API `POST /export`.
  - Nhận blob response và trigger browser download (`window.URL.createObjectURL`).

## 5. Chiến lược Caching (Hybrid Strategy)

Vấn đề của việc cache danh sách khách hàng là **`totalPaid` thay đổi liên tục** khi có giao dịch mới. Nếu cache cả cục danh sách (User + TotalPaid), tỉ lệ cache miss sẽ rất cao (vì phải invalidate liên tục).

**Giải pháp đề xuất: Tách biệt Cache (Static) và Realtime Data (Dynamic).**

### 5.1 Quy trình xử lý (Flow)
Khi API `GET /api/customers` được gọi:

1.  **Bước 1 (Lấy Static Data):**
    - Kiểm tra Cache Redis `customers:list:${page}:${limit}:${search}...` (Chỉ chứa thông tin User: tên, sđt, địa chỉ...).
    - Nếu Miss -> Query DB bảng `User` -> Lưu vào Redis (TTL 10 phút).
    - Nếu Hit -> Lấy danh sách ID khách hàng từ Cache.

2.  **Bước 2 (Merge Dynamic Data - `totalPaid`):**
    - Với danh sách ID có được, thực hiện Query Aggregate `Transaction` (như mục 3.8) để lấy tổng tiền mới nhất.
    - **Lưu ý:** Bước này *luôn* chạy (không cache), đảm bảo số tiền hiển thị là chính xác tuyệt đối 100% (Real-time).

3.  **Bước 3 (Return):**
    - Code Backend gộp (merge) `totalPaid` vào từng user và trả về Client.

### 5.2 Invalidation Strategy
- **Khi thêm/sửa/xóa Khách hàng (User Info):**
    - Xóa cache `customers:list:*`.
    - Xóa cache `customers:detail:${id}`.
- **Khi thêm/sửa/xóa Giao dịch (Transaction):**
    - **Không cần làm gì cả** với danh sách khách hàng! (Vì `totalPaid` luôn được tính lại ở Bước 2).
    - Chỉ cần invalidate cache của chính Transaction đó (nếu có).

-> **Ưu điểm:**
- Cache danh sách khách hàng bền vững, ít bị invalidate.
- Số tiền `totalPaid` luôn đúng, không bao giờ bị "dirty cache".
- Hiệu năng tốt vì Query Aggregate trên tập 20 ID cực nhanh.
