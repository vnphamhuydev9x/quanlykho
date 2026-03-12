# Kế hoạch Implement — Chức năng Quản lý Công Nợ

> **Ngày tạo**: 2026-03-12
> **Tài liệu tham chiếu**:
> - BRD: `Draft_requirement/công nợ/cong_no_requirement_rephrase.md`
> - Tech Spec: `technical_specs/11_TechSpec_debt_management.md`

---

## Tổng quan luồng thực hiện (theo SDLC)

```
[DONE] BRD Draft
[DONE] Tech Spec
  ↓
[ ] Bước 1: Test Spec
  ↓
[ ] Bước 2: Backend Implementation
  ↓
[ ] Bước 3: Integration Test (100% PASS)
  ↓
[ ] Bước 4: Frontend Implementation
```

---

## BƯỚC 1 — Viết Test Spec

**File output**: `docs/business-tech-note/testspec/11_TestSpec_debt_management.md`

Viết Test Spec granular đủ chuẩn theo `docs/rules/test_spec_writing_guide.md`.
Mỗi endpoint phải có đủ: Happy Path, No Token (401), Wrong Role (403), Not Found (404),
Validation (400), Business Logic (DB verify), Cache verify.

### Danh sách Test Cases cần cover

#### `GET /api/debts/years`
- [ ] `TC-DEBT-YEARS-01` — Happy Path: có dữ liệu nhiều năm → trả đúng danh sách, sort giảm dần
- [ ] `TC-DEBT-YEARS-AUTH-01` — No Token → 401
- [ ] `TC-DEBT-YEARS-EMPTY-01` — Chưa có dữ liệu nào → trả mảng rỗng

#### `GET /api/debts?year=YYYY`
- [ ] `TC-DEBT-SUM-01` — Happy Path: có khách nợ → trả đúng matrix 12 tháng
- [ ] `TC-DEBT-SUM-02` — Business Logic: runningBalance lũy kế đúng công thức (openingBalance + incurred - paid)
- [ ] `TC-DEBT-SUM-03` — Chỉ tính ExportOrder `paymentReceived=false`, bỏ qua `paymentReceived=true`
- [ ] `TC-DEBT-SUM-04` — Chỉ tính Transaction `status=SUCCESS`, bỏ qua `CANCELLED`
- [ ] `TC-DEBT-SUM-05` — Không hiển thị khách có tổng nợ = 0
- [ ] `TC-DEBT-SUM-06` — Cache: lần 2 trả từ Redis (verify hit)
- [ ] `TC-DEBT-SUM-AUTH-01` — No Token → 401
- [ ] `TC-DEBT-SUM-ROLE-01` — Wrong Role (non-ADMIN) → 403
- [ ] `TC-DEBT-SUM-YEAR-01` — Không truyền `year` → dùng năm hiện tại

#### `GET /api/debts/:customerId?year=YYYY`
- [ ] `TC-DEBT-DETAIL-01` — Happy Path: trả đủ openingBalance + debtOrders + payments + months
- [ ] `TC-DEBT-DETAIL-02` — Business Logic: months tính đúng lũy kế
- [ ] `TC-DEBT-DETAIL-03` — Cache: lần 2 trả từ Redis
- [ ] `TC-DEBT-DETAIL-04` — Cache Invalidation: sau khi upsert openingBalance → miss cache
- [ ] `TC-DEBT-DETAIL-404` — customerId không tồn tại → 404
- [ ] `TC-DEBT-DETAIL-AUTH-01` — No Token → 401
- [ ] `TC-DEBT-DETAIL-ROLE-01` — Wrong Role → 403

#### `PUT /api/debts/:customerId/opening-balance`
- [ ] `TC-DEBT-OB-01` — Happy Path (create): chưa có DebtPeriod → tạo mới, DB verify
- [ ] `TC-DEBT-OB-02` — Happy Path (update): đã có DebtPeriod → update, DB verify
- [ ] `TC-DEBT-OB-03` — Cache Invalidation: sau upsert → `debts:customer:{id}:{year}` và `debts:summary:{year}` bị xóa
- [ ] `TC-DEBT-OB-VAL-01` — Missing `year` → 400
- [ ] `TC-DEBT-OB-VAL-02` — `openingBalance` âm → 400 (nếu có validation)
- [ ] `TC-DEBT-OB-404` — customerId không tồn tại → 404
- [ ] `TC-DEBT-OB-AUTH-01` — No Token → 401
- [ ] `TC-DEBT-OB-ROLE-01` — Wrong Role → 403

#### Cache Invalidation từ các module khác
- [ ] `TC-DEBT-INV-01` — ExportOrder chuyển `DA_XUAT_KHO` + `paymentReceived=false` → cache debt bị xóa
- [ ] `TC-DEBT-INV-02` — Transaction tạo mới → cache debt của khách đó bị xóa
- [ ] `TC-DEBT-INV-03` — Transaction bị cancel → cache debt của khách đó bị xóa

---

## BƯỚC 2 — Backend Implementation

### 2.1 Database

