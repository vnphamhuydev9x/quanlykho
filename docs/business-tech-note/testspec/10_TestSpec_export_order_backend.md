# Test Spec: Module Xuất Kho (Export Order) — Backend

> **Phiên bản**: v1.1 | **Cập nhật**: 2026-03-10
> **Tham chiếu**: [10_BRD_export_order_management.md v1.1], [10_TechSpec_export_order_management.md v1.1]
> **Thay đổi v1.1**: Xóa TC-EO-CREATE-BVAL-02 (nhiều customerId → nay là hợp lệ); thêm TC-EO-CREATE-03 (multi-customer happy path); cập nhật TC-EO-CREATE-01 bỏ check `customerId`.
> **Schema hiện tại** (các field liên quan):
> - `ExportOrder`: `id`, `createdById`, `deliveryDateTime`, `deliveryCost`, `notes`, `status` (default `DA_TAO_LENH`), `amountReceived`, `actualShippingCost`, `deletedAt`, `createdAt`, `updatedAt`
> - **(v1.1) `customerId` đã xóa khỏi ExportOrder**
> - `ProductCode` (bổ sung): `exportOrderId`, `exportStatus`, `exportDeliveryDateTime`
> - `ProductItem` (bổ sung): `actualWeight`, `actualVolume`, `actualItemTransportFeeEstimate`, `actualImportCostToCustomer`, `useActualData`

---

