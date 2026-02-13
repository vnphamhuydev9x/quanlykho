# Tài Liệu Nghiệp Vụ: Quản Lý Nạp Tiền

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Nạp tiền (Transaction)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Nạp tiền** cho phép quản trị viên quản lý các giao dịch nạp tiền cho khách hàng, bao gồm tạo giao dịch mới, xem lịch sử giao dịch, hủy giao dịch, và xuất báo cáo.

### 1.2 Các chức năng chính
1. Xem danh sách giao dịch (có phân trang, tìm kiếm, lọc)
2. Tạo giao dịch nạp tiền mới
3. Hủy giao dịch
4. Xuất danh sách giao dịch ra Excel

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền truy cập và thao tác
- **Các nhân viên khác**: Không có quyền truy cập màn này

---

## 2. Thông Tin Giao Dịch

Mỗi giao dịch nạp tiền bao gồm các thông tin sau:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| **ID** | Số | - | Mã giao dịch (tự động tăng) |
| **Khách hàng** | Selection Box | ✅ Có | Khách hàng nhận tiền (chọn từ danh sách khách hàng đang hoạt động) |
| **Số tiền** | Số tiền | ✅ Có | Số tiền nạp (VND) |
| **Nội dung** | Text | ❌ Không | Ghi chú về giao dịch |
| **Trạng thái** | Tag | - | SUCCESS (Thành công) hoặc CANCELLED (Đã hủy) |
| **Người tạo** | Text | - | Nhân viên tạo giao dịch (tự động lấy từ tài khoản đăng nhập) |
| **Ngày tạo** | DateTime | - | Thời gian tạo giao dịch (tự động, định dạng: DD/MM/YYYY HH:mm) |

### 2.1 Trạng thái giao dịch

- **SUCCESS** (Thành công): Giao dịch đã hoàn thành, tiền đã được nạp vào tài khoản khách hàng
- **CANCELLED** (Đã hủy): Giao dịch đã bị hủy bởi quản trị viên

### 2.2 Quy tắc về số tiền

- Số tiền phải **lớn hơn 0**
- Đơn vị tiền tệ: **VND** (Việt Nam Đồng)
- Hiển thị định dạng: 1.000.000 VND

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Giao Dịch

#### Mô tả
Hiển thị danh sách tất cả giao dịch nạp tiền trong hệ thống dưới dạng bảng, có hỗ trợ phân trang, tìm kiếm và lọc.

#### Thông tin hiển thị trên bảng

| Cột | Mô tả |
|-----|-------|
| **ID** | Mã giao dịch (tự động tăng) |
| **Khách hàng** | Tên khách hàng (dòng 1), Username - Số điện thoại (dòng 2, màu xám nhỏ hơn) |
| **Số tiền** | Số tiền nạp (màu xanh lá, định dạng VND/CNY) |
| **Nội dung** | Ghi chú về giao dịch |
| **Trạng thái** | SUCCESS (màu xanh) / CANCELLED (màu đỏ) |
| **Người tạo** | Tên nhân viên tạo giao dịch |
| **Ngày tạo** | Thời gian tạo (định dạng: DD/MM/YYYY HH:mm) |
| **Thao tác** | Nút Hủy (chỉ hiện với ADMIN và giao dịch SUCCESS) |

#### Tính năng tìm kiếm và lọc

**1. Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm đồng thời theo nhiều trường:
  - Tên khách hàng
  - Mã khách hàng (Username)
  - Số điện thoại khách hàng
  - Nội dung giao dịch
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

**2. Lọc theo Trạng thái**
- **Loại**: Dropdown (Hộp chọn)
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Thành công (SUCCESS)
  - Đã hủy (CANCELLED)

**3. Lọc theo Người tạo**
- **Loại**: Dropdown (Hộp chọn) có tìm kiếm
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Danh sách tất cả nhân viên trong hệ thống (hiển thị tên)

**4. Nút thao tác**
- **Tìm kiếm**: Áp dụng các bộ lọc đã chọn
- **Xóa lọc**: Reset tất cả bộ lọc về mặc định

