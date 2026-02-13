# Tài Liệu Nghiệp Vụ: Quản Lý Xếp Xe

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Xếp xe (Manifest)  
> **Ngày tạo**: 2026-02-13

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Xếp xe** cho phép quản lý các chuyến xe vận chuyển hàng hóa từ Trung Quốc về Việt Nam. Mỗi chuyến xe chứa nhiều kiện hàng (Product Codes), giúp theo dõi và quản lý quá trình vận chuyển.

### 1.2 Các chức năng chính
1. **Trang Danh sách chuyến xe**:
   - Xem danh sách các chuyến xe (có phân trang, tìm kiếm)
   - Tạo chuyến xe mới
   - Sửa thông tin chuyến xe
   - Xóa chuyến xe (soft delete)

2. **Trang Chi tiết chuyến xe**:
   - Xem danh sách hàng hóa trong chuyến
   - Thêm hàng vào chuyến (từ danh sách hàng chờ xếp xe)
   - Xóa hàng khỏi chuyến
   - Xuất Excel danh sách hàng trong chuyến
   - Hiển thị tổng hợp số kiện, trọng lượng, khối lượng

### 1.3 Đối tượng sử dụng
- **Quản trị viên (ADMIN)**: Có toàn quyền quản lý chuyến xe
- **Nhân viên (SALE, USER)**: Có toàn quyền quản lý chuyến xe
- **Khách hàng (CUSTOMER)**: KHÔNG có quyền truy cập màn này

---

## 2. Cấu Trúc Dữ Liệu

### 2.1 Thông tin Chuyến xe (Manifest)

| STT | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|------------|--------------|----------|-------|
| 1 | **ID** | Number (Auto) | ✅ | Mã chuyến xe (tự động tăng) |
| 2 | **Tên chuyến** | Text | ✅ | Tên chuyến xe (VD: "Chuyến HN 02/02") |
| 3 | **Ngày xếp xe** | Date | ✅ | Ngày xếp hàng lên xe |
| 4 | **Ghi chú** | TextArea | - | Ghi chú thêm về chuyến xe |
| 5 | **Trạng thái** | Dropdown | - | OPEN / CLOSED / SHIPPED |
| 6 | **Số kiện hàng** | Number (Auto) | - | Số lượng kiện hàng trong chuyến (tự động đếm) |

### 2.2 Trạng thái chuyến xe

| Trạng thái | Mô tả | Màu sắc |
|------------|-------|---------|
| **OPEN** | Chuyến xe đang mở, có thể thêm/xóa hàng | Xanh lá (green) |
| **CLOSED** | Chuyến xe đã đóng, không thể thêm/xóa hàng | Xanh dương (blue) |
| **SHIPPED** | Chuyến xe đã xuất phát | Cam (orange) |

### 2.3 Thông tin Hàng hóa trong chuyến (8 cột)

Mỗi chuyến xe chứa nhiều kiện hàng (Product Codes), hiển thị **8 cột thông tin chính**:

| STT | Mã Excel | Tên cột | Nguồn dữ liệu | Mô tả |
|-----|----------|---------|---------------|-------|
| 1 | [A] | **Mã KH** | `customerCodeInput` hoặc `customer.customerCode` | Mã khách hàng |
| 2 | [B] | **Tên hàng** | `productName` | Tên sản phẩm/hàng hóa |
| 3 | [C] | **Mã đơn** | `orderCode` | Mã đơn hàng |
| 4 | [D] | **Số kiện** | `packageCount` | Số lượng kiện hàng |
| 5 | [E] | **Đóng gói** | `packing` | Đơn vị đóng gói (Thùng cotton / Pallet / Chiếc) |
| 6 | [F] | **TL (Kg)** | `weight` | Trọng lượng (đơn vị: Kg) |
| 7 | [G] | **KL (m³)** | `volume` | Khối lượng (đơn vị: m³) |
| 8 | [H] | **Ảnh** | `images` | Hiển thị Tag "Có ảnh" nếu có ảnh |

