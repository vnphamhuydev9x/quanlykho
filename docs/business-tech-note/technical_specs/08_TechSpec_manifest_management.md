# TechSpec — Xếp Xe (Manifest) v3

> **Phiên bản**: 3.0
> **BRD tham chiếu**: `08_BRD_manifest_management.md` v3.0

---

## 1. Phạm vi thay đổi v3

| Layer     | Thay đổi |
|-----------|----------|
| DB Schema | ProductCode: thêm `vehicleStatus`, `vehicleStatusOverridden` |
| Backend   | manifestController: các validator + logic update chọn lọc; thêm 2 endpoint mới |
| Frontend  | ManifestListPage: view/edit → Modal; ProductCodePage: nút Xếp xe khi select; DeclarationModal/table: thêm vehicleStatus |

---

## 2. Database Migration

### 2.1 Bổ sung vào model `ProductCode` trong schema.prisma

```prisma
model ProductCode {
  // ... existing fields ...
  vehicleStatus           ManifestStatus?  // Trạng thái xếp xe (null = chưa xếp)
  vehicleStatusOverridden Boolean          @default(false) // Đã chỉnh thủ công
}
```

> **Migration**: `npx prisma migrate dev --name add_vehicle_status_to_product_code`

---

## 3. Backend API — Thay đổi & Endpoint mới

### 3.1 Endpoints hiện tại — thay đổi logic

#### POST /manifests — Create
**Bổ sung**: Nhận thêm `productCodeIds[]` trong body.
**Logic mới**:
```javascript
// 1. Validate tất cả PC có vehicleStatus = null
const conflicts = await prisma.productCode.findMany({
    where: { id: { in: productCodeIds }, vehicleStatus: { not: null } },
    include: { manifest: { select: { id: true, licensePlate: true } } }
});
if (conflicts.length > 0) return 400 with conflict list

// 2. Tạo Manifest
// 3. Gán productCodeIds + set vehicleStatus = CHO_XEP_XE, vehicleStatusOverridden = false
await prisma.productCode.updateMany({
    where: { id: { in: productCodeIds } },
    data: { manifestId, vehicleStatus: 'CHO_XEP_XE', vehicleStatusOverridden: false }
});
```

**Response 400 conflict body**:
```json
{
  "code": 400,
  "message": "Một số mã hàng đã được xếp xe",
  "conflicts": [
    { "productCodeId": 101, "manifestId": 5, "licensePlate": "51C-xxx", "orderCode": "DH001" }
  ]
}
```

#### PUT /manifests/:id — Update (khi status thay đổi)
**Logic mới**: Nếu `status` thay đổi → chỉ update PC chưa override:
```javascript
if (status && status !== existing.status) {
    await prisma.productCode.updateMany({
        where: { manifestId: parseInt(id), vehicleStatusOverridden: false },
        data: { vehicleStatus: status }
    });
}
```

#### POST /manifests/:id/add-items
**Logic mới**:
```javascript
// Validate vehicleStatus = null
const conflicts = await prisma.productCode.findMany({
    where: { id: { in: ids }, vehicleStatus: { not: null } }
});
if (conflicts.length > 0) return 400

// Set vehicleStatus = manifest.status, vehicleStatusOverridden = false
await prisma.productCode.updateMany({
    where: { id: { in: ids } },
    data: { manifestId, vehicleStatus: manifest.status, vehicleStatusOverridden: false }
});
```

#### DELETE /manifests/:id (soft delete)
**Logic mới**: Reset vehicleStatus + override cho tất cả PC:
```javascript
await prisma.productCode.updateMany({
    where: { manifestId },
    data: { manifestId: null, vehicleStatus: null, vehicleStatusOverridden: false }
});
```

#### POST /manifests/:id/remove-items
**Logic mới**: Reset vehicleStatus:
```javascript
await prisma.productCode.updateMany({
    where: { id: { in: ids }, manifestId },
    data: { manifestId: null, vehicleStatus: null, vehicleStatusOverridden: false }
});
```

---

### 3.2 Endpoint mới

#### PATCH /manifests/:id/product-codes/:pcId/vehicle-status
**Mô tả**: Chỉnh thủ công vehicleStatus một mã hàng (trong edit manifest)
**Request body**: `{ "vehicleStatus": "DA_XEP_XE" }`
**Logic**:
```javascript
// Validate pcId thuộc manifest id
// Set vehicleStatus + vehicleStatusOverridden = true
await prisma.productCode.update({
    where: { id: parseInt(pcId) },
    data: { vehicleStatus, vehicleStatusOverridden: true }
});
```
**Response**: `{ code: 200, data: updatedProductCode }`

#### PATCH /manifests/:id/product-codes/:pcId/reset-vehicle-status
**Mô tả**: Khôi phục vehicleStatus về trạng thái hiện tại của xe
**Logic**:
```javascript
const manifest = await prisma.manifest.findFirst({ where: { id } });
await prisma.productCode.update({
    where: { id: parseInt(pcId) },
    data: { vehicleStatus: manifest.status, vehicleStatusOverridden: false }
});
```

