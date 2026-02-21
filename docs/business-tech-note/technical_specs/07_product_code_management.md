
# Tài liệu kỹ thuật: Module Quản lý Mã hàng (Product Code)

## 1. Tổng quan
Module **Quản lý Mã hàng** dùng để quản lý chi tiết các lô hàng nhập khẩu.
- **Mục tiêu**: Quản lý 38 trường thông tin, bao gồm tính toán tự động chi phí và thuế.
- **Đối tượng**: Admin, Sale/User (Full quyền), Customer (Xem & Sửa hạn chế).

## 2. Thiết kế Database (Prisma)

Model: `ProductCode`.
Bảng dưới đây liệt kê mapping chi tiết giữa nghiệp vụ (BRD) và Database.

### 2.1 Mapping Fields

| BRD | Tên trường | Prisma Field | Kiểu | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **ID** | `id` | `Int` | PK |
| **1 [A]** | Ngày nhập kho | `entryDate` | `DateTime?` | |
| **2 [B]** | Mã khách hàng | `customerId` | `Int?` | Relation to User |
| **3 [C]** | Mã đơn hàng | `orderCode` | `String?` | |
| **4 [D]** | Tên mặt hàng | `productName` | `String?` | |
| **5 [E]** | Số kiện | `packageCount` | `Int?` | |
| **6 [F]** | Đơn vị kiện | `packageUnit` | `String?` | |
| **7 [G]** | Trọng lượng | `weight` | `Decimal?` | |
| **8 [H]** | Khối lượng | `volume` | `Decimal?` | |
| **9 [I]** | Phí nội địa TQ | `domesticFeeRMB` | `Decimal?` | |
| **10 [J]** | Phí kéo hàng TQ | `haulingFeeRMB` | `Decimal?` | |
| **11 [K]** | Tỷ giá | `exchangeRate` | `Decimal?` | |
| **12 [L1]** | Đơn giá cước (khối) | `volumeFee` | `Decimal?` | |
| **13 [L2]** | Đơn giá cước (cân) | `weightFee` | `Decimal?` | |
| **14 [M]** | Tổng cước | `totalTransportFeeEstimate` | `Decimal?` | **Auto**. Max([L1] * [H], [L2] * [G]) |
| **15 [N]** | Phí nội địa VN | `domesticFeeVN` | `Decimal?` | |
| **16 [O]** | Ghi chú (Chung) | `notes` | `String?` | |
| **17 [P]** | Tình trạng | `status` | `String?` | |
| **18 [Q]** | Ảnh hàng hóa | `images` | `String[]` | Max 3 URLs |
| **19 [S]** | Tem chính | `mainTag` | `String?` | |
| **20 [T]** | Tem phụ | `subTag` | `String?` | |
| **21 [U]** | Ảnh dán tem | `taggedImages` | `String[]` | Max 3 URLs |
| **22 [V]** | Số lượng SP | `productQuantity` | `Decimal?` | |
| **22.1 [V2]**| Đơn vị | `productUnit` | `String?` | |
| **23 [W]** | Quy cách | `specification` | `String?` | |
| **24 [X]** | Mô tả SP | `productDescription` | `String?` | |
| **25 [Y]** | Nhãn hiệu | `brand` | `String?` | |
| **26 [Z]** | Mã số thuế | `supplierTaxCode` | `String?` | |
| **27 [AA]**| Tên công ty | `supplierName` | `String?` | |
| **28 [AB]**| Nhu cầu KB | `declarationNeed` | `String?` | **Customer Edit** |
| **29 [AC]**| Số lượng KB | `declarationQuantity`| `Decimal?` | |
| **30 [AD]**| Giá xuất HĐ | `invoicePriceExport` | `Decimal?` | |
| **31 [AE]**| Tổng giá trị | `totalValueExport` | `Decimal?` | **Auto**. [AD] * [AC] |
| **32 [AF]**| Chính sách NK | `importPolicy` | `String?` | |
| **33 [AG]**| Phí phải nộp | `feeAmount` | `Decimal?` | |
| **34 [AH]**| Ghi chú (KB) | `otherNotes` | `String?` | **Customer Edit** |
| **35 [AI]**| Thuế VAT NK | `vatImportTax` | `Decimal?` | **Auto**. [AE] * 8% |
| **36 [AJ]**| Thuế NK nộp | `importTax` | `Decimal?` | |
| **37 [AK]**| Phí ủy thác | `trustFee` | `Decimal?` | **Auto**. [AE] * 1% |
| **38 [AL]**| Tổng chi phí | `totalImportCost` | `Decimal?` | **Auto**. (Formula complex) |
| **39 [AM]**| Tình trạng xuất VAT| `vatExportStatus` | `String?`| |

