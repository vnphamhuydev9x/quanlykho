# BRD — Chức năng Xếp Xe (Manifest)

> **Phiên bản**: 3.0 — Bổ sung vehicleStatus trên ProductCode, luồng tạo xe từ 2 điểm, override status thủ công
> **Thay thế**: v2.0

---

## 1. Bối cảnh & Mục tiêu

Bổ sung trạng thái xếp xe (`vehicleStatus`) trực tiếp lên từng mã hàng (`ProductCode`) để theo dõi độc lập với trạng thái tổng của chuyến xe. Đồng thời cải thiện UX tạo manifest (2 luồng) và chuyển view/edit sang Modal thay vì navigate trang.

---

## 2. Mô hình dữ liệu

### 2.1 Bổ sung vào `ProductCode`

| Trường                   | Kiểu                  | Mặc định  | Mô tả |
|--------------------------|-----------------------|-----------|-------|
| `vehicleStatus`          | `ManifestStatus?`     | `null`    | Trạng thái xếp xe của mã hàng. Null = chưa xếp xe |
| `vehicleStatusOverridden`| `Boolean`             | `false`   | Đánh dấu trạng thái đã bị chỉnh thủ công — không đồng bộ theo trạng thái xe nữa |

### 2.2 `Manifest` — giữ nguyên từ v2

| Trường         | Kiểu            | Mô tả                    |
|----------------|-----------------|--------------------------|
| `id`           | Int (PK)        | Auto increment           |
| `licensePlate` | String          | Biển số xe (bắt buộc)    |
| `callerId`     | Int? (FK→User)  | Người gọi xe             |
| `date`         | DateTime        | Ngày xếp xe              |
| `status`       | ManifestStatus  | Trạng thái chuyến xe     |
| `note`         | String?         | Ghi chú                  |

**Các trường tự tính (không lưu DB):**
- `totalProductCodes`, `totalWeight`, `totalVolume` tính từ productCodes liên kết

### 2.3 Enum ManifestStatus (dùng cho cả Manifest.status và ProductCode.vehicleStatus)

| Giá trị           | Nhãn             | Tag Color  |
|-------------------|------------------|------------|
| `CHO_XEP_XE`      | Chờ xếp xe       | `default`  |
| `DA_XEP_XE`       | Đã xếp xe        | `blue`     |
| `DANG_KIEM_HOA`   | Đang kiểm hóa    | `orange`   |
| `CHO_THONG_QUAN`  | Chờ thông quan   | `gold`     |
| `DA_THONG_QUAN`   | Đã thông quan    | `green`    |
| `DA_NHAP_KHO_VN`  | Đã nhập kho VN   | `purple`   |

---

## 3. Luồng nghiệp vụ chi tiết

### 3.1 Luồng 1 — Tạo xe từ màn hình Mã hàng

```
1. User tick chọn ≥1 mã hàng trong bảng ProductCode
2. Xuất hiện nút [Xếp xe] trong summary bar
3. User bấm [Xếp xe]
4. Hệ thống validate:
   - Nếu bất kỳ mã hàng nào đã có vehicleStatus ≠ null
     → Hiện popup cảnh báo: "Các mã hàng sau đã được xếp xe:
        [ID #101 — Xe #5 (biển 51C-xxx)]
        [ID #102 — ...]
       Vui lòng bỏ chọn các mã hàng này để tiếp tục."
   - Nếu tất cả vehicleStatus = null → mở ManifestCreateModal
5. User điền thông tin xe (biển số, người gọi xe, ngày, trạng thái, ghi chú)
6. Bấm [Tạo chuyến xe]
7. Backend: tạo Manifest + gán productCodeIds + set vehicleStatus = CHO_XEP_XE cho tất cả
```

### 3.2 Luồng 2 — Tạo xe từ màn hình Xếp xe

```
1. User vào menu [Xếp xe] → bấm [+ Tạo chuyến mới]
2. ManifestModal hiện ra (chế độ Create):
   - Form: biển số, người gọi xe, ngày, trạng thái, ghi chú
   - Table mã hàng: rỗng ban đầu
   - Nút [+ Thêm mã hàng]
3. Bấm [Thêm mã hàng] → popup chọn mã hàng:
   - Chỉ hiển thị ProductCode có vehicleStatus = null
   - User tick chọn → xác nhận
   - Danh sách cập nhật trong form
4. Bấm [Tạo chuyến xe]
5. Backend: tạo Manifest + gán productCodeIds + set vehicleStatus = CHO_XEP_XE
```

### 3.3 Validate khi gán mã hàng vào xe

**Rule bắt buộc**: Mọi mã hàng được thêm vào xe phải có `vehicleStatus = null`.
Nếu có mã hàng nào khác → trả về lỗi 400 với danh sách mã hàng vi phạm.

### 3.4 Thay đổi trạng thái chuyến xe

Khi `Manifest.status` thay đổi:
- **Chỉ update** `vehicleStatus` của những ProductCode có `vehicleStatusOverridden = false`
- ProductCode có `vehicleStatusOverridden = true` → **giữ nguyên** vehicleStatus

