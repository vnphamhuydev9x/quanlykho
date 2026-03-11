# BRD (Draft) — Chức năng Xuất Kho

> **Trạng thái**: OLD (Hết hạn) — Đã được thay thế bởi [10_BRD_export_order_management.md v1.1](../../docs/business-tech-note/BRD/10_BRD_export_order_management.md)
> **Ngày**: 2026-03-10
> **Tham chiếu**: BRD Xếp Xe (`08_BRD_manifest_management.md`), BRD Mã Hàng (`07_BRD_product_code_management.md`)

---

## 1. Bối cảnh & Mục tiêu

Khi hàng hóa đã về kho Việt Nam (trạng thái xe = `DA_NHAP_KHO_VN`), hệ thống cần một luồng nghiệp vụ để quản lý việc **xuất hàng ra khỏi kho đến tay khách hàng**. Luồng này bao gồm: tạo lệnh xuất kho, nhân viên kho cân đo lại hàng thực tế, admin xác nhận số liệu, và cuối cùng giao hàng cho khách.

Chức năng mới cần bổ sung:
1. **Menu "Xuất kho"** — quản lý các lệnh xuất kho.
2. **Luồng tạo lệnh xuất kho** từ màn hình Mã hàng (tương tự luồng xếp xe).
3. **Luồng cân đo lại** — nhân viên kho cập nhật số liệu thực tế, admin xác nhận.
4. **Luồng giao hàng** — nhân viên kho xác nhận đã giao và ghi nhận tiền thu.
5. **Menu "Tồn kho VN"** (chưa implement) — hiển thị hàng đang chờ xuất.

---

## 2. Mô hình Dữ liệu

### 2.1 Đối tượng mới: `ExportOrder` (Lệnh Xuất Kho)

| Trường | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | Int (PK) | Auto | |
| `customerId` | Int? | FK → User | Khách hàng của lệnh xuất kho (bắt buộc khi tạo, tất cả mã hàng trong lệnh phải cùng khách hàng này) |
| `deliveryDateTime` | DateTime? | | Ngày giờ dự kiến khách nhận hàng |
| `deliveryFee` | Int? | VND | Chi phí giao hàng |
| `notes` | String? | Text Area | Ghi chú |
| `status` | `ExportOrderStatus` | Enum | Trạng thái lệnh xuất kho (xem mục 2.3) |
| `receivedAmount` | Int? | VND | Số tiền đã thu của khách (điền khi giao hàng) |
| `shippingFee` | Int? | VND | Phí ship thực tế (điền khi giao hàng) |
| `createdById` | Int? | FK → User | Người tạo lệnh |
| `createdAt` | DateTime | Auto | |
| `updatedAt` | DateTime | Auto | |
| `deletedAt` | DateTime? | Soft delete | |

**Quan hệ:** Một `ExportOrder` có thể chứa nhiều `ProductCode` (quan hệ 1-N: một `ProductCode` chỉ thuộc 1 lệnh xuất kho tại một thời điểm).

### 2.2 Bổ sung vào `ProductCode`

| Trường | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `exportOrderId` | Int? | null | FK → ExportOrder. Null = chưa có lệnh xuất kho |
| `exportStatus` | `ExportOrderStatus?` | null | Bản sao trạng thái xuất kho, để hiển thị nhanh trên bảng (tương tự `vehicleStatus`) |
| `exportDeliveryDateTime` | DateTime? | null | Clone từ ExportOrder.deliveryDateTime, dùng để sort trong "Tồn kho VN" |

> **Quyết định thiết kế — Sorting "Tồn kho VN"**: Clone `exportDeliveryDateTime` sang `ProductCode` thay vì JOIN. Tránh JOIN phức tạp khi render bảng lớn. Trường này được cập nhật đồng bộ mỗi khi `ExportOrder.deliveryDateTime` thay đổi.

### 2.3 Enum `ExportOrderStatus`