## 3. Đặc tả API (API Specification)

Base URL: `/api/product-codes`

### 3.1 Caching Strategy (Server-side Redis)
1.  **List (`GET /`)**:
    *   **TTL**: **5 phút**.
    *   Invalidate: `POST`, `PUT`, `DELETE` delete keys `product-codes:list:*`.
2.  **Detail (`GET /:id`)**:
    *   **TTL**: **10 phút**.
    *   Invalidate: `PUT`, `DELETE` delete key `product-codes:detail:{id}`.

### 3.2 Endpoints

#### GET / - Danh sách
- **Filter**: `search` (Multiple fields), `status` (Tình trạng hàng hóa).
- **Logic**: Hỗ trợ lọc đặc biệt "Tồn kho TQ" (Status != Đã giao TT) và "Tồn kho VN".

#### POST / - Tạo mới
- **Quyền**: `ADMIN`, `SALE`, `USER`.
- **Validation**:
  - `packageUnit`: Enum/String check.
  - Required fields: A, B, C, D, E, F, G, H, L1, L2.
- **Logic**:
  - Tính toán lại 5 công thức ([M], [AE], [AI], [AK], [AL]) Server-side trước khi lưu.

#### PUT /:id - Cập nhật
- **Quyền**:
  - `ADMIN`, `SALE`, `USER`: Full quyền.
  - `CUSTOMER`: Chỉ được sửa `declarationNeed` ([AB]) và `otherNotes` ([AH]). Chặn sửa các trường khác.
  - Validate: Nếu user là Customer -> Check `ProductCode.customerId == user.id`.

#### DELETE /:id - Xóa
- **Quyền**: `ADMIN`.
- **Logic**: Soft delete (`deletedAt`).

#### POST /export - Xuất Excel
- **Quyền**: `ADMIN`, `SALE`, `USER`.
- **Logic**: Export selected IDs. Format số VN/CN/DE tương ứng.

## 4. Frontend Logic

### 4.1 UI Layout
- **Horizontal Scroll Table**: 39 cột.
- **Tabs Modal**: 3 Tabs như BRD.
- **Summary Bar**: Khi chọn nhiều dòng -> Tính tổng Kiện, Trọng lượng, Khối lượng.

### 4.2 Auto Calculation (Client-side)
Cần replicate logic tính toán ở FE để User thấy ngay:
1.  `TotalTransport` = `Math.max(VolumeFee * Volume, WeightFee * Weight)`.
2.  `TotalValue` = `InvoicePrice` * `Quantity`.
3.  `VAT` = `TotalValue` * 0.08.
4.  `TrustFee` = `TotalValue` * 0.01.
5.  `TotalCost` = Sum all components (Convert RMB -> VND using Rate).

### 4.3 Notification Logic
- Khi `status` thay đổi (VD: Kho TQ -> Kho VN), gọi API Notification (hoặc Socket) báo cho Customer.

### 4.4 Upload Images
- Quản lý 2 mảng ảnh riêng biệt: `images` (Hàng hóa) và `taggedImages` (Hàng dán tem).
- Logic UI: Max 3 ảnh/loại.
