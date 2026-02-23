# Tài Liệu Nghiệp Vụ: Quản Lý Mã Hàng

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Mã hàng (Product Code)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Mã hàng** cho phép quản lý thông tin chi tiết về các lô hàng nhập khẩu từ Trung Quốc về Việt Nam, bao gồm thông tin chung, thông tin sản phẩm, và thông tin khai báo hải quan.

### 1.2 Các chức năng chính
1. Xem danh sách mã hàng (có phân trang, tìm kiếm, lọc theo trạng thái)
2. Thêm mới mã hàng
3. Xem chi tiết mã hàng (chế độ chỉ đọc)
4. Chỉnh sửa thông tin mã hàng
5. Xóa mã hàng (soft delete)
6. Xuất dữ liệu Excel (tất cả bản ghi)
7. Upload ảnh hàng hóa và ảnh hàng dán tem

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền tạo, sửa, xóa, xuất Excel
- **Nhân viên (SALE, USER)**: Có quyền xem, sửa (toàn bộ trường), xuất Excel
- **Khách hàng (CUSTOMER)**: Chỉ có quyền xem và **sửa 2 trường**: `Nhu cầu khai báo` và `Ghi chú`

---

## 2. Cấu Trúc Dữ Liệu

Mỗi mã hàng bao gồm **39 trường dữ liệu** được chia thành **3 nhóm chính**:

### 2.1 Tab 1: Thông tin chung (16 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 1 | [A] | **Ngày nhập kho** | Date | ✅ | Ngày nhập hàng vào kho |
| 2 | [B] | **Mã khách hàng** | Dropdown | ✅ | Chọn khách hàng từ danh sách |
| 3 | [C] | **Mã đơn hàng** | Text | ✅ | Mã đơn hàng (Order Code) |
| 4 | [D] | **Tên mặt hàng** | Text | ✅ | Tên sản phẩm/hàng hóa |
| 5 | [E] | **Số kiện** | Number | ✅ | Số lượng kiện hàng |
| 6 | [F] | **Đơn vị kiện** | Dropdown | ✅ | Thùng carton / Pallet |
| 7 | [G] | **Trọng lượng (Kg)** | Number | ✅ | Trọng lượng hàng hóa (đơn vị: Kg) |
| 8 | [H] | **Khối lượng (m³)** | Number | ✅ | Thể tích hàng hóa (đơn vị: m³) |
| 9 | [I] | **Phí nội địa TQ (RMB)** | Number | - | Phí nội địa tại Trung Quốc (đơn vị: RMB) |
| 10 | [J] | **Phí kéo hàng TQ (RMB)** | Number | - | Phí kéo hàng (đơn vị: RMB) |
| 11 | [K] | **Tỷ giá** | Number | - | Tỷ giá RMB/VND |
| 12 | [L1] | **Đơn giá cước TQ_HN (khối)** | Number | ✅ | Đơn giá vận chuyển TQ → HN theo m³ (VND) |
| 13 | [L2] | **Đơn giá cước TQ_HN (cân)** | Number | ✅ | Đơn giá vận chuyển TQ → HN theo kg (VND) |
| 14 | [M] | **Tổng cước TQ_HN** | Number (Auto) | - | **Tự động tính** = Max([L1] × [H], [L2] × [G]). Có tooltip hiển thị công thức |
| 15 | [N] | **Phí nội địa VN** | Number | - | Phí nội địa tại Việt Nam (VND) |
| 16 | [O] | **Ghi chú** | Text | - | Ghi chú thêm |

### 2.2 Tab 2: Thông tin sản phẩm (12 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 17 | [P] | **Tình trạng hàng hóa** | Dropdown | - | Kho TQ / Đã xếp xe / Kho VN / Kiểm hoá / Đã giao chưa TT / Đã giao đã TT |
| 18 | [Q] | **Ảnh hàng hóa** | Image Upload | - | Ảnh sản phẩm (tối đa 3 ảnh, ẩn nút upload khi đã đủ 3) |
| 19 | [S] | **Tem chính** | Text | - | Thông tin tem chính |
| 20 | [T] | **Tem phụ** | Text | - | Thông tin tem phụ |
| 21 | [U] | **Ảnh hàng dán tem** | Image Upload | - | Ảnh hàng đã dán tem (tối đa 3 ảnh, ẩn nút upload khi đã đủ 3) |
| 22 | [V] | **Số lượng SP** | Number | - | Số lượng sản phẩm |
| 22.1 | [V2] | **Đơn vị** | Text | - | Đơn vị tính của sản phẩm (bộ, chiếc...) |
| 23 | [W] | **Quy cách** | Text | - | Quy cách đóng gói |
| 24 | [X] | **Mô tả SP** | TextArea | - | Mô tả chi tiết sản phẩm |
| 25 | [Y] | **Nhãn hiệu** | Text | - | Thương hiệu/nhãn hiệu |
| 26 | [Z] | **Mã số thuế** | Text | - | Mã số thuế đơn vị bán hàng |
| 27 | [AA] | **Tên công ty bán hàng** | Text | - | Tên công ty cung cấp |