### 3.5 Chỉnh thủ công vehicleStatus của từng mã hàng (trong ManifestModal Edit)

```
1. User ở ManifestModal (Edit mode)
2. Tick chọn ≥1 mã hàng trong bảng
3. Chọn trạng thái mới từ dropdown → bấm [Áp dụng]
4. Backend: set vehicleStatus = status mới + vehicleStatusOverridden = true
5. FE: hiển thị icon/badge cảnh báo "⚠ Đã chỉnh thủ công" trên dòng đó
6. User có thể bấm nút [↺ Khôi phục] trên từng dòng:
   → Backend: vehicleStatusOverridden = false, vehicleStatus = manifest.status hiện tại
```

### 3.6 Khi xóa mã hàng khỏi xe
→ Set `vehicleStatus = null`, `vehicleStatusOverridden = false`

### 3.7 Khi xóa xe (soft delete)
→ Set `vehicleStatus = null`, `vehicleStatusOverridden = false` cho tất cả PC liên kết

---

## 4. View/Edit Manifest — chuyển sang Modal

| Nút      | Hành động cũ          | Hành động mới                                |
|----------|------------------------|----------------------------------------------|
| [Xem]    | Navigate /manifests/:id | Mở ManifestModal (chế độ View, read-only)     |
| [Sửa]    | Navigate + edit        | Mở ManifestModal (chế độ Edit, có thể sửa)   |
| [Xóa]    | Confirm → delete       | Giữ nguyên                                   |

### ManifestModal — cấu trúc

**View Mode** (read-only):
- Form thông tin xe: toàn bộ disabled
- Table mã hàng: cột Thao tác chỉ có `[👁 Xem mã hàng]`

**Edit Mode** (editable):
- Form thông tin xe: có thể sửa
- Table mã hàng:
  - Checkbox chọn nhiều dòng
  - Cột `vehicleStatus` hiển thị Tag + badge "⚠ thủ công" nếu overridden
  - Cột Thao tác: `[↺ Khôi phục]` (chỉ hiện khi overridden=true), `[👁 Xem mã hàng]`
  - Toolbar trên table: dropdown chọn trạng thái + `[Áp dụng cho các dòng đã chọn]`
  - Nút `[+ Thêm mã hàng]`

---

## 5. Declaration — hiển thị vehicleStatus

Khi xem Declaration:
- Thêm cột `vehicleStatus` (Tag màu) vào table mặt hàng (ProductItem list)
- Thêm trường hiển thị `vehicleStatus` vào Declaration form (read-only)
- vehicleStatus lấy từ `declaration.productCode.vehicleStatus`

---

## 6. Chức năng chính (User Stories cập nhật)

| US-ID | Mô tả | Thay đổi vs v2 |
|---|---|---|
| US-MNF-001 | Tạo xe từ màn hình Xếp xe (Luồng 2) | Bổ sung thêm mã hàng trong form tạo |
| US-MNF-001b | Tạo xe từ màn hình Mã hàng (Luồng 1) | **Mới** |
| US-MNF-002 | Thêm mã hàng vào xe (chỉ vehicleStatus=null) | Bổ sung validate |
| US-MNF-003 | Xóa mã hàng khỏi xe | Bổ sung reset vehicleStatus |
| US-MNF-004 | Xem danh sách xe | Thêm cột tổng cân/khối |
| US-MNF-005 | Xem chi tiết xe | **Chuyển sang Modal View** |
| US-MNF-006 | Sửa thông tin xe | **Chuyển sang Modal Edit** |
| US-MNF-007 | Xóa xe | Bổ sung reset vehicleStatus |
| US-MNF-008 | Chỉnh thủ công vehicleStatus mã hàng | **Mới** |
| US-MNF-009 | Khôi phục vehicleStatus về trạng thái xe | **Mới** |
| US-MNF-010 | Đổi trạng thái xe chỉ áp dụng PC chưa override | **Mới** |

---

## 7. Quyền truy cập

| Role     | Tạo xe | Sửa xe | Xóa xe | Xem xe | Chỉnh vehicleStatus |
|----------|--------|--------|--------|--------|---------------------|
| ADMIN    | ✅      | ✅      | ✅      | ✅      | ✅                   |
| Khác     | ❌      | ❌      | ❌      | ❌      | ❌                   |

---

## 8. Quyết định thiết kế

| Quyết định | Lý do |
|---|---|
| vehicleStatus dùng chung enum ManifestStatus | Tái dùng enum, cùng tập giá trị |
| vehicleStatusOverridden là Boolean | Đơn giản, tường minh hơn dùng nullable timestamp |
| ManifestModal thay vì route | UX nhanh hơn, không mất ngữ cảnh trang danh sách |
| Luồng 1 validate trước khi mở form | Tránh tạo xe thất bại, UX tốt hơn |
| Khi update status xe chỉ áp dụng PC chưa override | Tôn trọng quyết định thủ công của user |
