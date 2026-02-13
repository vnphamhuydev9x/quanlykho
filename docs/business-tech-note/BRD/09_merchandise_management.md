# Tài Liệu Nghiệp Vụ: Quản Lý Hàng Hóa

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Hàng hóa (Merchandise)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Hàng hóa** là một **view khác** của màn **Mã hàng** (Product Code), cho phép quản lý thông tin hàng hóa với **40 trường dữ liệu** (A-AN) thay vì 38 trường như màn Mã hàng. Màn này tập trung vào việc quản lý thông tin chi tiết hàng hóa từ góc nhìn nghiệp vụ.

### 1.2 Sự khác biệt với màn Mã hàng

| Tiêu chí | Màn Mã hàng | Màn Hàng hóa |
|----------|-------------|--------------|
| **Số trường dữ liệu** | 38 trường (A-AM) | 40 trường (A-AN) |
| **Cấu trúc form** | 3 tabs (Thông tin chung, Sản phẩm, Khai báo) | 1 form dài với tất cả trường |
| **Trường bổ sung** | - | [AM] Phí mua hàng, [AN] Xác nhận PKT |
| **Backend API** | `productCodeService` | `productCodeService` (cùng API) |
| **Phân quyền** | CUSTOMER có quyền sửa 2 trường | Không có phân quyền đặc biệt |
| **Chức năng đặc biệt** | Chọn nhiều dòng, Export selected | Export tất cả dữ liệu hiện tại |

### 1.3 Các chức năng chính
1. Xem danh sách hàng hóa (có phân trang, tìm kiếm)
2. Thêm mới hàng hóa
3. Sửa thông tin hàng hóa
4. Xóa hàng hóa (soft delete)
5. Xuất dữ liệu Excel (tất cả dữ liệu hiện tại trên trang)
6. Upload ảnh hàng hóa (tối đa 3 ảnh)

### 1.4 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền tạo, sửa, xóa, xuất Excel
- **Nhân viên (SALE, USER)**: Có toàn quyền tạo, sửa, xóa, xuất Excel
- **Khách hàng (CUSTOMER)**: Có quyền xem, sửa (không có giới hạn trường như màn Mã hàng)

---

## 2. Cấu Trúc Dữ Liệu

Mỗi hàng hóa bao gồm **40 trường dữ liệu** (A-AN):

### 2.1 Thông tin Hệ thống (3 trường)

| STT | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|------------|--------------|----------|-------|
| - | **Khách hàng** | Dropdown | ✅ | Chọn khách hàng từ danh sách |
| - | **Kho nhận** | Dropdown | - | Chọn kho VN nhận hàng |
| - | **Loại hàng** | Dropdown | - | Chọn loại hàng (Category) |

