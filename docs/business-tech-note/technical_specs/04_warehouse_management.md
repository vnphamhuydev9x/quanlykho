
# Tài liệu kỹ thuật: Module Quản lý Kho VN (Warehouse)

## 1. Tổng quan
Module **Quản lý Kho VN** cho phép Admin quản lý danh sách các kho hàng tại Việt Nam.
- **Mục tiêu**: Định nghĩa các điểm tập kết hàng hóa.
- **Đối tượng**: Admin (Full quyền), Staff (Xem).

## 2. Thiết kế Database (Prisma)

Sử dụng model `Warehouse` hiện có.

### 2.1 Schema Update
Model `Warehouse` trong `schema.prisma`:

| Trường Prisma | Kiểu | Ghi chú |
| :--- | :--- | :--- |
| `id` | `Int` | PK |
| `name` | `String` | Tên kho. Unique. |
| `status` | `WarehouseStatus`| Enum: `AVAILABLE` (Mặc định), `UNAVAILABLE`. |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |
| `deletedAt` | `DateTime?` | Soft Delete. |

**Enum WarehouseStatus**:
```prisma
enum WarehouseStatus {
  AVAILABLE
  UNAVAILABLE
}
```

### 2.2 Index Strategy
- **Index `name`**: Mặc dù số lượng kho ít, nhưng `name` cần Unique Index để đảm bảo tính duy nhất.
- **Index `status`**: Lọc theo trạng thái.

## 3. Đặc tả API (API Specification)

Base URL: `/api/warehouses`

### 3.1 Danh sách kho
- **Endpoint**: `GET /`
- **Quyền**: `AUTHENTICATED` (Tất cả nhân viên đã đăng nhập).
- **Query Params**:
  - `page`, `limit`
  - `search`: Tìm theo tên kho.
  - `status`: `AVAILABLE` | `UNAVAILABLE`.
- **Response**: List Warehouse.

### 3.2 Tạo kho mới
- **Endpoint**: `POST /`
- **Quyền**: `ADMIN`
- **Body**: `{ "name": "Kho HN", "status": "AVAILABLE" }`
- **Validation**: Check trùng tên kho (Case-insensitive nếu cần, hoặc dựa vào Unique Constraint của DB).

### 3.3 Chi tiết kho
- **Endpoint**: `GET /:id`
- **Quyền**: `AUTHENTICATED`.

### 3.4 Cập nhật kho
- **Endpoint**: `PUT /:id`
- **Quyền**: `ADMIN`
- **Body**: `{ "name": "Kho HN Mới", "status": "UNAVAILABLE" }`
- **Validation**: Check trùng tên nếu đổi tên.

### 3.5 Xóa kho
- **Endpoint**: `DELETE /:id`
- **Quyền**: `ADMIN`
- **Logic**: Soft delete (`deletedAt`).

## 4. Frontend Logic
- **Dropdown chọn Kho**:
  - Các màn hình khác (như Product Code) sẽ cần dropdown chọn kho.
  - Cần API `GET /api/warehouses/all` (hoặc reuse API list với `limit=1000`) để lấy toàn bộ danh sách kho `AVAILABLE`.
  - Cache: Danh sách này rất ít thay đổi -> Cache Browser (LocalStorage) hoặc React Query `staleTime` lớn (ví dụ: 1h).

## 5. Caching Strategy
- **Cache**: `warehouses:list:...`
- TTL: 1 giờ (Dữ liệu Master data cực kỳ ít biến động).
- Invalidate: Khi Admin thêm/sửa/xóa kho.