### 2.3 Tab 3: Thông tin khai báo (11 trường)

| STT | Mã Excel | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|----------|------------|--------------|----------|-------|
| 28 | [AB] | **Nhu cầu khai báo** | TextArea | - | Nhu cầu khai báo hải quan (CUSTOMER được sửa) |
| 29 | [AC] | **Số lượng khai báo** | Number | - | Số lượng khai báo |
| 30 | [AD] | **Giá xuất HĐ** | Number | - | Giá xuất hóa đơn (VND) |
| 31 | [AE] | **Tổng giá trị lô hàng** | Number (Auto) | - | **Tự động tính** = [AD] × [AC]. Có tooltip hiển thị công thức |
| 32 | [AF] | **Chính sách NK** | Text | - | Chính sách nhập khẩu |
| 33 | [AG] | **Phí phải nộp** | Number | - | Phí phải nộp (VND) |
| 34 | [AH] | **Ghi chú** | Text | - | Ghi chú thêm (CUSTOMER được sửa) |
| 35 | [AI] | **Thuế VAT NK** | Number (Auto) | - | **Tự động tính** = [AE] × 8%. Có tooltip hiển thị công thức |
| 36 | [AJ] | **Thuế NK phải nộp** | Number | - | Thuế nhập khẩu phải nộp (VND) |
| 37 | [AK] | **Phí uỷ thác** | Number (Auto) | - | **Tự động tính** = [AE] × 1%. Có tooltip hiển thị công thức |
| 38 | [AL] | **Tổng chi phí NK** | Number (Auto) | - | **Tự động tính** = [AJ] + [AI] + [AG] + [N] + [M] + [AK] + (([I] + [J]) × [K]). Có tooltip hiển thị công thức |
| 39 | [AM] | **Tình trạng xuất VAT** | Text | - | Tình trạng xuất VAT |

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Mã Hàng

#### Mô tả
Hiển thị danh sách tất cả các mã hàng trong hệ thống dưới dạng bảng ngang (horizontal scroll) với **39 cột** tương ứng với 39 trường dữ liệu.

#### Thông tin hiển thị trên bảng

Bảng hiển thị **TẤT CẢ 39 trường** theo thứ tự từ trái sang phải:
- **ID**: Mã tự động tăng
- **1. [A] → 39. [AM]**: Tất cả các trường dữ liệu theo đúng thứ tự
- **Ngày tạo**: Thời gian tạo bản ghi (DD/MM/YYYY)
- **Thao tác**: Nút Xem, Sửa, Xóa

#### Tính năng tìm kiếm

**Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm theo **nhiều trường**:
  - ID (nếu nhập số)
  - Username khách hàng
  - Tên khách hàng
  - Số điện thoại khách hàng
  - Tên đối tác
  - Tên mặt hàng
  - Tên kho VN
  - Tên loại hàng
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

#### Lọc theo trạng thái

Hệ thống hỗ trợ lọc theo **Tình trạng hàng hóa** [P]:
- **Kho TQ** (Nhập kho TQ)
- **Đã xếp xe**
- **Kho VN** (Nhập kho VN)
- **Kiểm hoá**
- **Đã giao, chưa thanh toán**
- **Đã giao, đã thanh toán**

Ngoài ra còn hỗ trợ lọc đặc biệt:
- **Tồn kho TQ**: Tất cả trạng thái NGOẠI TRỪ "Đã giao, đã thanh toán"
- **Tồn kho VN**: Chỉ hiển thị "Kho VN" và "Đã giao, chưa thanh toán"

#### Chọn nhiều dòng