### 2.2 Thông tin Chi tiết (40 trường A-AN)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 1 | [A] | **Ngày nhập kho** | Date | ✅ | Ngày nhập hàng vào kho |
| 2 | [B] | **NVKD** | Text (Auto) | - | Nhân viên kinh doanh (tự động từ khách hàng) |
| 3 | [C] | **Mã khách hàng** | Text | - | Mã khách hàng |
| 4 | [D] | **Tên mặt hàng** | Text | - | Tên sản phẩm/hàng hóa |
| 5 | [E] | **Mã đơn hàng** | Text | - | Mã đơn hàng |
| 6 | [F] | **Số kiện** | Number | - | Số lượng kiện hàng |
| 7 | [G] | **Đóng gói** | Text | - | Đơn vị đóng gói |
| 8 | [H] | **Trọng lượng (Kg)** | Number | - | Trọng lượng hàng hóa (đơn vị: Kg) |
| 9 | [I] | **Khối lượng (m³)** | Number | - | Thể tích hàng hóa (đơn vị: m³) |
| 10 | [J] | **Nguồn tin** | Dropdown | - | Kho TQ / Kho VN / Khách hàng |
| 11 | [K] | **Phí nội địa (RMB)** | Number | - | Phí nội địa tại Trung Quốc (đơn vị: RMB) |
| 12 | [L] | **Phí kéo hàng (RMB)** | Number | - | Phí kéo hàng (đơn vị: RMB) |
| 13 | [M] | **Phí dỡ hàng (RMB)** | Number | - | Phí dỡ hàng (đơn vị: RMB) |
| 14 | [N] | **Cước TQ_HN (Kg)** | Number | - | Đơn giá vận chuyển theo Kg (VND) |
| 15 | [O] | **Cước TQ_HN (m³)** | Number | - | Đơn giá vận chuyển theo m³ (VND) |
| 16 | [P] | **Tổng cước TQ_HN** | Number (Auto) | - | **Tự động tính** = Max([H]×[N], [I]×[O]) |
| 17 | [Q] | **Ghi chú** | Text | - | Ghi chú thêm |
| 18 | [R] | **Ảnh hàng hóa** | Image Upload | - | Ảnh sản phẩm (tối đa 3 ảnh) |
| 19 | [S] | *(Không sử dụng)* | - | - | - |
| 20 | [T] | **Tem chính** | Text | - | Thông tin tem chính |
| 21 | [U] | **Tem phụ** | Text | - | Thông tin tem phụ |
| 22 | [V] | **Xác nhận PCT** | Text | - | Xác nhận phòng chuyên trách |
| 23 | [W] | **SL Sản phẩm** | Number | - | Số lượng sản phẩm |
| 24 | [X] | **Quy cách** | Text | - | Quy cách đóng gói |
| 25 | [Y] | **Mô tả** | Text | - | Mô tả chi tiết sản phẩm |
| 26 | [Z] | **Nhãn hiệu** | Text | - | Thương hiệu/nhãn hiệu |
| 27 | [AA] | **MST Người bán** | Text | - | Mã số thuế đơn vị bán hàng |
| 28 | [AB] | **Tên Cty Bán** | Text | - | Tên công ty cung cấp |
| 29 | [AC] | **Nhu cầu KB** | Text | - | Nhu cầu khai báo hải quan |
| 30 | [AD] | **Chính sách KB** | Text | - | Chính sách khai báo |
| 31 | [AE] | **SL Khai báo** | Number | - | Số lượng khai báo |
| 32 | [AF] | **Giá xuất HĐ** | Number | - | Giá xuất hóa đơn (VND) |
| 33 | [AG] | **Giá khai báo** | Number | - | Giá khai báo (VND) |
| 34 | [AH] | **Phí ủy thác** | Number | - | Phí ủy thác (VND) |
| 35 | [AI] | **Tên khai báo** | Text | - | Tên khai báo |
| 36 | [AJ] | **Phí phải nộp** | Number | - | Phí phải nộp (VND) |
| 37 | [AK] | **Thuế NK** | Number | - | Thuế nhập khẩu phải nộp (VND) |
| 38 | [AL] | **Thuế VAT NK** | Number | - | Thuế VAT nhập khẩu (VND) |
| 39 | [AM] | **Phí mua hàng** | Number | - | Phí mua hàng (VND) |
| 40 | [AN] | **Xác nhận PKT** | Text | - | Xác nhận phòng kế toán |

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Hàng Hóa

#### Mô tả
Hiển thị danh sách tất cả hàng hóa trong hệ thống dưới dạng bảng ngang (horizontal scroll).

#### Thông tin hiển thị trên bảng

Bảng hiển thị **một số cột chính** (không phải tất cả 40 trường):
- **ID**: Mã tự động tăng (fixed left)
- **1. [A] Ngày nhập**: Ngày nhập kho (DD/MM/YYYY)
- **3. [C] Mã KH**: Mã khách hàng
- **4. [D] Tên hàng**: Tên sản phẩm
- **5. [E] Mã đơn**: Mã đơn hàng
- **6. [F] Số kiện**: Số lượng kiện
- **8. [H] TL (Kg)**: Trọng lượng
- **9. [I] KL (m³)**: Khối lượng
- **16. [P] Tổng cước**: Tổng cước vận chuyển (định dạng VND)
- **11. [K] Phí NĐ RMB**: Phí nội địa (định dạng RMB)
- **12. [L] Phí kéo RMB**: Phí kéo hàng (định dạng RMB)
- **Action**: Nút Sửa, Xóa (fixed right)

