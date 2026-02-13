# Tài Liệu Nghiệp Vụ: Quản Lý Loại Hàng

> **Mục đích**: Mô tả các chức năng nghiệp vụ của menu Loại hàng (Category)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Menu **Loại hàng** cho phép quản lý danh sách các loại hàng hóa trong hệ thống, bao gồm thông tin tên loại hàng và trạng thái sẵn sàng.

### 1.2 Các chức năng chính
1. Xem danh sách loại hàng (có phân trang, tìm kiếm, lọc)
2. Thêm mới loại hàng
3. Xem chi tiết loại hàng (chế độ chỉ đọc)
4. Chỉnh sửa thông tin loại hàng
5. Xóa loại hàng

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền tạo, sửa, xóa loại hàng
- **Các nhân viên khác**: Chỉ có quyền **xem** danh sách loại hàng (không thể tạo, sửa, xóa)

---

## 2. Thông Tin Loại Hàng

Mỗi loại hàng bao gồm các thông tin sau:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| **ID** | Số | - | Mã loại hàng (tự động tăng) |
| **Tên loại hàng** | Text | ✅ Có | Tên của loại hàng |
| **Trạng thái** | Switch | ✅ Có | Trạng thái sẵn sàng: AVAILABLE (Sẵn sàng) / UNAVAILABLE (Không sẵn sàng) |
| **Ngày tạo** | DateTime | - | Thời gian tạo loại hàng (tự động, định dạng: DD/MM/YYYY HH:mm) |

### 2.1 Trạng thái loại hàng

- **AVAILABLE** (Sẵn sàng): Loại hàng đang hoạt động và có thể sử dụng
- **UNAVAILABLE** (Không sẵn sàng): Loại hàng tạm ngưng hoạt động hoặc không khả dụng

---

## 3. Chức Năng Chi Tiết

### 3.1 Xem Danh Sách Loại Hàng

#### Mô tả
Hiển thị danh sách tất cả các loại hàng trong hệ thống dưới dạng bảng, có hỗ trợ phân trang, tìm kiếm và lọc.

#### Thông tin hiển thị trên bảng

| Cột | Mô tả |
|-----|-------|
| **ID** | Mã loại hàng (tự động tăng) |
| **Tên loại hàng** | Tên của loại hàng (hiển thị đậm) |
| **Trạng thái** | AVAILABLE (màu xanh) / UNAVAILABLE (màu đỏ) |
| **Ngày tạo** | Thời gian tạo (định dạng: DD/MM/YYYY HH:mm) |
| **Thao tác** | Nút Xem, Nút Sửa, Nút Xóa (Sửa/Xóa chỉ hiện với ADMIN) |

#### Tính năng tìm kiếm và lọc

**1. Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, chiếm toàn bộ chiều ngang
- **Chức năng**: Tìm kiếm theo **tên loại hàng**
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

**2. Lọc theo Trạng thái**
- **Loại**: Dropdown (Hộp chọn)
- **Các lựa chọn**:
  - Tất cả (mặc định)
  - Sẵn sàng (AVAILABLE)
  - Không sẵn sàng (UNAVAILABLE)

**3. Nút thao tác**
- **Tìm kiếm**: Áp dụng các bộ lọc đã chọn
- **Xóa lọc**: Reset tất cả bộ lọc về mặc định

#### Phân trang
- **Số bản ghi mỗi trang**: 10 (mặc định), có thể chọn 20 hoặc 30
- **Hiển thị**: "1-10 / 50" (Từ bản ghi 1 đến 10, tổng 50 bản ghi)
- **Điều hướng**: Nút Previous, Next, và các số trang

---

### 3.2 Thêm Mới Loại Hàng

#### Mô tả
Cho phép quản trị viên tạo loại hàng mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"+ Thêm mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal)
3. Nhập đầy đủ thông tin bắt buộc
4. Click nút **"Lưu"**

#### Form nhập liệu

| Trường | Loại | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| Tên loại hàng | Text input | ✅ | Tên của loại hàng |
| Trạng thái | Switch (Bật/Tắt) | ✅ | Trạng thái sẵn sàng. Mặc định: Sẵn sàng (AVAILABLE) |

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền tạo loại hàng
- Trạng thái mặc định khi tạo mới: **AVAILABLE** (Sẵn sàng)
- Sau khi tạo thành công → Danh sách loại hàng tự động cập nhật

---

### 3.3 Xem Chi Tiết Loại Hàng

#### Mô tả
Cho phép xem thông tin chi tiết của loại hàng ở chế độ **chỉ đọc** (không thể chỉnh sửa).

#### Cách thực hiện
1. Tại dòng loại hàng cần xem, click nút **"Xem"** (biểu tượng mắt)
2. Hệ thống hiển thị form với tất cả thông tin
3. Tất cả các trường đều ở chế độ **chỉ đọc** (disabled)
4. Không có nút "Lưu"

#### Mục đích
- Xem thông tin loại hàng mà không lo chỉnh sửa nhầm
- Kiểm tra thông tin trước khi quyết định sửa hoặc xóa

---

### 3.4 Chỉnh Sửa Thông Tin Loại Hàng

