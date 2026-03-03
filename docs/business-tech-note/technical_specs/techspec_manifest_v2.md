# TechSpec — Xếp Xe (Manifest) v2

## 1. Phạm vi thay đổi

| Layer    | Thay đổi |
|----------|----------|
| DB Schema | Migrate Manifest: thêm `licensePlate`, `callerId`, đổi `status` sang Enum đúng |
| Backend  | Cập nhật controller + route, thêm join caller trong getAll/getById |
| Frontend | Rewrite ManifestListPage + ManifestDetailPage |

---

## 2. Database Migration

### 2.1 Thêm Enum `ManifestStatus` vào schema.prisma

```prisma
enum ManifestStatus {
  CHO_XEP_XE
  DA_XEP_XE
  DANG_KIEM_HOA
  CHO_THONG_QUAN
  DA_THONG_QUAN
  DA_NHAP_KHO_VN
}
```

### 2.2 Cập nhật model `Manifest`

```prisma
model Manifest {
  id           Int            @id @default(autoincrement())
  licensePlate String                          // Biển số xe (bắt buộc)
  callerId     Int?                            // Người gọi xe (FK → User)
  caller       User?          @relation("ManifestCaller", fields: [callerId], references: [id])
  date         DateTime       @default(now()) // Ngày xếp xe
  status       ManifestStatus @default(CHO_XEP_XE)
  note         String?

  productCodes ProductCode[]

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  @@map("manifests")
}
```

### 2.3 Thêm relation ngược vào model `User`

```prisma
// Trong model User, thêm:
manifestsCalled  Manifest[]  @relation("ManifestCaller")
```

> **Migration strategy**: Đây là breaking change — cột `name` được xóa, thêm `licensePlate`, `callerId`, đổi kiểu `status`. Cần chạy `prisma migrate dev --name manifest_v2`.
> - `name` hiện có data: nếu cần giữ, migration script copy `name` → `licensePlate` trước khi drop `name`.
> - `status` đang là String: cần map OPEN→CHO_XEP_XE, CLOSED→DA_XEP_XE, SHIPPED→DA_XEP_XE trong migration SQL.

---

## 3. Backend API

### 3.1 Endpoints (giữ nguyên route structure)

| Method | Path                           | Mô tả                        |
|--------|--------------------------------|------------------------------|
| GET    | `/manifests`                   | Danh sách xe (có tổng cân/khối) |
| GET    | `/manifests/:id`               | Chi tiết xe + productCodes   |
| POST   | `/manifests`                   | Tạo mới                      |
| PUT    | `/manifests/:id`               | Cập nhật thông tin           |
| DELETE | `/manifests/:id`               | Xóa mềm                      |
| POST   | `/manifests/:id/items`         | Thêm mã hàng vào xe          |
| DELETE | `/manifests/:id/items`         | Xóa mã hàng khỏi xe          |

### 3.2 GET /manifests — Response shape

```json
{
  "items": [
    {
      "id": 1,
      "licensePlate": "51C-123.45",
      "caller": { "id": 5, "fullName": "Nguyễn Văn A", "username": "nva" },
      "date": "2026-03-01T00:00:00.000Z",
      "status": "DA_XEP_XE",
      "note": "...",
      "_count": { "productCodes": 12 },
      "_sum": { "totalWeight": 1500, "totalVolume": 45.5 }
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

> `_sum` được tính bằng Prisma aggregate trên productCodes liên kết.

### 3.3 GET /manifests/:id — Response shape

```json
{
  "id": 1,
  "licensePlate": "51C-123.45",
  "caller": { "id": 5, "fullName": "Nguyễn Văn A" },
  "date": "...",
  "status": "DA_XEP_XE",
  "productCodes": [
    {
      "id": 101,
      "orderCode": "DH001",
      "totalWeight": 120,
      "totalVolume": 3.5,
      "customer": { "id": 10, "fullName": "Khách A" },
      "items": [
        { "packageCount": 5, "packageUnit": "BAO_TAI" }
      ]
    }
  ]
}
```

### 3.4 POST /manifests — Request body

```json
{
  "licensePlate": "51C-123.45",
  "callerId": 5,
  "date": "2026-03-01T00:00:00.000Z",
  "status": "CHO_XEP_XE",
  "note": "Ghi chú"
}
```

### 3.5 calculateTotals — Backend aggregate logic

```javascript
// Trong getAll, dùng Prisma groupBy hoặc select aggregate:
const manifest = await prisma.manifest.findMany({
  include: {
    caller: { select: { id: true, fullName: true, username: true } },
    _count: { select: { productCodes: true } },
    productCodes: {
      select: { totalWeight: true, totalVolume: true }
    }
  }
});

