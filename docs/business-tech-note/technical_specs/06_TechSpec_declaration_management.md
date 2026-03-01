# Tài liệu kỹ thuật: Module Quản lý Khai báo (Declaration)

## 1. Tổng quan & Thiết kế tích hợp
Module Khai báo (Declaration) chứa đựng thông tin về quy trình hải quan, thuế nhập khẩu của từng mặt hàng riêng lẻ.

**Core Workflow**: Hệ thống không cung cấp API tạo trực tiếp Declaration trống từ người dùng. Thay vào đó:
- Tại endpoint tạo Mã hàng (`POST /api/product-codes`), sau khi tạo `ProductCode` và Cấu hình List `ProductItem`, backend (bằng Prisma Transaction) sẽ đồng thời lấy list `ProductItem` và `create` các record `Declaration` tương ứng cho mỗi Item.
- Tại endpoint sửa Mã hàng (`PUT /api/product-codes/:id`), nếu có mặt hàng nào bị xóa, bản ghi `Declaration` tương ứng của nó bị cascade/soft delete theo. Nếu có Item mới được thêm, phải tạo thêm Declaration.

## 2. Thiết kế Database (Prisma Schema)

Table dự kiến: `Declaration`

| Field name | Prisma Type | Ghi chú Thiết kế |
| --- | --- | --- |
| `id` | `Int` | PK, `@id @default(autoincrement())` |
| `productCodeId` | `Int` | FK -> `ProductCode`. Cố tình thiết kế **duplicate** Reference Key từ ProductItem (vốn đã tra ra được mã hàng thông qua item). Mục đích: Để truy xuất nhanh (`where productCodeId = x`) tăng performance khi query list theo Mã. |
| `productItemId` | `Int` | FK -> `ProductItem` (với `@unique` để thiết lập quan hệ 1-1 chặt chẽ) |
| `images` | `String?` | Text/String Cấu trúc JSON chứa mảng URL ảnh, lưu trữ tối đa 3 ảnh |
| `mainStamp` | `String?` | Tem chính (`@db.Text`) |
| `subStamp` | `String?` | Tem phụ (`@db.Text`) |
| `productQuantity`| `Int?` | Số lượng sản phẩm |
| `specification` | `String?` | Quy cách |
| `productDescription`| `String?`| Mô tả sản phẩm (`@db.Text`) |
| `brand` | `String?` | Nhãn hiệu |
| `sellerTaxCode` | `String?` | Mã số thuế đơn vị bán hàng |
| `sellerCompanyName`| `String?` | Tên công ty bán hàng |
| `declarationNeed`| `String?` | Nhu cầu khai báo |
| `declarationQuantity`| `Int?`| Số lượng khai báo |
| `invoicePriceBeforeVat` | `Int?` | VND - Giá xuất hóa đơn |
| `totalLotValueBeforeVat`| `Int?` | **Disabled/Auto Calculated** (Giá xuất HĐ x Số lượng khai báo). |
| `importTax` | `Decimal?`| `@db.Decimal(5,2)` (%) Dành cho hiển thị thập phân |
| `vatTax` | `Decimal?`| `@db.Decimal(5,2)` (%) Dành cho hiển thị thập phân |
| `importTaxPayable`| `Int?` | **Disabled/Auto Calculated** (VND) |
| `vatTaxPayable` | `Int?` | **Disabled/Auto Calculated** (VND) |
| `payableFee` | `Int?` | VND - Phí phải nộp |
| `notes` | `String?` | Ghi chú `@db.Text` |
| `entrustmentFee`| `Int?` | VND - Phí ủy thác |
| `importCostToCustomer`| `Int?` | **Disabled/Auto Calculated** (Phụ thuộc vào Item và Thuế) |

## 3. API Endpoints cần xử lý

- `GET /api/declarations`: Lấy danh sách khai báo. Join với ProductItem và ProductCode để lấy các trường bổ trợ view. 
- `GET /api/declarations/:id`: Lấy chi tiết. Yêu cầu Includes Relation tương ứng.
- `PUT /api/declarations/:id`: Cập nhật khai báo. Payload truyền lên từ Frontend sẽ chứa toàn bộ các trường Input. Khi submit, Backend làm tác vụ bắt buộc là **Recalculate** lại toàn bộ các dữ liệu tính toán (importTaxPayable, vatTaxPayable, importCostToCustomer...) dựa theo biến input, nhằm tránh trường hợp Fake API Request từ Client.

## 4. Frontend Implementation Notes
1. **Upload Images**:
   Component `ImageUpload` cần set limit ở mức `3`. Trong Ant Design, cấu hình thuộc tính `maxCount={3}` với danh sách FileList điều hướng. Dùng CSS/thủ thuật UI API để ẩn nút chọn ảnh đi khi có đủ 3 items.
2. **Disabled Inputs Realtime**:
   Sử dụng `Form.useWatch` tương tự logic tính Mã hàng:
   - `totalLotValueBeforeVat` = `invoicePriceBeforeVat` * `declarationQuantity`
   - `importTaxPayable` = `totalLotValueBeforeVat` * (`importTax` / 100)
   - `vatTaxPayable` = `totalLotValueBeforeVat` * (`vatTax` / 100)
   - `importCostToCustomer` = Móc nối thông số `itemTransportFeeEstimate` (có được từ Props hay Hook trỏ lấy relation item) + `importTaxPayable` + `vatTaxPayable` + `payableFee` + `entrustmentFee`