#### PATCH /manifests/:id/product-codes/bulk-vehicle-status  *(tuỳ chọn — optional)*
**Mô tả**: Chỉnh thủ công cho nhiều mã hàng cùng lúc
**Request body**: `{ "productCodeIds": [101, 102], "vehicleStatus": "DA_XEP_XE" }`
**Logic**: Loop update từng PC với vehicleStatusOverridden = true

---

### 3.3 GET /manifests/:id — cập nhật include

Bổ sung thêm `vehicleStatus`, `vehicleStatusOverridden` vào include productCodes:
```javascript
productCodes: {
    include: {
        customer: { select: { id, fullName, customerCode } },
        items: { select: { packageCount, packageUnit } }
    }
    // vehicleStatus, vehicleStatusOverridden tự có trong productCode fields
}
```

---

### 3.4 GET /product-codes — thêm vehicleStatus vào list response

Bổ sung `vehicleStatus`, `vehicleStatusOverridden` vào select/include của `getAllProductCodes`.

---

## 4. Route mới (manifestRoutes.js)

```javascript
router.patch('/:id/product-codes/:pcId/vehicle-status', manifestController.updateProductCodeVehicleStatus);
router.patch('/:id/product-codes/:pcId/reset-vehicle-status', manifestController.resetProductCodeVehicleStatus);
// Optional bulk:
router.patch('/:id/product-codes/bulk-vehicle-status', manifestController.bulkUpdateVehicleStatus);
```

---

## 5. Frontend — Thay đổi

### 5.1 Files thay đổi

| File | Thay đổi |
|------|----------|
| `schema.prisma` | Thêm 2 fields vào ProductCode |
| `manifestController.js` | Logic mới cho tất cả handlers + 2 handler mới |
| `manifestRoutes.js` | 2 route mới |
| `manifestService.js` | 2 method mới: `updateVehicleStatus`, `resetVehicleStatus`, `create` nhận thêm `productCodeIds` |
| `ProductCodePage.jsx` | Thêm nút [Xếp xe] trong summary bar |
| `ManifestListPage.jsx` | View/Edit mở ManifestModal thay vì navigate |
| `ManifestModal.jsx` | **Mới** — Modal tổng hợp view/edit |
| `ManifestDetailPage.jsx` | Có thể giữ hoặc redirect về ManifestListPage |
| `DeclarationModal.jsx` | Thêm field vehicleStatus (read-only, lấy từ productCode) |
| `ProductCodeModal.jsx` | Thêm cột vehicleStatus trong table mặt hàng (đây là table productCode, không phải items) |

### 5.2 ManifestModal — thiết kế component

```
Props: { visible, mode ('view'|'edit'|'create'), manifestId?, initialProductCodeIds?, onClose, onSuccess }

State:
- form data (biển số, callerId, date, status, note)
- productCodes[] — danh sách mã hàng trong xe
- selectedPCKeys[] — các dòng đang tick trong bảng
- bulkStatusValue — giá trị trạng thái được chọn để áp dụng bulk
- addModalVisible
- availablePCs[] — danh sách PC có vehicleStatus=null để thêm vào

Table columns khi Edit:
  ID | Mã đơn | Khách hàng | Tổng cân | Tổng khối | Trạng thái xếp xe | Ghi chú | Thao tác
     |        |            |          |           | [Tag + ⚠ nếu override] |   | [↺ Khôi phục] [👁 Xem]
```

### 5.3 vehicleStatus hiển thị trong Declaration

Khi mở Declaration (DeclarationModal):
- Lấy `vehicleStatus` từ `declaration.productCode.vehicleStatus`
- Hiển thị read-only Tag trong form sau các field khai báo

Trong ProductCodeModal — table danh sách mặt hàng:
- Thêm cột `vehicleStatus` → Tag màu giống ManifestStatus

### 5.4 manifestService.js — bổ sung

```javascript
updateVehicleStatus: async (manifestId, pcId, vehicleStatus) => {
    return axiosInstance.patch(`/manifests/${manifestId}/product-codes/${pcId}/vehicle-status`, { vehicleStatus });
},
resetVehicleStatus: async (manifestId, pcId) => {
    return axiosInstance.patch(`/manifests/${manifestId}/product-codes/${pcId}/reset-vehicle-status`);
},
```

---

## 6. Thứ tự implement

1. ✅ **schema.prisma** — thêm `vehicleStatus`, `vehicleStatusOverridden`
2. ✅ **Migration** — `prisma migrate dev`
3. ✅ **manifestController.js** — cập nhật logic + thêm 2 handler mới
4. ✅ **manifestRoutes.js** — thêm 2 route
5. ✅ **manifestService.js** (FE) — thêm 2 method
6. ✅ **ManifestModal.jsx** — tạo mới component
7. ✅ **ManifestListPage.jsx** — dùng ManifestModal thay navigate
8. ✅ **ProductCodePage.jsx** — thêm nút Xếp xe trong summary bar
9. ✅ **DeclarationModal.jsx** — thêm field vehicleStatus
