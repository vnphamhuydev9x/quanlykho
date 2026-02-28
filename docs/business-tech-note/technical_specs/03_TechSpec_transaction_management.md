
# Tài liệu kỹ thuật: Module Quản lý Nạp tiền (Transaction)

## 1. Tổng quan
Module **Quản lý Nạp tiền** cho phép Admin nạp tiền vào tài khoản khách hàng.
- **Mục tiêu**: Tạo và quản lý lịch sử nạp tiền.
- **Đối tượng**: Admin.

## 2. Thiết kế Database (Prisma)

Sử dụng model `Transaction` hiện có.

### 2.1 Schema Update
Model `Transaction` trong `schema.prisma`:

| Trường Prisma | Kiểu | Ghi chú |
| :--- | :--- | :--- |
| `id` | `Int` | PK |
| `amount` | `Decimal` | Lưu số tiền (VND). Sử dụng Decimal(15, 0) vì VND không dùng số thập phân. |
| `content` | `String?` | Nội dung nạp tiền. |
| `status` | `TransactionStatus`| Enum: `SUCCESS` (Mặc định), `CANCELLED`. |
| `customerId` | `Int` | FK -> User (Customer). |
| `createdById` | `Int` | FK -> User (Admin/Staff who created). |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Enum TransactionStatus**:
```prisma
enum TransactionStatus {
  SUCCESS
  CANCELLED
}
```

### 2.2 Index Strategy
- **Index `customerId`**: Để lọc giao dịch của 1 khách hàng (dùng cho tính `totalPaid`).
- **Index `status`**: Lọc theo trạng thái.
- **Index `createdAt`**: Sắp xếp lịch sử giao dịch.

## 3. Đặc tả API (API Specification)

Base URL: `/api/transactions`

### 3.1 Danh sách giao dịch
- **Endpoint**: `GET /`
- **Quyền**: `ADMIN`
- **Query Params**:
  - `page`, `limit`
  - `search`: Tìm theo Info Khách hàng (Tên, Mã, SĐT) hoặc Nội dung.
    - *Lưu ý*: Tìm theo Info Khách hàng cần join bảng `User` customer.
  - `status`: `SUCCESS` | `CANCELLED`.
  - `createdById`: Lọc theo người tạo.
- **Response**: List Transaction (Include `customer` & `creator` info).
- **Sort**: Mặc định `createdAt: desc`.

### 3.2 Tạo giao dịch (Nạp tiền)
- **Endpoint**: `POST /`
- **Quyền**: `ADMIN`
- **Body**:
  ```json
  {
    "customerId": 10,
    "amount": 1000000,
    "content": "Nạp tiền đợt 1"
  }
  ```
- **Validation**:
  - `amount` > 0.
  - `customerId` tồn tại và `isActive=true`.
- **Logic**:
  - Tạo Transaction với `status = SUCCESS`.
  - `createdById` = `req.user.id`.
  - Không cần update bảng User (vì `totalPaid` tính dynamic).

### 3.3 Hủy giao dịch
- **Endpoint**: `PUT /:id/cancel` (Hoặc `DELETE /:id` nếu muốn Semantic, nhưng đây là update status nên PUT/PATCH hợp lý hơn).
- **Quyền**: `ADMIN`
- **Logic**:
  - Kiểm tra Transaction có tồn tại và status đang là `SUCCESS`.
  - Nếu đã `CANCELLED` -> Lỗi.
  - Cập nhật `status = CANCELLED`.
  - (Việc này sẽ tự động làm giảm `totalPaid` của khách hàng ở lần query tiếp theo).

### 3.4 Xuất Excel
- **Endpoint**: `POST /export`
- **Body**: `{ ids: [...] }`
- **Logic**: Tương tự Customer Export.

## 4. Frontend Logic
- **Form Nạp tiền**:
  - Dropdown chọn Khách hàng: Cần API search khách hàng (`GET /api/customers?search=...&status=active`).
  - Input tiền: Format currency VND (1,000,000).

## 5. Caching Strategy
- **Không Cache danh sách giao dịch**: Vì dữ liệu này là nhật ký (log), tính realtime cao và thường dùng để đối soát.
- **Cache dropdown Customer**: Tận dụng cache của module Customer để load vào dropdown tạo giao dịch nhanh hơn.

## 6. Lưu ý quan trọng
- Vì `totalPaid` bên Customer được tính bằng cách SUM(amount) where status=SUCCESS, nên hành động **Hủy giao dịch** (chuyển sang CANCELLED) sẽ ngay lập tức làm số tiền tổng của khách hàng giảm xuống đúng bằng số tiền đã hủy. Logic này tự động khớp.