## Danh sách API cần test

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/export-orders` | GET | ADMIN | Lấy danh sách ExportOrder |
| `/api/export-orders/:id` | GET | ADMIN | Lấy chi tiết ExportOrder kèm ProductCode + ProductItem |
| `/api/export-orders` | POST | ADMIN | Tạo ExportOrder mới từ danh sách ProductCode |
| `/api/export-orders/:id/submit-reweigh` | PATCH | ADMIN | Gửi số liệu cân lại (DA_TAO_LENH → DANG_XAC_NHAN_CAN) |
| `/api/export-orders/:id/confirm-reweigh` | PATCH | ADMIN | Admin xác nhận số cân (DANG_XAC_NHAN_CAN → DA_XAC_NHAN_CAN) |
| `/api/export-orders/:id/status` | PATCH | ADMIN | Cập nhật trạng thái giao hàng (DA_XAC_NHAN_CAN → DA_XUAT_KHO) |
| `/api/export-orders/:id` | DELETE | ADMIN | Hủy ExportOrder — soft delete (chỉ khi DA_TAO_LENH) |

---

## Test Cases

---

## 1. POST /api/export-orders — Tạo ExportOrder

---

### [TC-EO-CREATE-01] — Happy Path: Tạo thành công (cùng 1 khách hàng)

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**:
  - Tồn tại `ProductCode[PC1]` và `ProductCode[PC2]` với:
    - `vehicleStatus = DA_NHAP_KHO_VN`
    - `exportOrderId = null`
    - (cùng hoặc khác `customerId` đều được)
- **Input Body**:
  ```json
  {
    "productCodeIds": ["<PC1>", "<PC2>"],
    "deliveryDateTime": "2026-03-20T09:00:00Z",
    "deliveryCost": 500000,
    "notes": "Giao hàng trước 9h sáng"
  }
  ```
- **Expected HTTP Status**: `201`
- **Expected Response**:
  ```json
  {
    "code": 200,
    "data": {
      "id": "<newId>",
      "status": "DA_TAO_LENH",
      "deliveryCost": 500000,
      "notes": "Giao hàng trước 9h sáng"
    }
  }
  ```
- **DB Verify**:
  - `ExportOrder` mới: `status = DA_TAO_LENH`, `deliveryCost = 500000`, `deletedAt = null`, `createdById = <adminId>`, **`customerId` không tồn tại**
  - `ProductCode[PC1]`: `exportOrderId = <newId>`, `exportStatus = DA_TAO_LENH`, `exportDeliveryDateTime = "2026-03-20T09:00:00Z"`
  - `ProductCode[PC2]`: `exportOrderId = <newId>`, `exportStatus = DA_TAO_LENH`, `exportDeliveryDateTime = "2026-03-20T09:00:00Z"`
- **Cache**: `export-orders:list:*` và `product-codes:list:*` bị invalidate

---

### [TC-EO-CREATE-03] — Happy Path: Tạo thành công với mã hàng nhiều khách hàng khác nhau

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**:
  - `ProductCode[PC1]`: `customerId = C1`, `vehicleStatus = DA_NHAP_KHO_VN`, `exportOrderId = null`
  - `ProductCode[PC2]`: `customerId = C2` (khác C1), `vehicleStatus = DA_NHAP_KHO_VN`, `exportOrderId = null`
- **Input Body**:
  ```json
  {
    "productCodeIds": ["<PC1>", "<PC2>"]
  }
  ```
- **Expected HTTP Status**: `201`
- **Expected Response**: `{ "code": 200, "data": { "id": "<newId>", "status": "DA_TAO_LENH" } }`
- **DB Verify**:
  - `ExportOrder` mới được tạo thành công (không có `customerId`)
  - `PC1.exportOrderId = <newId>`, `PC2.exportOrderId = <newId>`
  - `PC1.customerId` và `PC2.customerId` **không thay đổi** (vẫn là C1 và C2)

---

### [TC-EO-CREATE-02] — Happy Path: Không truyền deliveryDateTime (null)

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**: `ProductCode[PC3]` với `vehicleStatus = DA_NHAP_KHO_VN`, `exportOrderId = null`
- **Input Body**:
  ```json
  {
    "productCodeIds": ["<PC3>"]
  }
  ```
- **Expected HTTP Status**: `201`
- **DB Verify**:
  - `ExportOrder` mới: `deliveryDateTime = null`
  - `ProductCode[PC3]`: `exportDeliveryDateTime = null`

---

### [TC-EO-CREATE-AUTH-01] — No Token → 401

- **Endpoint**: `POST /api/export-orders`
- **Auth**: Không có Bearer token
- **Input Body**: `{ "productCodeIds": [1] }`
- **Expected HTTP Status**: `401`
- **Expected Response**: `{ "code": 99003 }`
- **DB Verify**: Không có `ExportOrder` mới được tạo

---

### [TC-EO-CREATE-VAL-01] — Missing productCodeIds → 400

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Input Body**: `{ "deliveryCost": 500000, "notes": "test" }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 99001 }`
- **DB Verify**: Không có `ExportOrder` mới

---

### [TC-EO-CREATE-VAL-02] — productCodeIds là mảng rỗng → 400

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Input Body**: `{ "productCodeIds": [] }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 99001 }`

---

### [TC-EO-CREATE-BVAL-01] — vehicleStatus ≠ DA_NHAP_KHO_VN → 400

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**: `ProductCode[PC4].vehicleStatus = "DANG_VAN_CHUYEN"` (chưa về kho VN)
- **Input Body**: `{ "productCodeIds": ["<PC4>"] }`
- **Expected HTTP Status**: `400`
- **Expected Response**:
  ```json
  {
    "code": 400,
    "errorCode": "VEHICLE_STATUS_INVALID",
    "conflicts": [{ "id": "<PC4>", "vehicleStatus": "DANG_VAN_CHUYEN" }]
  }
  ```
- **DB Verify**: Không có `ExportOrder` mới; `ProductCode[PC4]` không thay đổi

---

### [TC-EO-CREATE-BVAL-02] — ~~Nhiều customerId → 400~~ **(XÓA trong v1.1)**

> **Đã xóa**: Behavior này không còn là lỗi. Xem TC-EO-CREATE-03 là happy path cho multi-customer.

---

### [TC-EO-CREATE-BVAL-03] — ProductCode đã có exportOrderId ≠ null → 400

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**: `ProductCode[PC7].exportOrderId = <EO_OLD>` (đã thuộc lệnh xuất kho khác)
- **Input Body**: `{ "productCodeIds": ["<PC7>"] }`
- **Expected HTTP Status**: `400`
- **Expected Response**:
  ```json
  {
    "code": 400,
    "errorCode": "ALREADY_IN_EXPORT_ORDER",
    "conflicts": [{ "id": "<PC7>", "exportOrderId": "<EO_OLD>" }]
  }
  ```
- **DB Verify**: Không có `ExportOrder` mới; `ProductCode[PC7].exportOrderId` không thay đổi

---

### [TC-EO-CREATE-BVAL-04] — Mixed: 1 PC hợp lệ + 1 PC có vehicleStatus sai → 400 (dừng ở lỗi đầu tiên)

- **Endpoint**: `POST /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**:
  - `ProductCode[PC8]`: `vehicleStatus = DA_NHAP_KHO_VN`, `customerId = C1`, `exportOrderId = null`
  - `ProductCode[PC9]`: `vehicleStatus = DA_XEP_XE`, `customerId = C1`, `exportOrderId = null`
