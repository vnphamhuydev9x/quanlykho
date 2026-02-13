# Tài Liệu Nghiệp Vụ: Quản Lý Khai Báo

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Khai báo (Declaration)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Khai báo** cho phép quản lý thông tin khai báo hải quan cho các lô hàng nhập khẩu từ Trung Quốc về Việt Nam, bao gồm thông tin lô hàng, thông tin sản phẩm, và thông tin khai báo hải quan.

### 1.2 Các chức năng chính
1. Xem danh sách khai báo (có phân trang, tìm kiếm)
2. Thêm mới khai báo
3. Xem chi tiết khai báo (chế độ chỉ đọc)
4. Chỉnh sửa thông tin khai báo
5. Xóa khai báo (soft delete)
6. Xuất dữ liệu Excel (tất cả bản ghi)

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền tạo, sửa, xóa, xuất Excel
- **Các nhân viên khác**: Chỉ có quyền **xem** danh sách khai báo (không thể tạo, sửa, xóa, xuất)

---

## 2. Cấu Trúc Dữ Liệu

Mỗi khai báo bao gồm **43 trường dữ liệu** được chia thành **3 nhóm chính**:

### 2.1 Tab 1: Thông tin lô hàng (13 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| - | - | **Ngày nhập kho** | Date | ✅ | Ngày nhập hàng vào kho |
| 1 | [A] | **Mã khách hàng** | Dropdown | ✅ | Chọn khách hàng từ danh sách |
| 2 | [B] | **Tên mặt hàng** | Text | - | Tên sản phẩm/hàng hóa |
| - | - | **Mã đơn hàng** | Text | - | Mã đơn hàng (Order Code) |
| 3 | [C] | **Số kiện** | Number | - | Số lượng kiện hàng |
| 4 | [D] | **Trọng lượng (Kg)** | Number | - | Trọng lượng hàng hóa (đơn vị: Kg) |
| 5 | [E] | **Khối lượng (m³)** | Number | - | Thể tích hàng hóa (đơn vị: m³) |
| 6 | [F] | **Nguồn tin** | Dropdown | - | Nguồn thông tin: Kho TQ / Kho VN / Dự kiến nhập kho |
| 7 | [G] | **Phí nội địa (RMB)** | Number | - | Phí nội địa tại Trung Quốc (đơn vị: RMB) |
| 8 | [H] | **Phí kéo hàng (RMB)** | Number | - | Phí kéo hàng (đơn vị: RMB) |
| 9 | [I] | **Phí dỡ hàng (RMB)** | Number | - | Phí dỡ hàng (đơn vị: RMB) |
| 10 | [J] | **Đơn giá cước (Kg)** | Number | - | Đơn giá vận chuyển theo Kg (TQ → HN) |
| 11 | [K] | **Đơn giá cước (m³)** | Number | - | Đơn giá vận chuyển theo m³ (TQ → HN) |
| 12 | [L] | **Tổng cước TQ_HN** | Number (Auto) | - | **Tự động tính** = MAX([D]×[J], [E]×[K]). Có tooltip hiển thị công thức |
| 13 | [M] | **Ghi chú** | TextArea | - | Ghi chú thêm |

### 2.2 Tab 2: Thông tin hàng hóa (12 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 14 | [N] | **Ảnh hàng hóa** | Image Upload | - | Ảnh sản phẩm (tối đa 3 ảnh, ẩn nút upload khi đã đủ 3) |
| 16 | [P] | **Tem phụ** | Text | - | Thông tin tem phụ |
| 17 | [Q] | **Số lượng SP** | Number | - | Số lượng sản phẩm |
| 18 | [R] | **Quy cách** | Text | - | Quy cách đóng gói |
| 19 | [S] | **Mô tả SP** | TextArea | - | Mô tả chi tiết sản phẩm |
| 20 | [T] | **Nhãn hiệu** | Text | - | Thương hiệu/nhãn hiệu |
| 21 | [U] | **Nhu cầu khai báo** | Text | - | Nhu cầu khai báo hải quan |
| 22 | [V] | **Chính sách khai báo** | Text | - | Chính sách áp dụng |
| 23 | [W] | **SL khai báo (Nháp)** | Text | - | Số lượng khai báo dự kiến |
| 24 | [X] | **Giá xuất HĐ** | Number | - | Giá xuất hóa đơn (trước VAT) |
| 25 | [Y] | **TT bổ sung** | TextArea | - | Thông tin cần bổ sung |