#### Mô tả
Cho phép quản trị viên cập nhật thông tin của loại hàng đã có.

#### Cách thực hiện
1. Tại dòng loại hàng cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết
4. Click nút **"Lưu"**

#### Form chỉnh sửa

| Trường | Có thể sửa? | Ghi chú |
|--------|-------------|---------|
| Tên loại hàng | ✅ Có | Có thể thay đổi |
| Trạng thái | ✅ Có | Có thể chuyển đổi giữa Sẵn sàng / Không sẵn sàng |

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền sửa loại hàng
- Sau khi sửa thành công → Danh sách loại hàng tự động cập nhật

---

### 3.5 Xóa Loại Hàng

#### Mô tả
Cho phép quản trị viên xóa loại hàng khỏi hệ thống.

#### Cách thực hiện
1. Tại dòng loại hàng cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa?"
3. Click **"Yes"** để xác nhận xóa, hoặc **"No"** để hủy thao tác
4. Nếu xác nhận → Loại hàng bị xóa khỏi hệ thống

#### Quy tắc nghiệp vụ
- **Chỉ ADMIN** mới có quyền xóa loại hàng
- Sau khi xóa thành công → Danh sách loại hàng tự động cập nhật

#### Lưu ý
- Thao tác xóa là **vĩnh viễn**, không thể khôi phục
- Cần cân nhắc kỹ trước khi xóa

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc màn hình

```
┌────────────────────────────────────────────────────────┐
│  Loại hàng                     [+ Thêm mới]            │  ← Chỉ ADMIN
├────────────────────────────────────────────────────────┤
│  Bộ lọc:                                               │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🔍 Tìm theo Tên loại hàng...                   │   │
│  └────────────────────────────────────────────────┘   │
│  [Lọc theo Trạng thái ▼]                              │
│                              [Tìm kiếm] [Xóa lọc]     │
├────────────────────────────────────────────────────────┤
│  Bảng danh sách:                                       │
│  ┌──┬──────────────┬────────────┬──────────────┬────┐│
│  │ID│Tên loại hàng │Trạng thái  │Ngày tạo      │Thao││
│  │  │              │            │              │tác ││
│  ├──┼──────────────┼────────────┼──────────────┼────┤│
│  │1 │Điện tử       │✓ Sẵn sàng  │13/02/2026    │👁✏️🗑││
│  │2 │Thực phẩm     │✗ Không SS  │12/02/2026    │👁✏️🗑││
│  └──┴──────────────┴────────────┴──────────────┴────┘│
├────────────────────────────────────────────────────────┤
│  1-10 / 50    [10 ▼]    [◀ 1 2 3 ▶]                  │
└────────────────────────────────────────────────────────┘
```

### 4.2 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn | Điều kiện hiển thị |
|------------|-----|---------|-----------|-----------|-------------------|
| ➕ | Thêm mới | Xanh dương | Tạo loại hàng mới | Chỉ ADMIN | Luôn hiển thị |
| 👁 | Xem | Xanh dương | Xem chi tiết (chế độ chỉ đọc) | Tất cả | Luôn hiển thị |
| ✏️ | Sửa | Xanh dương | Chỉnh sửa thông tin loại hàng | Chỉ ADMIN | Luôn hiển thị (disabled nếu không phải ADMIN) |
| 🗑️ | Xóa | Đỏ | Xóa loại hàng | Chỉ ADMIN | Chỉ hiện với ADMIN |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi thêm mới loại hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không nhập Tên loại hàng | "Vui lòng nhập đủ thông tin" |

### 5.2 Khi chỉnh sửa loại hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Loại hàng không tồn tại | "Loại hàng không tồn tại" |

### 5.3 Khi xóa loại hàng

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Loại hàng không tồn tại | "Loại hàng không tồn tại" |

### 5.4 Khi truy cập chức năng ADMIN

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không phải ADMIN cố tạo/sửa/xóa | "Bạn không có quyền thực hiện thao tác này" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Chỉ Quản trị viên (ADMIN)** mới có quyền tạo, sửa, xóa loại hàng
2. ✅ **Các nhân viên khác** chỉ có quyền **xem** danh sách loại hàng
3. ✅ **Trạng thái mặc định** khi tạo mới: **AVAILABLE** (Sẵn sàng)

### 6.2 Quy tắc mặc định

- Trạng thái mặc định khi tạo mới: **AVAILABLE** (Sẵn sàng)
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Phân trang mặc định: **10 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)

### 6.3 Quy tắc hiển thị

- Trạng thái AVAILABLE: Tag màu xanh, hiển thị "Sẵn sàng"
- Trạng thái UNAVAILABLE: Tag màu đỏ, hiển thị "Không sẵn sàng"
- Tên loại hàng: Hiển thị đậm
- Ngày tạo: Định dạng DD/MM/YYYY HH:mm
- Nút Xem: Luôn hiển thị cho tất cả người dùng
- Nút Sửa: Disabled (vô hiệu hóa) nếu không phải ADMIN
- Nút Xóa: Chỉ hiển thị nếu là ADMIN

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của menu Loại hàng (Category).**
