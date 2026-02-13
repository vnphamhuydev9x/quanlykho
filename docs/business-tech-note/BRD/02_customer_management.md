# Tài Liệu Nghiệp Vụ: Quản Lý Khách Hàng

> **Mục đích**: Mô tả các chức năng nghiệp vụ của module Quản lý Khách hàng  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Module **Quản lý Khách hàng** cho phép quản trị viên quản lý toàn bộ tài khoản khách hàng trong hệ thống, bao gồm thông tin cá nhân, nhân viên phụ trách, và tổng tiền đã thanh toán.

### 1.2 Các chức năng chính
1. Xem danh sách khách hàng (có phân trang, tìm kiếm, lọc)
2. Thêm mới khách hàng
3. Chỉnh sửa thông tin khách hàng
4. Xem chi tiết khách hàng (chế độ chỉ đọc)
5. Xóa khách hàng
6. Reset mật khẩu khách hàng
7. Xuất danh sách khách hàng ra Excel

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền truy cập và thao tác
- **Các nhân viên khác**: Không có quyền truy cập module này

---

## 2. Thông Tin Khách Hàng

Khi tạo mới hoặc quản lý khách hàng, hệ thống lưu trữ các thông tin sau:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| **Mã khách hàng** | Text | ✅ Có | Tên đăng nhập của khách hàng. **Không thể sửa** sau khi tạo. Phải là duy nhất. |
| **Mật khẩu** | Password | ✅ Có (khi tạo mới) | Mật khẩu đăng nhập. Chỉ nhập khi tạo mới, không hiển thị khi chỉnh sửa. |
| **Họ và tên** | Text | ✅ Có | Họ tên đầy đủ của khách hàng |
| **Số điện thoại** | Text | ❌ Không | Số điện thoại liên hệ |
| **Địa chỉ** | Text | ❌ Không | Địa chỉ giao hàng/liên hệ |
| **Nhân viên phụ trách** | Selection Box | ❌ Không | Nhân viên phụ trách khách hàng này (có thể là bất kỳ nhân viên nào trong hệ thống) |
| **Trạng thái** | Switch (Bật/Tắt) | ✅ Có | Trạng thái hoạt động của tài khoản |
| **Tổng tiền đã thanh toán** | Số tiền | - | **Tự động tính** từ các giao dịch thành công (chỉ hiển thị, không nhập) |

### 2.1 Trạng thái khách hàng

- **Hoạt động** (Active): Khách hàng có thể đăng nhập và sử dụng hệ thống
- **Vô hiệu hóa** (Inactive): Khách hàng không thể đăng nhập hệ thống

### 2.2 Nhân viên phụ trách

- Mỗi khách hàng có thể được gán cho **1 nhân viên** để quản lý
- Nhân viên phụ trách có thể là **bất kỳ nhân viên nào** trong hệ thống (ADMIN, SALE, KHO_TQ, KE_TOAN, v.v.)
- Có thể để trống (không gán nhân viên phụ trách)

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Khách Hàng

#### Mô tả
Hiển thị danh sách tất cả khách hàng trong hệ thống dưới dạng bảng, có hỗ trợ phân trang, tìm kiếm và lọc.

#### Thông tin hiển thị trên bảng

| Cột | Mô tả |
|-----|-------|
| **ID** | Mã số khách hàng (tự động tăng) |
| **Mã khách hàng** | Username để đăng nhập |
| **Họ và tên** | Họ tên đầy đủ |
| **Tổng tiền đã thanh toán** | Tổng số tiền từ các giao dịch thành công (hiển thị màu xanh, định dạng VND) |
| **Số điện thoại** | Số điện thoại liên hệ |
| **Địa chỉ** | Địa chỉ giao hàng |
| **Nhân viên phụ trách** | Tên nhân viên Sale phụ trách (hiển thị "-" nếu không có) |
| **Trạng thái** | Hoạt động (màu xanh) / Vô hiệu hóa (màu đỏ) |
| **Thao tác** | Các nút: Xem, Sửa, Reset mật khẩu, Xóa |

#### Tính năng tìm kiếm và lọc

**1. Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm đồng thời theo nhiều trường:
  - Họ và tên
  - Mã khách hàng (Username)
  - Số điện thoại
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

**2. Lọc theo Trạng thái (Status Filter)**
- **Loại**: Dropdown (Hộp chọn)
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Hoạt động
  - Vô hiệu hóa

**3. Lọc theo Nhân viên phụ trách**
- **Loại**: Dropdown (Hộp chọn) có tìm kiếm
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Danh sách tất cả nhân viên trong hệ thống (hiển thị tên hoặc username)

**4. Nút thao tác**
- **Tìm kiếm**: Áp dụng các bộ lọc đã chọn
- **Xóa lọc**: Reset tất cả bộ lọc về mặc định