| Giá trị | Nhãn hiển thị | Tag Color |
|---|---|---|
| `DA_TAO_LENH` | Đã tạo lệnh xuất kho | `blue` |
| `DANG_XAC_NHAN_CAN` | Đang xác nhận số cân đo lại | `orange` |
| `DA_XAC_NHAN_CAN` | Đã xác nhận số cân | `green` |
| `DA_XUAT_KHO` | Đã xuất kho | `purple` |

### 2.4 Bổ sung vào `ProductItem` — Thông tin cân đo lại

Số liệu gốc **không bao giờ bị xoá hay ghi đè**. Số liệu sau cân lại được lưu song song. Trường `useActualData` đánh dấu admin đã quyết định dùng bộ số liệu nào cho lần xuất kho này.

| Trường | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `actualWeight` | Int? | | Trọng lượng sau khi cân lại (kg) |
| `actualVolume` | Decimal? | `@db.Decimal(15,3)` | Khối lượng sau khi cân lại (m³) |
| `actualItemTransportFeeEstimate` | Decimal? | `@db.Decimal(15,2)` | Auto Calculated từ `actualWeight`/`actualVolume`, cùng công thức `itemTransportFeeEstimate` |
| `actualImportCostToCustomer` | Decimal? | `@db.Decimal(15,2)` | Auto Calculated: `actualItemTransportFeeEstimate + declarationCost` |
| `useActualData` | Boolean | Default `false` | **Flag xác nhận của Admin**. `false` = dùng số liệu gốc, `true` = dùng số liệu sau cân lại. Đây là "quyết định có vết" thay cho việc ghi đè dữ liệu gốc. |

> **Nguyên tắc audit trail**: Không ghi đè `itemTransportFeeEstimate` hay `importCostToCustomer` gốc. Thay vào đó, downstream (báo cáo, thanh toán) sẽ đọc: nếu `useActualData = true` thì dùng `actual*`, ngược lại dùng giá trị gốc. Mọi thay đổi quyết định đều để lại vết rõ ràng qua trường `useActualData`.

> **Gợi ý UI/UX cho màn hình xác nhận cân**: Trong ExportOrderModal (view của admin), hiển thị bảng mặt hàng với 2 cột so sánh song song:
> - "Số liệu ban đầu": `weight`, `volume`, `itemTransportFeeEstimate`, `importCostToCustomer`
> - "Số liệu sau cân lại": `actualWeight`, `actualVolume`, `actualItemTransportFeeEstimate`, `actualImportCostToCustomer`
> - Highlight màu đỏ nếu actual lớn hơn gốc, màu xanh nếu nhỏ hơn
> - Mỗi dòng có toggle/checkbox "Dùng số liệu sau cân lại" → set `useActualData`
> - Nút [Xác nhận tất cả dùng số liệu mới] để áp `useActualData = true` cho toàn bộ mặt hàng trong 1 click

---

## 3. Luồng Nghiệp Vụ Chi Tiết

### 3.1 Luồng Tạo Lệnh Xuất Kho (từ màn Mã Hàng)

```
1. User (Admin) tick chọn ≥1 mã hàng trong bảng ProductCode
2. Summary bar hiển thị: [Xếp xe] | [Tạo lệnh xuất kho]
3. User bấm [Tạo lệnh xuất kho]
4. Hệ thống validate (theo thứ tự, dừng lại ở lỗi đầu tiên):
   a. Tất cả mã hàng phải có vehicleStatus = DA_NHAP_KHO_VN
      → Nếu không: "Các mã hàng sau chưa về kho VN:
         [ID #xxx — Trạng thái hiện tại: ...]
        Vui lòng bỏ chọn các mã hàng này để tiếp tục."
   b. Tất cả mã hàng phải có cùng customerId
      → Nếu không: "Lệnh xuất kho chỉ được tạo cho 1 khách hàng.
         Các mã hàng sau thuộc khách hàng khác:
         [ID #xxx — Khách hàng: ...]"
   c. Không có mã hàng nào đã có exportOrderId ≠ null
      → Nếu có: "Các mã hàng sau đã có lệnh xuất kho:
         [ID #xxx — Lệnh xuất kho #yyy]"
   → Tất cả hợp lệ: Mở ExportOrderCreateModal
5. User điền: ngày giờ khách nhận hàng, chi phí giao hàng, ghi chú
   (Trạng thái lúc tạo tự động = DA_TAO_LENH, không cho chọn)
6. Bấm [Tạo lệnh xuất kho]
7. Backend: tạo ExportOrder (gán customerId từ mã hàng đầu tiên)
           + gán productCodeIds
           + set exportStatus = DA_TAO_LENH trên từng ProductCode
           + set exportDeliveryDateTime trên từng ProductCode
```

