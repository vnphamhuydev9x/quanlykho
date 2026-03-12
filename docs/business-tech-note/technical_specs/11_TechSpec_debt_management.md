# TechSpec — Quản Lý Công Nợ Khách Hàng (Debt Management) v1.0

> **Phiên bản**: 1.0
> **BRD tham chiếu**: `Draft_requirement/công nợ/cong_no_requirement_rephrase.md`
> **Ngày**: 2026-03-12

---

## 1. Phạm Vi Thay Đổi

| Layer | Thay đổi |
|---|---|
| DB Schema | Thêm model `DebtPeriod`; thêm indexes vào `Transaction`, `ExportOrder` |
| Backend | Tạo mới `debtController.js`, `debtRoutes.js`; cập nhật `exportOrderController.js` và `transactionController.js` để invalidate debt cache |
| Frontend | Tạo mới `DebtPage.jsx`, `DebtDetailPage.jsx`, `DebtPeriodModal.jsx`; cập nhật Sidebar |

---

## 2. Database

### 2.1 Model mới: `DebtPeriod`

```prisma
model DebtPeriod {
  id             Int      @id @default(autoincrement())
  customerId     Int
  customer       User     @relation("CustomerDebtPeriods", fields: [customerId], references: [id])
  year           Int                      // VD: 2025, 2026
  openingBalance Decimal  @default(0) @db.Decimal(15, 0)  // Nợ đầu kỳ (VND) — admin nhập tay
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([customerId, year])            // Mỗi khách chỉ có 1 nợ đầu kỳ mỗi năm
  @@index([year])                         // Filter theo năm khi lấy danh sách
  @@map("debt_periods")
}
```

### 2.2 Bổ sung Index vào các model hiện có

#### `Transaction`

```prisma
model Transaction {
  // ... existing fields unchanged ...

  @@index([customerId, status, createdAt])  // Query: nạp tiền của khách X, status=SUCCESS, trong khoảng thời gian
  @@map("transactions")
}
```

**Lý do**: Query tính công nợ luôn filter theo `(customerId, status=SUCCESS, createdAt BETWEEN year-start AND year-end)`. Composite index này giúp DB tránh full scan toàn bảng.

#### `ExportOrder`

```prisma
model ExportOrder {
  // ... existing fields unchanged ...

  @@index([customerId, status, paymentReceived, createdAt])  // Query: lệnh xuất nợ của khách X trong kỳ
  @@map("export_orders")
}
```

**Lý do**: Query tính công nợ filter theo `(customerId, status=DA_XUAT_KHO, paymentReceived=false, createdAt BETWEEN ...)`. Index cover đúng 4 trường này.

---

## 3. Backend API

Base URL: `/api/debts`

### 3.1 Caching Strategy

**Nguyên tắc**: Cache tính toán thống kê theo đơn vị `(customerId, year)`. Đây là đơn vị nhỏ nhất để invalidate chính xác, tránh flush toàn bộ khi chỉ 1 khách có thay đổi.

#### Cache Keys

| Key | Nội dung | TTL |
|---|---|---|
| `debts:years` | Danh sách năm có dữ liệu (union từ 3 nguồn) | 1 giờ |
| `debts:summary:{year}` | Toàn bộ ma trận công nợ tất cả khách × 12 tháng | 10 phút |
| `debts:customer:{customerId}:year:{year}` | Chi tiết công nợ 1 khách theo năm (ExportOrder list + Transaction list + DebtPeriod) | 10 phút |

#### Invalidation Rules

| Sự kiện | Key bị invalidate |
|---|---|
| `ExportOrder` chuyển sang `DA_XUAT_KHO` | `debts:summary:{năm của createdAt}` + `debts:customer:{customerId}:{năm}` |
| `ExportOrder.paymentReceived` thay đổi | `debts:summary:{năm}` + `debts:customer:{customerId}:{năm}` |
| `Transaction` tạo mới (POST `/transactions`) | `debts:summary:{năm của createdAt}` + `debts:customer:{customerId}:{năm}` + `debts:years` |
| `Transaction` bị hủy (POST `/transactions/:id/cancel`) | `debts:summary:{năm}` + `debts:customer:{customerId}:{năm}` |
| `DebtPeriod` upsert (PUT `/debts/:customerId/opening-balance`) | `debts:summary:{year}` + `debts:customer:{customerId}:{year}` + `debts:years` |

> **Lưu ý**: Khi invalidate `debts:summary:{year}`, dùng pattern `debts:summary:{year}` xóa chính xác key đó. Không dùng wildcard `debts:summary:*` để tránh flush nhầm các năm khác.

