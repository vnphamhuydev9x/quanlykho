# TechSpec — Quản Lý Xuất Kho (Export Order) v1.0

> **Phiên bản**: 1.1
> **BRD tham chiếu**: `10_BRD_export_order_management.md` v1.1
> **Thay đổi v1.1**: Xóa `customerId` khỏi model `ExportOrder`; xóa validation MULTIPLE_CUSTOMERS; cập nhật create flow và frontend.
> **Ngày**: 2026-03-10

---

## 1. Phạm vi thay đổi

| Layer     | Thay đổi |
|-----------|----------|
| DB Schema | Thêm enum `ExportOrderStatus`; thêm model `ExportOrder`; ProductCode: thêm `exportOrderId`, `exportStatus`, `exportDeliveryDateTime`; ProductItem: thêm `actualWeight`, `actualVolume`, `actualItemTransportFeeEstimate`, `actualImportCostToCustomer`, `useActualData` |
| Backend   | Tạo mới `exportOrderController.js`, `exportOrderRoutes.js`; cập nhật `productCodeController.js` (GET list/detail trả thêm exportStatus) |
| Frontend  | Tạo mới `ExportOrderListPage.jsx`, `ExportOrderModal.jsx`, `InventoryVNPage.jsx`; cập nhật `ProductCodePage.jsx` (nút Tạo lệnh xuất kho), `ProductCodeTable.jsx` (cột exportStatus), Sidebar |

---

## 2. Database Migration

### 2.1 Enum mới: `ExportOrderStatus`

```prisma
enum ExportOrderStatus {
  DA_TAO_LENH
  DANG_XAC_NHAN_CAN
  DA_XAC_NHAN_CAN
  DA_XUAT_KHO
}
```

### 2.2 Model mới: `ExportOrder`

```prisma
model ExportOrder {
  id                  Int               @id @default(autoincrement())
  // customerId đã bị xóa (v1.1): 1 lệnh có thể chứa mã hàng nhiều khách hàng
  createdById         Int?
  createdBy           User?             @relation("ExportOrderCreatedBy", fields: [createdById], references: [id])
  deliveryDateTime    DateTime?         // Ngày giờ khách nhận hàng
  deliveryCost        Int?              // Chi phí giao hàng dự kiến (VND)
  notes               String?           @db.Text
  status              ExportOrderStatus @default(DA_TAO_LENH)
  amountReceived      Int?              // Số tiền đã nhận (VND) — điền khi giao hàng
  actualShippingCost  Int?              // Phí ship thực tế (VND) — điền khi giao hàng
  productCodes        ProductCode[]
  deletedAt           DateTime?         // Soft delete
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
}
```

> **Migration v1.1**: `npx prisma migrate dev --name remove_customer_from_export_order`

### 2.3 Bổ sung vào model `ProductCode`

```prisma
model ProductCode {
  // ... existing fields ...
  exportOrderId           Int?              // FK → ExportOrder
  exportOrder             ExportOrder?      @relation(fields: [exportOrderId], references: [id])
  exportStatus            ExportOrderStatus? // Clone từ ExportOrder.status
  exportDeliveryDateTime  DateTime?         // Clone từ ExportOrder.deliveryDateTime (để sort)
}
```

### 2.4 Bổ sung vào model `ProductItem`

```prisma
model ProductItem {
  // ... existing fields ...
  actualWeight                    Int?          // Trọng lượng sau cân lại (kg)
  actualVolume                    Decimal?      @db.Decimal(15,3)  // Khối lượng sau cân lại (m³)
  actualItemTransportFeeEstimate  Decimal?      @db.Decimal(15,2)  // Cước TQ_HN sau cân lại (VND) — Auto Calculated
  actualImportCostToCustomer      Decimal?      @db.Decimal(15,2)  // Chi phí NK sau cân lại (VND) — Auto Calculated
  useActualData                   Boolean       @default(false)    // Flag Admin xác nhận dùng số liệu sau cân
}
```

> **Migration**: `npx prisma migrate dev --name add_export_order_management`

---

## 3. Backend API

Base URL: `/api/export-orders`

### 3.1 Caching Strategy (Server-side Redis)