#### Phân trang
- **Số bản ghi mỗi trang**: Có thể chọn 20, 30, 40, hoặc 50
- **Hiển thị**: "1-20 / 100" (Từ bản ghi 1 đến 20, tổng 100 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

---

### 3.2 Thêm Mới Khách Hàng

#### Mô tả
Cho phép quản trị viên tạo tài khoản khách hàng mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"+ Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal)
3. Nhập đầy đủ thông tin bắt buộc
4. Click nút **"Lưu"**

#### Form nhập liệu

| Trường | Loại | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| Mã khách hàng | Text input | ✅ | Phải là duy nhất, không trùng với tài khoản đã có |
| Mật khẩu | Password input | ✅ | Mật khẩu ban đầu do Admin đặt |
| Họ và tên | Text input | ✅ | - |
| Số điện thoại | Text input | ❌ | - |
| Địa chỉ | Text input | ❌ | - |
| Nhân viên phụ trách | Dropdown có tìm kiếm | ❌ | Chọn từ danh sách nhân viên, hiển thị tên + quyền hạn |
| Trạng thái | Switch | ✅ | Mặc định: Hoạt động |

#### Quy tắc nghiệp vụ
- Mã khách hàng **phải là duy nhất** trong hệ thống
- Nếu mã khách hàng đã tồn tại → Hiển thị lỗi: "Tên đăng nhập đã tồn tại"
- Sau khi tạo thành công → Danh sách khách hàng tự động cập nhật

---

### 3.3 Chỉnh Sửa Thông Tin Khách Hàng

#### Mô tả
Cho phép quản trị viên cập nhật thông tin của khách hàng đã có.

#### Cách thực hiện
1. Tại dòng khách hàng cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết
4. Click nút **"Lưu"**

#### Form chỉnh sửa

| Trường | Có thể sửa? | Ghi chú |
|--------|-------------|---------|
| Mã khách hàng | ❌ **KHÔNG** | Trường này bị khóa, không cho phép sửa |
| Mật khẩu | ❌ **KHÔNG** | Không hiển thị trong form sửa. Dùng chức năng "Reset mật khẩu" riêng |
| Họ và tên | ✅ Có | - |
| Số điện thoại | ✅ Có | - |
| Địa chỉ | ✅ Có | - |
| Nhân viên phụ trách | ✅ Có | Có thể thay đổi hoặc xóa (để trống) |
| Trạng thái | ✅ Có | Có thể bật/tắt tài khoản |

#### Quy tắc nghiệp vụ
- **Không** cho phép sửa mã khách hàng (Username)
- **Không** cho phép sửa mật khẩu qua form này (Dùng chức năng Reset mật khẩu)
- Sau khi sửa thành công → Danh sách khách hàng tự động cập nhật

---

### 3.4 Xem Chi Tiết Khách Hàng

#### Mô tả
Cho phép xem thông tin chi tiết của khách hàng ở chế độ **chỉ đọc** (không thể chỉnh sửa).

#### Cách thực hiện
1. Tại dòng khách hàng cần xem, click nút **"Xem"** (biểu tượng mắt)
2. Hệ thống hiển thị form với tất cả thông tin
3. Tất cả các trường đều ở chế độ **chỉ đọc** (disabled)
4. Không có nút "Lưu"

#### Mục đích
- Xem thông tin khách hàng mà không lo chỉnh sửa nhầm
- Kiểm tra thông tin trước khi quyết định sửa hoặc xóa

---

### 3.5 Xóa Khách Hàng

#### Mô tả
Cho phép quản trị viên xóa tài khoản khách hàng khỏi hệ thống.

#### Cách thực hiện
1. Tại dòng khách hàng cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"OK"** để xác nhận xóa, hoặc **"Hủy"** để hủy thao tác
4. Nếu xác nhận → Khách hàng bị xóa khỏi hệ thống

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xóa khách hàng
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Khách hàng đã xóa sẽ không hiển thị trong danh sách
- Sau khi xóa thành công → Danh sách khách hàng tự động cập nhật

#### Lưu ý
- Thao tác xóa là **vĩnh viễn**, không thể khôi phục
- Cần cân nhắc kỹ trước khi xóa

---

### 3.6 Reset Mật Khẩu

#### Mô tả
Cho phép quản trị viên đặt lại mật khẩu của khách hàng về mật khẩu mặc định.

#### Cách thực hiện
1. Tại dòng khách hàng cần reset, click nút **"Reset mật khẩu"** (biểu tượng vòng tròn xoay, màu cam)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn reset mật khẩu?"
3. Click **"OK"** để xác nhận
4. Hệ thống reset mật khẩu và hiển thị thông báo: "Reset mật khẩu thành công. Mật khẩu mới: **123**"

#### Quy tắc nghiệp vụ
- Mật khẩu sau khi reset: **`123`**
- Quản trị viên cần thông báo mật khẩu mới cho khách hàng

---

### 3.7 Xuất Danh Sách Khách Hàng (Export Excel)

#### Mô tả
Cho phép quản trị viên xuất các khách hàng đã chọn ra file Excel.

#### Cách thực hiện
1. **Chọn** các khách hàng cần xuất bằng cách tick vào checkbox ở đầu mỗi dòng
2. Click nút **"Export Excel"** (biểu tượng download, màu xanh lá) ở góc phải trên cùng
3. Hệ thống tự động tải file Excel về máy
4. Tên file: `DanhSachKhachHang_YYYY-MM-DD.xlsx` (ví dụ: `DanhSachKhachHang_2026-02-13.xlsx`)

#### Nội dung file Excel

| Cột | Mô tả |
|-----|-------|
| ID | Mã số khách hàng |
| Mã khách hàng | Username |
| Họ và tên | Họ tên đầy đủ |
| Số điện thoại | Số điện thoại |
| Địa chỉ | Địa chỉ |
| Trạng thái | Hoạt động / Vô hiệu hóa |

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xuất Excel
- **Phải chọn ít nhất 1 khách hàng** trước khi xuất
- Nếu không chọn khách hàng nào → Hiển thị lỗi: "Vui lòng chọn ít nhất một khách hàng để xuất"
- Chỉ xuất các khách hàng **đã được chọn** (không xuất toàn bộ)
- Dữ liệu được sắp xếp theo thứ tự tạo mới (mới nhất trước)

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────┐
│  Quản lý Khách hàng    [Export Excel] [+ Thêm mới]    │
├────────────────────────────────────────────────────────┤
│  Bộ lọc:                                               │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🔍 Khách hàng (Họ tên, Mã KH, Số điện thoại)  │   │
│  └────────────────────────────────────────────────┘   │
│  [Lọc theo Trạng thái ▼] [Lọc theo Sale ▼]           │
│                              [Tìm kiếm] [Xóa lọc]     │
├────────────────────────────────────────────────────────┤
│  Bảng danh sách:                                       │
│  ┌──┬─────┬──────┬────────┬──────┬─────┬────┬────┬──┐│
│  │ID│Mã KH│Họ tên│Tổng $  │SĐT   │Địa  │Sale│...│  ││
│  ├──┼─────┼──────┼────────┼──────┼─────┼────┼────┼──┤│
│  │1 │KH001│Nguyễn│1.000.000₫│0123│HN  │Sale│... │👁✏🔄🗑││
│  │2 │KH002│Trần  │500.000₫│0456 │HCM │-   │... │👁✏🔄🗑││
│  └──┴─────┴──────┴────────┴──────┴─────┴────┴────┴──┘│
├────────────────────────────────────────────────────────┤
│  1-20 / 100    [20 ▼]    [◀ 1 2 3 ▶]                 │
└────────────────────────────────────────────────────────┘
```

### 4.2 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn |
|------------|-----|---------|-----------|-----------|
| 📥 | Export Excel | Xanh lá | Xuất danh sách ra Excel | Chỉ ADMIN |
| 👁 | Xem | Xanh dương | Xem chi tiết (chế độ chỉ đọc) | ADMIN |
| ✏️ | Sửa | Xanh dương | Chỉnh sửa thông tin | ADMIN |
| 🔄 | Reset Password | Cam | Reset mật khẩu về mặc định | ADMIN, SALE (chỉ KH của mình) |
| 🗑️ | Xóa | Đỏ | Xóa khách hàng | ADMIN |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới khách hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không nhập Mã khách hàng | "Vui lòng nhập đủ thông tin" |
| Không nhập Mật khẩu | "Vui lòng nhập đủ thông tin" |
| Không nhập Họ và tên | "Vui lòng nhập đủ thông tin" |
| Mã khách hàng đã tồn tại | "Tên đăng nhập đã tồn tại" |

### 5.2 Khi reset mật khẩu

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Khách hàng không tồn tại | "Khách hàng không tồn tại" |

### 5.3 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không chọn khách hàng nào | "Vui lòng chọn ít nhất một khách hàng để xuất" |

### 5.4 Khi truy cập module

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không phải ADMIN | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Chỉ Quản trị viên (ADMIN)** mới có quyền quản lý khách hàng (CRUD)
2. ✅ **Mã khách hàng phải duy nhất** trong toàn hệ thống
3. ✅ **Mã khách hàng không thể sửa** sau khi tạo
4. ✅ **Mật khẩu không thể sửa** qua form Chỉnh sửa (Phải dùng Reset mật khẩu)
5. ✅ **Mật khẩu reset mặc định là `123`**
6. ✅ **Tổng tiền đã thanh toán** được tính tự động từ các giao dịch có trạng thái "SUCCESS"
7. ✅ **Nhân viên phụ trách** có thể là bất kỳ nhân viên nào trong hệ thống
8. ✅ **Export Excel** chỉ xuất các khách hàng đã được chọn

### 6.2 Quy tắc mặc định

- Trạng thái mặc định khi tạo mới: **Hoạt động**
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Phân trang mặc định: **20 bản ghi/trang**
- Nhân viên phụ trách: Có thể để trống, có thể là bất kỳ nhân viên nào

### 6.3 Quy tắc hiển thị

- Trạng thái Active: Tag màu xanh
- Trạng thái Inactive: Tag màu đỏ
- Tổng tiền đã thanh toán: Màu xanh lá, định dạng VND (ví dụ: 1.000.000 ₫)
- Nhân viên phụ trách: Hiển thị tên hoặc username, hiển thị "-" nếu không có

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của module Quản lý Khách hàng.**
