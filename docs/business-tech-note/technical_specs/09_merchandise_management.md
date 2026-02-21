
# Tài liệu kỹ thuật: Module Quản lý Hàng hóa (Merchandise)

## 1. Tổng quan
Module **Quản lý Hàng hóa (Merchandise)** là một View chức năng khác kết nối trực tiếp với **ProductCode** Backend API. 
- **Mục tiêu**: Cung cấp giao diện làm việc (1 form dọc) đầy đủ 40 trường dữ liệu (A-AN) cho nghiệp vụ Hàng hóa, không bị chia cắt thành 3 tabs như Mã hàng.
- **Đối tượng**: Admin, Sale/User và **Customer** (Full quyền sửa).

## 2. Phân tích Dữ liệu (Prisma & API Backend)

Màn này **KHÔNG** cần tạo thêm Database Table hay Route API mới.
Toàn bộ dữ liệu đọc/ghi thông qua `ProductCode` Model và API `/api/product-codes`.

### 2.1 Các trường dữ liệu bổ sung (So với màn Mã hàng)
Bên cạnh 38 trường giống màn Mã hàng (A-AL), màn Quản lý Hàng hóa hiển thị thêm 2 trường từ Table `ProductCode`:
- **[AM] Phí mua hàng** (`purchaseFee`: Decimal)
- **[AN] Xác nhận PKT** (`accountingConfirmation`: String)

*Tổng số trường hiển thị: 40 trường thông tin chi tiết + 3 trường phân loại (Khách hàng, Kho nhận, Loại hàng).*

### 2.2 Re-use Backend API (`/api/product-codes`)
- **GET Danh sách**: `/api/product-codes` (Hỗ trợ Search/Filter). Caching Server-side (5m) áp dụng chung.
- **POST Tạo mới**: `/api/product-codes`
- **PUT Sửa**: `/api/product-codes/:id`
- **DELETE Xóa**: `/api/product-codes/:id`

## 3. Đặc tả Frontend Logic (UI/UX)

Sự khác biệt lớn nhất nằm ở lớp **Trình diễn (Frontend layer)**.

### 3.1 Giao diện Form thêm/sửa
- Quét bỏ thiết kế 3 Tabs. Chuyển sang Scroll View / Long Form chứa toàn bộ 40 trường (chia Section rõ ràng bằng fieldsets/headers).
- Bổ sung 2 trường `[AM]` và `[AN]` vào giao diện.

### 3.2 Phân quyền chức năng (RBAC - Role Based Access Control)
- **Customer**: Trong màn Merchandise, **Customer được phép SỬA TOÀN BỘ CÁC TRƯỜNG** (Trái ngược với màn ProductCode, Customer chỉ được sửa 2 trường).
- *Lưu ý Dev Frontend*: Màn này cần override cờ ẩn/hiện fields (disabled) cho role Customer so với component ProductCode.
- *Lưu ý Dev Backend*: Do dùng chung API `PUT /api/product-codes/:id`, Backend cần nhận diện request đến từ URL/Route nào hoặc Header nào để **bỏ qua logic chặn Customer update fields**, HOẶC Backend mở hoàn toàn cho Customer và việc chặn là do Frontend của màn ProductCode chịu trách nhiệm tùy theo phân tích an toàn hệ thống (Best practice: Backend kiểm tra Menu/Context qua custom Header `X-Context: merchandise`).

### 3.3 Auto Calculation Formula
Cần code Logic Auto Calculation riêng cho UI màn hình này:

1. **Tổng cước TQ_HN ([P])**:
   ```javascript
   const weightPrice = (weight || 0) * (transportRate || 0); // [H] * [N]
   const volumePrice = (volume || 0) * (transportRateVolume || 0); // [I] * [O]

   const totalTransportFeeEstimate = Math.max(weightPrice, volumePrice);
   ```
   *(Theo BRD, công thức này là MAX của cước theo cân nặng và cước theo thể tích. Field này set Disabled trên UI và tự tính theo Realtime).*

### 3.4 Excel Export
- Tính năng export tại màn hình này **KHÔNG** yêu cầu chọn Checkbox dòng (Select IDs).
- Behavior: Khi click Export, Frontend lấy toàn bộ dữ liệu đang có trên Table (theo phân trang hiện tại màn hình) -> Xuất ra file Excel gồm 40 cột.

### 3.5 Upload Images
- Component Upload Upload tối đa 3 ảnh. 
- State tương tự màn Product Code bằng array link URLs (`images` array).

---

## 4. Workarounds / Architecture Notes

1.  **Backend Security Override**: 
    Nếu Backend đang restrict cứng Customer role tại Endpoint API `PUT /api/product-codes/:id`, việc Customer sửa Data ở màn Merchandise sẽ bị BE từ chối. 
    **Giải pháp**: Frontend khi gọi API trong tab Merchandise cần truyền Header `X-Module-View: merchandise`. Backend Controller sẽ check: 
    ```javascript
    if (user.role === 'CUSTOMER') {
      if (headers['x-module-view'] === 'merchandise') {
         // Allow full update
      } else {
         // Restrict update (only declarationNeed and otherNotes)
      }
    }
    ```