### 3.2 Luồng Cân Đo Lại (Nhân viên kho)

```
1. Nhân viên kho vào menu [Hàng tồn] → [Tồn kho VN]
   → Bảng hiển thị các mã hàng có vehicleStatus = DA_NHAP_KHO_VN
   → Sorted:
       Ưu tiên 1: exportDeliveryDateTime tăng dần (giao sớm nhất lên trên; null xuống cuối)
       Ưu tiên 2: id tăng dần (tạo trước lên trên)
2. Mã hàng có exportStatus = DA_TAO_LENH → nhân viên biết cần cân đo lại
3. Nhân viên mở chi tiết mã hàng → vào từng mặt hàng → điền:
   - actualWeight (Trọng lượng sau khi cân lại)
   - actualVolume (Khối lượng sau khi cân lại)
   → actualItemTransportFeeEstimate và actualImportCostToCustomer tự động tính
4. Sau khi điền xong tất cả mặt hàng → bấm [Gửi thông tin cân lại]
5. Backend: ExportOrder.status = DANG_XAC_NHAN_CAN
           + ProductCode.exportStatus = DANG_XAC_NHAN_CAN (tất cả PC trong lệnh)
```

### 3.3 Luồng Xác Nhận Số Cân (Admin)

```
1. Admin vào menu [Xuất kho] → sub-menu [Đang xác nhận số cân đo lại]
   → Chỉ hiển thị ExportOrder có status = DANG_XAC_NHAN_CAN
2. Admin mở chi tiết ExportOrder → xem bảng so sánh song song:
   [Số liệu gốc] ↔ [Số liệu sau cân lại] cho từng mặt hàng
   (highlight chênh lệch: đỏ = tăng, xanh = giảm)
3. Admin quyết định cho từng mặt hàng (toggle useActualData):
   - Giữ nguyên (useActualData = false): dùng số liệu gốc
   - Dùng sau cân (useActualData = true): đánh dấu dùng số liệu actual
   Ngoài ra có nút [Xác nhận tất cả dùng số liệu mới] để bulk set toàn bộ
4. Admin bấm [Xác nhận số cân]
5. Backend: lưu useActualData cho từng ProductItem
           + ExportOrder.status = DA_XAC_NHAN_CAN
           + ProductCode.exportStatus = DA_XAC_NHAN_CAN
   → Số liệu gốc (itemTransportFeeEstimate, importCostToCustomer) KHÔNG bị xoá.
     Hệ thống downstream dùng actual* khi useActualData = true.
```

### 3.4 Luồng Giao Hàng (Nhân viên kho)

```
1. Nhân viên kho vào [Tồn kho VN] → thấy mã hàng có exportStatus = DA_XAC_NHAN_CAN
2. Gọi shipper đến lấy hàng
3. Nhân viên điền:
   - Số tiền đã nhận từ khách (receivedAmount)
   - Phí ship thực tế (shippingFee)
4. Bấm [Đã giao hàng]
5. Backend: ExportOrder.status = DA_XUAT_KHO
           + ProductCode.exportStatus = DA_XUAT_KHO
```

