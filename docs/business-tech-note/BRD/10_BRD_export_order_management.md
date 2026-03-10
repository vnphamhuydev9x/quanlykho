# Tài Liệu Nghiệp Vụ: Quản Lý Xuất Kho (Export Order)

> **Phiên bản**: v1.1
> **Ngày**: 2026-03-10
> **Thay đổi v1.1**: Bỏ ràng buộc "1 lệnh = 1 khách hàng" — cho phép 1 lệnh xuất kho chứa mã hàng của nhiều khách hàng khác nhau.
> **Tham chiếu**: BRD Xếp Xe (`08_BRD_manifest_management.md`), BRD Mã Hàng (`07_BRD_product_code_management.md`)

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Sau khi hàng hóa đã về kho Việt Nam (trạng thái xe = `DA_NHAP_KHO_VN`), module **Xuất Kho** quản lý toàn bộ luồng từ khi Admin/Sale tạo lệnh xuất kho cho khách hàng, nhân viên kho cân đo lại hàng thực tế, Admin xác nhận số liệu, đến khi nhân viên kho giao hàng và ghi nhận thu tiền.

### 1.2 Vị trí trong Sidebar
Menu **"Xuất kho"** nằm ngay bên dưới menu **"Hàng tồn"**. Cùng lúc implement thêm sub-menu **"Tồn kho VN"** trong menu "Hàng tồn" (chưa có trước đây).

### 1.3 Điểm tương đồng với Xếp Xe
Luồng Xuất Kho có thiết kế tương tự luồng Xếp Xe:
- Tạo lệnh từ màn hình Mã Hàng bằng cách chọn nhiều mã hàng → bấm nút trong summary bar
- Mỗi lệnh (ExportOrder) quản lý một nhóm ProductCode
- Trạng thái lệnh được clone xuống từng ProductCode để hiển thị nhanh trên bảng (field `exportStatus`, tương tự `vehicleStatus`)

---

## 2. Thông Tin Chi Tiết Các Trường Dữ Liệu

### 2.1 Lệnh Xuất Kho (`ExportOrder`) — Đối tượng Master

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | **Ngày giờ khách nhận hàng** | DateTime | | Ngày giờ dự kiến khách đến nhận hoặc shipper giao |
| 2 | **Chi phí giao hàng** | Integer | Đơn vị: VND | Chi phí giao hàng dự kiến |
| 3 | **Ghi chú** | String | Text Area | Ghi chú về lệnh xuất kho |
| 4 | **Trạng thái** | Enum | Bắt buộc | Trạng thái lệnh xuất kho (xem mục 2.3). Lúc tạo tự động = `DA_TAO_LENH`, không cho chọn |
| 5 | **Số tiền đã nhận** | Integer | Disabled khi tạo, VND | Số tiền thực tế đã thu của khách. Chỉ điền được ở bước giao hàng |
| 6 | **Phí ship thực tế** | Integer | Disabled khi tạo, VND | Phí ship thực tế. Chỉ điền được ở bước giao hàng |
| 7 | **Người tạo lệnh** | Read-only | Auto-fill | Tự động gán người dùng đang đăng nhập |

> **Lưu ý v1.1**: Lệnh xuất kho **không** gắn với 1 khách hàng cố định. Các mã hàng trong lệnh có thể thuộc nhiều khách hàng khác nhau. Thông tin khách hàng được tra cứu qua từng `ProductCode.customerId` khi cần.

### 2.2 Thông Tin Cân Đo Lại — Bổ sung vào Mặt Hàng (`ProductItem`)

