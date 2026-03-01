# Tài Liệu Nghiệp Vụ: Quản Lý Khai Báo (Declaration)

> **Mục đích**: Mô tả các chức năng nghiệp vụ của màn Khai báo theo yêu cầu mới nhất (được tạo tự động từ Mặt hàng)
> **Ngày cập nhật**: 2026-03-01

---

## 1. Tổng Quan Module

### 1.1 Mục đích
Quản lý thông tin khai báo hải quan nhập khẩu cho từng mặt hàng cụ thể. Đây là công đoạn nối tiếp sau khi một Mã hàng và các Mặt hàng con đã được tạo trên hệ thống. 

### 1.2 Cơ chế tạo mới tự động (Auto-creation)
Bản ghi "Khai báo" (Declaration) **không được tạo thủ công** bắt đầu từ số không. Thay vào đó, mỗi khi hệ thống sinh ra một bản ghi "Mặt hàng" mới, hệ thống sẽ tự động khởi tạo lưu trữ 1 bản ghi "Khai báo" tương ứng (có liên kết tới Mã hàng và Mặt hàng đó).
Người dùng quản lý chỉ vào màn hình Khai báo để Cập nhật các thông tin chi tiết (thêm ảnh, nhập giá trị, thuế...).

### 1.3 Đối tượng người dùng
- Admin, Kế toán: được phép xem và chỉnh sửa thông tin Khai báo.
- Các roles khác: tùy chỉnh (mặc định chỉ xem).

---

## 2. Thông tin chi tiết các trường Dữ liệu

| STT | Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả & Quy tắc tính (Nếu có) |
|---|---|---|---|---|
| 1 | **Mã hàng (ID)** | Reference | Có | Mã hàng tổng. Duplicate lưu ở bảng Khai báo để tăng performance query khi filter theo lô |
| 2 | **Mặt hàng (ID)** | Reference | Có | Mặt hàng chi tiết tương ứng |
| 3 | **Ảnh hàng hóa** | Upload | Không | Tối đa 3 ảnh. Khi uploaded đủ 3 ảnh thì hệ thống phải ẩn/bỏ nút upload đi. |
| 4 | **Tem chính** | Text Area | Không | |
| 5 | **Tem phụ** | Text Area | Không | |
| 6 | **Số lượng sản phẩm** | Integer | Không | |
| 7 | **Quy cách** | String | Không | |
| 8 | **Mô tả sản phẩm** | Text Area | Không | |
| 9 | **Nhãn hiệu** | String | Không | |
| 10 | **Mã số thuế đơn vị bán hàng** | String | Không | |
| 11 | **Tên công ty bán hàng** | String | Không | |
| 12 | **Nhu cầu khai báo** | String | Không | |
| 13 | **Số lượng khai báo** | Integer | Không | |
| 14 | **Giá xuất hóa đơn (trước VAT)**| Integer | Không | Đơn vị: VND |
| 15 | **Tổng giá trị lô hàng (trước VAT)**| Integer | **Disabled** | **Tự động tính** = `Giá xuất hóa đơn (trước VAT)` × `Số lượng khai báo` |
| 16 | **Thuế nhập khẩu** | Float | Không | Đơn vị phần trăm (%) |
| 17 | **Thuế VAT**| Float | Không | Đơn vị phần trăm (%) |
| 18 | **Thuế nhập khẩu phải nộp** | Integer | **Disabled** | **Tự động tính** = `Tổng giá trị lô hàng (trước VAT)` × `Thuế nhập khẩu` / 100. Đơn vị VND |
| 19 | **Thuế VAT phải nộp** | Integer | **Disabled** | **Tự động tính** = `Tổng giá trị lô hàng (trước VAT)` × `Thuế VAT` / 100. Đơn vị VND |
| 20 | **Phí phải nộp** | Integer | Không | Đơn vị VND |
| 21 | **Ghi chú** | Text Area | Không | |
| 22 | **Phí ủy thác**| Integer | Không | Đơn vị VND |
| 23 | **Chi phí NK hàng hóa đến tay KH** | Integer | **Disabled** | **Tự động tính** = `Cước TQ_HN tạm tính` (từ bảng mặt hàng) + `Thuế nhập khẩu phải nộp` + `Thuế VAT phải nộp` + `Phí phải nộp` + `Phí ủy thác`. Đơn vị VND |

---

## 3. Các đặc tính xử lý giao diện hiển thị (Frontend)

1. **Auto Calculation (Tính toán thời gian thực)**: Giao diện chỉnh sửa Declaration phải lắng nghe thay đổi của các trường đầu vào (Như giá xuất hóa đơn, hệ số thuế...) để ngay lập tức hiển thị dữ liệu cho các trường được gán nhãn **Disabled** (Trường 15, 18, 19, 23).
2. **Luồng Cước TQ_HN Tạm tính**: Hệ thống cần móc nối được dữ liệu đã lưu ở đối tượng Mặt Hàng (ProductItem) của nó để nhặt con số `Cước TQ_HN tạm tính của mặt hàng` vào xử lý phép cộng gộp kết quả cho thuộc tính số [23].