### 2.3 Tab 3: Thông tin khai báo chính thức (18 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 26 | [Z] | **Tên khai báo** | Text | - | Tên chính thức khai báo |
| 27 | [AA] | **SL khai báo (CT)** | Number | - | Số lượng khai báo chính thức |
| 28 | [AB] | **Đơn vị tính** | Text | - | Đơn vị tính (cái, kg, m³...) |
| 29 | [AC] | **Giá khai báo** | Number | - | Giá khai báo hải quan |
| 30 | [AD] | **Trị giá** | Number (Auto) | - | **Tự động tính** = [AA] × [AC]. Có tooltip hiển thị công thức |
| 31 | [AE] | **Số kiện (CT)** | Number | - | Số kiện chính thức |
| 32 | [AF] | **Net Weight** | Number | - | Trọng lượng tịnh |
| 33 | [AG] | **Gross Weight** | Number | - | Trọng lượng gộp |
| 34 | [AH] | **CBM** | Number | - | Khối lượng (Cubic Meter) |
| 35 | [AI] | **HS Code** | Text | - | Mã HS Code hải quan |
| 36 | [AJ] | **% Thuế VAT** | Number | - | Phần trăm thuế VAT (0-100%) |
| 37 | [AK] | **Thuế VAT** | Number | - | Số tiền thuế VAT phải nộp |
| 38 | [AL] | **% Thuế NK** | Number | - | Phần trăm thuế nhập khẩu (0-100%) |
| 39 | [AM] | **Thuế NK (USD)** | Number | - | Thuế nhập khẩu (đơn vị: USD) |
| 40 | [AN] | **Thuế NK (VNĐ)** | Number | - | Thuế nhập khẩu (đơn vị: VNĐ) |
| 41 | [AO] | **Tỷ giá HQ** | Number | - | Tỷ giá hải quan |
| 42 | [AP] | **Phí KTCL** | Number | - | Phí kiểm tra chất lượng |
| 43 | [AQ] | **Xác nhận PKT** | Text | - | Xác nhận của phòng kế toán |

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Khai Báo

#### Mô tả
Hiển thị danh sách tất cả các khai báo trong hệ thống dưới dạng bảng ngang (horizontal scroll) với **43 cột** tương ứng với 43 trường dữ liệu.

#### Thông tin hiển thị trên bảng

Bảng hiển thị **TẤT CẢ 43 trường** theo thứ tự từ trái sang phải:
- **ID**: Mã khai báo (tự động tăng)
- **Ngày nhập**: Ngày nhập kho (DD/MM/YYYY)
- **Mã đơn**: Mã đơn hàng
- **1. [A] Mã KH**: Tên + Username khách hàng
- **2. [B] Tên hàng**: Tên mặt hàng
- **3. [C] → 43. [AQ]**: Tất cả các trường còn lại theo thứ tự

#### Tính năng tìm kiếm

**Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm theo **nhiều trường**:
  - ID (nếu nhập số)
  - Username khách hàng
  - Tên khách hàng
  - Số điện thoại khách hàng
  - Mã đơn hàng
  - Tên mặt hàng
  - Tên khai báo
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