Khi nhân viên kho cân lại hàng thực tế, số liệu mới được lưu **song song** với số liệu ban đầu. Số liệu gốc **tuyệt đối không bị xoá hay ghi đè**.

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | **Trọng lượng sau cân lại** | Integer | | Trọng lượng thực tế sau khi cân lại. Đơn vị: kg. Cùng kiểu dữ liệu và cách hiển thị với trường "Trọng lượng" gốc |
| 2 | **Khối lượng sau cân lại** | Float | | Khối lượng thực tế sau khi cân lại. Đơn vị: m³. Cùng kiểu dữ liệu và cách hiển thị với trường "Khối lượng" gốc |
| 3 | **Cước TQ_HN sau cân lại** | Float | Disabled, Auto Calculated | Tự động tính theo công thức `itemTransportFeeEstimate` nhưng dùng trọng lượng và khối lượng sau cân lại. Đơn vị: VND |
| 4 | **Chi phí NK sau cân lại** | Float | Disabled, Auto Calculated | Tự động tính: `Cước TQ_HN sau cân lại + Chi phí khai báo`. Đơn vị: VND |
| 5 | **Dùng số liệu sau cân** | Boolean | Default: false | Flag Admin xác nhận. `false` = giữ số liệu gốc, `true` = dùng số liệu sau cân lại. Đây là "quyết định có vết" thay cho việc ghi đè |

**Nguyên tắc audit trail**: Downstream (báo cáo, thanh toán) đọc: nếu `useActualData = true` thì dùng `actual*`, ngược lại dùng giá trị gốc. Mọi quyết định đều để lại vết rõ ràng.

### 2.3 Trạng Thái Lệnh Xuất Kho (`ExportOrderStatus`)

| Trạng thái | Nhãn hiển thị | Tag Color | Mô tả |
|------------|---------------|-----------|-------|
| `DA_TAO_LENH` | Đã tạo lệnh xuất kho | Xanh dương | Lệnh vừa được Admin/Sale tạo, nhân viên kho chưa cân đo |
| `DANG_XAC_NHAN_CAN` | Đang xác nhận số cân đo lại | Cam | Nhân viên kho đã gửi số liệu cân lại, chờ Admin xác nhận |
| `DA_XAC_NHAN_CAN` | Đã xác nhận số cân | Xanh lá | Admin đã xác nhận số liệu, sẵn sàng giao hàng |
| `DA_XUAT_KHO` | Đã xuất kho | Tím | Nhân viên kho đã giao hàng và ghi nhận tiền thu |

---

## 3. Quy Tắc Xác Thực (Validation Rules)

### 3.1 Validation khi Tạo Lệnh Xuất Kho
Backend kiểm tra theo thứ tự, trả về lỗi ngay khi gặp vi phạm đầu tiên:

1. **Tất cả mã hàng phải có `vehicleStatus = DA_NHAP_KHO_VN`**
   - Lỗi: `"Các mã hàng sau chưa về kho VN: [danh sách ID + trạng thái hiện tại]"`

2. **Tất cả mã hàng phải có `exportOrderId = null`** (chưa thuộc lệnh xuất kho nào)
   - Lỗi: `"Các mã hàng sau đã có lệnh xuất kho: [danh sách ID + lệnh #yyy]"`

> **Lưu ý v1.1**: Đã xóa rule "cùng 1 khách hàng". Các mã hàng thuộc nhiều khách hàng khác nhau vẫn được phép tạo chung 1 lệnh xuất kho.

### 3.2 Validation Hủy Lệnh Xuất Kho
- **Chỉ cho phép hủy** khi `status = DA_TAO_LENH`
- **Không cho phép hủy** khi status là `DANG_XAC_NHAN_CAN`, `DA_XAC_NHAN_CAN`, `DA_XUAT_KHO`
  - Lý do: Đã có action thực tế (cân đo, xác nhận, giao hàng), không thể đảo ngược đơn giản

---

## 4. Luồng Nghiệp Vụ

### 4.1 Tạo Lệnh Xuất Kho
Có 2 điểm khởi đầu:

**Luồng A: Từ màn hình Mã Hàng (có sẵn mã hàng được chọn)**
```
1. Admin tick chọn ≥1 mã hàng trong bảng ProductCode
2. Summary bar xuất hiện nút [Tạo lệnh xuất kho] (bên cạnh nút [Xếp xe])
3. Bấm [Tạo lệnh xuất kho] → FE validate nhanh:
   - Tất cả phải có vehicleStatus = DA_NHAP_KHO_VN
   - Không mã nào đã có exportOrderId
   (Không cần check cùng khách hàng)
4. Nếu hợp lệ → Mở ExportOrderModal (chế độ Create), danh sách mã hàng đã chọn hiển thị sẵn
5. User có thể thêm mã hàng khác bằng nút [Thêm mã hàng]
6. Điền form: ngày giờ khách nhận, chi phí giao hàng, ghi chú
7. Bấm [Tạo lệnh xuất kho]
```