- **Input Body**: `{ "productCodeIds": ["<PC8>", "<PC9>"] }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "errorCode": "VEHICLE_STATUS_INVALID", "conflicts": [{ "id": "<PC9>" }] }`
- **DB Verify**: Cả PC8 và PC9 đều không thay đổi

---

## 2. GET /api/export-orders — Danh sách

---

### [TC-EO-LIST-01] — Happy Path: Lấy danh sách thành công

- **Endpoint**: `GET /api/export-orders`
- **Auth**: ADMIN token
- **Precondition**: Tồn tại 2 ExportOrder chưa bị soft delete; 1 ExportOrder đã bị soft delete (`deletedAt ≠ null`)
- **Input**: Không có query params
- **Expected HTTP Status**: `200`
- **Expected Response**:
  ```json
  {
    "code": 200,
    "data": {
      "items": [{ "id": ..., "status": "DA_TAO_LENH", "customer": { "id": ..., "fullName": "..." }, "productCodeCount": ... }],
      "total": 2,
      "page": 1,
      "limit": 20
    }
  }
  ```
- **DB Verify**: Response không chứa ExportOrder đã soft delete
- **Cache**: Lần GET tiếp theo trả từ Redis `export-orders:list:*`

---

### [TC-EO-LIST-AUTH-01] — No Token → 401

- **Endpoint**: `GET /api/export-orders`
- **Auth**: Không có Bearer token
- **Expected HTTP Status**: `401`

---

### [TC-EO-LIST-FILTER-01] — Filter theo status

- **Endpoint**: `GET /api/export-orders?status=DANG_XAC_NHAN_CAN`
- **Auth**: ADMIN token
- **Precondition**: Tồn tại ExportOrder với các status: `DA_TAO_LENH`, `DANG_XAC_NHAN_CAN`, `DA_XUAT_KHO`
- **Expected HTTP Status**: `200`
- **DB Verify**: Response chỉ chứa ExportOrder có `status = DANG_XAC_NHAN_CAN`

---

## 3. GET /api/export-orders/:id — Chi tiết

---

### [TC-EO-DETAIL-01] — Happy Path: Lấy chi tiết đầy đủ