Hệ thống cho phép **chọn nhiều dòng** (checkbox) để xem tổng hợp:
- **Tổng số kiện**: Tổng số kiện của các dòng đã chọn (được đếm và phân loại chi tiết theo đơn vị đóng gói, ví dụ: 9 thùng carton và 17 pallet)
- **Tổng trọng lượng**: Tổng trọng lượng (Kg)
- **Tổng khối lượng**: Tổng khối lượng (m³)

Hiển thị dưới dạng thanh thông tin màu xanh phía trên bảng:
```
Đã chọn 5 dòng | Tổng kiện: 9 thùng carton và 17 pallet | Tổng trọng lượng: 1.234,56 kg | Tổng khối lượng: 45,67 m³
```

#### Phân trang
- **Số bản ghi mỗi trang**: 20 (mặc định), có thể chọn 30, 40, hoặc 50
- **Hiển thị**: "1-20 / 150" (Từ bản ghi 1 đến 20, tổng 150 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

#### Định dạng hiển thị
- **Số tiền (VND)**: Định dạng theo chuẩn Việt Nam với ký hiệu ₫
  - Ví dụ: 1.234.567 ₫
- **Số tiền (RMB)**: Định dạng theo chuẩn Trung Quốc với ký hiệu ¥
  - Ví dụ: ¥1,234.56
- **Số thập phân**: Định dạng theo chuẩn Đức (dấu chấm phân cách hàng nghìn)
  - Ví dụ: 1.234,56
- **Ảnh**: Hiển thị thumbnail 50px, click để xem lớn (có thể xem tất cả ảnh trong group)
- **Tổng cước, Tổng chi phí NK**: Hiển thị màu xanh (#389e0d), in đậm (highlight quan trọng)
- **Trạng thái**: Hiển thị dưới dạng Tag màu sắc

---

### 3.2 Thêm Mới Mã Hàng

#### Mô tả
Cho phép người dùng (ADMIN, SALE, USER) tạo mã hàng mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"+ Thêm Mã hàng"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal) kích thước lớn (1200px)
3. Form được chia thành **3 tabs**:
   - Tab 1: Thông tin chung
   - Tab 2: Thông tin sản phẩm
   - Tab 3: Thông tin khai báo
4. Nhập thông tin vào các trường
5. Click nút **"Lưu"** (hoặc nút "Tiếp" để chuyển tab)

#### Quy tắc nghiệp vụ

**1. Trường bắt buộc**
- **Ngày nhập kho** [A]: Phải chọn
- **Mã khách hàng** [B]: Phải chọn từ danh sách khách hàng
- **Mã đơn hàng** [C]: Phải nhập
- **Tên mặt hàng** [D]: Phải nhập
- **Số kiện** [E]: Phải nhập
- **Đơn vị kiện** [F]: Phải chọn (Thùng carton / Pallet)
- **Trọng lượng** [G]: Phải nhập
- **Khối lượng** [H]: Phải nhập
- **Đơn giá cước TQ_HN (khối)** [L1]: Phải nhập
- **Đơn giá cước TQ_HN (cân)** [L2]: Phải nhập

**2. Tính toán tự động**

Hệ thống tự động tính **4 công thức** khi nhập dữ liệu:

- **[M] Tổng cước TQ_HN** = Max([L1] × [H], [L2] × [G])
  - Tự động tính khi nhập: Đơn giá cước khối, Đơn giá cước cân, Khối lượng, Trọng lượng
  - **Tooltip**: Hiển thị công thức "Tổng cước TQ_HN = Max(Đơn giá cước khối [L1] * Khối lượng [H], Đơn giá cước cân [L2] * Trọng lượng [G])" khi hover chuột
  
- **[AE] Tổng giá trị lô hàng** = [AD] × [AC]
  - Tự động tính khi nhập: Giá xuất HĐ, Số lượng khai báo
  - **Tooltip**: Hiển thị công thức "Tổng giá trị = Giá xuất hoá đơn [AD] * Số lượng khai báo [AC]" khi hover chuột

- **[AI] Thuế VAT NK** = [AE] × 8%
  - Tự động tính khi [AE] thay đổi
  - **Tooltip**: Hiển thị công thức "Thuế VAT NK = Tổng giá trị [AE] * 8%" khi hover chuột

- **[AK] Phí uỷ thác** = [AE] × 1%
  - Tự động tính khi [AE] thay đổi
  - **Tooltip**: Hiển thị công thức "Phí uỷ thác = Tổng giá trị [AE] * 1%" khi hover chuột

- **[AL] Tổng chi phí NK** = [AJ] + [AI] + [AG] + [N] + [M] + [AK] + (([I] + [J]) × [K])
  - Tự động tính khi bất kỳ trường nào trong công thức thay đổi
  - **Tooltip**: Hiển thị công thức đầy đủ khi hover chuột

**3. Upload ảnh**

Hệ thống hỗ trợ upload **2 loại ảnh**:

- **[Q] Ảnh hàng hóa**: Tối đa **3 ảnh**
  - Định dạng: JPG, PNG
  - Hiển thị preview trước khi lưu
  - Khi đã upload đủ 3 ảnh → **Ẩn nút upload** (không cho phép upload thêm)
  - Có thể xóa ảnh đã upload để upload ảnh khác

- **[U] Ảnh hàng dán tem**: Tối đa **3 ảnh**
  - Định dạng: JPG, PNG
  - Hiển thị preview trước khi lưu
  - Khi đã upload đủ 3 ảnh → **Ẩn nút upload** (không cho phép upload thêm)
  - Có thể xóa ảnh đã upload để upload ảnh khác

**4. Quyền hạn**
- **ADMIN, SALE, USER** có quyền tạo mã hàng
- **CUSTOMER** KHÔNG có quyền tạo mã hàng (nút "Thêm" bị ẩn)
- Sau khi tạo thành công → Danh sách mã hàng tự động cập nhật

**5. Thêm khách hàng mới**
- Trong dropdown "Mã khách hàng", có tùy chọn **"+ Thêm khách hàng mới"**
- Click vào sẽ mở trang Quản lý khách hàng trong tab mới
- Sau khi thêm khách hàng mới, quay lại và click nút "Reload" để cập nhật danh sách

---

### 3.3 Xem Chi Tiết Mã Hàng

#### Mô tả
Cho phép xem thông tin chi tiết của mã hàng ở chế độ **chỉ đọc** (không thể chỉnh sửa).

#### Cách thực hiện
1. Tại dòng mã hàng cần xem, click nút **"Xem"** (biểu tượng mắt)
2. Hệ thống hiển thị form với tất cả thông tin chia thành 3 tabs
3. Tất cả các trường đều ở chế độ **chỉ đọc** (disabled)
4. **Không có nút "Lưu"**, chỉ có nút "Đóng"

#### Mục đích
- Xem thông tin mã hàng mà không lo chỉnh sửa nhầm
- Kiểm tra thông tin trước khi quyết định sửa hoặc xóa
- **Tất cả người dùng** đều có quyền xem

---

### 3.4 Chỉnh Sửa Thông Tin Mã Hàng

#### Mô tả
Cho phép người dùng cập nhật thông tin của mã hàng đã có.

#### Cách thực hiện
1. Tại dòng mã hàng cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết (có thể chuyển qua lại giữa 3 tabs)
4. Click nút **"Lưu"**

#### Quy tắc nghiệp vụ

**1. Quyền hạn theo vai trò**

- **ADMIN, SALE, USER**: Có quyền sửa **TẤT CẢ** các trường
  - Có thể thay đổi khách hàng
  - Có thể thay đổi ảnh (upload ảnh mới, xóa ảnh cũ, hoặc giữ nguyên)
  - Tối đa 3 ảnh cho mỗi loại, ẩn nút upload khi đã đủ 3 ảnh
  - Các công thức tính toán tự động vẫn hoạt động khi sửa (có tooltip hiển thị công thức)

- **CUSTOMER**: Chỉ có quyền sửa **2 trường**:
  - **[AB] Nhu cầu khai báo**: Có thể sửa
  - **[AH] Ghi chú**: Có thể sửa
  - **Tất cả các trường khác**: Bị khóa (disabled)
  - **Chỉ được sửa mã hàng của chính mình** (kiểm tra `customerId`)

**2. Thông báo thay đổi trạng thái**
- Khi ADMIN/SALE/USER thay đổi trường **[P] Tình trạng hàng hóa**
- Hệ thống tự động gửi **thông báo** cho khách hàng
- Khách hàng sẽ nhận được thông báo về sự thay đổi trạng thái hàng hóa

**3. Sau khi sửa thành công**
- Danh sách mã hàng tự động cập nhật
- Cache bị xóa để đảm bảo dữ liệu mới nhất

---

### 3.5 Xóa Mã Hàng

#### Mô tả
Cho phép quản trị viên xóa mã hàng khỏi hệ thống (soft delete).

#### Cách thực hiện
1. Tại dòng mã hàng cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"Yes"** để xác nhận xóa, hoặc **"No"** để hủy thao tác
4. Nếu xác nhận → Mã hàng bị đánh dấu xóa (soft delete)

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xóa mã hàng
- **SALE, USER, CUSTOMER** KHÔNG có quyền xóa (nút "Xóa" bị ẩn)
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Sau khi xóa thành công → Danh sách mã hàng tự động cập nhật

---

### 3.6 Xuất Dữ Liệu Excel

#### Mô tả
Cho phép người dùng (ADMIN, SALE, USER) xuất **các bản ghi đã chọn** ra file Excel.

#### Cách thực hiện
1. Chọn các bản ghi cần xuất bằng cách tick vào checkbox ở đầu mỗi dòng
2. Click nút **"Xuất Excel"** (biểu tượng download) ở góc phải trên cùng
3. Nếu chưa chọn bản ghi nào → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
4. Nếu đã chọn → Hệ thống tự động tải file Excel về máy
5. Tên file: `product_codes_[timestamp].xlsx`

#### Nội dung file Excel

File Excel chứa **các bản ghi đã chọn** với các cột:
- **ID**: Mã tự động tăng
- **Khách hàng**: Tên khách hàng
- **Tên đối tác**: Tên đối tác
- **Kho VN**: Tên kho VN
- **Loại hàng**: Tên loại hàng
- **Tên mặt hàng**: Tên sản phẩm
- **Tỷ giá**: Tỷ giá RMB/VND
- **Trọng lượng**: Tổng trọng lượng
- **Khối lượng**: Tổng khối lượng
- **Số kiện**: Tổng số kiện
- **Tổng tiền**: Tổng giá trị
- **Lợi nhuận**: Lợi nhuận (nếu có)
- **Ngày tạo**: Thời gian tạo bản ghi (DD/MM/YYYY)

#### Quy tắc nghiệp vụ
- **ADMIN, SALE, USER** có quyền xuất Excel
- **CUSTOMER** KHÔNG có quyền xuất Excel (nút "Xuất Excel" bị ẩn)
- Xuất **chỉ các bản ghi đã chọn**
- **Bắt buộc** phải chọn ít nhất 1 bản ghi trước khi xuất
- Nếu chưa chọn bản ghi nào → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
- Định dạng số: Theo chuẩn địa phương (Việt Nam hoặc Trung Quốc)

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────────┐
│  Quản lý Mã hàng       [Xuất Excel] [+ Thêm Mã hàng]       │  ← Ẩn nếu CUSTOMER
├────────────────────────────────────────────────────────────┤
│  Bộ lọc:                                                   │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 🔍 Tìm theo ID, Khách Hàng, Đối Tác, Sản Phẩm... │     │
│  └──────────────────────────────────────────────────┘     │
│                              [Tìm kiếm] [Xóa lọc]         │
├────────────────────────────────────────────────────────────┤
│  ☑ Đã chọn 5 dòng | Tổng kiện: 9 thùng carton và 17 pallet | Trọng lượng: 1.234kg│
├────────────────────────────────────────────────────────────┤
│  Bảng danh sách (scroll ngang):                            │
│  ┌──┬────┬────┬────┬────┬────┬─────────────┬────┬────┐   │
│  │☑ │ID  │Ngày│Mã  │Mã  │Tên │... 39 cột...│Thao│    │   │
│  │  │    │nhập│KH  │đơn │hàng│             │tác │    │   │
│  ├──┼────┼────┼────┼────┼────┼─────────────┼────┼────┤   │
│  │☑ │1   │13/ │Nguyễn│ABC│Điện│...          │👁✏️🗑│    │   │
│  │  │    │02  │Văn A │   │tử  │             │    │    │   │
│  └──┴────┴────┴────┴────┴────┴─────────────┴────┴────┘   │
├────────────────────────────────────────────────────────────┤
│  1-20 / 150    [20 ▼]    [◀ 1 2 3 ▶]                     │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Cấu trúc Form (Modal)

```
┌────────────────────────────────────────────────────────────┐
│  Thêm mới Mã hàng                       [Đóng] [Lưu]      │
├────────────────────────────────────────────────────────────┤
│  [Tab 1: Thông tin chung] [Tab 2: Sản phẩm] [Tab 3: KB]   │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │ 1. [A] Ngày │ 2. [B] Mã KH│ 3. [C] Mã đơn│             │
│  │ [___/___]   │ [Dropdown_] │ [_________] │              │
│  │             │             │             │              │
│  │ 4. [D] Tên  │ 5. [E] Số   │ 6. [F] Đơn vị│             │
│  │ [_________] │ kiện [____] │ [Dropdown_] │              │
│  │             │             │             │              │
│  │ 12. [L1]Đơn │ 13. [M] Tổng│             │              │
│  │ giá cước    │ cước (Auto) │             │              │
│  │ [_________] │ [_________] │             │              │
│  │             │     (?)     │             │              │
│  └─────────────┴─────────────┴─────────────┘              │
│                                    [◀ Trước] [Tiếp ▶]     │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn | Điều kiện hiển thị |
|------------|-----|---------|-----------|-----------|-------------------|
| 📥 | Xuất Excel | Xanh dương | Xuất tất cả dữ liệu ra Excel | ADMIN, SALE, USER | Ẩn nếu CUSTOMER |
| ➕ | Thêm Mã hàng | Xanh dương | Tạo mã hàng mới | ADMIN, SALE, USER | Ẩn nếu CUSTOMER |
| 👁 | Xem | Xanh dương | Xem chi tiết (chế độ chỉ đọc) | Tất cả | Luôn hiển thị |
| ✏️ | Sửa | Vàng | Chỉnh sửa thông tin mã hàng | Tất cả (giới hạn trường với CUSTOMER) | Luôn hiển thị |
| 🗑️ | Xóa | Đỏ (#ff4d4f) | Xóa mã hàng | Chỉ ADMIN | Chỉ hiện với ADMIN |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới mã hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không nhập đủ trường bắt buộc | "Vui lòng nhập đủ thông tin" |
| Khách hàng không tồn tại hoặc đã bị xóa | "Customer not found" |
| Kho VN không tồn tại hoặc đã bị xóa | "Warehouse not found" |
| Loại hàng không tồn tại hoặc đã bị xóa | "Category not found" |

### 5.2 Khi chỉnh sửa mã hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Mã hàng không tồn tại | "Product code not found" |
| CUSTOMER cố sửa mã hàng của người khác | "Forbidden" |
| CUSTOMER cố sửa trường không được phép | Không có thông báo lỗi, chỉ lưu 2 trường được phép |
| Thay đổi khách hàng không hợp lệ | "Customer not found" |

### 5.3 Khi xóa mã hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Mã hàng không tồn tại | "Product code not found" |

### 5.4 Khi upload ảnh

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Mã hàng không tồn tại | "Product code not found" |
| Không có file được upload | "No files uploaded" |

### 5.5 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Chưa chọn bản ghi nào | "Vui lòng chọn ít nhất 1 bản ghi để xuất" |

### 5.6 Khi truy cập chức năng không có quyền

| Tình huống | Thông báo lỗi |
|------------|---------------|
| CUSTOMER cố tạo/xóa/xuất Excel | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Phân quyền đặc biệt**:
   - ADMIN: Toàn quyền (CRUD + Export)
   - SALE, USER: Xem, Sửa (toàn bộ), Export
   - CUSTOMER: Xem, Sửa (chỉ 2 trường: `Nhu cầu khai báo`, `Ghi chú`)

2. ✅ **Trường bắt buộc**: 9 trường (A, B, C, D, E, F, G, H, L)

3. ✅ **Tính toán tự động**: 4 công thức (M, AE, AI, AK, AL) với tooltip hiển thị công thức

4. ✅ **Upload ảnh**: 2 loại, mỗi loại tối đa 3 ảnh, ẩn nút upload khi đã đủ 3

5. ✅ **Soft delete**: Xóa mềm, không xóa vĩnh viễn

6. ✅ **Thông báo**: Tự động gửi thông báo cho khách hàng khi thay đổi trạng thái hàng hóa

### 6.2 Quy tắc mặc định

- Phân trang mặc định: **20 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)
- Upload ảnh: Tối đa **3 ảnh** cho mỗi loại (Ảnh hàng hóa, Ảnh hàng dán tem)
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Export Excel: Chỉ xuất các bản ghi đã chọn

### 6.3 Quy tắc hiển thị

- **Số tiền (VND)**: Định dạng Việt Nam (1.234.567 ₫)
- **Số tiền (RMB)**: Định dạng Trung Quốc (¥1,234.56)
- **Số thập phân**: Định dạng Đức (1.234,56)
- **Ngày nhập**: Định dạng DD/MM/YYYY
- **Ngày tạo**: Định dạng DD/MM/YYYY
- **Tổng cước, Tổng chi phí NK**: Màu xanh (#389e0d), in đậm
- **Ảnh**: Thumbnail 50px, click để xem lớn (tối đa 3 ảnh mỗi loại)
- **Trường tự động tính**: Disabled, màu nền xám, có tooltip hiển thị công thức khi hover
- **Trạng thái**: Tag màu sắc (blue, cyan, geekblue, purple, orange, green)

### 6.4 Công thức tính toán

**1. Tổng cước TQ_HN ([M])**
```
Tổng cước = Max(Đơn giá cước TQ_HN (khối) [L1] × Khối lượng [H], Đơn giá cước TQ_HN (cân) [L2] × Trọng lượng [G])
```

**2. Tổng giá trị lô hàng ([AE])**
```
Tổng giá trị = Giá xuất HĐ [AD] × Số lượng khai báo [AC]
```

**3. Thuế VAT NK ([AI])**
```
Thuế VAT NK = Tổng giá trị [AE] × 8%
```

**4. Phí uỷ thác ([AK])**
```
Phí uỷ thác = Tổng giá trị [AE] × 1%
```

**5. Tổng chi phí NK ([AL])**
```
Tổng chi phí NK = Thuế NK [AJ] + Thuế VAT NK [AI] + Phí phải nộp [AG] 
                + Phí nội địa VN [N] + Tổng cước TQ_HN [M] + Phí uỷ thác [AK] 
                + ((Phí nội địa TQ [I] + Phí kéo hàng TQ [J]) × Tỷ giá [K])
```

---

## 7. Lưu Ý Đặc Biệt

### 7.1 Về cấu trúc dữ liệu
- Màn Mã hàng có **39 trường dữ liệu** - là màn phức tạp nhất trong hệ thống (ngang với Khai báo)
- Dữ liệu được chia thành **3 tabs** để dễ quản lý:
  - Tab 1: Thông tin chung (15 trường)
  - Tab 2: Thông tin sản phẩm (12 trường)
  - Tab 3: Thông tin khai báo (11 trường)

### 7.2 Về hiển thị
- Bảng danh sách có **scroll ngang** (horizontal scroll) do có quá nhiều cột
- Cột "Thao tác" được **fixed bên phải** để luôn hiển thị
- Cột "ID" được **fixed bên trái** để luôn hiển thị
- Có thanh thông tin hiển thị tổng hợp khi chọn nhiều dòng

### 7.3 Về phân quyền đặc biệt
- **CUSTOMER** có quyền sửa nhưng **chỉ 2 trường**:
  - `[AB] Nhu cầu khai báo`
  - `[AH] Ghi chú`
- **CUSTOMER** chỉ được sửa mã hàng của chính mình (kiểm tra `customerId`)
- Tất cả các trường khác bị khóa (disabled) khi CUSTOMER sửa

### 7.4 Về upload ảnh
- Hỗ trợ **2 loại ảnh**:
  - `[Q] Ảnh hàng hóa`: Tối đa 3 ảnh
  - `[U] Ảnh hàng dán tem`: Tối đa 3 ảnh
- Khi đã upload đủ 3 ảnh → **Ẩn nút upload**
- Có thể xóa ảnh đã upload để upload ảnh khác

### 7.5 Về xuất Excel
- Xuất **chỉ các bản ghi đã chọn**
- **Bắt buộc** phải chọn ít nhất 1 bản ghi trước khi xuất
- Nếu chưa chọn → Hiển thị lỗi: "Vui lòng chọn ít nhất 1 bản ghi để xuất"
- File Excel chứa thông tin tổng hợp (không phải tất cả 39 trường)

### 7.6 Về thông báo
- Khi ADMIN/SALE/USER thay đổi **Tình trạng hàng hóa** [P]
- Hệ thống tự động gửi thông báo cho khách hàng
- Khách hàng sẽ nhận được thông báo về sự thay đổi

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của màn Mã hàng (Product Code).**
