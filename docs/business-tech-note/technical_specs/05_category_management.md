
# Tài liệu kỹ thuật: Module Quản lý Loại hàng (Category)

## 1. Tổng quan
Module **Quản lý Loại hàng** cho phép Admin quản lý danh mục phân loại hàng hóa.
- **Mục tiêu**: Phân nhóm hàng hóa để dễ quản lý và thống kê.
- **Đối tượng**: Admin (Full quyền), Staff (Xem).

## 2. Thiết kế Database (Prisma)

Sử dụng model `Category` hiện có.

### 2.1 Schema Update
Model `Category` trong `schema.prisma`:

| Trường Prisma | Kiểu | Ghi chú |
| :--- | :--- | :--- |
| `id` | `Int` | PK |
| `name` | `String` | Tên loại hàng. Unique (Theo logic validation, có thể thêm constraint trong DB). |
| `status` | `CategoryStatus`| Enum: `AVAILABLE` (Mặc định), `UNAVAILABLE`. |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |
| `deletedAt` | `DateTime?` | Soft Delete. |

**Enum CategoryStatus**:
```prisma
enum CategoryStatus {
  AVAILABLE
  UNAVAILABLE
}
```

### 2.2 Index Strategy
- **Index `name`**: Để search và check unique.
- **Index `status`**: Lọc theo trạng thái.

## 3. Đặc tả API (API Specification)

Base URL: `/api/categories`

### 3.1 Danh sách loại hàng
- **Endpoint**: `GET /`
- **Quyền**: `AUTHENTICATED`
- **Query Params**:
  - `page`, `limit`
  - `search`: Tìm theo tên.
  - `status`: `AVAILABLE` | `UNAVAILABLE`.
- **Response**: List Category.

### 3.2 Tạo loại hàng
- **Endpoint**: `POST /`
- **Quyền**: `ADMIN`
- **Body**: `{ "name": "Điện tử", "status": "AVAILABLE" }`
- **Validation**: Check trùng tên.

### 3.3 Chi tiết loại hàng
- **Endpoint**: `GET /:id`
- **Quyền**: `AUTHENTICATED`

### 3.4 Cập nhật loại hàng
- **Endpoint**: `PUT /:id`
- **Quyền**: `ADMIN`
- **Body**: `{ "name": "Điện tử & Gia dụng", "status": "AVAILABLE" }`
- **Validation**: Check trùng tên nếu đổi tên.

### 3.5 Xóa loại hàng
- **Endpoint**: `DELETE /:id`
- **Quyền**: `ADMIN`
- **Logic**: Soft delete.

## 4. Frontend Logic
- **Dropdown chọn Loại hàng**:
  - Tương tự Warehouse, cần API lấy all categories (`AVAILABLE`) để populate vào các dropdown o màn hình Product/Declaration.
  - **Cache**: Client-side (1 giờ).

## 5. Caching Strategy
- **Cache Key**: `categories:list:...`
- **TTL**: 1 giờ.
- **Invalidate**: Khi Admin thêm/sửa/xóa.