- **Endpoint**: `GET /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**:
  - `ExportOrder[EO1]` tồn tại, `status = DA_TAO_LENH`
  - EO1 có 1 `ProductCode[PC10]`
  - PC10 có 2 `ProductItem` (PI1, PI2) với các trường `actual*` = null, `useActualData = false`
- **Expected HTTP Status**: `200`
- **Expected Response**:
  ```json
  {
    "code": 200,
    "data": {
      "id": "<EO1>",
      "status": "DA_TAO_LENH",
      "customer": { "id": ..., "fullName": "..." },
      "productCodes": [{
        "id": "<PC10>",
        "items": [{
          "id": "<PI1>",
          "weight": ..., "volume": ...,
          "actualWeight": null, "actualVolume": null,
          "useActualData": false
        }]
      }]
    }
  }
  ```

---

### [TC-EO-DETAIL-AUTH-01] — No Token → 401

- **Endpoint**: `GET /api/export-orders/1`
- **Auth**: Không có token
- **Expected HTTP Status**: `401`

---

### [TC-EO-DETAIL-404] — Not Found → 404

- **Endpoint**: `GET /api/export-orders/99999`
- **Auth**: ADMIN token
- **Expected HTTP Status**: `404`

---

### [TC-EO-DETAIL-SOFTDEL-01] — ExportOrder đã soft delete → 404

- **Endpoint**: `GET /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO_DELETED].deletedAt ≠ null`
- **Expected HTTP Status**: `404`

---

## 4. PATCH /api/export-orders/:id/submit-reweigh — Gửi số liệu cân lại

---

### [TC-EO-REWEIGH-01] — Happy Path: Tính actualItemTransportFeeEstimate đúng công thức

- **Endpoint**: `PATCH /api/export-orders/:id/submit-reweigh`
- **Auth**: ADMIN token
- **Precondition**:
  - `ExportOrder[EO2].status = DA_TAO_LENH`
  - `ProductItem[PI3]`: `volumeFee = 300000`, `weightFee = 2000`, `domesticFeeTQ = 0`, `haulingFeeTQ = 0`, `unloadingFeeRMB = 0`
  - `ProductCode` cha của PI3: `exchangeRate = 3500`
- **Input Body**:
  ```json
  {
    "items": [
      { "productItemId": "<PI3>", "actualWeight": 95, "actualVolume": 0.90 }
    ]
  }
  ```
- **Expected HTTP Status**: `200`
- **DB Verify**:
  - `ProductItem[PI3].actualWeight = 95`
  - `ProductItem[PI3].actualVolume = 0.90`
  - `actualItemTransportFeeEstimate = MAX(0.90 × 300000, 95 × 2000) = MAX(270000, 190000) = 270000`
  - `ExportOrder[EO2].status = DANG_XAC_NHAN_CAN`
  - `ProductCode` trong EO2: `exportStatus = DANG_XAC_NHAN_CAN`
  - Số liệu gốc: `ProductItem[PI3].weight` và `ProductItem[PI3].volume` **không thay đổi**
- **Cache**: `product-codes:list:*` bị invalidate

---

### [TC-EO-REWEIGH-02] — Tính actualImportCostToCustomer với declarationCost

- **Endpoint**: `PATCH /api/export-orders/:id/submit-reweigh`
- **Auth**: ADMIN token
- **Precondition**:
  - `ExportOrder[EO3].status = DA_TAO_LENH`
  - `ProductItem[PI4]`: `volumeFee = 300000`, `weightFee = 2000`, `domesticFeeTQ = 50`, `haulingFeeTQ = 30`, `unloadingFeeRMB = 20`
  - `ProductCode` cha: `exchangeRate = 3500`
  - `Declaration` liên kết với PI4 có `declarationCost = 100000`
- **Input Body**:
  ```json
  {
    "items": [{ "productItemId": "<PI4>", "actualWeight": 80, "actualVolume": 0.80 }]
  }
  ```
- **DB Verify**:
  - `extraFeeVND = (50 + 30 + 20) × 3500 = 350000`
  - `feeByVolume = 0.80 × 300000 = 240000`
  - `feeByWeight = 80 × 2000 = 160000`
  - `actualItemTransportFeeEstimate = MAX(240000, 160000) + 350000 = 590000`
  - `actualImportCostToCustomer = 590000 + 100000 = 690000`

---

### [TC-EO-REWEIGH-03] — Nhiều item trong 1 request

- **Endpoint**: `PATCH /api/export-orders/:id/submit-reweigh`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO4].status = DA_TAO_LENH`, có 2 ProductItem PI5 và PI6
- **Input Body**:
  ```json
  {
    "items": [
      { "productItemId": "<PI5>", "actualWeight": 50, "actualVolume": 0.5 },
      { "productItemId": "<PI6>", "actualWeight": 70, "actualVolume": 0.7 }
    ]
  }
  ```
- **Expected HTTP Status**: `200`
- **DB Verify**: Cả PI5 và PI6 đều được cập nhật; `ExportOrder[EO4].status = DANG_XAC_NHAN_CAN`

---

### [TC-EO-REWEIGH-AUTH-01] — No Token → 401

- **Endpoint**: `PATCH /api/export-orders/1/submit-reweigh`
- **Auth**: Không có token
- **Expected HTTP Status**: `401`

---

### [TC-EO-REWEIGH-404] — Not Found → 404

- **Endpoint**: `PATCH /api/export-orders/99999/submit-reweigh`
- **Auth**: ADMIN token
- **Input Body**: `{ "items": [{ "productItemId": 1, "actualWeight": 50, "actualVolume": 0.5 }] }`
- **Expected HTTP Status**: `404`