#### Nơi thêm invalidation code

- **`exportOrderController.js`** — trong handler `updateStatus`: khi transition sang `DA_XUAT_KHO`, hoặc khi update `paymentReceived`, gọi hàm `invalidateDebtCache(customerId, year)`.
- **`transactionController.js`** — trong `createTransaction` và `cancelTransaction`: gọi `invalidateDebtCache(customerId, year)`.
- **`debtController.js`** — trong `upsertOpeningBalance`: gọi `invalidateDebtCache(customerId, year)`.

#### Helper function

```javascript
// utils/cacheInvalidation.js (hoặc đặt trong debtController)
async function invalidateDebtCache(redisClient, customerId, year) {
    await redisClient.del(`debts:customer:${customerId}:year:${year}`);
    await redisClient.del(`debts:summary:${year}`);
    await redisClient.del('debts:years');
}
```

---

### 3.2 Logic Tính Công Nợ (Core Formula)

```javascript
/**
 * Tính công nợ lũy kế của 1 khách hàng đến hết tháng M trong năm Y.
 * Trả về số nợ còn lại (VND).
 */
async function calcDebt(prisma, customerId, year, upToMonth) {
    const yearStart = new Date(year, 0, 1);          // Jan 1
    const monthEnd  = new Date(year, upToMonth, 1);  // đầu tháng tiếp theo (exclusive)

    // 1. Nợ đầu kỳ
    const period = await prisma.debtPeriod.findUnique({
        where: { customerId_year: { customerId, year } }
    });
    const openingBalance = period ? Number(period.openingBalance) : 0;

    // 2. Tổng phát sinh nợ (ExportOrder bị nợ, deletedAt = null)
    const debtOrders = await prisma.exportOrder.findMany({
        where: {
            customerId,
            status: 'DA_XUAT_KHO',
            paymentReceived: false,
            deletedAt: null,
            createdAt: { gte: yearStart, lt: monthEnd }
        },
        select: { deliveryCost: true, productCodes: { select: { totalImportCostToCustomer: true } } }
    });
    const totalDebt = debtOrders.reduce((sum, order) => {
        const importCost = order.productCodes.reduce(
            (s, pc) => s + Number(pc.totalImportCostToCustomer || 0), 0
        );
        return sum + importCost + Number(order.deliveryCost || 0);
    }, 0);

    // 3. Tổng đã nạp (Transaction SUCCESS)
    const payments = await prisma.transaction.aggregate({
        where: {
            customerId,
            status: 'SUCCESS',
            createdAt: { gte: yearStart, lt: monthEnd }
        },
        _sum: { amount: true }
    });
    const totalPaid = Number(payments._sum.amount || 0);

    return openingBalance + totalDebt - totalPaid;
}
```

> **Ghi chú `totalImportCostToCustomer`**: Đây là trường tổng hợp ở cấp `ProductCode` (tổng `importCostToCustomer` của tất cả `ProductItem` trong mã hàng đó, có tính `useActualData`). Cần xác nhận trường này tồn tại trong schema `ProductCode` hoặc tính từ `ProductItem` khi query.

---

### 3.3 API Endpoints

#### GET `/api/debts/years` — Danh sách năm có dữ liệu

Trả về union các năm từ 3 nguồn: `ExportOrder` (bị nợ), `Transaction` (SUCCESS), `DebtPeriod`.

**Auth**: `authMiddleware`

**Logic**:
```javascript
// Lấy distinct years từ 3 bảng rồi union
const [eoYears, txYears, periodYears] = await Promise.all([
    prisma.$queryRaw`SELECT DISTINCT EXTRACT(YEAR FROM "created_at")::int AS year
                     FROM export_orders
                     WHERE status = 'DA_XUAT_KHO' AND payment_received = false AND deleted_at IS NULL`,
    prisma.$queryRaw`SELECT DISTINCT EXTRACT(YEAR FROM "created_at")::int AS year
                     FROM transactions WHERE status = 'SUCCESS'`,
    prisma.debtPeriod.findMany({ select: { year: true }, distinct: ['year'] })
]);
const years = [...new Set([
    ...eoYears.map(r => r.year),
    ...txYears.map(r => r.year),
    ...periodYears.map(r => r.year)
])].sort((a, b) => b - a);  // Giảm dần (năm mới nhất lên đầu)
```

**Response**:
```json
{
  "code": 200,
  "data": [2026, 2025, 2024]
}
```

---

#### GET `/api/debts?year=YYYY` — Tổng quan công nợ theo năm

Trả về ma trận: mỗi hàng là 1 khách hàng, mỗi cột là 1 tháng.

