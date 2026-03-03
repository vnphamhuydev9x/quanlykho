# BRD — Chức năng Xếp Xe (Manifest) v2

## 1. Bối cảnh & Mục tiêu

Chức năng Xếp xe hiện tại (v1) chỉ lưu `name`, `date`, `note`, `status` — quá đơn giản, thiếu thông tin nghiệp vụ thực tế.

**v2** cần redesign Manifest để:
- Gắn biển số xe cụ thể
- Biết ai là người gọi xe (nhân viên)
- Tính tự động tổng cân/khối/mã hàng từ danh sách mã hàng trong xe
- Trạng thái xe theo quy trình nghiệp vụ thực tế (6 bước)
- Xem danh sách mã hàng trong xe khi mở chi tiết

---

## 2. Quy trình nghiệp vụ

```
[Chờ xếp xe] → [Đã xếp xe] → [Đang kiểm hóa] → [Chờ thông quan] → [Đã thông quan] → [Đã nhập kho VN]
```

---

## 3. Mô hình dữ liệu — Manifest v2

| Trường            | Kiểu       | Mô tả                                              | Nguồn       |
|-------------------|------------|----------------------------------------------------|-------------|
| `id`              | Int (PK)   | Auto increment                                     | System      |
| `licensePlate`    | String     | Biển số xe (VD: 51C-123.45)                        | User nhập   |
| `callerId`        | Int (FK)   | Người gọi xe → FK → User (EMPLOYEE)                | User chọn   |
| `date`            | DateTime   | Ngày xếp xe                                        | User chọn   |
| `status`          | Enum       | Trạng thái xe (6 giá trị - xem bên dưới)           | User chọn   |
| `note`            | String?    | Ghi chú (giữ lại)                                  | User nhập   |
| `createdAt`       | DateTime   | Auto                                               | System      |
| `updatedAt`       | DateTime   | Auto                                               | System      |
| `deletedAt`       | DateTime?  | Soft delete                                        | System      |

**Các trường TỰ TÍNH (không lưu DB, tính từ productCodes liên kết):**
- `totalProductCodes` = `COUNT(productCodes)`
- `totalWeight` = `SUM(productCode.totalWeight)` cho các productCode thuộc xe này
- `totalVolume` = `SUM(productCode.totalVolume)` cho các productCode thuộc xe này

> **Lý do không lưu tổng vào DB**: Tránh data drift — khi ProductCode được cập nhật, tổng trong Manifest sẽ tự lỗi thời. Tính real-time từ dữ liệu gốc là cách tiếp cận đúng.

### Enum ManifestStatus (v2)

| Giá trị           | Nhãn tiếng Việt    |
|-------------------|--------------------|
| `CHO_XEP_XE`      | Chờ xếp xe         |
| `DA_XEP_XE`       | Đã xếp xe          |
| `DANG_KIEM_HOA`   | Đang kiểm hóa      |
| `CHO_THONG_QUAN`  | Chờ thông quan      |
| `DA_THONG_QUAN`   | Đã thông quan       |
| `DA_NHAP_KHO_VN`  | Đã nhập kho VN      |

### Quan hệ với ProductCode (giữ nguyên kiến trúc hiện tại)

```
ProductCode.manifestId → Manifest.id  (Many-to-One)
```
Một Manifest có nhiều ProductCode. Một ProductCode thuộc tối đa 1 Manifest.

---

## 4. Chức năng chính (User Stories)

### US-MNF-001: Tạo chuyến xe mới
- Nhân viên nhập biển số xe, chọn người gọi xe, chọn ngày xếp
- Trạng thái mặc định: `CHO_XEP_XE`
- Chưa cần chọn mã hàng ngay khi tạo

### US-MNF-002: Thêm mã hàng vào xe
- Từ màn hình Xếp xe detail: hiển thị danh sách ProductCode chưa có xe
- Cho phép tick chọn và gán vào xe
- Khi gán: ProductCode.manifestId = manifest.id

### US-MNF-003: Xóa mã hàng khỏi xe
- Từ danh sách mã hàng trong xe, có nút xóa từng mã
- Khi xóa: ProductCode.manifestId = null

### US-MNF-004: Xem danh sách xe
- Table hiển thị: Biển số, Người gọi xe, Ngày xếp, Số mã hàng, Tổng cân, Tổng khối, Trạng thái
- Các cột tổng cân/khối/số mã hàng được backend tính từ productCodes join

### US-MNF-005: Xem chi tiết xe
- Thông tin xe + danh sách mã hàng đang trong xe
- Mỗi mã hàng hiển thị: ID, Mã đơn, Khách hàng, Tổng cân, Tổng khối, Trạng thái mã hàng

### US-MNF-006: Sửa thông tin xe
- Có thể sửa: biển số, người gọi xe, ngày, trạng thái, ghi chú
- Không thể "sửa" danh sách mã hàng qua form edit (phải làm qua US-MNF-002/003)

### US-MNF-007: Xóa xe (soft delete)
- Các mã hàng trong xe sẽ được giải phóng (manifestId = null)

---

## 5. Quyền truy cập

| Role     | Tạo | Sửa | Xóa | Xem |
|----------|-----|-----|-----|-----|
| ADMIN    | ✅   | ✅   | ✅   | ✅   |
| SALE     | ✅   | ✅   | ❌   | ✅   |
| CUSTOMER | ❌   | ❌   | ❌   | ✅ (chỉ xe có hàng của mình) |

---

## 6. Thay đổi so với v1

| v1 (cũ)            | v2 (mới)                                |
|--------------------|-----------------------------------------|
| `name` (tên chuyến)| ❌ Bỏ → thay bằng `licensePlate`        |
| `status` String    | ✅ Chuyển thành Enum cụ thể 6 trạng thái |
| Không có caller    | ✅ Thêm `callerId` → FK nhân viên        |
| Status: OPEN/CLOSED/SHIPPED | ✅ 6 trạng thái nghiệp vụ     |
| Tổng cân/khối không có | ✅ Tính real-time từ productCodes    |