#### Tính năng tìm kiếm

**Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, bên phải
- **Chức năng**: Tìm kiếm theo **nhiều trường** (tương tự màn Mã hàng)
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

#### Phân trang
- **Số bản ghi mỗi trang**: 20 (mặc định)
- **Sắp xếp**: Mới nhất trước (theo ngày tạo giảm dần)

#### Định dạng hiển thị
- **Số tiền (VND)**: Định dạng theo chuẩn Việt Nam với ký hiệu ₫
  - Ví dụ: 1.234.567 ₫
- **Số tiền (RMB)**: Định dạng theo chuẩn Trung Quốc với ký hiệu ¥
  - Ví dụ: ¥1,234.56
- **Ngày nhập**: Định dạng DD/MM/YYYY
- **Tổng cước**: Hiển thị định dạng VND

---

### 3.2 Thêm Mới Hàng Hóa

#### Mô tả
Cho phép người dùng (ADMIN, SALE, USER, CUSTOMER) tạo hàng hóa mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal) kích thước lớn (1200px)
3. Form được chia thành **2 phần**:
   - **Thông tin Hệ thống**: Khách hàng, Kho nhận, Loại hàng
   - **Thông tin Chi tiết (A-AN)**: 40 trường dữ liệu
4. Nhập thông tin vào các trường
5. Click nút **"OK"** để lưu

#### Quy tắc nghiệp vụ

**1. Trường bắt buộc**
- **Khách hàng**: Phải chọn từ danh sách
- **Ngày nhập kho** [A]: Phải chọn

**2. Tính toán tự động**

Hệ thống tự động tính **1 công thức** khi nhập dữ liệu:

- **[P] Tổng cước TQ_HN** = Max([H] × [N], [I] × [O])
  - Tự động tính khi nhập: Trọng lượng [H], Khối lượng [I], Cước Kg [N], Cước m³ [O]
  - Công thức: Lấy giá trị **lớn nhất** giữa:
    - Trọng lượng × Cước Kg
    - Khối lượng × Cước m³

**3. Upload ảnh**

Hệ thống hỗ trợ upload **ảnh hàng hóa**:
- **[R] Ảnh hàng hóa**: Tối đa **3 ảnh**
  - Định dạng: JPG, PNG
  - Hiển thị preview trước khi lưu
  - Khi đã upload đủ 3 ảnh → **Ẩn nút upload** (không cho phép upload thêm)
  - Có thể xóa ảnh đã upload để upload ảnh khác

**4. Quyền hạn**
- **ADMIN, SALE, USER, CUSTOMER** có quyền tạo hàng hóa
- Sau khi tạo thành công → Danh sách hàng hóa tự động cập nhật

---

### 3.3 Sửa Thông Tin Hàng Hóa

#### Mô tả
Cho phép người dùng cập nhật thông tin của hàng hóa đã có.

#### Cách thực hiện
1. Tại dòng hàng hóa cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết
4. Click nút **"OK"** để lưu

#### Quy tắc nghiệp vụ

**1. Quyền hạn**
- **ADMIN, SALE, USER, CUSTOMER** có quyền sửa **TẤT CẢ** các trường
- **Không có giới hạn trường** như màn Mã hàng

**2. Thay đổi ảnh**
- Có thể thay đổi ảnh (upload ảnh mới, xóa ảnh cũ, hoặc giữ nguyên)
- Tối đa 3 ảnh, ẩn nút upload khi đã đủ 3 ảnh

**3. Công thức tính toán**
- Công thức tính toán tự động vẫn hoạt động khi sửa

**4. Sau khi sửa thành công**
- Danh sách hàng hóa tự động cập nhật
- Cache bị xóa để đảm bảo dữ liệu mới nhất

---

### 3.4 Xóa Hàng Hóa

#### Mô tả
Cho phép người dùng xóa hàng hóa khỏi hệ thống (soft delete).