- **List (`GET /`)**: Cache key `export-orders:list:*`. Invalidate khi Create, Update status, Cancel.
- **Detail (`GET /:id`)**: Cache key `export-orders:detail:{id}`. Invalidate khi Update, Cancel.
- Khi thao tác thay đổi `exportStatus` trên `ProductCode` → invalidate `product-codes:list:*` và `product-codes:detail:{affectedIds}`.

### 3.2 API Endpoints

#### GET `/` — Danh sách ExportOrder

**Query params**: `page`, `limit`, `status` (filter), `customerId` (filter)

**Response**:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "createdBy": { "id": 2, "fullName": "Admin" },
        "deliveryDateTime": "2026-03-15T09:00:00Z",
        "deliveryCost": 500000,
        "status": "DA_TAO_LENH",
        "notes": "...",
        "productCodeCount": 3,
        "productCodes": [{ "id": 101, "customer": { "id": 10, "fullName": "Nguyễn A", "customerCode": "KH001" } }],
        "createdAt": "2026-03-10T10:00:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```
> **v1.1**: `customer` field cấp ExportOrder đã xóa. Thông tin khách hàng nằm trong từng `productCodes[i].customer`.

---

#### GET `/:id` — Chi tiết ExportOrder

**Response**: ExportOrder kèm `productCodes[]` (mỗi PC kèm `items[]`):
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "customer": { "id": 10, "fullName": "Nguyễn A" },
    "status": "DA_TAO_LENH",
    "productCodes": [
      {
        "id": 101,
        "orderCode": "DH001",
        "totalWeight": 200,
        "totalVolume": 1.5,
        "vehicleStatus": "DA_NHAP_KHO_VN",
        "exportStatus": "DA_TAO_LENH",
        "items": [
          {
            "id": 501,
            "productName": "Đồ điện tử",
            "weight": 100, "volume": 0.8,
            "itemTransportFeeEstimate": 500000,
            "actualWeight": null, "actualVolume": null,
            "actualItemTransportFeeEstimate": null,
            "actualImportCostToCustomer": null,
            "useActualData": false
          }
        ]
      }
    ]
  }
}
```

---

#### POST `/` — Tạo ExportOrder

**Request body**:
```json
{
  "productCodeIds": [101, 102],
  "deliveryDateTime": "2026-03-15T09:00:00Z",
  "deliveryCost": 500000,
  "notes": "Ghi chú"
}
```

**Logic (trong `$transaction`)**:

```javascript
// Bước 1: Validate vehicleStatus = DA_NHAP_KHO_VN
const notInVN = await prisma.productCode.findMany({
    where: { id: { in: productCodeIds }, vehicleStatus: { not: 'DA_NHAP_KHO_VN' } },
    select: { id: true, orderCode: true, vehicleStatus: true }
});
if (notInVN.length > 0) return 400 { code: 'VEHICLE_STATUS_INVALID', conflicts: notInVN }

// Bước 2 (v1.1): KHÔNG validate cùng customerId — cho phép nhiều khách hàng

// Bước 2: Validate exportOrderId = null
const alreadyExported = await prisma.productCode.findMany({
    where: { id: { in: productCodeIds }, exportOrderId: { not: null } },
    select: { id: true, orderCode: true, exportOrderId: true }
});
if (alreadyExported.length > 0) return 400 { code: 'ALREADY_IN_EXPORT_ORDER', conflicts: alreadyExported }

// Tạo ExportOrder (không có customerId)
const exportOrder = await prisma.exportOrder.create({
    data: {
        createdById: req.user.id,
        deliveryDateTime,
        deliveryCost,
        notes,
        status: 'DA_TAO_LENH'
    }
});