---

## 3. Chức Năng Chi Tiết

## 3.1 Trang Danh Sách Chuyến Xe

### 3.1.1 Xem Danh Sách Chuyến Xe

#### Mô tả
Hiển thị danh sách tất cả các chuyến xe trong hệ thống dưới dạng bảng.

#### Thông tin hiển thị trên bảng

| Cột | Nội dung | Mô tả |
|-----|----------|-------|
| **ID** | Mã chuyến xe | Mã tự động tăng |
| **Tên chuyến** | Tên chuyến xe | VD: "Chuyến HN 02/02" |
| **Ngày xếp** | Ngày xếp xe | Định dạng DD/MM/YYYY |
| **Số kiện hàng** | Số lượng kiện | Đếm tự động từ `_count.productCodes` |
| **Trạng thái** | Trạng thái chuyến | Tag màu sắc (OPEN / CLOSED / SHIPPED) |
| **Ghi chú** | Ghi chú | Ghi chú thêm |
| **Hành động** | Nút thao tác | Chi tiết, Sửa, Xóa |

#### Tính năng tìm kiếm

**Ô tìm kiếm (Search Box)**
- **Vị trí**: Phía trên bảng, bên phải
- **Chức năng**: Tìm kiếm theo **tên chuyến xe**
- **Cách hoạt động**: Nhập từ khóa → Nhấn Enter hoặc click nút "Tìm kiếm"

#### Phân trang
- **Số bản ghi mỗi trang**: 20 (mặc định)
- **Sắp xếp**: Mới nhất trước (theo ngày tạo giảm dần)

#### Định dạng hiển thị
- **Ngày xếp**: Định dạng DD/MM/YYYY
- **Trạng thái**: Tag màu sắc
  - OPEN: Xanh lá (green)
  - CLOSED: Xanh dương (blue)
  - SHIPPED: Cam (orange)

---

### 3.1.2 Tạo Chuyến Xe Mới

#### Mô tả
Cho phép người dùng (ADMIN, SALE, USER) tạo chuyến xe mới trong hệ thống.

#### Cách thực hiện
1. Click nút **"Tạo chuyến mới"** ở góc phải trên cùng
2. Hệ thống hiển thị form nhập liệu dạng popup (Modal)
3. Nhập thông tin vào các trường:
   - **Tên chuyến** (bắt buộc): VD: "Chuyến HN 02/02"
   - **Ngày xếp xe** (bắt buộc): Chọn ngày (mặc định là ngày hiện tại)
   - **Ghi chú** (tùy chọn): Ghi chú thêm
4. Click nút **"OK"** để lưu

#### Quy tắc nghiệp vụ

**1. Trường bắt buộc**
- **Tên chuyến**: Phải nhập
- **Ngày xếp xe**: Phải chọn (mặc định là ngày hiện tại)

**2. Trạng thái mặc định**
- Khi tạo mới, trạng thái mặc định là **OPEN**

**3. Quyền hạn**
- **ADMIN, SALE, USER** có quyền tạo chuyến xe
- **CUSTOMER** KHÔNG có quyền truy cập màn này

**4. Sau khi tạo thành công**
- Danh sách chuyến xe tự động cập nhật
- Hiển thị thông báo: "Tạo mới thành công"

---

### 3.1.3 Sửa Thông Tin Chuyến Xe

#### Mô tả
Cho phép người dùng cập nhật thông tin của chuyến xe đã có.

#### Cách thực hiện
1. Tại dòng chuyến xe cần sửa, click nút **"Sửa"** (biểu tượng bút chì)
2. Hệ thống hiển thị form với thông tin hiện tại đã được điền sẵn
3. Chỉnh sửa các trường cần thiết:
   - **Tên chuyến**
   - **Ngày xếp xe**
   - **Ghi chú**
   - **Trạng thái** (OPEN / CLOSED / SHIPPED)
4. Click nút **"OK"** để lưu

#### Quy tắc nghiệp vụ

