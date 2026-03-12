# BRD (Draft) — Chức năng Quản lý Công Nợ Khách Hàng

> **Trạng thái**: Draft — Chưa chính thức
> **Ngày**: 2026-03-12
> **Tham chiếu**: [10_BRD_export_order_management.md v1.3](../../BRD/10_BRD_export_order_management.md)

---

## 1. Bối cảnh & Mục tiêu

Sau khi module Xuất Kho được triển khai, hệ thống đã có dữ liệu đủ để xác định công nợ của từng khách hàng:
- Một lệnh xuất kho được coi là **phát sinh công nợ** khi `ExportOrder.status = DA_XUAT_KHO` và `ExportOrder.paymentReceived = false`.
- Ngược lại, nếu `paymentReceived = true`, lệnh đó được coi là **đã thanh toán đủ**.

Hệ thống đã có sẵn chức năng **Nạp tiền** (model `Transaction`) — ghi nhận các lần khách hàng trả tiền cho công ty theo từng cục lớn, không theo từng lệnh xuất.

Chức năng mới cần bổ sung là một **trang thống kê Công Nợ**, cho phép admin theo dõi: nợ đầu kỳ, phát sinh nợ trong kỳ, số tiền đã nạp (từ `Transaction`), và số nợ còn lại — theo từng khách hàng, từng tháng, từng năm.

---

## 2. Mô hình Dữ liệu

### 2.1 Đối tượng hiện có: `Transaction` (Nạp Tiền)

> **Đã có sẵn trong hệ thống** — dùng lại, không tạo mới.

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | Int (PK) | |
| `customerId` | Int (FK → User) | Khách hàng nạp tiền |
| `amount` | Decimal | Số tiền nạp (VND) |
| `content` | String? | Nội dung giao dịch |
| `status` | Enum | `SUCCESS` / `CANCELLED` |
| `createdById` | Int (FK → User) | Admin ghi nhận |
| `createdAt` | DateTime | Dùng để xác định tháng/năm nạp tiền |
| `updatedAt` | DateTime | |

**API hiện có:**
- `GET /api/transactions` — danh sách (có filter `customerId`, `status`)
- `POST /api/transactions` — tạo giao dịch nạp tiền mới (ADMIN)
- `POST /api/transactions/:id/cancel` — hủy giao dịch (ADMIN)

> **Lưu ý**: Khi tính công nợ, chỉ tính các `Transaction` có `status = SUCCESS`.

### 2.2 Đối tượng mới: `DebtPeriod` (Nợ Đầu Kỳ)

Lưu trữ **nợ đầu kỳ** của từng khách hàng cho từng năm — do admin nhập tay.

| Trường | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | Int (PK) | Auto | |
| `customerId` | Int | FK → User | Khách hàng |
| `year` | Int | Unique per customer | Năm của kỳ (VD: 2025, 2026) |
| `openingBalance` | Decimal | Default `0`, VND | Số nợ đầu kỳ — admin nhập tay |
| `createdAt` | DateTime | Auto | |
| `updatedAt` | DateTime | Auto | |

> **Ràng buộc**: `(customerId, year)` là unique — mỗi khách chỉ có 1 nợ đầu kỳ cho mỗi năm.

---

## 3. Logic Tính Công Nợ

### 3.1 Công thức tổng quát

```
Công nợ còn lại của khách X tính đến hết tháng M, năm Y =

    Nợ đầu kỳ năm Y                          (DebtPeriod.openingBalance, mặc định 0)
  + Tổng chi phí các ExportOrder bị nợ        (status=DA_XUAT_KHO, paymentReceived=false,
      phát sinh từ tháng 1 đến hết tháng M      createdAt trong năm Y, tháng ≤ M)
  - Tổng tiền đã nạp từ tháng 1 đến hết M    (Transaction.status=SUCCESS,
                                                createdAt trong năm Y, tháng ≤ M)
```

**Chi phí phải trả của 1 ExportOrder bị nợ:**
```
= totalImportCostToCustomer + deliveryCost
```

### 3.2 Phạm vi quan tâm

- Hệ thống **mặc định hiển thị năm hiện tại**, có thể chuyển sang xem các năm cũ.
- Các năm cũ lưu đủ để tra cứu, không tự động kết chuyển — admin nhập nợ đầu kỳ tay mỗi năm.
- Không lưu cached "nợ còn lại" — tính real-time từ dữ liệu gốc.

---

## 4. Luồng Nghiệp Vụ

### 4.1 Thiết lập Nợ Đầu Kỳ (Admin)

```
1. Admin vào trang Công Nợ → chọn một khách hàng → chọn năm
2. Admin nhập "Nợ đầu kỳ năm YYYY"
3. Hệ thống upsert bản ghi DebtPeriod (customerId + year)
4. Nếu không nhập → mặc định 0
```