**Auth**: `authMiddleware` + `roleMiddleware(['ADMIN'])`

**Query params**: `year` (required, default: năm hiện tại)

**Cache**: Đọc từ `debts:summary:{year}`, nếu miss thì tính và lưu lại (TTL 10 phút).

**Logic**:
```javascript
// 1. Lấy danh sách customerId có phát sinh trong năm (union 3 nguồn)
// 2. Với mỗi khách, tính mảng 12 tháng: { month, incurred, paid, runningBalance }
// 3. runningBalance[m] = openingBalance + sum(incurred[1..m]) - sum(paid[1..m])
// 4. Chỉ trả về khách có runningBalance > 0 ở bất kỳ tháng nào trong năm
```

**Response**:
```json
{
  "code": 200,
  "data": [
    {
      "customer": { "id": 10, "fullName": "Nguyễn A", "customerCode": "KH001" },
      "openingBalance": 50000000,
      "months": [
        { "month": 1, "incurred": 20000000, "paid": 0,        "runningBalance": 70000000 },
        { "month": 2, "incurred": 0,        "paid": 100000000,"runningBalance": -30000000 },
        { "month": 3, "incurred": 15000000, "paid": 0,        "runningBalance": -15000000 }
      ],
      "totalRunningBalance": -15000000
    }
  ]
}
```

> Tháng nào không có phát sinh → `incurred = 0`, `paid = 0`, `runningBalance` lấy từ tháng trước lũy kế.

---

#### GET `/api/debts/:customerId?year=YYYY` — Chi tiết 1 khách theo năm

**Auth**: `authMiddleware` + `roleMiddleware(['ADMIN'])`

**Cache**: Đọc từ `debts:customer:{customerId}:year:{year}`, TTL 10 phút.

**Response**:
```json
{
  "code": 200,
  "data": {
    "customer": { "id": 10, "fullName": "Nguyễn A", "customerCode": "KH001" },
    "year": 2026,
    "openingBalance": 50000000,
    "debtOrders": [
      {
        "exportOrderId": 5,
        "createdAt": "2026-01-15T10:00:00Z",
        "productCodes": [
          { "id": 101, "orderCode": "DH001", "importCostToCustomer": 8000000 }
        ],
        "deliveryCost": 200000,
        "totalOwed": 8200000
      }
    ],
    "payments": [
      {
        "id": 12,
        "amount": 100000000,
        "content": "Chuyển khoản MB Bank",
        "createdAt": "2026-02-01T09:00:00Z",
        "createdBy": { "id": 2, "fullName": "Admin" }
      }
    ],
    "months": [
      { "month": 1, "incurred": 20000000, "paid": 0,         "runningBalance": 70000000 },
      { "month": 2, "incurred": 0,        "paid": 100000000, "runningBalance": -30000000 }
    ]
  }
}
```

---

#### PUT `/api/debts/:customerId/opening-balance` — Upsert nợ đầu kỳ

**Auth**: `authMiddleware` + `roleMiddleware(['ADMIN'])`

**Request body**:
```json
{
  "year": 2026,
  "openingBalance": 50000000
}
```

**Logic**:
```javascript
await prisma.debtPeriod.upsert({
    where: { customerId_year: { customerId, year } },
    update: { openingBalance },
    create: { customerId, year, openingBalance }
});
await invalidateDebtCache(redis, customerId, year);
```

**Response**:
```json
{
  "code": 200,
  "message": "Success",
  "data": { "customerId": 10, "year": 2026, "openingBalance": 50000000 }
}
```

---

### 3.4 Route (`debtRoutes.js`)

```javascript
router.get('/years',             authMiddleware, debtController.getYears);
router.get('/',                  authMiddleware, roleMiddleware(['ADMIN']), debtController.getSummary);
router.get('/:customerId',       authMiddleware, roleMiddleware(['ADMIN']), debtController.getCustomerDetail);
router.put('/:customerId/opening-balance', authMiddleware, roleMiddleware(['ADMIN']), debtController.upsertOpeningBalance);
```

Đăng ký trong `app.js`:
```javascript
app.use('/api/debts', debtRoutes);
```

---

## 4. Invalidation trong Controllers Hiện Có

### 4.1 `exportOrderController.js` — handler `updateStatus`

Khi `newStatus === 'DA_XUAT_KHO'` hoặc khi `paymentReceived` thay đổi:

```javascript
const year = new Date(exportOrder.createdAt).getFullYear();
await invalidateDebtCache(redis, exportOrder.customerId, year);
```

