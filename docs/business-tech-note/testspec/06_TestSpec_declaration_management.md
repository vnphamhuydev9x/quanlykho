# Test Spec: Module Khai báo (Declaration) — Backend

> **Phiên bản**: v2.0 | **Cập nhật**: 2026-03-01
> **Tham chiếu**: BRD 06, TechSpec 06
> **Schema hiện tại** (các trường của model `Declaration` đang dùng):
> `id, productCodeId, productItemId, images, mainStamp, subStamp, productQuantity, specification, productDescription, brand, sellerTaxCode, sellerCompanyName, declarationNeed, declarationQuantity, invoicePriceBeforeVat, totalLotValueBeforeVat(auto), importTax, vatTax, importTaxPayable(auto), vatTaxPayable(auto), payableFee, notes, entrustmentFee, importCostToCustomer(auto), deletedAt`

> ⚠️ **Lưu ý khi seed test data**: Khi `prisma.declaration.create()` trực tiếp, CHỈ dùng các field trong schema trên. KHÔNG dùng field cũ như: `invoiceRequestName`, `customerId`, `productNameVi`, `hsCode`, `contractPrice`, `declarationPriceVND`, `importTaxPercent`, `vatPercent`, `serviceFeePercent`, `isDeclared`.

---

## Danh sách API cần test

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/declarations/export/all` | GET | ADMIN | Xuất toàn bộ dữ liệu |
| `/api/declarations` | GET | Any (authed) | Lấy danh sách, phân trang, search |
| `/api/declarations/:id` | GET | Any (authed) | Lấy chi tiết 1 bản ghi |
| `/api/declarations/:id` | PUT | ADMIN | Cập nhật + tự tính các trường auto |
| `/api/declarations/:id` | DELETE | ADMIN | Soft delete |

---

## Nhóm 1: Auth & Permissions

### [TC-DECL-AUTH-01] No token → 401 (GET list)
- **Input**: GET `/api/declarations` không có header Authorization
- **Expected HTTP**: `401`

### [TC-DECL-AUTH-02] No token → 401 (GET by ID)
- **Input**: GET `/api/declarations/1` không có header Authorization
- **Expected HTTP**: `401`

### [TC-DECL-AUTH-03] USER role có thể đọc danh sách
- **Input**: GET `/api/declarations` với USER token
- **Expected HTTP**: `200`

### [TC-DECL-AUTH-04] USER role có thể đọc chi tiết
- **Input**: GET `/api/declarations/:id` với USER token
- **Expected HTTP**: `200`

### [TC-DECL-AUTH-05] USER role không thể cập nhật → 403
- **Input**: PUT `/api/declarations/:id` với USER token, body `{ brand: "Test" }`
- **Expected HTTP**: `403`

### [TC-DECL-AUTH-06] USER role không thể xóa → 403
- **Input**: DELETE `/api/declarations/:id` với USER token
- **Expected HTTP**: `403`

### [TC-DECL-AUTH-07] USER role không thể export → 403
- **Input**: GET `/api/declarations/export/all` với USER token
- **Expected HTTP**: `403`

---

## Nhóm 2: GET /api/declarations — Danh sách

### [TC-DECL-GET-01] Response structure chuẩn
- **Input**: GET `/api/declarations` với ADMIN token
- **Expected HTTP**: `200`
- **Expected Response**: `{ code: 200, data: { items: [...], total: N, page: 1, totalPages: N } }`
- **DB Verify**: `items` chứa ít nhất 1 record đã được seed

### [TC-DECL-GET-02] Phân trang hoạt động đúng
- **Input**: GET `/api/declarations?page=1&limit=1` với 2 records đã seed
- **Expected HTTP**: `200`
- **Expected Response**: `items` có đúng 1 phần tử, `total >= 2`, `totalPages >= 2`

### [TC-DECL-GET-03] Tìm kiếm theo brand
- **Input**: GET `/api/declarations?search=Nike` (record được seed có `brand: "Nike"`)
- **Expected HTTP**: `200`
- **Expected Response**: `items[0].brand === "Nike"`

### [TC-DECL-GET-04] Tìm kiếm theo sellerCompanyName
- **Input**: GET `/api/declarations?search=Nike+China`
- **Expected HTTP**: `200`
- **Expected Response**: `items.length >= 1`

### [TC-DECL-GET-05] Lọc theo productCodeId
- **Input**: GET `/api/declarations?productCodeId=X` (X là ID của productCode đầu tiên)
- **Setup**: Tạo thêm 1 ProductCode khác với Declaration riêng
- **Expected Response**: Chỉ trả về Declaration của ProductCode X

### [TC-DECL-GET-06] Không hiện record đã soft-delete
- **Setup**: Soft-delete declaration hiện có
- **Input**: GET `/api/declarations`
- **Expected Response**: `items` không chứa ID của declaration đã xóa

### [TC-DECL-GET-07] Cache: lần 2 lấy từ Redis
- **Input**: GET `/api/declarations` 2 lần liên tiếp
- **Expected**: Sau lần 1, Redis có key `declarations:list:*`. Lần 2 trả về kết quả đúng.

---

## Nhóm 3: GET /api/declarations/:id — Chi tiết

### [TC-DECL-GETID-01] Trả về đầy đủ relations
- **Input**: GET `/api/declarations/:id`
- **Expected HTTP**: `200`
- **Expected Response**: `data.productItem.productName = "Giày Nike Test"`, `data.productCode.orderCode = "PC-TEST-001"`

### [TC-DECL-GETID-02] Not Found → 404
- **Input**: GET `/api/declarations/99999`
- **Expected HTTP**: `404`

### [TC-DECL-GETID-03] Soft-deleted → 404
- **Setup**: Soft-delete declaration
- **Input**: GET `/api/declarations/:id`
- **Expected HTTP**: `404`

---

## Nhóm 4: PUT /api/declarations/:id — Cập nhật & Tính toán

### [TC-DECL-UPDATE-01] Happy Path — Cập nhật trường text
- **Input**: `{ brand: "Adidas", sellerCompanyName: "Adidas Co", declarationNeed: "NK thương mại", notes: "test" }`
- **Expected HTTP**: `200`
- **DB Verify**: `brand = "Adidas"`, `sellerCompanyName = "Adidas Co"`, `notes = "test"`

### [TC-DECL-UPDATE-02] Secure Recalculation — chặn fake `totalLotValueBeforeVat`
- **Input**: `{ invoicePriceBeforeVat: 100000, declarationQuantity: 10, importTax: 5, vatTax: 10, totalLotValueBeforeVat: 99000000 }`
  - ⚠️ `99000000` là giá trị GIẢ MẠO từ client
- **Expected HTTP**: `200`
- **DB Verify** (server tự tính, bỏ qua giá trị client):
  - `totalLotValueBeforeVat = 100000 × 10 = 1,000,000` ← KHÔNG phải 99,000,000
  - `importTaxPayable = 1,000,000 × 5% = 50,000`
  - `vatTaxPayable = 1,000,000 × 10% = 100,000`

### [TC-DECL-UPDATE-03] Edge Case — declarationQuantity = 0 → tất cả = 0
- **Input**: `{ invoicePriceBeforeVat: 500000, declarationQuantity: 0, importTax: 10, vatTax: 10 }`
- **DB Verify**: `totalLotValueBeforeVat = 0`, `importTaxPayable = 0`, `vatTaxPayable = 0`

### [TC-DECL-UPDATE-04] Edge Case — invoicePriceBeforeVat = 0 → tổng = 0
- **Input**: `{ invoicePriceBeforeVat: 0, declarationQuantity: 50, importTax: 20, vatTax: 10 }`
- **DB Verify**: `totalLotValueBeforeVat = 0`

### [TC-DECL-UPDATE-05] importCostToCustomer — tính đủ chain
- **Setup**: `productItem.itemTransportFeeEstimate = 500,000`
- **Input**: `{ invoicePriceBeforeVat: 200000, declarationQuantity: 5, importTax: 10, vatTax: 10, payableFee: 50000, entrustmentFee: 30000 }`
- **DB Verify**:
  - `totalLotValueBeforeVat = 1,000,000`
  - `importTaxPayable = 100,000`
  - `vatTaxPayable = 100,000`
  - `importCostToCustomer = 500,000 + 100,000 + 100,000 + 50,000 + 30,000 = 780,000`

### [TC-DECL-UPDATE-06] Not Found → 404
- **Input**: PUT `/api/declarations/99999` với body hợp lệ
- **Expected HTTP**: `404`

### [TC-DECL-UPDATE-07] Cache invalidated sau update
- **Setup**: Seed Redis key `declarations:list:1:20::`
- **Input**: PUT `/api/declarations/:id` 
- **Expected**: Keys `declarations:list:*` = 0 sau khi update

---

## Nhóm 5: DELETE /api/declarations/:id — Xóa mềm

### [TC-DECL-DELETE-01] Happy Path — Soft delete thành công
- **Input**: DELETE `/api/declarations/:id` với ADMIN token
- **Expected HTTP**: `200`
- **DB Verify**: `declaration.deletedAt !== null`

### [TC-DECL-DELETE-02] Sau delete không hiện trong list
- **Input**: DELETE → rồi GET `/api/declarations`
- **Expected**: `items` không chứa ID vừa xóa

### [TC-DECL-DELETE-03] Cache invalidated sau delete
- **Setup**: Seed Redis dummy key
- **Expected**: Keys `declarations:list:*` = 0 sau delete

---

## Nhóm 6: GET /api/declarations/export/all — Export

### [TC-DECL-EXPORT-01] ADMIN export thành công
- **Input**: GET `/api/declarations/export/all` với ADMIN token
- **Expected HTTP**: `200`
- **Expected Response**: `data` là array, mỗi item có `productItem` và `productCode` relations

### [TC-DECL-EXPORT-02] USER role bị từ chối → 403
- **Input**: GET `/api/declarations/export/all` với USER token
- **Expected HTTP**: `403`

---

## Nhóm 7: Scenario 1 — Auto Creation via ProductCode

### [TC-DECL-AUTO-01] POST ProductCode với 2 items → tự tạo 2 Declarations
- **Input**: POST `/api/product-codes` với `items: [itemA, itemB]`
- **Expected**: `Declaration.count({ where: { productCodeId } }) === 2`
- **DB Verify**: Mỗi Declaration có `productCodeId` và `productItemId` khớp đúng

### [TC-DECL-AUTO-02] PUT ProductCode thay items → Declaration cũ bị cascade delete, Declaration mới được tạo
- **Setup**: Tạo ProductCode với 1 item → 1 Declaration
- **Input**: PUT `/api/product-codes/:id` với items mới hoàn toàn
- **Expected**:
  - Item cũ bị xóa khỏi DB
  - Declaration cũ bị cascade delete (do `productItem.onDelete: Cascade`)
  - 1 Declaration mới được tạo cho item mới

---

## Nhóm 8: Scenario 3 — DB Consistency

### [TC-DECL-CONS-01] Count(Declaration) == Count(ProductItem) cho cùng ProductCode
- **Input**: POST `/api/product-codes` với 3 items
- **DB Verify**: `productItem.count = 3`, `declaration.count = 3`

### [TC-DECL-CONS-02] Không có Orphan Declaration sau khi update items
- **Setup**: Tạo ProductCode với 2 items → 2 Declarations
- **Input**: PUT `/api/product-codes/:id` với 1 item mới
- **DB Verify**: `productItem.count = 1`, `declaration.count = 1`, không còn orphan records