#### Cách thực hiện
1. Tại dòng hàng hóa cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"OK"** để xác nhận xóa, hoặc **"Cancel"** để hủy thao tác
4. Nếu xác nhận → Hàng hóa bị đánh dấu xóa (soft delete)

#### Quy tắc nghiệp vụ
- **ADMIN, SALE, USER, CUSTOMER** có quyền xóa hàng hóa
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Sau khi xóa thành công → Danh sách hàng hóa tự động cập nhật

---

### 3.5 Xuất Dữ Liệu Excel

#### Mô tả
Cho phép người dùng xuất **TẤT CẢ** dữ liệu hàng hóa **hiện tại trên trang** ra file Excel.

#### Cách thực hiện
1. Click nút **"Excel"** (biểu tượng export) ở góc phải trên cùng
2. Nếu không có dữ liệu → Hiển thị cảnh báo: "Không có dữ liệu để xuất"
3. Nếu có dữ liệu → Hệ thống tự động tải file Excel về máy
4. Tên file: `HangHoa_Export.xlsx`

#### Nội dung file Excel

File Excel chứa **TẤT CẢ** dữ liệu **hiện tại trên trang** với **40 cột**:

| Cột | Nội dung |
|-----|----------|
| **STT** | Số thứ tự (1, 2, 3, ...) |
| **1. [A] Ngày nhập** | Ngày nhập kho (DD/MM/YYYY) |
| **2. [B] NVKD** | Nhân viên kinh doanh |
| **3. [C] Mã KH** | Mã khách hàng |
| **4. [D] Tên hàng** | Tên sản phẩm |
| **5. [E] Mã đơn** | Mã đơn hàng |
| **6. [F] Số kiện** | Số lượng kiện |
| **7. [G] Đóng gói** | Đơn vị đóng gói |
| **8. [H] Trọng lượng** | Trọng lượng (Kg) |
| **9. [I] Khối lượng** | Khối lượng (m³) |
| **10. [J] Nguồn tin** | Nguồn cung cấp thông tin |
| **11. [K] Phí nội địa RMB** | Phí nội địa (RMB) |
| **12. [L] Phí kéo RMB** | Phí kéo hàng (RMB) |
| **13. [M] Phí dỡ RMB** | Phí dỡ hàng (RMB) |
| **14. [N] Cước Kg** | Đơn giá cước theo Kg |
| **15. [O] Cước m³** | Đơn giá cước theo m³ |
| **16. [P] Tổng cước** | Tổng cước vận chuyển |
| **17. [Q] Ghi chú** | Ghi chú |
| **20. [T] Tem chính** | Tem chính |
| **21. [U] Tem phụ** | Tem phụ |
| **22. [V] Xác nhận PCT** | Xác nhận phòng chuyên trách |
| **23. [W] SL SP** | Số lượng sản phẩm |
| **24. [X] Quy cách** | Quy cách |
| **25. [Y] Mô tả** | Mô tả sản phẩm |
| **26. [Z] Nhãn hiệu** | Nhãn hiệu |
| **27. [AA] MST** | Mã số thuế |
| **28. [AB] Tên Cty** | Tên công ty bán hàng |
| **29. [AC] Nhu cầu KB** | Nhu cầu khai báo |
| **30. [AD] Chính sách KB** | Chính sách khai báo |
| **31. [AE] SL KB** | Số lượng khai báo |
| **32. [AF] Giá HĐ** | Giá xuất hóa đơn |
| **33. [AG] Giá KB** | Giá khai báo |
| **34. [AH] Phí ủy thác** | Phí ủy thác |
| **35. [AI] Tên KB** | Tên khai báo |
| **36. [AJ] Phí phải nộp** | Phí phải nộp |
| **37. [AK] Thuế NK** | Thuế nhập khẩu |
| **38. [AL] Thuế VAT** | Thuế VAT nhập khẩu |
| **39. [AM] Phí mua** | Phí mua hàng |
| **40. [AN] Xác nhận PKT** | Xác nhận phòng kế toán |