// Tính tổng cân/khối từ productCodes trước khi trả về
const formatted = manifest.map(m => ({
  ...m,
  totalWeight: m.productCodes.reduce((s, pc) => s + (pc.totalWeight || 0), 0),
  totalVolume: m.productCodes.reduce((s, pc) => s + parseFloat(pc.totalVolume || 0), 0),
  productCodes: undefined // loại bỏ khỏi list response, chỉ giữ _count
}));
```

---

## 4. Frontend

### 4.1 Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/manifest/ManifestListPage.jsx` | Rewrite toàn bộ |
| `src/pages/manifest/ManifestDetailPage.jsx` | Rewrite toàn bộ |
| `src/services/manifestService.js` | Kiểm tra/cập nhật endpoints |
| `src/constants/enums.js` | Thêm `MANIFEST_STATUS_OPTIONS` |

### 4.2 ManifestListPage — Layout

```
[Header: Quản lý Xếp Xe] [+ Tạo chuyến mới] [Search]

Table:
ID | Biển số xe | Người gọi xe | Ngày xếp | Số mã hàng | Tổng cân (kg) | Tổng khối (m³) | Trạng thái | Thao tác
                                                                                [Tag màu theo status]
```

Form tạo/sửa (Modal inline):
- Biển số xe: Input (required)
- Người gọi xe: Select → fetch employees
- Ngày xếp xe: DatePicker (default: hôm nay)
- Trạng thái: Select (6 options)
- Ghi chú: TextArea

### 4.3 ManifestDetailPage — Layout

```
[← Quay lại] [Biển số: 51C-123.45] [Trạng thái: Tag]

[Thông tin xe: licensePlate, caller, date, note]
[Nút: Thêm mã hàng | Sửa thông tin xe]

[Table: Danh sách mã hàng trong xe]
ID | Mã đơn | Khách hàng | Tổng cân | Tổng khối | Số mặt hàng | Thao tác[Xóa khỏi xe]
```

### 4.4 Status color mapping (Tag)

| Status            | Ant Design Color |
|-------------------|-----------------|
| `CHO_XEP_XE`      | `default`        |
| `DA_XEP_XE`       | `blue`           |
| `DANG_KIEM_HOA`   | `orange`         |
| `CHO_THONG_QUAN`  | `gold`           |
| `DA_THONG_QUAN`   | `green`          |
| `DA_NHAP_KHO_VN`  | `purple`         |

### 4.5 Constant cần thêm vào enums.js

```javascript
export const MANIFEST_STATUS_OPTIONS = [
  { value: 'CHO_XEP_XE',    label: 'Chờ xếp xe',     color: 'default' },
  { value: 'DA_XEP_XE',     label: 'Đã xếp xe',      color: 'blue'    },
  { value: 'DANG_KIEM_HOA', label: 'Đang kiểm hóa',  color: 'orange'  },
  { value: 'CHO_THONG_QUAN',label: 'Chờ thông quan',  color: 'gold'    },
  { value: 'DA_THONG_QUAN', label: 'Đã thông quan',   color: 'green'   },
  { value: 'DA_NHAP_KHO_VN',label: 'Đã nhập kho VN',  color: 'purple'  },
];
```

---

## 5. Thứ tự implement

1. **DB Migration** → cập nhật schema.prisma, chạy migrate
2. **Backend controller** → cập nhật manifestController.js
3. **Frontend enums** → thêm MANIFEST_STATUS_OPTIONS
4. **ManifestListPage** → rewrite với form mới
5. **ManifestDetailPage** → rewrite hiển thị danh sách mã hàng
6. **Test** → theo TestSpec

---

## 6. Rủi ro & Lưu ý

| Rủi ro | Giải pháp |
|--------|-----------|
| Migration làm mất data status cũ | Map OPEN→CHO_XEP_XE, CLOSED/SHIPPED→DA_XEP_XE trong SQL migration |
| Tính toán tổng cân/khối chậm nếu manifest có nhiều PC | Chấp nhận được ở quy mô này, nếu cần sẽ thêm cache sau |
| User (EmployeeId) hiện không có relation "ManifestCaller" trong schema | Cần thêm vào User model + tạo migration |