---

### [TC-EO-REWEIGH-VAL-01] — Status ≠ DA_TAO_LENH → 400 (INVALID_STATUS_TRANSITION)

- **Endpoint**: `PATCH /api/export-orders/:id/submit-reweigh`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO5].status = DANG_XAC_NHAN_CAN`
- **Input Body**: `{ "items": [{ "productItemId": "<PI7>", "actualWeight": 50, "actualVolume": 0.5 }] }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "INVALID_STATUS_TRANSITION" }`
- **DB Verify**: `ProductItem[PI7].actualWeight` không thay đổi; `ExportOrder[EO5].status` không đổi

---

## 5. PATCH /api/export-orders/:id/confirm-reweigh — Admin xác nhận số cân

---

### [TC-EO-CONFIRM-01] — Happy Path: Xác nhận per-item (mixed true/false)

- **Endpoint**: `PATCH /api/export-orders/:id/confirm-reweigh`
- **Auth**: ADMIN token
- **Precondition**:
  - `ExportOrder[EO6].status = DANG_XAC_NHAN_CAN`
  - `ProductItem[PI8].useActualData = false`, đã có `actualWeight`, `actualVolume`
  - `ProductItem[PI9].useActualData = false`, đã có `actualWeight`, `actualVolume`
- **Input Body**:
  ```json
  {
    "items": [
      { "productItemId": "<PI8>", "useActualData": true },
      { "productItemId": "<PI9>", "useActualData": false }
    ]
  }
  ```
- **Expected HTTP Status**: `200`
- **DB Verify**:
  - `ProductItem[PI8].useActualData = true`
  - `ProductItem[PI9].useActualData = false`
  - `ExportOrder[EO6].status = DA_XAC_NHAN_CAN`
  - `ProductCode` trong EO6: `exportStatus = DA_XAC_NHAN_CAN`
  - Số liệu gốc của PI8, PI9 (`weight`, `volume`, `itemTransportFeeEstimate`) **không thay đổi**
- **Cache**: `export-orders:detail:<EO6>` và `product-codes:list:*` bị invalidate

---

### [TC-EO-CONFIRM-02] — Bulk: Tất cả item đều useActualData = true

- **Endpoint**: `PATCH /api/export-orders/:id/confirm-reweigh`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO7].status = DANG_XAC_NHAN_CAN`, có 3 ProductItem PI10, PI11, PI12
- **Input Body**:
  ```json
  {
    "items": [
      { "productItemId": "<PI10>", "useActualData": true },
      { "productItemId": "<PI11>", "useActualData": true },
      { "productItemId": "<PI12>", "useActualData": true }
    ]
  }
  ```
- **Expected HTTP Status**: `200`
- **DB Verify**: PI10, PI11, PI12 đều có `useActualData = true`; `ExportOrder[EO7].status = DA_XAC_NHAN_CAN`

---

### [TC-EO-CONFIRM-AUTH-01] — No Token → 401

- **Endpoint**: `PATCH /api/export-orders/1/confirm-reweigh`
- **Auth**: Không có token
- **Expected HTTP Status**: `401`

---

### [TC-EO-CONFIRM-404] — Not Found → 404

- **Endpoint**: `PATCH /api/export-orders/99999/confirm-reweigh`
- **Auth**: ADMIN token
- **Input Body**: `{ "items": [{ "productItemId": 1, "useActualData": true }] }`
- **Expected HTTP Status**: `404`

---

### [TC-EO-CONFIRM-VAL-01] — Status ≠ DANG_XAC_NHAN_CAN → 400

- **Endpoint**: `PATCH /api/export-orders/:id/confirm-reweigh`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO8].status = DA_TAO_LENH`
- **Input Body**: `{ "items": [{ "productItemId": "<PI13>", "useActualData": true }] }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "INVALID_STATUS_TRANSITION" }`
- **DB Verify**: `ProductItem[PI13].useActualData` không thay đổi; `ExportOrder[EO8].status` không đổi

---

## 6. PATCH /api/export-orders/:id/status — Cập nhật trạng thái (Giao hàng)

---

### [TC-EO-STATUS-01] — Happy Path: Giao hàng (DA_XAC_NHAN_CAN → DA_XUAT_KHO)

- **Endpoint**: `PATCH /api/export-orders/:id/status`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO9].status = DA_XAC_NHAN_CAN`
- **Input Body**:
  ```json
  {
    "status": "DA_XUAT_KHO",
    "amountReceived": 2500000,
    "actualShippingCost": 150000
  }
  ```