### 4.2 Ghi Nhận Nạp Tiền (Admin)

> Dùng lại luồng hiện có tại menu **Nạp tiền** (`/transactions`).
> Không cần tạo luồng mới — chức năng đã đủ.

### 4.3 Xem Thống Kê Công Nợ (Admin)

```
1. Admin vào menu Báo Cáo → Công Nợ
2. Trang hiển thị bảng tất cả khách hàng có công nợ (nợ > 0)
3. Filter theo năm (danh sách năm lấy từ API, không hardcode)
4. Khi chọn năm → bảng chia theo 12 tháng:
   - Mỗi tháng hiển thị: Phát sinh nợ | Nạp tiền | Nợ còn lại lũy kế
5. Admin click vào 1 khách hàng → xem trang chi tiết
```

---

## 5. Màn Hình & UI

### 5.1 Trang Tổng Quan Công Nợ (`/bao-cao/cong-no`)

**Bộ lọc:**
- Dropdown chọn năm — lấy từ API (danh sách năm có dữ liệu), mặc định năm hiện tại

**Bảng chính** — mỗi hàng là 1 khách hàng có công nợ trong năm đang xem:

| Cột | Mô tả |
|---|---|
| Khách hàng | Tên khách |
| Nợ đầu kỳ | `DebtPeriod.openingBalance` năm đang xem |
| Tháng 1 … Tháng 12 | Mỗi tháng: Phát sinh / Nạp / Còn lại lũy kế |
| Tổng nợ còn lại | Lũy kế đến cuối năm |

**Hiển thị từng ô tháng:**
```
Tháng M:
  Phát sinh:  +X VND   (tổng chi phí ExportOrder bị nợ phát sinh trong tháng M)
  Nạp tiền:   -Y VND   (tổng Transaction SUCCESS trong tháng M)
  Còn lại:    Z VND    (lũy kế từ đầu năm đến hết tháng M)
```

> Chỉ hiển thị khách hàng có tổng nợ còn lại > 0 trong năm đang xem.

### 5.2 Trang Chi Tiết Công Nợ của 1 Khách Hàng

**Header:**
- Tên khách hàng
- Nợ đầu kỳ năm X — hiển thị, có nút chỉnh sửa
- Nút [Nạp tiền] → chuyển hướng hoặc mở modal tới luồng nạp tiền hiện có

**Bảng 1 — Mã Hàng Phát Sinh Công Nợ** (năm đang xem):
- Sort: ngày xuất kho giảm dần (gần đây nhất lên đầu)
- Cột: Mã hàng | Ngày xuất kho | Chi phí NK | Phí ship | Tổng phải trả

**Bảng 2 — Lịch Sử Nạp Tiền** (năm đang xem, lấy từ `Transaction`):
- Sort: `createdAt` giảm dần
- Cột: Ngày nạp | Số tiền | Nội dung | Người ghi nhận | Trạng thái

---

## 6. API Cần Bổ Sung

> API Nạp tiền (`/api/transactions`) đã có sẵn — không cần thêm.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/debts/years` | Danh sách năm có dữ liệu công nợ (union từ ExportOrder + Transaction + DebtPeriod) |
| GET | `/api/debts?year=YYYY` | Thống kê công nợ tất cả khách theo năm, chia theo tháng |
| GET | `/api/debts/:customerId?year=YYYY` | Chi tiết công nợ 1 khách theo năm |
| PUT | `/api/debts/:customerId/opening-balance` | Upsert nợ đầu kỳ cho 1 khách, 1 năm |

---

## 7. Quyền Truy Cập

| Hành động | ADMIN |
|---|---|
| Xem tổng quan công nợ | ✅ |
| Xem chi tiết công nợ từng khách | ✅ |
| Thiết lập nợ đầu kỳ | ✅ |
| Ghi nhận nạp tiền | ✅ (qua `/transactions` hiện có) |

---

## 8. Quyết Định Thiết Kế

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Tái sử dụng `Transaction` cho nạp tiền | Đã có đủ: `customerId`, `amount`, `status`, `createdAt`. Không tạo model trùng lặp |
| 2 | Chỉ tạo mới `DebtPeriod` cho nợ đầu kỳ | Đây là giá trị duy nhất chưa có nơi lưu trong hệ thống |
| 3 | Nợ đầu kỳ admin nhập tay, không tự kết chuyển | Nghiệp vụ có thể có điều chỉnh thủ công; tránh sai lệch tự động |
| 4 | Không lưu cached "nợ còn lại" — tính real-time | Tránh stale data; công thức đơn giản đủ tính nhanh |
| 5 | Danh sách năm lấy từ API | Tránh hardcode; hệ thống tự mở rộng qua các năm |
| 6 | Chỉ hiển thị khách có nợ > 0 trong bảng tổng quan | Tập trung vào khách cần thu hồi nợ, tránh nhiễu |