**Luồng B: Từ màn hình Xuất Kho (tạo trực tiếp)**
```
1. Admin bấm [Tạo lệnh xuất kho] trên màn danh sách Xuất Kho
2. Mở ExportOrderModal (chế độ Create) với danh sách mã hàng trống
3. Bấm [Thêm mã hàng] → Popup chọn mã hàng (filter: vehicleStatus=DA_NHAP_KHO_VN + chưa có lệnh)
4. Có thể thêm mã hàng từ nhiều khách hàng khác nhau
5. Điền form: ngày giờ khách nhận, chi phí giao hàng, ghi chú
6. Bấm [Tạo lệnh xuất kho]
```

**Backend (trong 1 transaction)**:
```
- Tạo ExportOrder (không có customerId)
- Gán tất cả productCodeIds vào ExportOrder
- Set exportOrderId, exportStatus = DA_TAO_LENH, exportDeliveryDateTime trên từng ProductCode
```

### 4.2 Cân Đo Lại (Nhân viên kho)
```
1. Nhân viên vào [Hàng tồn] → [Tồn kho VN]
   - Bảng hiển thị ProductCode có vehicleStatus = DA_NHAP_KHO_VN
   - Sorted: exportDeliveryDateTime tăng dần (null xuống cuối) → rồi id tăng dần
2. Mã hàng có exportStatus = DA_TAO_LENH → nhân viên biết cần cân đo lại
3. Nhân viên mở chi tiết mã hàng → vào từng mặt hàng → điền:
   - Trọng lượng sau cân lại
   - Khối lượng sau cân lại
   → Cước TQ_HN sau cân lại và Chi phí NK sau cân lại tự động tính
4. Nhân viên bấm [Gửi thông tin cân lại] trên lệnh xuất kho
5. Backend: ExportOrder.status = DANG_XAC_NHAN_CAN
           + ProductCode.exportStatus = DANG_XAC_NHAN_CAN (tất cả PC trong lệnh)
```

### 4.3 Xác Nhận Số Cân (Admin)
```
1. Admin vào [Xuất kho] → [Đang xác nhận số cân đo lại]
2. Mở ExportOrder → xem bảng so sánh song song cho từng mặt hàng:
   [Số liệu gốc] ↔ [Số liệu sau cân lại]
   (highlight: đỏ = tăng, xanh = giảm so với gốc)
3. Admin quyết định per-item bằng toggle "Dùng số liệu sau cân":
   - OFF (useActualData = false): dùng số liệu gốc
   - ON  (useActualData = true):  dùng số liệu sau cân lại
   Có nút [Bật tất cả] để bulk set toàn bộ mặt hàng trong 1 click
4. Admin bấm [Xác nhận số cân]
5. Backend: lưu useActualData cho từng ProductItem
           + ExportOrder.status = DA_XAC_NHAN_CAN
           + ProductCode.exportStatus = DA_XAC_NHAN_CAN
   → Số liệu gốc KHÔNG bị xoá. Flag useActualData = vết quyết định.
```

### 4.4 Giao Hàng (Nhân viên kho)
```
1. Nhân viên vào [Tồn kho VN] → thấy mã hàng exportStatus = DA_XAC_NHAN_CAN
2. Gọi shipper đến lấy hàng
3. Nhân viên mở ExportOrder → điền:
   - Số tiền đã nhận từ khách
   - Phí ship thực tế
4. Bấm [Đã giao hàng]
5. Backend: ExportOrder.status = DA_XUAT_KHO
           + ProductCode.exportStatus = DA_XUAT_KHO
```

### 4.5 Hủy Lệnh Xuất Kho
```
Điều kiện: ExportOrder.status = DA_TAO_LENH (chỉ trạng thái này)

1. Admin bấm [Hủy lệnh] trên ExportOrder
2. Confirm dialog: "Xác nhận hủy lệnh xuất kho #xxx?"
3. Backend (trong 1 transaction):
   - Soft delete ExportOrder (set deletedAt)
   - Reset các ProductCode liên kết:
     exportOrderId = null
     exportStatus = null
     exportDeliveryDateTime = null
   → Mã hàng trở về trạng thái "Chưa có lệnh xuất", có thể tạo lệnh mới
```