#### Quy tắc nghiệp vụ
- **ADMIN, SALE, USER, CUSTOMER** có quyền xuất Excel
- Xuất **TẤT CẢ** dữ liệu **hiện tại trên trang** (theo phân trang hiện tại)
- Định dạng số: Theo chuẩn địa phương

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────────┐
│  Quản lý Hàng hóa                                          │
│              [Tìm kiếm...] [Thêm mới] [🔄] [Excel]        │
├────────────────────────────────────────────────────────────┤
│  Bảng danh sách (scroll ngang):                            │
│  ┌──┬────┬────┬────┬────┬────┬─────────────┬────┬────┐   │
│  │ID│Ngày│Mã  │Tên │Mã  │Số  │... cột ...  │Sửa │Xóa │   │
│  │  │nhập│KH  │hàng│đơn │kiện│             │    │    │   │
│  ├──┼────┼────┼────┼────┼────┼─────────────┼────┼────┤   │
│  │1 │13/ │A001│Điện│ABC │10  │...          │✏️  │🗑️  │   │
│  │  │02  │    │tử  │    │    │             │    │    │   │
│  └──┴────┴────┴────┴────┴────┴─────────────┴────┴────┘   │
├────────────────────────────────────────────────────────────┤
│  1-20 / 150    [20 ▼]    [◀ 1 2 3 ▶]                     │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Cấu trúc Form (Modal)