**1. Quyền hạn**
- **ADMIN, SALE, USER** có quyền sửa chuyến xe
- **CUSTOMER** KHÔNG có quyền truy cập màn này

**2. Thay đổi trạng thái**
- Có thể thay đổi trạng thái từ OPEN → CLOSED → SHIPPED
- **Lưu ý**: Khi trạng thái là CLOSED hoặc SHIPPED, nên hạn chế thêm/xóa hàng (tùy logic nghiệp vụ)

**3. Sau khi sửa thành công**
- Danh sách chuyến xe tự động cập nhật
- Hiển thị thông báo: "Cập nhật thành công"

---

### 3.1.4 Xóa Chuyến Xe

#### Mô tả
Cho phép người dùng xóa chuyến xe khỏi hệ thống (soft delete).

#### Cách thực hiện
1. Tại dòng chuyến xe cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: 
   - "Bạn có chắc chắn muốn xóa chuyến xe này?"
   - "Các kiện hàng trong chuyến sẽ được trả về trạng thái Chờ xếp xe."
3. Click **"OK"** để xác nhận xóa, hoặc **"Cancel"** để hủy thao tác
4. Nếu xác nhận → Chuyến xe bị đánh dấu xóa (soft delete)

#### Quy tắc nghiệp vụ

**1. Quyền hạn**
- **ADMIN, SALE, USER** có quyền xóa chuyến xe
- **CUSTOMER** KHÔNG có quyền truy cập màn này

**2. Xử lý hàng hóa trong chuyến**
- Khi xóa chuyến xe, **TẤT CẢ** hàng hóa trong chuyến sẽ:
  - Bị tách khỏi chuyến xe (`manifestId = null`)
  - Trạng thái quay về **CHO_XEP_XE** (Chờ xếp xe)
  - Gửi thông báo cho khách hàng về sự thay đổi trạng thái

**3. Soft delete**
- Xóa mềm (soft delete): Dữ liệu không bị xóa vĩnh viễn, chỉ đánh dấu `deletedAt`
- Chuyến xe đã xóa sẽ không hiển thị trong danh sách

**4. Sau khi xóa thành công**
- Danh sách chuyến xe tự động cập nhật
- Hiển thị thông báo: "Xóa thành công"

---

## 3.2 Trang Chi Tiết Chuyến Xe

### 3.2.1 Xem Chi Tiết Chuyến Xe

#### Mô tả
Hiển thị thông tin chi tiết của chuyến xe và danh sách hàng hóa trong chuyến.

#### Cách thực hiện
1. Tại trang Danh sách chuyến xe, click nút **"Chi tiết"** (biểu tượng mắt)
2. Hệ thống chuyển sang trang Chi tiết chuyến xe

#### Thông tin hiển thị

**1. Thông tin chuyến xe**
- **Tên chuyến**: Hiển thị ở tiêu đề (VD: "Chuyến HN 02/02")
- **Ngày xếp**: Định dạng DD/MM/YYYY
- **Trạng thái**: Tag màu sắc (OPEN / CLOSED / SHIPPED)
- **Ghi chú**: Ghi chú thêm

**2. Danh sách hàng hóa trong chuyến**
- Hiển thị dưới dạng bảng với **8 cột**:
  - **#**: Số thứ tự (tự động)
  - **1. [A] Mã KH**: Mã khách hàng
  - **2. [B] Tên hàng**: Tên sản phẩm
  - **3. [C] Mã đơn**: Mã đơn hàng
  - **4. [D] Số kiện**: Số lượng kiện
  - **5. [E] Đóng gói**: Đơn vị đóng gói
  - **6. [F] TL (Kg)**: Trọng lượng
  - **7. [G] KL (m³)**: Khối lượng
  - **8. [H] Ảnh**: Tag "Có ảnh" nếu có ảnh
  - **Thao tác**: Nút Xóa (xóa khỏi chuyến)

