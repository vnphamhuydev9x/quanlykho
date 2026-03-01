# Tài liệu kỹ thuật: Module Quản lý Mã hàng (Product Code) - Cấu trúc Master/Detail

## 1. Tổng quan
Module **Quản lý Mã hàng** dùng để quản lý chi tiết các lô hàng vận chuyển từ Trung Quốc về Việt Nam theo kiến trúc Master-Detail.
- **Mục tiêu**: Phân tách rõ ràng thông tin lô hàng chung (Master) và danh sách các mặt hàng chi tiết (Detail) cấu thành nên lô hàng đó.
- **Tính toán tự động**: Tự động tính toán tổng cước vận chuyển TQ_HN dựa trên tương quan So sánh Khối lượng và Trọng lượng của từng mặt hàng chi tiết.
- **Quy tắc Data**: Quản lý chặt chẽ Input Validations từ Frontend xuống Backend (đặc biệt là Selection box).

---

## 2. Thiết kế Database (Prisma)

Hệ thống sử dụng 2 models chính: `ProductCode` (Master) và `ProductItem` (Detail).

### 2.1 Model: ProductCode (Master)

| Tên trường (Frontend) | Prisma Field | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Nhân viên** | `employeeId` | `Int?` | Relation | Tham chiếu `User` (FK) |
| **Mã khách hàng** | `customerId` | `Int?` | Relation | Tham chiếu `User` (FK) |
| **Ngày nhập kho** | `entryDate` | `DateTime?` | | |
| **Mã đơn hàng** | `orderCode` | `String?` | | |
| **Tổng trọng lượng** | `totalWeight` | `Int?` | | Integer |
| **Tổng khối lượng** | `totalVolume` | `Decimal?` | `@db.Decimal(15,3)` | Float |
| **Nguồn cung cấp thông tin**| `infoSource` | `String?` | | |
| **Tổng cước TQ_HN tạm tính**| `totalTransportFeeEstimate`| `Decimal?` | `@db.Decimal(15,2)` | **Auto Calculated** |
| **Tỷ giá** | `exchangeRate` | `Decimal?` | `@db.Decimal(15,4)` | Float |
| **Trạng thái hàng** | `merchandiseConditionId`| `Int?` | Relation | Tham chiếu `MerchandiseCondition` |

### 2.2 Model: ProductItem (Detail)
Mỗi `ProductCode` có thể có nhiều `ProductItem` (quan hệ 1-N).

| Tên trường (Frontend) | Prisma Field | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Mapping Master** | `productCodeId` | `Int` | FK | Tham chiếu `ProductCode.id` (`onDelete: Cascade`) |
| **Tên mặt hàng** | `productName` | `String?` | | |
| **Số kiện** | `packageCount` | `Int?` | | Integer |
| **Đơn vị kiện** | `packageUnit` | `String?` | Enum Validated | `CARTON`, `PALLET`, v.v. |
| **Trọng lượng** | `weight` | `Int?` | | Integer |
| **Khối lượng** | `volume` | `Decimal?` | `@db.Decimal(15,3)` | Float |
| **Đơn giá cước TQ_HN (khối)**| `volumeFee` | `Int?` | | Integer (VND) |
| **Đơn giá cước TQ_HN (cân)**| `weightFee` | `Int?` | | Integer (VND) |
| **Phí nội địa** | `domesticFeeTQ` | `Decimal?` | `@db.Decimal(15,2)` | Float (RMB) - Lưu trữ |
| **Phí kéo hàng** | `haulingFeeTQ` | `Decimal?` | `@db.Decimal(15,2)` | Float (RMB) - Lưu trữ |
| **Phí dỡ hàng** | `unloadingFeeRMB` | `Decimal?` | `@db.Decimal(15,2)` | Float (RMB) - Lưu trữ |
| **Cước TQ_HN tạm tính**| `itemTransportFeeEstimate`| `Decimal?` | `@db.Decimal(15,2)` | Float (VND) - **Auto Calculated** |
| **Ghi chú** | `notes` | `String?` | | Text area |

---

## 3. Đặc tả API (API Specification) & Validation Rules

Base URL: `/api/product-codes`

### 3.1 Caching Strategy (Server-side Redis)
1. **List (`GET /`)**:
   - Cache key: `product-codes:list:*` (bao gồm params page, search).
   - Invalidate: Khi có Create, Update, Delete.
2. **Detail (`GET /:id`)**:
   - Response trả về Master kèm `items` (Detail).
   - Cache key: `product-codes:detail:{id}`.
   - Invalidate: Khi có Update, Delete.