#### Phân trang
- **Số bản ghi mỗi trang**: 10 (mặc định), có thể thay đổi
- **Hiển thị**: "1-10 / 100" (Từ bản ghi 1 đến 10, tổng 100 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

---

### 3.2 Tạo Giao Dịch Nạp Tiền

#### Mô tả
Cho phép quản trị viên tạo giao dịch nạp tiền mới cho khách hàng.

#### Cách thực hiện
1. Click nút **"+ Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal)
3. Nhập đầy đủ thông tin bắt buộc
4. Click nút **"Lưu"**

#### Form nhập liệu

| Trường | Loại | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| Khách hàng | Dropdown có tìm kiếm | ✅ | Chọn từ danh sách khách hàng **đang hoạt động**. Hiển thị: "Tên (Username - SĐT)" |
| Số tiền | Number input | ✅ | Nhập số tiền (VND). Phải lớn hơn 0 |
| Nội dung | Text area (3 dòng) | ❌ | Ghi chú về giao dịch |

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền tạo giao dịch
- Chỉ hiển thị khách hàng **đang hoạt động** (isActive = true) trong dropdown
- Giao dịch mới luôn có trạng thái **SUCCESS**
- Người tạo được **tự động ghi nhận** từ tài khoản đăng nhập
- Sau khi tạo thành công → Danh sách giao dịch tự động cập nhật và quay về trang 1

---

### 3.3 Hủy Giao Dịch

#### Mô tả
Cho phép quản trị viên hủy giao dịch đã tạo.

#### Cách thực hiện
1. Tại dòng giao dịch cần hủy, click nút **"Hủy"** (biểu tượng X trong vòng tròn, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn hủy giao dịch này?"
3. Click **"Có"** để xác nhận hủy, hoặc **"Không"** để hủy thao tác
4. Nếu xác nhận → Trạng thái giao dịch chuyển thành **CANCELLED**

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền hủy giao dịch
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Giao dịch đã xóa sẽ không hiển thị trong danh sách
- Sau khi xóa thành công → Danh sách giao dịch tự động cập nhật
- **Chỉ** có thể hủy giao dịch có trạng thái **SUCCESS**
- Giao dịch đã hủy (**CANCELLED**) **KHÔNG** thể hủy lại (nút Hủy sẽ không hiển thị)
- Nếu cố gắng hủy giao dịch đã hủy → Hiển thị lỗi: "Giao dịch đã được hủy trước đó"
- Sau khi hủy thành công → Danh sách giao dịch tự động cập nhật

#### Lưu ý
- Hủy giao dịch **KHÔNG** xóa giao dịch khỏi hệ thống, chỉ thay đổi trạng thái
- Giao dịch đã hủy vẫn hiển thị trong danh sách với trạng thái CANCELLED

---

### 3.4 Xuất Danh Sách Giao Dịch (Export Excel)

#### Mô tả
Cho phép quản trị viên xuất các giao dịch đã chọn ra file Excel.

#### Cách thực hiện
1. **Chọn** các giao dịch cần xuất bằng cách tick vào checkbox ở đầu mỗi dòng
2. Click nút **"Export Excel"** (biểu tượng download, màu xanh lá) ở góc phải trên cùng
3. Hệ thống tự động tải file Excel về máy
4. Tên file: Theo cấu hình i18n (ví dụ: `DanhSachGiaoDich_2026-02-13.xlsx`)

#### Nội dung file Excel

| Cột | Mô tả |
|-----|-------|
| ID | Mã giao dịch |
| Khách hàng | Tên khách hàng |
| Số điện thoại | Số điện thoại khách hàng |
| Số tiền | Số tiền nạp |
| Nội dung | Ghi chú |
| Trạng thái | SUCCESS / CANCELLED |
| Người tạo | Tên nhân viên tạo giao dịch |
| Ngày tạo | Thời gian tạo (định dạng: DD/MM/YYYY HH:mm) |

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xuất Excel
- **Phải chọn ít nhất 1 giao dịch** trước khi xuất
- Nếu không chọn giao dịch nào → Hiển thị lỗi: "Vui lòng chọn ít nhất một giao dịch để xuất"
- Chỉ xuất các giao dịch **đã được chọn** (không xuất toàn bộ)
- Dữ liệu được sắp xếp theo thứ tự tạo mới (mới nhất trước)

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────┐
│  Nạp tiền              [Export Excel] [+ Thêm mới]     │  ← Chỉ ADMIN
├────────────────────────────────────────────────────────┤
│  Bộ lọc:                                               │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🔍 Tìm theo Tên KH, Mã KH, SĐT, Nội dung...   │   │
│  └────────────────────────────────────────────────┘   │
│  [Lọc theo Trạng thái ▼] [Lọc theo Người tạo ▼]      │
│                              [Tìm kiếm] [Xóa lọc]     │
├────────────────────────────────────────────────────────┤
│  Bảng danh sách:                                       │
│  ┌──┬────────┬────────┬──────┬────┬────┬──────┬────┐│
│  │ID│Khách   │Số tiền │Nội   │Trạng│Người│Ngày │... ││
│  │  │hàng    │        │dung  │thái │tạo  │tạo  │    ││
│  ├──┼────────┼────────┼──────┼────┼────┼──────┼────┤│
│  │1 │Nguyễn  │1.000k₫ │Nạp   │✓   │Admin│13/02│ ❌ ││
│  │  │KH001   │        │tiền  │    │     │10:00│    ││
│  └──┴────────┴────────┴──────┴────┴────┴──────┴────┘│
├────────────────────────────────────────────────────────┤
│  1-10 / 100    [10 ▼]    [◀ 1 2 3 ▶]                 │
└────────────────────────────────────────────────────────┘
```

### 4.2 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn | Điều kiện hiển thị |
|------------|-----|---------|-----------|-----------|-------------------|
| 📥 | Export Excel | Xanh lá | Xuất danh sách ra Excel | Chỉ ADMIN | Luôn hiển thị |
| ➕ | Thêm mới | Xanh dương | Tạo giao dịch mới | Chỉ ADMIN | Luôn hiển thị |
| ❌ | Hủy | Đỏ | Hủy giao dịch | Chỉ ADMIN | Chỉ hiện với giao dịch SUCCESS |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi tạo giao dịch

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không chọn Khách hàng | "Vui lòng nhập đủ thông tin" |
| Không nhập Số tiền | "Vui lòng nhập đủ thông tin" |
| Số tiền = 0 hoặc âm | Validation lỗi (input không cho nhập) |

### 5.2 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không chọn giao dịch nào | "Vui lòng chọn ít nhất một giao dịch để xuất" |

### 5.3 Khi hủy giao dịch

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Giao dịch không tồn tại | "Giao dịch không tồn tại" |
| Giao dịch đã bị hủy trước đó | "Giao dịch đã được hủy trước đó" |

### 5.4 Khi truy cập màn

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không phải ADMIN truy cập màn | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Chỉ Quản trị viên (ADMIN)** mới có quyền truy cập màn này
2. ✅ **Các nhân viên khác** không có quyền truy cập
3. ✅ **Giao dịch mới** luôn có trạng thái **SUCCESS**
4. ✅ **Chỉ hủy được** giao dịch có trạng thái **SUCCESS**
5. ✅ **Giao dịch đã hủy** (CANCELLED) không thể hủy lại
6. ✅ **Người tạo** được tự động ghi nhận từ tài khoản đăng nhập
7. ✅ **Số tiền** phải lớn hơn 0, đơn vị VND
8. ✅ **Chỉ hiển thị khách hàng đang hoạt động** trong dropdown khi tạo giao dịch
9. ✅ **Export Excel** chỉ xuất các giao dịch đã được chọn

### 6.2 Quy tắc mặc định

- Trạng thái mặc định khi tạo mới: **SUCCESS**
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Phân trang mặc định: **10 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)

### 6.3 Quy tắc hiển thị

- Trạng thái SUCCESS: Tag màu xanh
- Trạng thái CANCELLED: Tag màu đỏ
- Số tiền: Màu xanh lá, định dạng VND (ví dụ: 1.000.000 VND)
- Khách hàng: Tên (dòng 1, đậm), Username - SĐT (dòng 2, màu xám, nhỏ hơn)
- Ngày tạo: Định dạng DD/MM/YYYY HH:mm

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của màn Nạp tiền (Transaction).**