- **Expected HTTP Status**: `200`
- **DB Verify**:
  - `ExportOrder[EO9].status = DA_XUAT_KHO`
  - `ExportOrder[EO9].amountReceived = 2500000`
  - `ExportOrder[EO9].actualShippingCost = 150000`
  - `ProductCode` trong EO9: `exportStatus = DA_XUAT_KHO`
- **Cache**: `export-orders:list:*`, `export-orders:detail:<EO9>`, `product-codes:list:*` bị invalidate

---

### [TC-EO-STATUS-AUTH-01] — No Token → 401

- **Endpoint**: `PATCH /api/export-orders/1/status`
- **Auth**: Không có token
- **Expected HTTP Status**: `401`

---

### [TC-EO-STATUS-404] — Not Found → 404

- **Endpoint**: `PATCH /api/export-orders/99999/status`
- **Auth**: ADMIN token
- **Input Body**: `{ "status": "DA_XUAT_KHO" }`
- **Expected HTTP Status**: `404`

---

### [TC-EO-STATUS-VAL-01] — Nhảy cóc trạng thái (DA_TAO_LENH → DA_XUAT_KHO) → 400

- **Endpoint**: `PATCH /api/export-orders/:id/status`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO10].status = DA_TAO_LENH`
- **Input Body**: `{ "status": "DA_XUAT_KHO", "amountReceived": 1000000 }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "INVALID_STATUS_TRANSITION" }`
- **DB Verify**: `ExportOrder[EO10].status` vẫn là `DA_TAO_LENH`; `amountReceived` không thay đổi

---

### [TC-EO-STATUS-VAL-02] — Nhảy cóc (DA_TAO_LENH → DA_XAC_NHAN_CAN) → 400

- **Endpoint**: `PATCH /api/export-orders/:id/status`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO11].status = DA_TAO_LENH`
- **Input Body**: `{ "status": "DA_XAC_NHAN_CAN" }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "INVALID_STATUS_TRANSITION" }`

---

### [TC-EO-STATUS-VAL-03] — Trạng thái cuối (DA_XUAT_KHO) không thể chuyển tiếp → 400

- **Endpoint**: `PATCH /api/export-orders/:id/status`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO12].status = DA_XUAT_KHO`
- **Input Body**: `{ "status": "DA_TAO_LENH" }`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "INVALID_STATUS_TRANSITION" }`

---

## 7. DELETE /api/export-orders/:id — Hủy ExportOrder (Soft Delete)

---

### [TC-EO-CANCEL-01] — Happy Path: Hủy thành công khi status = DA_TAO_LENH

- **Endpoint**: `DELETE /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**:
  - `ExportOrder[EO13].status = DA_TAO_LENH`, `deletedAt = null`
  - `ProductCode[PC20]`: `exportOrderId = <EO13>`, `exportStatus = DA_TAO_LENH`, `exportDeliveryDateTime = "2026-03-20T09:00:00Z"`
  - `ProductCode[PC21]`: `exportOrderId = <EO13>`, `exportStatus = DA_TAO_LENH`, `exportDeliveryDateTime = "2026-03-20T09:00:00Z"`
- **Expected HTTP Status**: `200`
- **DB Verify**:
  - `ExportOrder[EO13].deletedAt ≠ null` (soft deleted)
  - `ProductCode[PC20]`: `exportOrderId = null`, `exportStatus = null`, `exportDeliveryDateTime = null`
  - `ProductCode[PC21]`: `exportOrderId = null`, `exportStatus = null`, `exportDeliveryDateTime = null`
- **Cache**: `export-orders:list:*`, `product-codes:list:*` bị invalidate

---

### [TC-EO-CANCEL-AUTH-01] — No Token → 401

- **Endpoint**: `DELETE /api/export-orders/1`
- **Auth**: Không có token
- **Expected HTTP Status**: `401`

---

### [TC-EO-CANCEL-404] — Not Found → 404

- **Endpoint**: `DELETE /api/export-orders/99999`
- **Auth**: ADMIN token
- **Expected HTTP Status**: `404`

---

### [TC-EO-CANCEL-VAL-01] — Status = DANG_XAC_NHAN_CAN → không cho hủy → 400

- **Endpoint**: `DELETE /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO14].status = DANG_XAC_NHAN_CAN`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "CANNOT_CANCEL" }`
- **DB Verify**: `ExportOrder[EO14].deletedAt = null` (không bị xóa)

