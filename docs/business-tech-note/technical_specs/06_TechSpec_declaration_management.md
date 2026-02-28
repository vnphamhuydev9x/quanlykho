
# Tài liệu kỹ thuật: Module Quản lý Khai báo (Declaration)

## 1. Tổng quan
Module **Quản lý Khai báo** dùng để quản lý thông tin nhập khẩu của các lô hàng.
- **Mục tiêu**: Lưu trữ chi tiết 43 trường thông tin cho mỗi lần khai báo. Đây là **Source of Truth** cho cấu trúc dữ liệu.
- **Đối tượng**: Admin (Full quyền), Staff (Xem).

## 2. Thiết kế Database (Prisma)

Model: `Declaration`.
Bảng dưới đây liệt kê chi tiết toàn bộ các trường dữ liệu được lưu trữ.

### 2.1 Chi tiết Schema

| STT | Tên trường (BRD) | Prisma Field | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **ID** | `id` | `Int` | Primary Key, Auto-increment. |
| **-** | **Mã khách hàng** | `customerId` | `Int` | Foreign Key -> `User`. |
| **1** | **Ngày nhập kho** | `entryDate` | `DateTime?` | Ngày nhập hàng. |
| **2** | **Mã KH (Input)** | `customerCodeInput` | `String?` | Mã khách hàng (lưu text để search nhanh/backup). |
| **3** | **Tên mặt hàng** | `productName` | `String?` | |
| **4** | **Mã đơn hàng** | `orderCode` | `String?` | |
| **5** | **Số kiện** | `packageCount` | `Int?` | |
| **6** | **Trọng lượng (Kg)** | `weight` | `Decimal?` | `@db.Decimal(15, 2)` |
| **7** | **Khối lượng (m³)** | `volume` | `Decimal?` | `@db.Decimal(15, 3)` |
| **8** | **Nguồn tin** | `infoSource` | `String?` | Kho TQ / Kho VN... |
| **9** | **Phí nội địa (RMB)**| `domesticFeeRMB` | `Decimal?` | `@db.Decimal(15, 2)` |
| **10** | **Phí kéo hàng (RMB)**| `haulingFeeRMB` | `Decimal?` | `@db.Decimal(15, 2)` |
| **11** | **Phí dỡ hàng (RMB)** | `unloadingFeeRMB` | `Decimal?` | `@db.Decimal(15, 2)` |
| **12** | **Đơn giá cước (Kg)**| `transportRate` | `Decimal?` | `@db.Decimal(15, 2)` |
| **13** | **Đơn giá cước (m³)**| `transportRateVolume`| `Decimal?` | `@db.Decimal(15, 2)` |
| **14** | **Tổng cước (Auto)** | `totalTransportFeeEstimate` | `Decimal?` | **CALCULATED**. Store value for query performance. |
| **15** | **Ghi chú** | `note` | `String?` | |
| **16** | **Ảnh hàng hóa** | `productImage` | `String?` | URL ảnh (Comma separated if multiple). |
| **17** | **Tem phụ** | `subTag` | `String?` | |
| **18** | **Số lượng SP** | `productQuantity` | `Int?` | |
| **19** | **Quy cách** | `specification` | `String?` | |
| **20** | **Mô tả SP** | `productDescription` | `String?` | |
| **21** | **Nhãn hiệu** | `brand` | `String?` | |
| **22** | **Nhu cầu khai báo** | `declarationNeed` | `String?` | |
| **23** | **CS khai báo** | `declarationPolicy` | `String?` | |
| **24** | **Giá xuất HĐ** | `invoicePrice` | `Decimal?` | `@db.Decimal(15, 2)` |
| **25** | **TT bổ sung** | `additionalInfo` | `String?` | |
| **26** | **Tên khai báo** | `declarationName` | `String?` | |
| **27** | **SL khai báo (CT)**| `declarationQuantityDeclared` | `Decimal?` | `@db.Decimal(15, 2)` |
| **28** | **Đơn vị tính** | `unit` | `String?` | |
| **29** | **Giá khai báo** | `declarationPrice` | `Decimal?` | `@db.Decimal(15, 2)` |
| **30** | **Trị giá (Auto)** | `value` | `Decimal?` | `@db.Decimal(15, 2)`. **CALCULATED**. |
| **31** | **Số kiện (CT)** | `packageCountDeclared`| `Int?` | |
| **32** | **Net Weight** | `netWeight` | `Decimal?` | `@db.Decimal(15, 2)` |
| **33** | **Gross Weight** | `grossWeight` | `Decimal?` | `@db.Decimal(15, 2)` |
| **34** | **CBM** | `cbm` | `Decimal?` | `@db.Decimal(15, 3)` |
| **35** | **HS Code** | `hsCode` | `String?` | |
| **36** | **% Thuế VAT** | `vatPercent` | `Decimal?` | `@db.Decimal(5, 2)` |
| **37** | **Thuế VAT** | `vatAmount` | `Decimal?` | `@db.Decimal(15, 2)` |
| **38** | **% Thuế NK** | `importTaxPercent` | `Decimal?` | `@db.Decimal(5, 2)` |
| **39** | **Thuế NK (USD)** | `importTaxUSD` | `Decimal?` | `@db.Decimal(15, 2)` |
| **40** | **Thuế NK (VNĐ)** | `importTaxVND` | `Decimal?` | `@db.Decimal(15, 2)` |
| **41** | **Tỷ giá HQ** | `customsExchangeRate`| `Decimal?` | `@db.Decimal(15, 2)` |
| **42** | **Phí KTCL** | `qualityControlFee` | `Decimal?` | `@db.Decimal(15, 2)` |
| **43** | **Xác nhận PKT** | `accountingConfirmation` | `String?` | |
| **-** | **Ngày tạo** | `createdAt` | `DateTime` | Default `now()`. |
| **-** | **Ngày cập nhật** | `updatedAt` | `DateTime` | Auto update. |
| **-** | **Ngày xóa** | `deletedAt` | `DateTime?` | Soft delete. |