// Gán ProductCode + clone exportStatus + exportDeliveryDateTime
await prisma.productCode.updateMany({
    where: { id: { in: productCodeIds } },
    data: {
        exportOrderId: exportOrder.id,
        exportStatus: 'DA_TAO_LENH',
        exportDeliveryDateTime: deliveryDateTime ?? null
    }
});
```

**Response 400 conflict body (ví dụ)**:
```json
{
  "code": 400,
  "errorCode": "VEHICLE_STATUS_INVALID",
  "message": "Các mã hàng sau chưa về kho VN",
  "conflicts": [
    { "id": 103, "orderCode": "DH003", "vehicleStatus": "DA_XEP_XE" }
  ]
}
```

---

#### PATCH `/:id/status` — Cập nhật trạng thái

Dùng cho các bước: gửi số liệu cân lại (`DANG_XAC_NHAN_CAN`), xác nhận số cân (`DA_XAC_NHAN_CAN`), giao hàng (`DA_XUAT_KHO`).

**Request body** (ví dụ bước giao hàng):
```json
{
  "status": "DA_XUAT_KHO",
  "amountReceived": 2500000,
  "actualShippingCost": 150000
}
```

**Logic**:
```javascript
// Kiểm tra transition hợp lệ (xem mục 3.3)
// Cập nhật ExportOrder
const updated = await prisma.exportOrder.update({
    where: { id },
    data: { status, amountReceived, actualShippingCost }
});

// Clone exportStatus xuống tất cả ProductCode liên kết
await prisma.productCode.updateMany({
    where: { exportOrderId: id },
    data: { exportStatus: status }
});
```

---

#### PATCH `/:id/confirm-reweigh` — Admin xác nhận số cân (Bước 3)

**Request body**:
```json
{
  "items": [
    { "productItemId": 501, "useActualData": true },
    { "productItemId": 502, "useActualData": false }
  ]
}
```

**Logic (trong `$transaction`)**:
```javascript
// Validate ExportOrder.status = DANG_XAC_NHAN_CAN
// Cập nhật useActualData cho từng ProductItem
for (const item of items) {
    await prisma.productItem.update({
        where: { id: item.productItemId },
        data: { useActualData: item.useActualData }
    });
}

// Chuyển trạng thái ExportOrder + clone xuống ProductCode
await prisma.exportOrder.update({ where: { id }, data: { status: 'DA_XAC_NHAN_CAN' } });
await prisma.productCode.updateMany({
    where: { exportOrderId: id },
    data: { exportStatus: 'DA_XAC_NHAN_CAN' }
});
```

---

#### PATCH `/:id/submit-reweigh` — Nhân viên gửi số liệu cân lại (Bước 2)

**Request body**: Danh sách ProductItem với `actualWeight` và `actualVolume`:
```json
{
  "items": [
    {
      "productItemId": 501,
      "actualWeight": 95,
      "actualVolume": 0.75
    }
  ]
}
```

**Logic**:
```javascript
// Validate ExportOrder.status = DA_TAO_LENH
// Với mỗi item: tính actualItemTransportFeeEstimate + actualImportCostToCustomer
// (dùng cùng công thức với itemTransportFeeEstimate nhưng thay weight/volume bằng actual)
// Lưu vào ProductItem
// Set ExportOrder.status = DANG_XAC_NHAN_CAN
// Clone exportStatus xuống ProductCode
```

**Thuật toán tính `actualItemTransportFeeEstimate`** (giống công thức gốc, thay số liệu):
```javascript
const exchangeRate = parseFloat(productCode.exchangeRate || 0);
for (const item of items) {
    const feeByVolume = (item.volumeFee || 0) * (item.actualVolume || 0);
    const feeByWeight = (item.weightFee || 0) * (item.actualWeight || 0);
    const maxFee = Math.max(feeByVolume, feeByWeight);
    const extraFeeVND = (
        parseFloat(item.domesticFeeTQ || 0) +
        parseFloat(item.haulingFeeTQ || 0) +
        parseFloat(item.unloadingFeeRMB || 0)
    ) * exchangeRate;
    const actualFee = maxFee + extraFeeVND;

    // actualImportCostToCustomer = actualFee + chiPhiKhaiBAo
    // (join Declaration để lấy declarationCost nếu có)

    await prisma.productItem.update({
        where: { id: item.productItemId },
        data: {
            actualWeight: item.actualWeight,
            actualVolume: item.actualVolume,
            actualItemTransportFeeEstimate: actualFee,
            actualImportCostToCustomer: actualFee + (declarationCost || 0)
        }
    });
}
```

---

#### DELETE `/:id` — Hủy ExportOrder (soft delete)

**Validation**: Chỉ cho phép khi `status = DA_TAO_LENH`.

**Logic (trong `$transaction`)**:
```javascript
// Validate status
const eo = await prisma.exportOrder.findFirst({ where: { id, deletedAt: null } });
if (!eo) return 404;
if (eo.status !== 'DA_TAO_LENH') return 400 { errorCode: 'CANNOT_CANCEL', message: '...' }