**3. Dòng tổng hợp (Summary Row)**
- Hiển thị ở cuối bảng, màu nền xám (#fafafa), chữ in đậm
- **Tổng số kiện**: Tổng số kiện của tất cả hàng trong chuyến
- **Tổng trọng lượng**: Tổng trọng lượng (Kg), định dạng 2 chữ số thập phân
- **Tổng khối lượng**: Tổng khối lượng (m³), định dạng 3 chữ số thập phân

#### Các nút thao tác

| Nút | Biểu tượng | Chức năng |
|-----|------------|-----------|
| **Quay lại** | ← | Quay lại trang Danh sách chuyến xe |
| **Thêm hàng** | ➕ | Mở popup chọn hàng để thêm vào chuyến |
| **Xuất Excel** | 📥 | Xuất danh sách hàng trong chuyến ra Excel |
| **Reload** | 🔄 | Tải lại dữ liệu |

---

### 3.2.2 Thêm Hàng Vào Chuyến

#### Mô tả
Cho phép người dùng thêm các kiện hàng (từ danh sách hàng chờ xếp xe) vào chuyến xe.

#### Cách thực hiện
1. Tại trang Chi tiết chuyến xe, click nút **"Thêm hàng"**
2. Hệ thống hiển thị popup "Thêm hàng vào chuyến xe" với danh sách hàng **chờ xếp xe**
3. Chọn các kiện hàng cần thêm bằng cách tick vào checkbox
4. Click nút **"Thêm đã chọn"**

#### Quy tắc nghiệp vụ

**1. Điều kiện hàng hóa được hiển thị**
- Chỉ hiển thị hàng có trạng thái **CHO_XEP_XE** (Chờ xếp xe)
- Chỉ hiển thị hàng chưa thuộc chuyến xe nào (`manifestId = null`)

**2. Bắt buộc chọn ít nhất 1 kiện**
- Nếu chưa chọn kiện nào → Hiển thị cảnh báo: "Vui lòng chọn ít nhất 1 kiện hàng"

**3. Sau khi thêm thành công**
- Các kiện hàng đã chọn sẽ:
  - Được gán vào chuyến xe (`manifestId = [id chuyến xe]`)
  - Trạng thái tự động chuyển thành **DA_XEP_XE** (Đã xếp xe)
  - Gửi thông báo cho khách hàng về sự thay đổi trạng thái
- Danh sách hàng trong chuyến tự động cập nhật
- Hiển thị thông báo: "Đã thêm hàng vào chuyến xe thành công"

**4. Thông tin hiển thị trong popup**
- Bảng hiển thị **4 cột**:
  - **Mã KH**: Mã khách hàng
  - **Tên hàng**: Tên sản phẩm
  - **Mã đơn**: Mã đơn hàng
  - **Số kiện**: Số lượng kiện
- Có phân trang (10 bản ghi/trang)
- Có checkbox để chọn nhiều kiện cùng lúc

---

### 3.2.3 Xóa Hàng Khỏi Chuyến

#### Mô tả
Cho phép người dùng xóa các kiện hàng khỏi chuyến xe.

#### Cách thực hiện
1. Tại dòng hàng hóa cần xóa, click nút **"Xóa"** (biểu tượng thùng rác, màu đỏ)
2. Hệ thống hiển thị hộp thoại xác nhận: "Bạn có chắc muốn xóa kiện hàng này khỏi chuyến xe?"
3. Click **"OK"** để xác nhận xóa, hoặc **"Cancel"** để hủy thao tác

#### Quy tắc nghiệp vụ

**1. Sau khi xóa thành công**
- Kiện hàng đã xóa sẽ:
  - Bị tách khỏi chuyến xe (`manifestId = null`)
  - Trạng thái quay về **CHO_XEP_XE** (Chờ xếp xe)
  - Gửi thông báo cho khách hàng về sự thay đổi trạng thái
- Danh sách hàng trong chuyến tự động cập nhật
- Hiển thị thông báo: "Đã xóa kiện hàng khỏi chuyến"

**2. Quyền hạn**
- **ADMIN, SALE, USER** có quyền xóa hàng khỏi chuyến
- **CUSTOMER** KHÔNG có quyền truy cập màn này

---

### 3.2.4 Xuất Dữ Liệu Excel

#### Mô tả
Cho phép người dùng xuất **TẤT CẢ** hàng hóa trong chuyến xe ra file Excel.

#### Cách thực hiện
1. Tại trang Chi tiết chuyến xe, click nút **"Xuất Excel"**
2. Nếu chuyến xe không có hàng → Hiển thị cảnh báo: "Không có dữ liệu để xuất"
3. Nếu có hàng → Hệ thống tự động tải file Excel về máy
4. Tên file: `XepXe_[Tên chuyến].xlsx`

#### Nội dung file Excel

File Excel chứa **TẤT CẢ** hàng hóa trong chuyến với các cột:

| Cột | Nội dung | Nguồn dữ liệu |
|-----|----------|---------------|
| **STT** | Số thứ tự | Tự động (1, 2, 3, ...) |
| **1. [A] Mã KH** | Mã khách hàng | `customerCodeInput` hoặc `customer.customerCode` |
| **2. [B] Tên hàng** | Tên sản phẩm | `productName` |
| **3. [C] Mã đơn** | Mã đơn hàng | `orderCode` |
| **4. [D] Số kiện** | Số lượng kiện | `packageCount` |
| **5. [E] Đóng gói** | Đơn vị đóng gói | `packing` |
| **6. [F] Trọng lượng (Kg)** | Trọng lượng | `weight` |
| **7. [G] Khối lượng (m³)** | Khối lượng | `volume` |
| **8. [H] Ảnh** | Có ảnh hay không | "Có ảnh" hoặc "Không" |

#### Quy tắc nghiệp vụ
- **ADMIN, SALE, USER** có quyền xuất Excel
- **CUSTOMER** KHÔNG có quyền truy cập màn này
- Xuất **TẤT CẢ** hàng hóa trong chuyến (không phân trang)
- Định dạng số: Theo chuẩn địa phương

---

## 4. Giao Diện Người Dùng (UI)

### 4.1 Cấu trúc Trang Danh Sách Chuyến Xe

```
┌────────────────────────────────────────────────────────────┐
│  Quản lý Xếp xe                                            │
│                    [Tìm kiếm...] [Tạo chuyến mới] [🔄]    │
├────────────────────────────────────────────────────────────┤
│  Bảng danh sách:                                           │
│  ┌──┬────────┬─────────┬────────┬────────┬────────┬────┐  │
│  │ID│Tên     │Ngày xếp │Số kiện │Trạng   │Ghi chú │Hành│  │
│  │  │chuyến  │         │hàng    │thái    │        │động│  │
│  ├──┼────────┼─────────┼────────┼────────┼────────┼────┤  │
│  │1 │Chuyến  │13/02/   │25      │[OPEN]  │        │👁✏️🗑│  │
│  │  │HN 02/02│2026     │        │        │        │    │  │
│  └──┴────────┴─────────┴────────┴────────┴────────┴────┘  │
├────────────────────────────────────────────────────────────┤
│  1-20 / 50    [20 ▼]    [◀ 1 2 3 ▶]                      │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Cấu trúc Trang Chi Tiết Chuyến Xe

```
┌────────────────────────────────────────────────────────────┐
│  [← Quay lại]                                              │
│                                                            │
│  Chuyến HN 02/02                                           │
│  Ngày xếp: 13/02/2026    Trạng thái: [OPEN]               │
│  Ghi chú: ...                                              │
│                    [➕ Thêm hàng] [📥 Xuất Excel] [🔄]     │
├────────────────────────────────────────────────────────────┤
│  Danh sách hàng hóa:                                       │
│  ┌──┬────┬────┬────┬────┬────┬────┬────┬────┬────┐       │
│  │# │Mã  │Tên │Mã  │Số  │Đóng│TL  │KL  │Ảnh │    │       │
│  │  │KH  │hàng│đơn │kiện│gói │(Kg)│(m³)│    │    │       │
│  ├──┼────┼────┼────┼────┼────┼────┼────┼────┼────┤       │
│  │1 │A001│Điện│ABC │10  │Thùng│100 │2.5 │[Có]│🗑  │       │
│  │2 │A002│Quần│DEF │15  │Pallet│150│3.2 │    │🗑  │       │
│  ├──┴────┴────┴────┼────┼────┼────┼────┴────┴────┤       │
│  │Tổng cộng         │25  │    │250 │5.700        │       │
│  └──────────────────┴────┴────┴────┴─────────────┘       │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Popup "Thêm hàng vào chuyến xe"

```
┌────────────────────────────────────────────────────────────┐
│  Thêm hàng vào chuyến xe                    [Hủy] [Thêm]  │
├────────────────────────────────────────────────────────────┤
│  ┌──┬────┬────────┬────────┬────────┐                     │
│  │☑ │Mã  │Tên hàng│Mã đơn  │Số kiện │                     │
│  ├──┼────┼────────┼────────┼────────┤                     │
│  │☑ │A003│Giày    │GHI     │20      │                     │
│  │☐ │A004│Túi xách│JKL     │30      │                     │
│  └──┴────┴────────┴────────┴────────┘                     │
│  1-10 / 50    [◀ 1 2 3 ▶]                                 │
└────────────────────────────────────────────────────────────┘
```

### 4.4 Các nút thao tác (Action Buttons)

| Biểu tượng | Tên | Màu sắc | Chức năng | Quyền hạn |
|------------|-----|---------|-----------|-----------|
| ➕ | Tạo chuyến mới | Xanh dương | Tạo chuyến xe mới | ADMIN, SALE, USER |
| 👁 | Chi tiết | Xanh dương | Xem chi tiết chuyến xe | ADMIN, SALE, USER |
| ✏️ | Sửa | Vàng | Sửa thông tin chuyến xe | ADMIN, SALE, USER |
| 🗑️ | Xóa | Đỏ (#ff4d4f) | Xóa chuyến xe | ADMIN, SALE, USER |
| ➕ | Thêm hàng | Xanh dương | Thêm hàng vào chuyến | ADMIN, SALE, USER |
| 📥 | Xuất Excel | Xanh dương | Xuất danh sách hàng ra Excel | ADMIN, SALE, USER |
| 🔄 | Reload | Xám | Tải lại dữ liệu | ADMIN, SALE, USER |

---

## 5. Các Trường Hợp Lỗi (Error Cases)

### 5.1 Khi tạo chuyến xe mới

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Không nhập tên chuyến | "Vui lòng nhập tên chuyến" |
| Không chọn ngày xếp xe | "Vui lòng chọn ngày" |

### 5.2 Khi thêm hàng vào chuyến

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Chưa chọn kiện hàng nào | "Vui lòng chọn ít nhất 1 kiện hàng" |
| Danh sách hàng chờ xếp xe trống | "Danh sách hàng hóa trống" |

### 5.3 Khi xóa hàng khỏi chuyến

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Danh sách hàng trống | "Danh sách hàng hóa trống" |

### 5.4 Khi xuất Excel

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Chuyến xe không có hàng | "Không có dữ liệu để xuất" |

### 5.5 Khi xóa chuyến xe

| Tình huống | Thông báo lỗi |
|------------|---------------|
| Chuyến xe không tồn tại | "Không tìm thấy chuyến xe" |

---

## 6. Quy Tắc Nghiệp Vụ Tổng Hợp

### 6.1 Quy tắc bắt buộc

1. ✅ **Phân quyền**:
   - ADMIN, SALE, USER: Toàn quyền quản lý chuyến xe
   - CUSTOMER: KHÔNG có quyền truy cập màn này

2. ✅ **Trường bắt buộc**: Tên chuyến, Ngày xếp xe

3. ✅ **Trạng thái mặc định**: OPEN khi tạo mới

4. ✅ **Soft delete**: Xóa mềm, không xóa vĩnh viễn

5. ✅ **Thông báo**: Tự động gửi thông báo cho khách hàng khi:
   - Thêm hàng vào chuyến (trạng thái → DA_XEP_XE)
   - Xóa hàng khỏi chuyến (trạng thái → CHO_XEP_XE)
   - Xóa chuyến xe (tất cả hàng → CHO_XEP_XE)

### 6.2 Quy tắc mặc định

- Phân trang mặc định: **20 bản ghi/trang**
- Sắp xếp: Mới nhất trước (theo ngày tạo giảm dần)
- Tìm kiếm: Không phân biệt chữ hoa/chữ thường
- Export Excel: Xuất tất cả hàng trong chuyến (không phân trang)

### 6.3 Quy tắc hiển thị

- **Ngày xếp**: Định dạng DD/MM/YYYY
- **Trạng thái**: Tag màu sắc (OPEN: green, CLOSED: blue, SHIPPED: orange)
- **Số kiện, Trọng lượng, Khối lượng**: Định dạng số với dấu phân cách thập phân
- **Dòng tổng hợp**: Màu nền xám (#fafafa), chữ in đậm
- **Ảnh**: Tag "Có ảnh" màu xanh dương nếu có ảnh

### 6.4 Quy tắc cập nhật trạng thái hàng hóa

**1. Khi thêm hàng vào chuyến**
```
Trạng thái hàng: CHO_XEP_XE → DA_XEP_XE
manifestId: null → [id chuyến xe]
```

**2. Khi xóa hàng khỏi chuyến**
```
Trạng thái hàng: DA_XEP_XE → CHO_XEP_XE
manifestId: [id chuyến xe] → null
```

**3. Khi xóa chuyến xe**
```
Tất cả hàng trong chuyến:
- Trạng thái: DA_XEP_XE → CHO_XEP_XE
- manifestId: [id chuyến xe] → null
```

---

## 7. Lưu Ý Đặc Biệt

### 7.1 Về cấu trúc dữ liệu
- Màn Xếp xe có **2 trang**:
  - Trang 1: Danh sách chuyến xe (CRUD cơ bản)
  - Trang 2: Chi tiết chuyến xe (quản lý hàng hóa trong chuyến)
- Mỗi chuyến xe chứa nhiều kiện hàng (Product Codes)
- Hiển thị **8 cột thông tin** chính của hàng hóa

### 7.2 Về hiển thị
- Trang Chi tiết có **dòng tổng hợp** (Summary Row) hiển thị:
  - Tổng số kiện
  - Tổng trọng lượng (2 chữ số thập phân)
  - Tổng khối lượng (3 chữ số thập phân)
- Dòng tổng hợp có màu nền xám, chữ in đậm

### 7.3 Về phân quyền
- **CUSTOMER KHÔNG có quyền truy cập** màn Xếp xe
- Chỉ ADMIN, SALE, USER mới có quyền quản lý chuyến xe

### 7.4 Về thông báo
- Khi thêm/xóa hàng vào/khỏi chuyến → Gửi thông báo cho khách hàng
- Khi xóa chuyến xe → Gửi thông báo cho tất cả khách hàng có hàng trong chuyến
- Thông báo được nhóm theo khách hàng (group notifications)

### 7.5 Về xuất Excel
- Xuất **TẤT CẢ** hàng hóa trong chuyến (không phân trang)
- Tên file: `XepXe_[Tên chuyến].xlsx`
- File Excel chứa 8 cột thông tin chính

### 7.6 Về trạng thái hàng hóa
- Chỉ hàng có trạng thái **CHO_XEP_XE** mới được hiển thị trong popup "Thêm hàng"
- Khi thêm vào chuyến → Trạng thái tự động chuyển thành **DA_XEP_XE**
- Khi xóa khỏi chuyến → Trạng thái quay về **CHO_XEP_XE**

---

**Tài liệu này mô tả các yêu cầu nghiệp vụ của màn Xếp xe (Manifest).**
