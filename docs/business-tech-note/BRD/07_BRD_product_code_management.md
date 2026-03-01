# Tài Liệu Nghiệp Vụ: Quản Lý Mã Hàng (Cập nhật - Master/Detail)

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Quản lý Mã hàng theo yêu cầu mới dựa trên cấu trúc Master-Detail
> **Ngày cập nhật**: 2026-02-28

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Màn **Mã hàng** cho phép quản lý thông tin các lô hàng vận chuyển từ Trung Quốc về Việt Nam, được thiết kế lại theo cấu trúc Master-Detail: Một đối tượng "Mã hàng" (Master) sẽ bao gồm thông tin tổng hợp và một bảng danh sách các "Mặt hàng" (Detail) bên trong.

### 1.2 Cấu trúc cơ sở dữ liệu mới (Phác thảo)
1. **Đối tượng quản lý chính (Mã hàng - Master)**: Giữ vai trò lô quản lý tổng.
2. **Đối tượng con (Danh sách mặt hàng - Detail)**: Quản lý chi tiết từng món hàng, kiện hàng đóng góp vào cấu thành Mã hàng đó.

> **Lưu ý Quan Trọng Về Tích Hợp (Integration)**: Khi tạo mới một "Mã hàng" kèm theo danh sách các "Mặt hàng", hệ thống sẽ **đồng thời tạo mới tự động** một bản ghi "Khai báo" (Declaration) tương ứng cho **mỗi mặt hàng** đó, để thuận tiện cho chuỗi cung ứng phía sau.

---

## 2. Thông Tin Chi Tiết Các Trường Dữ Liệu

### 2.1 Mã Hàng (Master)
Đối tượng Quản lý mã hàng với các trường thông tin sau:

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | **Nhân viên** | Selection box | Bắt buộc | Chọn thông tin từ danh sách nhân viên |
| 2 | **Mã khách hàng** | Selection box | Bắt buộc | Chọn từ danh sách khách hàng như hiện tại |
| 3 | **Ngày nhập kho** | Date | | Ngày hàng nhập kho |
| 4 | **Mã đơn hàng** | String | Bắt buộc | Mã đơn hàng (tương tự hiện tại) |
| 5 | **Tổng trọng lượng** | Integer | | Đơn vị: kg |
| 6 | **Tổng khối lượng** | Float | | Đơn vị: m³ |
| 7 | **Nguồn cung cấp thông tin (Kg.m3)**| String | | Thông tin nguồn cung cấp |
| 8 | **Tổng cước vận chuyển TQ_HN tạm tính**| Float | Disabled | Tự động tính tổng từ các mặt hàng. Hiển thị Tooltip công thức tính. |
| 9 | **Tỷ giá** | Float | | Tỷ giá RMB / VND |
| 10 | **Trạng thái hàng** | Selection box | | Lấy thông tin từ tình trạng hàng hóa (trong menu cài đặt, tức là tham chiếu Table/Entity) |

**Cơ chế Tính toán cho [8] Tổng cước vận chuyển TQ_HN tạm tính:**
Hệ thống lấy thông tin từ danh sách mặt hàng của mã hàng, dựa vào cước tính toán của từng mặt hàng:
- Với mỗi mặt hàng: Tính **Cước TQ_HN tạm tính** = `MAX(Khối lượng × Cước khối, Trọng lượng × Cước cân) + (Phí nội địa + Phí kéo hàng + Phí dỡ hàng) × Tỷ giá`.
- Cước tổng lô (**Tổng cước TQ_HN tạm tính**) = Cộng dồn tổng các `Cước TQ_HN tạm tính` của tất cả các mặt hàng.

### 2.2 Danh Sách Các Mặt Hàng (Detail)
Mỗi mã hàng bao gồm một tập hợp các đối tượng Mặt hàng, thông tin bao gồm:

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | **Tên mặt hàng** | String | | Tên của mặt hàng |
| 2 | **Số kiện** | Integer | | |
| 3 | **Đơn vị kiện** | Selection box | | Cấu hình list cứng (Enum): Không đóng gói, Bao tải, Thùng carton, Pallet |
| 4 | **Trọng lượng** | Integer | | Đơn vị: kg |
| 5 | **Khối lượng** | Float | | Đơn vị: m³ |
| 6 | **Đơn giá cước TQ_HN (khối)**| Integer | | Đơn vị: VND |
| 7 | **Đơn giá cước TQ_HN (cân)** | Integer | | Đơn vị: VND |
| 8 | **Phí nội địa** | Float | | Đơn vị: RMB. |
| 9 | **Phí kéo hàng** | Float | | Đơn vị: RMB. |
| 10 | **Phí dỡ hàng** | Float | | Đơn vị: RMB. |
| 11 | **Cước TQ_HN tạm tính** | Float | Disabled | Tự động tính toán theo công thức từ các loại phí của mặt hàng. Đơn vị: VND |
| 12 | **Ghi chú** | Text Area | | Các chú thích về mặt hàng (String) |

---

## 3. Quy Tắc Xác Thực (Validation Rules) - BE & FE

### 3.1 Quy Tắc Selection Box Data (Dropdowns)
Dựa theo Rule chuẩn hóa đã chốt: Khi một trường là dropdown (Selection Box), có thể nguồn dữ liệu rơi vào hai trường hợp:
1. Lấy data từ Table khác (Entity Relation): `Nhân viên`, `Mã khách hàng`, `Trạng thái hàng`.
2. Lấy data Hard-code Value (Enum Value): `Đơn vị kiện`.

👉 **QUY TẮC BACKEND**: Backend BẮT BUỘC phải thực hiện validate để kiểm tra giá trị truyền lên từ Frontend.
- Với Entity Relation phải đảm bảo ID thực sự tồn tại trong Table được liên kết.
- Với Enum Value phải đảm bảo giá trị nằm chính xác trong list hằng số đã được cấu hình của hệ thống.
- Tuyệt đối không được bỏ qua check validation, nhầm bảo vệ an toàn toàn vẹn dữ liệu cho DB.

### 3.2 Quy Tắc Số Học Của Frontend (Numerical Field Data Types)
- **Các trường kiểu Integer (Số nguyên)**: Ví dụ: Trog lượng, Số kiện, VNĐ. Chỉ được nhập và hiển thị toàn là số nguyên, không có phần thập phân.
- **Các trường kiểu Float (Số thực)**: Ví dụ: Khối lượng, RMB, Tỷ giá. Luôn format để view với chuẩn 2 số lẻ thập phân, và step thay đổi cũng hỗ trợ các mức thập phân nhỏ.

### 3.3 Đảm Bảo Real-time Thống Kê Giao Diện
- Frontend phải lập tức lắng nghe những thay đổi vào Detail của Danh sách các Mặt hàng để recalculate lại field Auto **"Tổng cước vận chuyển TQ_HN tạm tính"** và hiển thị con số ngay trên form trước khi Save.
