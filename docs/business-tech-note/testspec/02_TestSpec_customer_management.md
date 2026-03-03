# Test Spec: Module Quản lý Khách hàng — Backend

> **Phiên bản**: v1.0 | **Cập nhật**: 2026-03-03
> **Tham chiếu**: [BRD - 02_BRD_customer_management.md], [TechSpec - 02_TechSpec_customer_management.md]
> **Schema hiện tại (các trường liên quan)**:
> - `User`: `id`, `username`, `fullName`, `phone`, `address`, `saleId`, `isActive`, `type`, `deletedAt`
> - `ProductCode`: `id`, `customerId` (FK → User.id)
> - `Transaction`: `id`, `customerId`, `amount`, `status`

---

## Danh sách API cần test (phạm vi TestSpec này)

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/customers` | GET | ADMIN | Lấy danh sách khách hàng, bao gồm `totalOrders` |

> **Ghi chú**: TestSpec này tập trung vào field `totalOrders` mới được bổ sung. Các Test Case CRUD cơ bản (Create/Update/Delete) được ghi nhận trong checklist cuối file.

---

## Test Data Preparation

Trước khi chạy các Test Case, cần seed sẵn trong test DB:

| Biến | Mô tả |
|---|---|
| `adminUser` | `{ id: 1, username: 'admin', role: 'ADMIN', type: 'EMPLOYEE' }` |
| `customerA` | `{ id: 10, username: 'KHA001', type: 'CUSTOMER' }` — khách hàng có **3 mã hàng** |
| `customerB` | `{ id: 11, username: 'KHB002', type: 'CUSTOMER' }` — khách hàng **không có mã hàng nào** |
| `productCode1,2,3` | 3 bản ghi `ProductCode` có `customerId = 10` |

---

## Test Cases

### TC-CUST-ORDERS-01: Happy Path — totalOrders trả về đúng số mã hàng

- **Endpoint**: `GET /api/customers`
- **Auth**: ADMIN token
- **Precondition**: `customerA` (id=10) có 3 bản ghi `ProductCode` trong DB.
- **Input**: Không có query param đặc biệt (lấy toàn bộ, page=1)
- **Expected HTTP Status**: `200`
- **Expected Response** (phần data của customerA):
  ```json
  {
    "id": 10,
    "username": "KHA001",
    "totalOrders": 3,
    "totalPaid": "<bất kỳ số nào>"
  }
  ```
- **DB Verify**: `SELECT COUNT(*) FROM "ProductCode" WHERE "customerId" = 10` → phải trả về `3`.
- **Ghi chú**: `totalOrders` phải bằng đúng số ProductCode, không phải số Transaction hay bất kỳ bảng khác.

---

### TC-CUST-ORDERS-02: Edge Case — khách hàng không có mã hàng nào → totalOrders = 0

- **Endpoint**: `GET /api/customers`
- **Auth**: ADMIN token
- **Precondition**: `customerB` (id=11) chưa có ProductCode nào trong DB.
- **Input**: Không có query param
- **Expected HTTP Status**: `200`
- **Expected Response** (phần data của customerB):
  ```json
  {
    "id": 11,
    "username": "KHB002",
    "totalOrders": 0
  }
  ```
- **Ghi chú**: `totalOrders` phải là `0` (không phải `null` hay `undefined`).

---

### TC-CUST-ORDERS-03: Consistency — totalOrders tăng sau khi tạo thêm mã hàng

- **Endpoint (Step 1)**: `GET /api/customers` → ghi nhận `totalOrders` ban đầu của customerA = 3
- **Endpoint (Step 2)**: `POST /api/product-codes` — tạo thêm 1 mã hàng mới với `customerId = 10`
- **Endpoint (Step 3)**: `GET /api/customers` lần hai
- **Auth**: ADMIN token
- **Expected HTTP Status**: `200` ở cả 3 bước
- **DB Verify sau Step 2**: `SELECT COUNT(*) FROM "ProductCode" WHERE "customerId" = 10` → phải là `4`
- **Expected (Step 3)**: `totalOrders` của customerA phải là `4` (tăng 1 so với trước)
- **Ghi chú**: Kiểm tra tính real-time — không bị cache stale.

---

### TC-CUST-ORDERS-AUTH-01: Auth — Không có Bearer token → 401

- **Endpoint**: `GET /api/customers`
- **Auth**: Không có Authorization header
- **Input**: Không có
- **Expected HTTP Status**: `401`
- **Expected Response**:
  ```json
  { "code": 401 }
  ```

---

### TC-CUST-ORDERS-AUTH-02: Auth — Sai Role (CUSTOMER) → 403

- **Endpoint**: `GET /api/customers`
- **Auth**: Token của user có `type: CUSTOMER` (không phải ADMIN)
- **Input**: Không có
- **Expected HTTP Status**: `403`
- **Expected Response**:
  ```json
  { "code": 403 }
  ```

---

## Checklist Implementation Testing

```
☐ TC-CUST-ORDERS-01 — PASS: totalOrders = 3 khi có 3 ProductCode
☐ TC-CUST-ORDERS-02 — PASS: totalOrders = 0 khi không có ProductCode
☐ TC-CUST-ORDERS-03 — PASS: totalOrders tăng real-time sau khi tạo mới ProductCode
☐ TC-CUST-ORDERS-AUTH-01 — PASS: 401 khi không có token
☐ TC-CUST-ORDERS-AUTH-02 — PASS: 403 khi role là CUSTOMER
```

> **Điều kiện chốt cứng**: 100% PASS mới được chuyển sang làm Frontend.
> Không dùng `it.skip()` để né test case lỗi.