---

## 5. Giao Diện (UI/UX)

### 5.1 Menu "Tồn kho VN" (trong Hàng tồn)
- Hiển thị tất cả `ProductCode` có `vehicleStatus = DA_NHAP_KHO_VN`
- **Sorted**: `exportDeliveryDateTime ASC NULLS LAST` → `id ASC`
- Hiển thị cột trạng thái xuất kho (`exportStatus`) dưới dạng Tag màu
- Mã hàng `exportStatus = null` → Tag "Chưa có lệnh xuất" (màu mặc định)

### 5.2 Menu "Xuất kho"
| Sub-menu | Nội dung |
|---|---|
| Tất cả | Danh sách toàn bộ ExportOrder (trừ đã xoá mềm), có filter theo trạng thái |
| Đang xác nhận cân | Chỉ ExportOrder có `status = DANG_XAC_NHAN_CAN` |

### 5.3 Cột "Trạng thái xuất kho" trên bảng Mã Hàng
- Thêm cột hiển thị `exportStatus` (Tag màu) vào bảng ProductCode, tương tự cột `vehicleStatus`
- `null` → "Chưa có lệnh xuất" (Tag màu xám)
- Click vào Tag → Quick Peek ExportOrder (popup xem nhanh, tương tự Quick Peek xe)

### 5.4 So sánh Số Liệu Cân Lại (trong ExportOrderModal — Admin xác nhận)
- Bảng mặt hàng chia 2 nhóm cột: **"Số liệu ban đầu"** và **"Số liệu sau cân lại"**
- Highlight chênh lệch: đỏ nếu actual > gốc, xanh nếu actual < gốc, không highlight nếu bằng nhau
- Mỗi dòng: toggle "Dùng số liệu sau cân" (`useActualData`)
- Toolbar: nút [Bật tất cả] / [Tắt tất cả]

---

## 6. Quyền Truy Cập

> **Lưu ý**: Phiên bản 1.0 tạm thời chỉ ADMIN toàn quyền. Phân quyền chi tiết theo role (SALE, WAREHOUSE) sẽ bổ sung ở phiên bản sau.

| Hành động | ADMIN |
|---|---|
| Tạo lệnh xuất kho | ✅ |
| Xem danh sách xuất kho | ✅ |
| Hủy lệnh xuất kho (chỉ khi `DA_TAO_LENH`) | ✅ |
| Điền số liệu cân lại | ✅ |
| Xác nhận số cân (per-item + bulk) | ✅ |
| Xác nhận đã giao hàng + ghi tiền thu | ✅ |

---

## 7. Quyết Định Thiết Kế

| Quyết định | Lý do |
|---|---|
| Không ghi đè số liệu gốc — dùng flag `useActualData` per-item | Giữ audit trail đầy đủ. Luôn biết số liệu trước/sau và ai quyết định dùng cái nào |
| Xác nhận số cân per-item + nút bulk | Linh hoạt: admin chọn riêng lẻ hoặc approve nhanh toàn bộ |
| Chỉ cho hủy khi `DA_TAO_LENH` | Bảo vệ tính toàn vẹn sau khi đã có action thực tế |
| **1 ExportOrder = nhiều khách hàng (v1.1)** | Thực tế kho thường giao nhiều mã hàng nhiều khách trong 1 lần xuất. Không cần gắn cứng 1 khách. Thông tin khách tra qua `ProductCode.customerId` |
| ExportOrder không có `customerId` (v1.1) | Không còn ràng buộc 1 khách → remove field để tránh dư thừa. Mỗi PC đã biết khách của nó |
| Clone `exportDeliveryDateTime` sang `ProductCode` | Sort đơn giản không cần JOIN khi render bảng "Tồn kho VN" |
| `exportStatus` clone xuống `ProductCode` | Hiển thị nhanh trên bảng mà không cần JOIN vào ExportOrder (tương tự `vehicleStatus`) |