```
┌────────────────────────────────────────────────────────────┐
│  Thêm Hàng hóa                              [Cancel] [OK]  │
├────────────────────────────────────────────────────────────┤
│  ━━━━━━━━━━━━━━━━ Thông tin Hệ thống ━━━━━━━━━━━━━━━━━━  │
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │ Khách hàng  │ Kho nhận    │ Loại hàng   │              │
│  │ [Dropdown_] │ [Dropdown_] │ [Dropdown_] │              │
│  └─────────────┴─────────────┴─────────────┘              │
│                                                            │
│  ━━━━━━━━━━━━━━ Thông tin Chi tiết (A-AN) ━━━━━━━━━━━━━  │
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │ 1. [A] Ngày │ 3. [C] Mã KH│ 4. [D] Tên  │              │
│  │ nhập kho    │ [_________] │ hàng        │              │
│  │ [___/___]   │             │ [_________] │              │
│  │             │             │             │              │
│  │ 14. [N]     │ 15. [O]     │ 16. [P]     │              │
│  │ Cước Kg     │ Cước m³     │ Tổng cước   │              │
│  │ [_________] │ [_________] │ (Auto)      │              │
│  │             │             │ [_________] │              │
│  │             │             │             │              │
│  │ 18. [R] Ảnh hàng hóa (Upload, tối đa 3)│              │
│  │ [+] [+] [+]                             │              │
│  │                                         │              │
│  │ ... (tất cả 40 trường) ...              │              │
│  └─────────────┴─────────────┴─────────────┘              │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn |
|------------|-----|---------|-----------|-----------|
| ➕ | Thêm mới | Xanh dương | Tạo hàng hóa mới | Tất cả |
| ✏️ | Sửa | Vàng | Sửa thông tin hàng hóa | Tất cả |
| 🗑️ | Xóa | Đỏ (#ff4d4f) | Xóa hàng hóa | Tất cả |
| 📥 | Excel | Xanh dương | Xuất dữ liệu ra Excel | Tất cả |
| 🔄 | Reload | Xám | Tải lại dữ liệu | Tất cả |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới hàng hóa

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không chọn khách hàng | "Vui lòng chọn khách hàng" |
| Không chọn ngày nhập kho | "Vui lòng chọn ngày nhập kho" |

### 5.2 Khi sửa hàng hóa

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Hàng hóa không tồn tại | "Lỗi khi tải dữ liệu" |

### 5.3 Khi xóa hàng hóa

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Hàng hóa không tồn tại | "Lỗi khi xóa" |

### 5.4 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không có dữ liệu | "Không có dữ liệu để xuất" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Phân quyền**:
   - ADMIN, SALE, USER, CUSTOMER: Toàn quyền (CRUD + Export)
   - **Không có giới hạn trường** như màn Mã hàng

2. ✅ **Trường bắt buộc**: Khách hàng, Ngày nhập kho

3. ✅ **Tính toán tự động**: 1 công thức (Tổng cước = Max(TL×Cước_Kg, KL×Cước_m³))

4. ✅ **Upload ảnh**: Tối đa 3 ảnh, ẩn nút upload khi đã đủ 3

5. ✅ **Soft delete**: Xóa mềm, không xóa vĩnh viễn

### 6.2 Quy tắc mặc định

- Phân trang mặc định: **20 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)
- Upload ảnh: Tối đa **3 ảnh**
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Export Excel: Xuất tất cả dữ liệu hiện tại trên trang

### 6.3 Quy tắc hiển thị

- **Số tiền (VND)**: Định dạng Việt Nam (1.234.567 ₫)
- **Số tiền (RMB)**: Định dạng Trung Quốc (¥1,234.56)
- **Ngày nhập**: Định dạng DD/MM/YYYY
- **Tổng cước**: Định dạng VND
- **Ảnh**: Thumbnail 80px, hiển thị tối đa 3 ảnh
- **Trường tự động tính**: Disabled, màu nền xám

### 6.4 Công thức tính toán

**Tổng cước TQ_HN ([P])**
```
Tổng cước = Max(Trọng lượng [H] × Cước Kg [N], Khối lượng [I] × Cước m³ [O])
```

Giải thích:
- Tính 2 giá trị:
  - Giá theo trọng lượng = [H] × [N]
  - Giá theo khối lượng = [I] × [O]
- Lấy giá trị **lớn nhất** trong 2 giá trị trên

---

## 7. Lưu Ý Đặc Biệt

### 7.1 Về cấu trúc dữ liệu
- Màn Hàng hóa có **40 trường dữ liệu** (A-AN) - nhiều hơn màn Mã hàng (38 trường)
- **2 trường bổ sung**:
  - [AM] Phí mua hàng
  - [AN] Xác nhận PKT
- Dữ liệu được hiển thị trong **1 form dài** thay vì chia 3 tabs như màn Mã hàng

### 7.2 Về Backend API
- Màn Hàng hóa sử dụng **cùng backend API** với màn Mã hàng (`productCodeService`)
- Không có route riêng cho Merchandise
- Tất cả CRUD operations đều gọi đến ProductCode API

### 7.3 Về phân quyền
- **Không có phân quyền đặc biệt** như màn Mã hàng
- **CUSTOMER** có quyền sửa **TẤT CẢ** các trường (khác với màn Mã hàng chỉ cho sửa 2 trường)

### 7.4 Về upload ảnh
- Hỗ trợ upload **ảnh hàng hóa**: Tối đa 3 ảnh
- Khi đã upload đủ 3 ảnh → **Ẩn nút upload**
- Có thể xóa ảnh đã upload để upload ảnh khác

### 7.5 Về xuất Excel
- Xuất **TẤT CẢ** dữ liệu **hiện tại trên trang** (theo phân trang)
- File Excel chứa **40 cột** (tất cả trường A-AN)
- Tên file: `HangHoa_Export.xlsx`

### 7.6 Về công thức tính toán
- Chỉ có **1 công thức** tự động tính: Tổng cước
- Công thức: **Max** (không phải tổng) của 2 giá trị:
  - Trọng lượng × Cước Kg
  - Khối lượng × Cước m³

### 7.7 So sánh với màn Mã hàng

| Tiêu chí | Màn Mã hàng | Màn Hàng hóa |
|----------|-------------|--------------|
| **Số trường** | 38 (A-AM) | 40 (A-AN) |
| **Cấu trúc form** | 3 tabs | 1 form dài |
| **Công thức tính** | 4 công thức | 1 công thức |
| **Phân quyền CUSTOMER** | Chỉ sửa 2 trường | Sửa tất cả trường |
| **Export** | Chỉ bản ghi đã chọn | Tất cả dữ liệu hiện tại |
| **Chọn nhiều dòng** | Có | Không |
| **Backend API** | productCodeService | productCodeService |

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của màn Hàng hóa (Merchandise).**