### 3.2 Quy Tắc Validation (Backend) - BẮT BUỘC
- **Relation Check (DB Query)**: Trước khi lưu, phải check `employeeId`, `customerId`, `merchandiseConditionId` có thực sự tồn tại ở các table tương ứng hay không.
- **Enum Check (Hard-coded)**: Kiểm tra `items[].packageUnit` có nằm trong mảng các giá trị hợp lệ được định nghĩa ở server (vd: `['KHONG_DONG_GOI', 'BAO_TAI', 'THUNG_CARTON', 'PALLET']`).
- **Data Type Rules**: 
  - `weight`, `packageCount`, `volumeFee`, `weightFee` phải parse chuẩn là **Integer** (không lấy thập phân).
  - Các trường phí RMB, Tỷ giá, Khối lượng parse thành Decimal/Float.

### 3.3 Thuật toán tính `totalTransportFeeEstimate` (Cước TQ_HN tạm tính)
Logic tính toán này **phải được xử lý đồng bộ ở cả Frontend (lúc user nhập) và Backend (trước khi lưu vào DB)**.
```javascript
let totalTransportFeeEstimate = 0;
const exchangeRate = parseFloat(masterData.exchangeRate || 0);

for (const item of items) {
    // 1. Cước theo khối = Đơn giá khối * Khối lượng
    const feeByVolume = (item.volumeFee || 0) * (item.volume || 0);
    
    // 2. Cước theo cân = Đơn giá cân * Trọng lượng
    const feeByWeight = (item.weightFee || 0) * (item.weight || 0);
    
    // 3. Lấy giá trị lớn hơn
    const maxFeeForItem = Math.max(feeByVolume, feeByWeight);
    
    // 4. Các phí khác (RMB) quy ra tiền VNĐ
    const domesticFeeTQ = parseFloat(item.domesticFeeTQ || 0);
    const haulingFeeTQ = parseFloat(item.haulingFeeTQ || 0);
    const unloadingFeeRMB = parseFloat(item.unloadingFeeRMB || 0);
    const extraFeeVND = (domesticFeeTQ + haulingFeeTQ + unloadingFeeRMB) * exchangeRate;
    
    // 5. Tính cước riêng cho mặt hàng này
    const itemFeeEstimate = maxFeeForItem + extraFeeVND;
    item.itemTransportFeeEstimate = itemFeeEstimate; // Lưu vào Detail DB

    // 6. Cộng dồn vào tổng lô
    totalTransportFeeEstimate += itemFeeEstimate;
}
// Nếu lưu DB (Prisma), set giá trị này cho Master
```

### 3.4 API Endpoints
- **GET `/`**: Lấy danh sách ProductCodes. Join các bảng `customer`, `employee`, `merchandiseCondition` để hiển thị trên Table.
- **GET `/:id`**: Lấy chi tiết Master kèm `include: { items: true }`.
- **POST `/`**:
  - Request Body: Gửi Object Master bao gồm array `items`.
  - Transaction: Dùng `$transaction` để đảm bảo:
    - Tạo `ProductCode`
    - Tạo danh sách `ProductItem`
    - Đồng thời tự động tạo các bản ghi `Declaration` tương ứng cho từng `ProductItem`. Truyền cả `productCodeId` và `productItemId` vào `Declaration` (Lưu ý: duplicate dữ liệu `productCodeId` này có mục đích tăng performance khi query Declaration theo ProductCode).
- **PUT `/:id`**:
  - Cách xử lý Detail (`items`): Thực hiện xoá items cũ / thêm items mới / hoặc cập nhật.
  - Tức là nếu có `ProductItem` mới được sinh ra, phải đồng thời sinh ra bản ghi `Declaration` cho nó.
- **DELETE `/:id`**: Soft delete Master. `Declaration` cũng cần được xử lý phù hợp.

---

## 4. Frontend Logic

### 4.1 UI Layout (Form Master-Detail)
- **Cấu trúc Form**: Chia làm 2 khu vực rõ ràng. Khu vực trên điền thông tin chung (Master). Khu vực dưới là một Component Table động có thể "Thêm dòng/Xóa dòng", dùng Ant Design `Form.List` để quản lý các dòng mặt hàng.
- **Numerical Inputs**:
  - Các ô nhập dữ liệu *Integer* (Cân, Số lượng, VND) sử dụng thuộc tính `precision={0}`.
  - Các ô nhập dữ liệu *Float* (Khối lượng, RMB, tỷ giá) sử dụng thuộc tính `precision={2}` hoặc `3`.

### 4.2 Auto Calculation (Real-time Tính giá)
- Sử dụng Hook `Form.useWatch('items', form)` để lắng nghe sự thay đổi của danh sách mặt hàng.
- Dùng `useEffect` gọi hàm chạy thuật toán Tính cước tổng (xem mục 3.3) mỗi khi `items` thay đổi.
- Set ngược giá trị tính được vào ô bị disabled của form Master `form.setFieldValue('totalTransportFeeEstimate', result)` để hiển thị ra UI. Có kèm Tooltip giải thích công thức.