### 4.2 `transactionController.js` — `createTransaction` và `cancelTransaction`

```javascript
// Sau khi create/cancel thành công:
const year = new Date().getFullYear(); // create: năm hiện tại
// hoặc: new Date(transaction.createdAt).getFullYear() // cancel: năm của giao dịch gốc
await invalidateDebtCache(redis, customerId, year);
```

---

## 5. Frontend — Thiết kế Component

### 5.1 Files tạo mới / thay đổi

| File | Thay đổi |
|---|---|
| `debtController.js` | Tạo mới |
| `debtRoutes.js` | Tạo mới |
| `schema.prisma` | Thêm model `DebtPeriod` + indexes |
| `pages/debt/DebtPage.jsx` | Tạo mới — tổng quan công nợ (ma trận khách × tháng) |
| `pages/debt/DebtDetailPage.jsx` | Tạo mới — chi tiết 1 khách |
| `pages/debt/DebtPeriodModal.jsx` | Tạo mới — modal nhập nợ đầu kỳ |
| `services/debtService.js` | Tạo mới |
| `MainLayout.jsx` (Sidebar) | Thêm menu "Công nợ" dưới "Báo cáo" |
| `App.jsx` | Thêm routes `/bao-cao/cong-no` và `/bao-cao/cong-no/:customerId` |

### 5.2 DebtPage — Tổng quan (`/bao-cao/cong-no`)

**Bộ lọc**: Dropdown Year (lấy từ `GET /api/debts/years`, mặc định năm hiện tại).

**Bảng**: Mỗi hàng là 1 khách hàng.

| Cột | Dữ liệu |
|---|---|
| Khách hàng | `customer.fullName` + `customerCode` |
| Nợ đầu kỳ | `openingBalance` (có nút chỉnh sửa → mở `DebtPeriodModal`) |
| Tháng 1 … Tháng 12 | Mỗi ô: Phát sinh / Nạp / Còn lại (xem mục 5.3) |
| Tổng còn lại | `totalRunningBalance` |

Click vào tên khách → navigate sang `DebtDetailPage`.

### 5.3 Hiển thị ô tháng

Mỗi ô tháng là 1 `Tooltip` / mini card hiển thị:
```
▲ 20,000,000   (incurred — màu đỏ nếu > 0)
▼ 0            (paid — màu xanh nếu > 0)
= 70,000,000   (runningBalance — màu cam nếu > 0, xanh nếu ≤ 0)
```

Tháng không có phát sinh → hiển thị gọn: chỉ `runningBalance` lũy kế.

### 5.4 DebtDetailPage — Chi tiết 1 khách

**Header**: Tên khách + nợ đầu kỳ (nút chỉnh sửa) + nút [Nạp tiền] → redirect sang `/transactions` với `customerId` pre-fill.

**Bảng 1 — Lệnh Xuất Kho Phát Sinh Nợ** (năm đang xem):
- Sort: `createdAt` giảm dần
- Cột: Lệnh xuất # | Ngày xuất | Chi phí NK | Phí ship | Tổng phải trả

**Bảng 2 — Lịch Sử Nạp Tiền** (năm đang xem, từ `Transaction`):
- Sort: `createdAt` giảm dần
- Cột: Ngày | Số tiền | Nội dung | Người ghi nhận

### 5.5 debtService.js

```javascript
const debtService = {
    getYears: ()                       => axiosInstance.get('/debts/years'),
    getSummary: (year)                 => axiosInstance.get('/debts', { params: { year } }),
    getCustomerDetail: (customerId, year) => axiosInstance.get(`/debts/${customerId}`, { params: { year } }),
    upsertOpeningBalance: (customerId, data) => axiosInstance.put(`/debts/${customerId}/opening-balance`, data),
};
```

---

## 6. Thứ Tự Implement

1. `schema.prisma` — thêm model `DebtPeriod` + 2 indexes
2. `npx prisma migrate dev --name add_debt_period`
3. `utils/cacheInvalidation.js` — helper `invalidateDebtCache`
4. `debtController.js` + `debtRoutes.js` — 4 endpoints
5. Cập nhật `exportOrderController.js` — thêm invalidation khi status → `DA_XUAT_KHO`
6. Cập nhật `transactionController.js` — thêm invalidation khi create/cancel
7. `app.js` — đăng ký `/api/debts`
8. `debtService.js` — FE service
9. `DebtPeriodModal.jsx` — modal nhập nợ đầu kỳ
10. `DebtPage.jsx` — trang tổng quan
11. `DebtDetailPage.jsx` — trang chi tiết
12. `Sidebar` + `App.jsx` — thêm routes và menu