### [OBSOLETE] Yêu cầu: Quản lý Lệnh Xuất Kho

> [!WARNING]
> Tài liệu này đã cũ và không còn được sử dụng để phát triển.
> Vui lòng tham khảo tài liệu chính thức tại: [10_BRD_export_order_management.md v1.1](file:///Volumes/Data/projects/javascript/nodejs/quanlykho/docs/business-tech-note/10_BRD_export_order_management.md)

### 3.5 Luồng Hủy Lệnh Xuất Kho

```
Điều kiện cho phép hủy: ExportOrder.status = DA_TAO_LENH
  (Chưa có nhân viên cân đo, chưa có action thực tế nào)

Không cho phép hủy khi status là:
  DANG_XAC_NHAN_CAN / DA_XAC_NHAN_CAN / DA_XUAT_KHO
  → Hiển thị thông báo lý do và hướng dẫn liên hệ admin nếu cần xử lý ngoại lệ

Khi hủy:
1. Soft delete ExportOrder (set deletedAt)
2. Reset các ProductCode liên kết:
   exportOrderId = null
   exportStatus = null
   exportDeliveryDateTime = null
   → Các mã hàng trở về trạng thái "Chưa có lệnh xuất", có thể tạo lệnh mới
```

---

## 4. Cấu trúc Menu

```
Sidebar:
├── Mã hàng
├── Khai báo
├── Xếp xe
├── Hàng tồn
│   ├── Tồn kho VN          ← (implement cùng feature này)
│   └── ...
├── Xuất kho                ← Menu mới
│   ├── Tất cả              ← Danh sách toàn bộ ExportOrder
│   └── Đang xác nhận cân   ← Lọc status = DANG_XAC_NHAN_CAN
└── ...
```

---

## 5. Hiển thị Trạng Thái Xuất Kho trên Bảng Mã Hàng

Tương tự `vehicleStatus`, thêm cột **"Trạng thái xuất kho"** vào bảng ProductCode:
- Hiển thị Tag màu theo `ExportOrderStatus`
- Null → hiển thị "Chưa có lệnh xuất"
- Có thể click vào Tag để Quick Peek vào ExportOrder đó (tương tự Quick Peek xe)

---

## 6. Quyền Truy Cập

> **Lưu ý**: Hiện tại tạm thời phân quyền đơn giản — chỉ ADMIN thực hiện được tất cả hành động. Sẽ cập nhật chi tiết phân theo role (SALE, WAREHOUSE...) trong phiên bản sau.

| Hành động | ADMIN |
|---|---|
| Tạo lệnh xuất kho | ✅ |
| Xem danh sách xuất kho | ✅ |
| Hủy lệnh xuất kho (chỉ khi DA_TAO_LENH) | ✅ |
| Điền số liệu cân lại | ✅ |
| Xác nhận số cân | ✅ |
| Xác nhận đã giao hàng | ✅ |

---

## 7. Quyết định Thiết Kế Đã Chốt

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Không ghi đè số liệu gốc, dùng flag `useActualData` per-item | Giữ audit trail đầy đủ, biết được số liệu trước/sau và ai quyết định dùng cái nào |
| 2 | Xác nhận số cân per-item + nút bulk "Xác nhận tất cả" | Linh hoạt: admin có thể chọn riêng lẻ từng mặt hàng hoặc approve nhanh toàn bộ |
| 3 | Chỉ cho phép hủy khi status = `DA_TAO_LENH` | Bảo vệ tính toàn vẹn sau khi đã có action thực tế (cân đo, xác nhận) |
| 4 | Mỗi ExportOrder chỉ được tạo cho 1 khách hàng | Đảm bảo logic xuất kho theo từng khách, tránh nhầm lẫn khi giao hàng |
| 5 | Clone `exportDeliveryDateTime` sang `ProductCode` | Sort đơn giản, không cần JOIN khi render bảng "Tồn kho VN" |
