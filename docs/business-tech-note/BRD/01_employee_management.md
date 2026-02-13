# Tài Liệu Nghiệp Vụ: Quản Lý Nhân Viên

> **Mục đích**: Mô tả các chức năng nghiệp vụ của module Quản lý Nhân viên  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Module **Quản lý Nhân viên** cho phép quản trị viên quản lý toàn bộ tài khoản nhân viên trong hệ thống.

### 1.2 Các chức năng chính
1. Xem danh sách nhân viên (có phân trang, tìm kiếm, lọc)
2. Thêm mới nhân viên
3. Chỉnh sửa thông tin nhân viên
4. Xem chi tiết nhân viên (chế độ chỉ đọc)
5. Xóa nhân viên
6. Reset mật khẩu nhân viên

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền truy cập và thao tác
- **Các nhân viên khác**: Không có quyền truy cập module này

---

## 2. Thông Tin Nhân Viên

Khi tạo mới hoặc quản lý nhân viên, hệ thống lưu trữ các thông tin sau:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| **Tên đăng nhập** | Text | ✅ Có | Tên dùng để đăng nhập hệ thống. **Không thể sửa** sau khi tạo. Phải là duy nhất. |
| **Mật khẩu** | Password | ✅ Có (khi tạo mới) | Mật khẩu đăng nhập. Chỉ nhập khi tạo mới, không hiển thị khi chỉnh sửa. |
| **Họ và tên** | Text | ❌ Không | Họ tên đầy đủ của nhân viên |
| **Email** | Email | ❌ Không | Địa chỉ email liên hệ |
| **Số điện thoại** | Text | ❌ Không | Số điện thoại liên hệ |
| **Quyền hạn** | Selection Box | ✅ Có | Vai trò của nhân viên trong hệ thống |
| **Trạng thái** | Switch (Bật/Tắt) | ✅ Có | Trạng thái hoạt động của tài khoản |

### 2.1 Các quyền hạn (Role) trong hệ thống

| Mã quyền | Tên hiển thị | Mô tả |
|----------|--------------|-------|
| `ADMIN` | Quản trị viên | Toàn quyền quản lý hệ thống |
| `SALE` | Nhân viên Sale | Quản lý khách hàng và giao dịch |
| `KHO_TQ` | Kho Trung Quốc | Quản lý kho hàng tại Trung Quốc |
| `KE_TOAN` | Kế toán | Quản lý tài chính, kế toán |
| `DIEU_VAN` | Điều vận | Quản lý vận chuyển, logistics |
| `KHO_VN` | Kho Việt Nam | Quản lý kho hàng tại Việt Nam |
| `CHUNG_TU` | Chứng từ | Xử lý chứng từ, giấy tờ |

### 2.2 Trạng thái nhân viên

- **Hoạt động** (Active): Nhân viên có thể đăng nhập và sử dụng hệ thống
- **Vô hiệu hóa** (Inactive): Nhân viên không thể đăng nhập hệ thống

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Nhân Viên

#### Mô tả
Hiển thị danh sách tất cả nhân viên trong hệ thống dưới dạng bảng, có hỗ trợ phân trang, tìm kiếm và lọc.

#### Thông tin hiển thị trên bảng

| Cột | Mô tả |
|-----|-------|
| **ID** | Mã số nhân viên (tự động tăng) |
| **Tên đăng nhập** | Username để đăng nhập |
| **Họ và tên** | Họ tên đầy đủ |
| **Email** | Địa chỉ email |
| **Số điện thoại** | Số điện thoại liên hệ |
| **Quyền hạn** | Vai trò (hiển thị dạng nhãn màu xanh) |
| **Trạng thái** | Hoạt động (màu xanh) / Vô hiệu hóa (màu đỏ) |
| **Thao tác** | Các nút: Xem, Sửa, Reset mật khẩu, Xóa |

#### Tính năng tìm kiếm và lọc

**1. Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm đồng thời theo nhiều trường:
  - Tên đăng nhập
  - Họ và tên
  - Email
  - Số điện thoại
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

**2. Lọc theo Trạng thái (Status Filter)**
- **Loại**: Dropdown (Hộp chọn)
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Hoạt động
  - Vô hiệu hóa