- [ ] Thêm model `DebtPeriod` vào `schema.prisma`
- [ ] Thêm `@@index([customerId, status, createdAt])` vào model `Transaction`
- [ ] Thêm `@@index([customerId, status, paymentReceived, createdAt])` vào model `ExportOrder`
- [ ] Chạy migration: `npx prisma migrate dev --name add_debt_period_and_indexes`
- [ ] Thêm relation `debtPeriods` vào model `User` (nếu cần cho Prisma relation)

### 2.2 Cache Helper

- [ ] Tạo file `source/backend/src/utils/debtCacheHelper.js`
  - Hàm `invalidateDebtCache(redis, customerId, year)`
  - Xóa: `debts:customer:{customerId}:year:{year}`, `debts:summary:{year}`, `debts:years`

### 2.3 debtController.js

File: `source/backend/src/controllers/debtController.js`

- [ ] `getYears` — query distinct years từ 3 bảng, cache `debts:years` (TTL 1h)
- [ ] `getSummary` — tính matrix tất cả khách × 12 tháng, cache `debts:summary:{year}` (TTL 10m)
- [ ] `getCustomerDetail` — chi tiết 1 khách, cache `debts:customer:{id}:year:{year}` (TTL 10m)
- [ ] `upsertOpeningBalance` — upsert DebtPeriod, invalidate cache

### 2.4 debtRoutes.js

File: `source/backend/src/routes/debtRoutes.js`

- [ ] Khai báo 4 routes (xem Tech Spec mục 3.4)
- [ ] Đăng ký vào `app.js`: `app.use('/api/debts', debtRoutes)`

### 2.5 Cập nhật Controllers Hiện Có

- [ ] `exportOrderController.js` — thêm `invalidateDebtCache` khi:
  - Status chuyển sang `DA_XUAT_KHO`
  - `paymentReceived` thay đổi
- [ ] `transactionController.js` — thêm `invalidateDebtCache` khi:
  - `createTransaction` thành công
  - `cancelTransaction` thành công

---

## BƯỚC 3 — Integration Test

**File output**: `source/integration_tests/debt.test.js`

- [ ] Viết integration test cho tất cả TC trong Test Spec
- [ ] Mỗi `it()` có comment `// [TC-DEBT-xxx]` ở dòng đầu
- [ ] Setup: reset DB + flush Redis trước mỗi describe block
- [ ] Chạy: `npm run test -- --testPathPattern=debt.test.js`
- [ ] **Điều kiện chốt**: 100% PASS, không có `it.skip()`

---

## BƯỚC 4 — Frontend Implementation

> **Chỉ bắt đầu khi Bước 3 đã 100% PASS**

### 4.1 Service

- [ ] Tạo `source/frontend/src/services/debtService.js` (4 methods — xem Tech Spec mục 5.5)

### 4.2 Constants & i18n

- [ ] Thêm keys vào `source/frontend/src/locales/vi/translation.json`
  ```json
  "debt": {
    "title": "Công nợ",
    "openingBalance": "Nợ đầu kỳ",
    "incurred": "Phát sinh",
    "paid": "Nạp tiền",
    "remaining": "Còn lại",
    "editOpeningBalance": "Chỉnh sửa nợ đầu kỳ",
    ...
  }
  ```
- [ ] Thêm keys tương tự vào `zh/translation.json`
- [ ] Thêm menu key: `"menu.debt": "Công nợ"`

### 4.3 Components

- [ ] `DebtPeriodModal.jsx` — modal nhập/sửa nợ đầu kỳ (field: year + openingBalance)
- [ ] `DebtDetailPage.jsx` — trang chi tiết 1 khách (`/bao-cao/cong-no/:customerId`)
  - Bảng ExportOrder phát sinh nợ
  - Bảng lịch sử nạp tiền
  - Nút [Nạp tiền] redirect sang `/transactions?customerId=X`
- [ ] `DebtPage.jsx` — trang tổng quan (`/bao-cao/cong-no`)
  - Dropdown Year
  - Bảng ma trận khách × tháng
  - Ô tháng: Phát sinh / Nạp / Còn lại

### 4.4 Routing & Sidebar

- [ ] `App.jsx` — thêm 2 routes:
  - `/bao-cao/cong-no` → `DebtPage`
  - `/bao-cao/cong-no/:customerId` → `DebtDetailPage`
- [ ] `MainLayout.jsx` — thêm sub-menu "Công nợ" dưới mục "Báo cáo"

### 4.5 Kiểm tra E2E thủ công

- [ ] Bật dev server, đăng nhập ADMIN
- [ ] Kiểm tra trang tổng quan: filter năm, hiển thị đúng số liệu
- [ ] Kiểm tra nhập/sửa nợ đầu kỳ → số lũy kế tháng cập nhật đúng
- [ ] Kiểm tra trang chi tiết: đủ 2 bảng, sort đúng
- [ ] Kiểm tra nút [Nạp tiền] → redirect đúng
- [ ] Kiểm tra ô tháng không có phát sinh → hiển thị gọn

---

## Ghi Chú

- Tạm thời **bỏ qua menu "Công nợ" trong sidebar Báo cáo** nếu menu "Báo cáo" chưa có — tạo menu mới nếu cần.
- Trường `totalImportCostToCustomer` ở cấp `ProductCode`: cần xác nhận khi viết integration test xem trường này đã có trong schema chưa, hay cần tính từ `ProductItem.importCostToCustomer`.