#### Phân trang
- **Số bản ghi mỗi trang**: 20 (mặc định), có thể chọn 30, 40, hoặc 50
- **Hiển thị**: "1-20 / 150" (Từ bản ghi 1 đến 20, tổng 150 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

#### Định dạng hiển thị
- **Số tiền**: Định dạng theo chuẩn Đức (dấu chấm phân cách hàng nghìn)
  - Ví dụ: 1.234.567
- **Phần trăm**: Hiển thị với ký hiệu %
  - Ví dụ: 10%
- **Ảnh**: Hiển thị thumbnail nhỏ (40px), click để xem lớn
- **Tổng cước**: Hiển thị màu xanh, in đậm (highlight quan trọng)

---

### 3.2 Thêm Mới Khai Báo

#### Mô tả
Cho phép quản trị viên tạo khai báo mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"+ Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal) kích thước lớn (1200px)
3. Form được chia thành **3 tabs**:
   - Tab 1: Thông tin lô hàng
   - Tab 2: Thông tin hàng hóa
   - Tab 3: Thông tin khai báo chính thức
4. Nhập thông tin vào các trường (chỉ có 2 trường bắt buộc)
5. Click nút **"Lưu"**

#### Quy tắc nghiệp vụ

**1. Trường bắt buộc**
- **Ngày nhập kho**: Phải chọn
- **Mã khách hàng**: Phải chọn từ danh sách khách hàng có trạng thái "Active"

**2. Tính toán tự động**
- **[L] Tổng cước TQ_HN** = MAX([D] × [J], [E] × [K])
  - Tự động tính khi nhập: Trọng lượng, Khối lượng, Đơn giá cước (Kg), Đơn giá cước (m³)
  - Lấy giá trị lớn nhất giữa: (Trọng lượng × Đơn giá Kg) và (Khối lượng × Đơn giá m³)
  - **Tooltip**: Hiển thị công thức "MAX([D]×[J], [E]×[K])" khi hover chuột
  
- **[AD] Trị giá** = [AA] × [AC]
  - Tự động tính khi nhập: SL khai báo (CT) và Giá khai báo
  - **Tooltip**: Hiển thị công thức "[AA] × [AC]" khi hover chuột

**3. Upload ảnh**
- Chỉ cho phép upload **tối đa 3 ảnh**
- Định dạng: JPG, PNG
- Hiển thị preview trước khi lưu
- Khi đã upload đủ 3 ảnh → **Ẩn nút upload** (không cho phép upload thêm)
- Có thể xóa ảnh đã upload để upload ảnh khác

**4. Quyền hạn**
- **Chỉ ADMIN** mới có quyền tạo khai báo
- Sau khi tạo thành công → Danh sách khai báo tự động cập nhật

---

### 3.3 Xem Chi Tiết Khai Báo

#### Mô tả
Cho phép xem thông tin chi tiết của khai báo ở chế độ **chỉ đọc** (không thể chỉnh sửa).

#### Cách thực hiện
1. Tại dòng khai báo cần xem, click nút **"Xem"** (biểu tượng mắt)
2. Hệ thống hiển thị form với tất cả thông tin chia thành 3 tabs
3. Tất cả các trường đều ở chế độ **chỉ đọc** (disabled)
4. **Không có nút "Lưu"**, chỉ có nút "Đóng"

#### Mục đích
- Xem thông tin khai báo mà không lo chỉnh sửa nhầm
- Kiểm tra thông tin trước khi quyết định sửa hoặc xóa
- **Tất cả nhân viên** đều có quyền xem

---

### 3.4 Chỉnh Sửa Thông Tin Khai Báo

#### Mô tả
Cho phép quản trị viên cập nhật thông tin của khai báo đã có.

#### Cách thực hiện
1. Tại dòng khai báo cần sửa, click nút **"Sửa"** (biểu tượng bút chì, màu vàng)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết (có thể chuyển qua lại giữa 3 tabs)
4. Click nút **"Lưu"**

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền sửa khai báo
- Có thể thay đổi khách hàng (phải chọn khách hàng có trạng thái "Active")
- Có thể thay đổi ảnh (upload ảnh mới, xóa ảnh cũ, hoặc giữ nguyên)
- Tối đa 3 ảnh, ẩn nút upload khi đã đủ 3 ảnh
- Các công thức tính toán tự động vẫn hoạt động khi sửa (có tooltip hiển thị công thức)
- Sau khi sửa thành công → Danh sách khai báo tự động cập nhật

---

### 3.5 Xóa Khai Báo

#### Mô tả
Cho phép quản trị viên xóa khai báo khỏi hệ thống (soft delete).

#### Cách thực hiện
1. Tại dòng khai báo cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"Yes"** để xác nhận xóa, hoặc **"No"** để hủy thao tác
4. Nếu xác nhận → Khai báo bị đánh dấu xóa (soft delete)

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xóa khai báo
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Sau khi xóa thành công → Danh sách khai báo tự động cập nhật

---

### 3.6 Xuất Dữ Liệu Excel

#### Mô tả
Cho phép quản trị viên xuất **các bản ghi đã chọn** ra file Excel.

#### Cách thực hiện
1. Chọn các bản ghi cần xuất bằng cách tick vào checkbox ở đầu mỗi dòng
2. Click nút **"Export Excel"** (màu xanh lá, biểu tượng download) ở góc phải trên cùng
3. Nếu chưa chọn bản ghi nào → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
4. Nếu đã chọn → Hệ thống tự động tải file Excel về máy
5. Tên file: `Danh_Sach_Khai_Bao.xlsx`

#### Nội dung file Excel

File Excel chứa **các bản ghi đã chọn** với các cột:
- **ID**: Mã khai báo
- **Ngày nhập**: Định dạng DD/MM/YYYY
- **Mã đơn**: Mã đơn hàng
- **1. [A] → 43. [AQ]**: Tất cả 43 trường dữ liệu theo đúng thứ tự
- **Ngày tạo**: Thời gian tạo bản ghi (DD/MM/YYYY HH:mm)

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xuất Excel
- Xuất **chỉ các bản ghi đã chọn**
- **Bắt buộc** phải chọn ít nhất 1 bản ghi trước khi xuất
- Nếu chưa chọn bản ghi nào → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
- Định dạng số: Theo chuẩn Đức (dấu chấm phân cách hàng nghìn)

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────────┐
│  Khai báo          [Export Excel] [+ Thêm mới]             │  ← Chỉ ADMIN
├────────────────────────────────────────────────────────────┤
│  Bộ lọc:                                                   │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 🔍 Tìm theo Mã đơn, Tên hàng, Khách hàng...      │     │
│  └──────────────────────────────────────────────────┘     │
│                              [Tìm kiếm] [Xóa lọc]         │
├────────────────────────────────────────────────────────────┤
│  Bảng danh sách (scroll ngang):                            │
│  ┌──┬────┬────┬────┬────┬────┬─────────────┬────┬────┐   │
│  │ID│Ngày│Mã  │1.A │2.B │3.C │... 43 cột...│Thao│    │   │
│  │  │nhập│đơn │Mã  │Tên │Số  │             │tác │    │   │
│  │  │    │    │KH  │hàng│kiện│             │    │    │   │
│  ├──┼────┼────┼────┼────┼────┼─────────────┼────┼────┤   │
│  │1 │13/ │ABC │Nguyễn│Điện│ 10│...          │👁✏️🗑│    │   │
│  │  │02  │    │Văn A │tử  │   │             │    │    │   │
│  └──┴────┴────┴────┴────┴────┴─────────────┴────┴────┘   │
├────────────────────────────────────────────────────────────┤
│  1-20 / 150    [20 ▼]    [◀ 1 2 3 ▶]                     │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Cấu trúc Form (Modal)

```
┌────────────────────────────────────────────────────────────┐
│  Thêm mới Khai báo                      [Đóng] [Lưu]      │
├────────────────────────────────────────────────────────────┤
│  [Tab 1: Thông tin lô hàng] [Tab 2: Hàng hóa] [Tab 3: KB] │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┬─────────────────────┐            │
│  │ Ngày nhập kho *     │ 7. [G] Phí nội địa  │            │
│  │ [___________]       │ [___________] RMB   │            │
│  │                     │                     │            │
│  │ 1. [A] Mã KH *      │ 8. [H] Phí kéo hàng │            │
│  │ [Dropdown____]      │ [___________] RMB   │            │
│  │                     │                     │            │
│  │ 2. [B] Tên hàng     │ 10. [J] Cước (Kg)   │            │
│  │ [___________]       │ [___________]       │            │
│  │                     │                     │            │
│  │ ... (13 trường)     │ 12. [L] Tổng cước   │            │
│  │                     │ [___________] (Auto)│            │
│  └─────────────────────┴─────────────────────┘            │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn | Điều kiện hiển thị |
|------------|-----|---------|-----------|-----------|-------------------|
| 📥 | Export Excel | Xanh lá (#217346) | Xuất tất cả dữ liệu ra Excel | Chỉ ADMIN | Luôn hiển thị |
| ➕ | Thêm mới | Xanh dương | Tạo khai báo mới | Chỉ ADMIN | Luôn hiển thị |
| 👁 | Xem | Xanh dương | Xem chi tiết (chế độ chỉ đọc) | Tất cả | Luôn hiển thị |
| ✏️ | Sửa | Vàng (#faad14) | Chỉnh sửa thông tin khai báo | Chỉ ADMIN | Chỉ hiện với ADMIN |
| 🗑️ | Xóa | Đỏ (#ff4d4f) | Xóa khai báo | Chỉ ADMIN | Chỉ hiện với ADMIN |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới khai báo

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không chọn Ngày nhập kho | "Vui lòng nhập đủ thông tin" |
| Không chọn Mã khách hàng | "Vui lòng nhập đủ thông tin" |
| Khách hàng không tồn tại hoặc đã bị xóa | "Customer not found" |

### 5.2 Khi chỉnh sửa khai báo

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Khai báo không tồn tại | "Declaration not found" |
| Thay đổi khách hàng không hợp lệ | "Customer not found" |

### 5.3 Khi xóa khai báo

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Khai báo không tồn tại | "Declaration not found" |

### 5.4 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Chưa chọn bản ghi nào | "Vui lòng chọn ít nhất 1 bản ghi để xuất" |

### 5.5 Khi truy cập chức năng ADMIN

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không phải ADMIN cố tạo/sửa/xóa/xuất | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Chỉ Quản trị viên (ADMIN)** mới có quyền tạo, sửa, xóa, xuất Excel
2. ✅ **Các nhân viên khác** chỉ có quyền **xem** danh sách khai báo
3. ✅ **Trường bắt buộc**: Ngày nhập kho, Mã khách hàng
4. ✅ **Tính toán tự động**: Tổng cước TQ_HN, Trị giá
5. ✅ **Soft delete**: Xóa mềm, không xóa vĩnh viễn

### 6.2 Quy tắc mặc định

- Phân trang mặc định: **20 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)
- Upload ảnh: Tối đa **3 ảnh**, ẩn nút upload khi đã đủ 3
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Export Excel: Chỉ xuất các bản ghi đã chọn

### 6.3 Quy tắc hiển thị

- **Số tiền**: Định dạng Đức (1.234.567)
- **Phần trăm**: Hiển thị với ký hiệu % (10%)
- **Ngày nhập**: Định dạng DD/MM/YYYY
- **Ngày tạo**: Định dạng DD/MM/YYYY HH:mm
- **Tổng cước**: Màu xanh (#389e0d), in đậm
- **Ảnh**: Thumbnail 40px, click để xem lớn (tối đa 3 ảnh)
- **Trường tự động tính**: Disabled, màu nền xám, có tooltip hiển thị công thức khi hover

### 6.4 Công thức tính toán

**1. Tổng cước TQ_HN ([L])**
```
Tổng cước = MAX(
  Trọng lượng [D] × Đơn giá cước (Kg) [J],
  Khối lượng [E] × Đơn giá cước (m³) [K]
)
```

**2. Trị giá ([AD])**
```
Trị giá = SL khai báo (CT) [AA] × Giá khai báo [AC]
```

---

## 7. Lưu Ý Đặc Biệt

### 7.1 Về cấu trúc dữ liệu
- Màn Khai báo có **43 trường dữ liệu** - là màn phức tạp nhất trong hệ thống
- Dữ liệu được chia thành **3 tabs** để dễ quản lý:
  - Tab 1: Thông tin lô hàng (13 trường)
  - Tab 2: Thông tin hàng hóa (12 trường)
  - Tab 3: Thông tin khai báo chính thức (18 trường)

### 7.2 Về hiển thị
- Bảng danh sách có **scroll ngang** (horizontal scroll) do có quá nhiều cột
- Cột "Thao tác" được **fixed bên phải** để luôn hiển thị
- Cột "ID" được **fixed bên trái** để luôn hiển thị

### 7.3 Về xuất Excel
- Xuất **chỉ các bản ghi đã chọn**
- **Bắt buộc** phải chọn ít nhất 1 bản ghi trước khi xuất
- Nếu chưa chọn → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
- File Excel chứa đầy đủ 43 trường + thông tin khách hàng + ngày tạo

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của màn Khai báo (Declaration).**