**3. Lọc theo Quyền hạn (Role Filter)**
- **Loại**: Dropdown (Hộp chọn)
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Quản trị viên
  - Nhân viên Sale
  - Kho Trung Quốc
  - Kế toán
  - Điều vận
  - Kho Việt Nam
  - Chứng từ

**4. Nút thao tác**
- **Tìm kiếm**: Áp dụng các bộ lọc đã chọn
- **Xóa lọc**: Reset tất cả bộ lọc về mặc định

#### Phân trang
- **Số bản ghi mỗi trang**: Có thể chọn 20, 30, 40, hoặc 50
- **Hiển thị**: "1-20 / 100" (Từ bản ghi 1 đến 20, tổng 100 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

---

### 3.2 Thêm Mới Nhân Viên

#### Mô tả
Cho phép quản trị viên tạo tài khoản nhân viên mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"+ Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal)
3. Nhập đầy đủ thông tin bắt buộc
4. Click nút **"Lưu"**

#### Form nhập liệu

| Trường | Loại | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| Tên đăng nhập | Text input | ✅ | Phải là duy nhất, không trùng với tài khoản đã có |
| Mật khẩu | Password input | ✅ | Mật khẩu ban đầu do Admin đặt |
| Họ và tên | Text input | ❌ | - |
| Email | Email input | ❌ | - |
| Số điện thoại | Text input | ❌ | - |
| Quyền hạn | Dropdown | ✅ | Chọn 1 trong 7 quyền |
| Trạng thái | Switch | ✅ | Mặc định: Hoạt động |

#### Quy tắc nghiệp vụ
- Tên đăng nhập **phải là duy nhất** trong hệ thống
- Nếu tên đăng nhập đã tồn tại → Hiển thị lỗi: "Tên đăng nhập đã tồn tại"
- Sau khi tạo thành công → Danh sách nhân viên tự động cập nhật

---

### 3.3 Chỉnh Sửa Thông Tin Nhân Viên

#### Mô tả
Cho phép quản trị viên cập nhật thông tin của nhân viên đã có.

#### Cách thực hiện
1. Tại dòng nhân viên cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết
4. Click nút **"Lưu"**

#### Form chỉnh sửa

| Trường | Có thể sửa? | Ghi chú |
|--------|-------------|---------|
| Tên đăng nhập | ❌ **KHÔNG** | Trường này bị khóa, không cho phép sửa |
| Mật khẩu | ❌ **KHÔNG** | Không hiển thị trong form sửa. Dùng chức năng "Reset mật khẩu" riêng |
| Họ và tên | ✅ Có | - |
| Email | ✅ Có | - |
| Số điện thoại | ✅ Có | - |
| Quyền hạn | ✅ Có | Có thể thay đổi quyền |
| Trạng thái | ✅ Có | Có thể bật/tắt tài khoản |

#### Quy tắc nghiệp vụ
- **Không** cho phép sửa tên đăng nhập (Username)
- **Không** cho phép sửa mật khẩu qua form này (Dùng chức năng Reset mật khẩu)
- Sau khi sửa thành công → Danh sách nhân viên tự động cập nhật

---

### 3.4 Xem Chi Tiết Nhân Viên

#### Mô tả
Cho phép xem thông tin chi tiết của nhân viên ở chế độ **chỉ đọc** (không thể chỉnh sửa).

#### Cách thực hiện
1. Tại dòng nhân viên cần xem, click nút **"Xem"** (biểu tượng mắt)
2. Hệ thống hiển thị form với tất cả thông tin
3. Tất cả các trường đều ở chế độ **chỉ đọc** (disabled)
4. Không có nút "Lưu"

#### Mục đích
- Xem thông tin nhân viên mà không lo chỉnh sửa nhầm
- Kiểm tra thông tin trước khi quyết định sửa hoặc xóa

---

### 3.5 Xóa Nhân Viên

#### Mô tả
Cho phép quản trị viên xóa tài khoản nhân viên khỏi hệ thống.

#### Cách thực hiện
1. Tại dòng nhân viên cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"OK"** để xác nhận xóa, hoặc **"Hủy"** để hủy thao tác
4. Nếu xác nhận → Nhân viên bị xóa khỏi hệ thống

#### Quy tắc nghiệp vụ
- Quản trị viên **KHÔNG** thể tự xóa chính mình
- Nếu cố gắng tự xóa → Hiển thị lỗi: "Không thể tự xóa chính mình"
- Sau khi xóa thành công → Danh sách nhân viên tự động cập nhật

#### Lưu ý
- Thao tác xóa là **vĩnh viễn**, không thể khôi phục
- Cần cân nhắc kỹ trước khi xóa

---

### 3.6 Reset Mật Khẩu

#### Mô tả
Cho phép quản trị viên đặt lại mật khẩu của nhân viên về mật khẩu mặc định.

#### Cách thực hiện
1. Tại dòng nhân viên cần reset, click nút **"Reset mật khẩu"** (biểu tượng vòng tròn xoay, màu cam)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn reset mật khẩu?"
3. Click **"OK"** để xác nhận
4. Hệ thống reset mật khẩu và hiển thị thông báo: "Reset mật khẩu thành công. Mật khẩu mới: **123**"

#### Quy tắc nghiệp vụ
- Mật khẩu sau khi reset: **`123`**
- Quản trị viên cần thông báo mật khẩu mới cho nhân viên
- Nhân viên nên đổi mật khẩu ngay sau khi đăng nhập lần đầu

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────┐
│  Quản lý Nhân viên              [+ Thêm mới]       │
├────────────────────────────────────────────────────┤
│  Bộ lọc:                                           │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🔍 Tìm theo Tên đăng nhập, Họ tên, Email... │ │
│  └──────────────────────────────────────────────┘ │
│  [Lọc theo Trạng thái ▼] [Lọc theo Quyền hạn ▼]  │
│                          [Tìm kiếm] [Xóa lọc]     │
├────────────────────────────────────────────────────┤
│  Bảng danh sách:                                   │
│  ┌──┬──────────┬────────┬───────┬─────┬──────┬──┐│
│  │ID│Username  │Họ tên  │Email  │SĐT  │Role  │..││
│  ├──┼──────────┼────────┼───────┼─────┼──────┼──┤│
│  │1 │admin     │Admin   │a@.com │0123 │ADMIN │👁✏🔄🗑││
│  │2 │sale01    │Sale 1  │s@.com │0456 │SALE  │👁✏🔄🗑││
│  └──┴──────────┴────────┴───────┴─────┴──────┴──┘│
├────────────────────────────────────────────────────┤
│  1-20 / 100    [20 ▼]    [◀ 1 2 3 ▶]             │
└────────────────────────────────────────────────────┘
```

### 4.2 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng |
|------------|-----|---------|-----------|
| 👁 | Xem | Xanh dương | Xem chi tiết (chế độ chỉ đọc) |
| ✏️ | Sửa | Xanh dương | Chỉnh sửa thông tin |
| 🔄 | Reset Password | Cam | Reset mật khẩu về mặc định |
| 🗑️ | Xóa | Đỏ | Xóa nhân viên |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới nhân viên

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không nhập Tên đăng nhập | "Vui lòng nhập đủ thông tin" |
| Không nhập Mật khẩu | "Vui lòng nhập đủ thông tin" |
| Không chọn Quyền hạn | "Vui lòng nhập đủ thông tin" |
| Tên đăng nhập đã tồn tại | "Tên đăng nhập đã tồn tại" |

### 5.2 Khi xóa nhân viên

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Tự xóa chính mình | "Không thể tự xóa chính mình" |

### 5.3 Khi truy cập module

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không phải ADMIN | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Chỉ Quản trị viên (ADMIN)** mới có quyền truy cập module này
2. ✅ **Tên đăng nhập phải duy nhất** trong toàn hệ thống
3. ✅ **Tên đăng nhập không thể sửa** sau khi tạo
4. ✅ **Mật khẩu không thể sửa** qua form Chỉnh sửa (Phải dùng Reset mật khẩu)
5. ✅ **Không thể tự xóa chính mình**
6. ✅ **Mật khẩu reset mặc định là `123`**

### 6.2 Quy tắc mặc định

- Trạng thái mặc định khi tạo mới: **Hoạt động**
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Phân trang mặc định: **20 bản ghi/trang**

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của module Quản lý Nhân viên.**