---

### [TC-EO-CANCEL-VAL-02] — Status = DA_XAC_NHAN_CAN → không cho hủy → 400

- **Endpoint**: `DELETE /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO15].status = DA_XAC_NHAN_CAN`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "CANNOT_CANCEL" }`
- **DB Verify**: `ExportOrder[EO15].deletedAt = null`

---

### [TC-EO-CANCEL-VAL-03] — Status = DA_XUAT_KHO → không cho hủy → 400

- **Endpoint**: `DELETE /api/export-orders/:id`
- **Auth**: ADMIN token
- **Precondition**: `ExportOrder[EO16].status = DA_XUAT_KHO`
- **Expected HTTP Status**: `400`
- **Expected Response**: `{ "code": 400, "errorCode": "CANNOT_CANCEL" }`
- **DB Verify**: `ExportOrder[EO16].deletedAt = null`

---

## 8. Cache Invalidation

---

### [TC-EO-CACHE-01] — Create ExportOrder → invalidate list cache

- **Precondition**: Đã gọi `GET /api/export-orders` (cache được populate)
- **Action**: `POST /api/export-orders` tạo lệnh mới
- **Verify**: Gọi lại `GET /api/export-orders` → total tăng thêm 1, ExportOrder mới xuất hiện trong danh sách (không phải stale data)

---

### [TC-EO-CACHE-02] — submit-reweigh → invalidate product-codes cache

- **Precondition**: Đã gọi `GET /api/product-codes` (cache được populate với `exportStatus = DA_TAO_LENH`)
- **Action**: `PATCH /api/export-orders/:id/submit-reweigh`
- **Verify**: Gọi lại `GET /api/product-codes` → ProductCode liên quan hiển thị `exportStatus = DANG_XAC_NHAN_CAN`

---

### [TC-EO-CACHE-03] — Cancel ExportOrder → invalidate cả export-orders và product-codes cache

- **Precondition**: Cache `export-orders:list:*` và `product-codes:list:*` đã được populate
- **Action**: `DELETE /api/export-orders/:id` hủy lệnh
- **Verify**:
  - `GET /api/export-orders` → ExportOrder đã hủy không còn trong danh sách
  - `GET /api/product-codes` → ProductCode liên quan có `exportOrderId = null`, `exportStatus = null`

---

### [TC-EO-CACHE-04] — confirm-reweigh → invalidate detail cache

- **Precondition**: Đã gọi `GET /api/export-orders/:id` (cache `export-orders:detail:{id}` được populate)
- **Action**: `PATCH /api/export-orders/:id/confirm-reweigh`
- **Verify**: Gọi lại `GET /api/export-orders/:id` → `status = DA_XAC_NHAN_CAN` và `useActualData` của từng item đã cập nhật

---

## Checklist "Done" cho Module Xuất Kho

```
☐ 1. BRD (10_BRD_export_order_management.md) đã cập nhật đầy đủ
☐ 2. Tech Spec (10_TechSpec_export_order_management.md) đã cập nhật (schema, API contract)
☐ 3. Test Spec này — viết đủ granular (có TC-ID, Input, Expected Output) ← file này
☐ 4. Integration Test viết xong (source/integration_tests/exportOrder.test.js — mỗi TC có 1 it() block, có TC-ID comment)
☐ 5. Chạy: npm run test -- --testPathPattern=exportOrder.test.js
☐ 6. Tất cả test PASS (màu xanh 100%)
☐ 7. Không có SKIP test (không dùng it.skip() để trốn lỗi)
```