## 3. Đặc tả API (API Specification)

Base URL: `/api/declarations`

### 3.1 Caching Strategy (Redis)
Strategy: Cache dữ liệu ở tầng Server để giảm tải cho DB. Frontend gọi API bình thường mỗi khi cần dữ liệu.

1.  **Cache List (`/api/declarations`)**:
    *   **TTL**: **5 phút**.
    *   **Invalidation**: Khi có `POST`, `PUT`, `DELETE` bất kỳ -> Xóa toàn bộ key pattern `declarations:list:*`.

2.  **Cache Detail (`/api/declarations/:id`)**:
    *   **TTL**: **10 phút**.
    *   **Invalidation**: Khi `PUT` hoặc `DELETE` đúng ID đó -> Xóa key.

---

### 3.2 Danh sách khai báo
- **Endpoint**: `GET /`
- **Logic**:
  1. Frontend gọi API.
  2. Backend kiểm tra Cache Redis (5 phút).
     - **Hit**: Trả về dữ liệu từ Cache.
     - **Miss**: Query DB -> Lưu vào Cache -> Trả về dữ liệu.

### 3.3 Các API khác
- `POST /`: Tạo mới -> Invalidate cache list.
- `PUT /:id`: Cập nhật -> Invalidate cache list & cache detail ID.
- `DELETE /:id`: Xóa -> Invalidate cache list & cache detail ID.

## 4. Frontend Logic & Performance

### 4.1 Xử lý bảng lớn (43 cột)
- **Virtualization**: Bắt buộc sử dụng Virtual Scroll (cả row và column nếu cần) để render mượt mà.
- **Lazy Load Images**: Các ảnh thumbnail phải Lazy Load.

### 4.2 Auto Calculation (Client-side)
Frontend phải tự tính toán realtime để User thấy ngay kết quả trước khi Save.
- **Formula 1**: `Tổng cước`
  ```javascript
  const total = Math.max(
    (packageCount || 0) * (transportRate || 0),
    (volume || 0) * (transportRateVolume || 0)
  );
  ```
- **Formula 2**: `Trị giá` = `SL Khai báo` * `Giá khai báo`.

### 4.3 Validation
- Backend validate lại các trường tính toán (Calculator fields) khi nhận `POST/PUT` để đảm bảo data consistency, không phụ thuộc hoàn toàn vào Client gửi lên.