// Soft delete
await prisma.exportOrder.update({ where: { id }, data: { deletedAt: new Date() } });

// Reset ProductCode
await prisma.productCode.updateMany({
    where: { exportOrderId: id },
    data: {
        exportOrderId: null,
        exportStatus: null,
        exportDeliveryDateTime: null
    }
});
```

---

### 3.3 State Machine — Transition hợp lệ

| Từ trạng thái | Có thể chuyển sang |
|---|---|
| `DA_TAO_LENH` | `DANG_XAC_NHAN_CAN` (nhân viên gửi cân), hoặc Hủy |
| `DANG_XAC_NHAN_CAN` | `DA_XAC_NHAN_CAN` (admin xác nhận) |
| `DA_XAC_NHAN_CAN` | `DA_XUAT_KHO` (giao hàng) |
| `DA_XUAT_KHO` | *(không chuyển tiếp)* |

Backend kiểm tra transition hợp lệ trước mọi lần đổi status. Trả `400` với `errorCode: 'INVALID_STATUS_TRANSITION'` nếu không hợp lệ.

---

## 4. Route mới (`exportOrderRoutes.js`)

```javascript
router.get('/', exportOrderController.getAll);
router.get('/:id', exportOrderController.getById);
router.post('/', exportOrderController.create);
router.patch('/:id/status', exportOrderController.updateStatus);
router.patch('/:id/submit-reweigh', exportOrderController.submitReweigh);
router.patch('/:id/confirm-reweigh', exportOrderController.confirmReweigh);
router.delete('/:id', exportOrderController.cancel);
```

---

## 5. Frontend — Thiết kế Component

### 5.1 Files thay đổi / tạo mới

| File | Thay đổi |
|------|----------|
| `schema.prisma` | Thêm enum + model + fields mới |
| `exportOrderController.js` | Tạo mới — toàn bộ handler |
| `exportOrderRoutes.js` | Tạo mới |
| `ProductCodePage.jsx` | Thêm nút [Tạo lệnh xuất kho] trong summary bar |
| `ProductCodeTable.jsx` | Thêm cột `exportStatus` (Tag màu + click Quick Peek) |
| `ExportOrderListPage.jsx` | Tạo mới — bảng danh sách ExportOrder |
| `ExportOrderModal.jsx` | Tạo mới — modal create/view/edit/confirm-reweigh/delivery |
| `InventoryVNPage.jsx` | Tạo mới — trang "Tồn kho VN" trong menu "Hàng tồn" |
| `Sidebar` | Thêm menu "Xuất kho" + sub-menu; thêm "Tồn kho VN" trong "Hàng tồn" |
| `exportOrderService.js` | Tạo mới — axios calls |

### 5.2 ProductCodePage — Summary Bar

Khi user tick chọn ≥1 mã hàng:
- Nút [Xếp xe] (đã có)
- Nút [Tạo lệnh xuất kho] **(mới)**

Click [Tạo lệnh xuất kho]:
1. Gọi validate phía FE (tất cả phải có `vehicleStatus = DA_NHAP_KHO_VN`)
2. Nếu có vi phạm → hiển thị Modal cảnh báo danh sách mã hàng không hợp lệ
3. Nếu hợp lệ → Mở `ExportOrderModal` (chế độ `create`)

### 5.3 ExportOrderModal — cấu trúc

```
Props: {
  visible,
  mode: 'create' | 'view' | 'submit-reweigh' | 'confirm-reweigh' | 'delivery',
  exportOrderId?,
  initialProductCodeIds?,
  onClose,
  onSuccess
}
```

**Chế độ `create`**:
- Form: `deliveryDateTime`, `deliveryCost`, `notes`
- Bảng mã hàng đã chọn — có thể thêm/xóa
- Nút [Thêm mã hàng] → Sub-modal chọn PC (filter: `vehicleStatus=DA_NHAP_KHO_VN` + `exportOrderId=null`, không lọc theo khách hàng)
- Prop `initialProductCodeIds?` — nếu có thì pre-populate bảng (khi mở từ ProductCodePage)
- Trạng thái: "Đã tạo lệnh xuất kho" (read-only)
- Nút [Tạo lệnh xuất kho]

> **v1.1**: Không có customer picker. Mã hàng nhiều khách hàng được phép chọn cùng nhau.

**Chế độ `submit-reweigh`** (nhân viên điền số liệu cân lại):
- Bảng mặt hàng có cột nhập `actualWeight`, `actualVolume`
- Cột `actualItemTransportFeeEstimate` và `actualImportCostToCustomer` hiển thị real-time (disabled, auto tính phía FE)
- Nút [Gửi thông tin cân lại]

**Chế độ `confirm-reweigh`** (Admin xác nhận):
- Bảng mặt hàng chia 2 nhóm cột:
  - **Số liệu ban đầu**: `weight`, `volume`, `itemTransportFeeEstimate`
  - **Số liệu sau cân lại**: `actualWeight`, `actualVolume`, `actualItemTransportFeeEstimate`, `actualImportCostToCustomer`
- Highlight chênh lệch: `red` nếu actual > gốc, `green` nếu actual < gốc
- Toggle `useActualData` mỗi dòng
- Toolbar: [Bật tất cả] / [Tắt tất cả]
- Nút [Xác nhận số cân]

**Chế độ `delivery`** (nhân viên giao hàng):
- Form điền: `amountReceived`, `actualShippingCost`
- Nút [Đã giao hàng]

### 5.4 ExportOrderListPage — bảng danh sách

Cột: `ID`, `Số mã hàng`, `Ngày giao dự kiến`, `Chi phí giao hàng`, `Trạng thái` (Tag màu), `Số tiền đã thu`, `Ghi chú`, `Người tạo`, `Ngày tạo`, `Thao tác`

Filter: Dropdown trạng thái

> **v1.1**: Cột "Khách hàng" bị xóa (1 lệnh có thể nhiều khách). Thông tin khách hàng xem trong detail từng PC.

### 5.5 InventoryVNPage — Tồn kho VN

- Query: `ProductCode` với `vehicleStatus = DA_NHAP_KHO_VN`
- Sorted: `exportDeliveryDateTime ASC NULLS LAST` → `id ASC`
- Cột bổ sung: `exportStatus` (Tag màu), `exportDeliveryDateTime`
- `exportStatus = null` → hiển thị Tag xám "Chưa có lệnh xuất"

### 5.6 exportOrderService.js

```javascript
const exportOrderService = {
    getAll: (params) => axiosInstance.get('/export-orders', { params }),
    getById: (id) => axiosInstance.get(`/export-orders/${id}`),
    create: (data) => axiosInstance.post('/export-orders', data),
    updateStatus: (id, data) => axiosInstance.patch(`/export-orders/${id}/status`, data),
    submitReweigh: (id, data) => axiosInstance.patch(`/export-orders/${id}/submit-reweigh`, data),
    confirmReweigh: (id, data) => axiosInstance.patch(`/export-orders/${id}/confirm-reweigh`, data),
    cancel: (id) => axiosInstance.delete(`/export-orders/${id}`)
};
```

---

## 6. Tag màu cho `ExportOrderStatus`

| Giá trị | Nhãn | Ant Design Tag Color |
|---|---|---|
| `DA_TAO_LENH` | Đã tạo lệnh xuất kho | `blue` |
| `DANG_XAC_NHAN_CAN` | Đang xác nhận số cân đo lại | `orange` |
| `DA_XAC_NHAN_CAN` | Đã xác nhận số cân | `green` |
| `DA_XUAT_KHO` | Đã xuất kho | `purple` |
| `null` | Chưa có lệnh xuất | `default` |

---

## 7. Thứ tự Implement

1. `schema.prisma` — thêm enum, model, fields
2. `prisma migrate dev`
3. `exportOrderController.js` + `exportOrderRoutes.js` — tạo mới BE
4. `app.js` — đăng ký route mới
5. `exportOrderService.js` — FE service
6. `ExportOrderModal.jsx` — component Modal đa chế độ
7. `ExportOrderListPage.jsx` — trang danh sách
8. `InventoryVNPage.jsx` — trang Tồn kho VN
9. `ProductCodePage.jsx` — thêm nút Tạo lệnh xuất kho
10. `ProductCodeTable.jsx` — thêm cột exportStatus
11. `Sidebar` — thêm menu/sub-menu
