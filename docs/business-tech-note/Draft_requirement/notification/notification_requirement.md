# Yêu cầu chức năng: Hệ thống thông báo (Notification)

## 1. Tổng quan

Hệ thống thông báo nội bộ cho phép nhân viên (Admin, Sale, Chứng từ) nhận thông báo real-time về các sự kiện trong luồng xử lý tư vấn khách hàng.

---

## 2. Giao diện

- Thêm icon chuông cạnh avatar người dùng trên header
- Số lượng thông báo chưa đọc hiển thị trên tab của browser (dạng `(N) 3T Group Management`)
- Click vào chuông → sổ danh sách thông báo dạng dropdown
- Có nút "Đánh dấu tất cả là đã đọc"
- Có link "Xem tất cả" dẫn đến trang lịch sử thông báo

---

## 3. Hành vi thông báo

- FE polling mỗi 5 giây để kiểm tra thông báo mới (badge count)
- Khi có thông báo mới → badge đỏ trên icon chuông + cập nhật tab title
- Click vào thông báo → chuyển hướng đến menu "Tư vấn khách hàng" và tự động mở popup chi tiết câu hỏi tương ứng → đánh dấu thông báo là đã đọc

---

## 4. Phân loại thông báo theo sự kiện

| Sự kiện | Admin / Sale | Nhân viên chứng từ |
|---|---|---|
| Có câu hỏi mới từ khách | ✅ | ❌ |
| Admin/Sale approve câu hỏi (lần 1) | ❌ | ✅ (lúc này mới biết có câu hỏi cần trả lời) |
| Nhân viên chứng từ cập nhật câu trả lời | ✅ | ❌ |
| Admin/Sale reject câu trả lời (lần 2) | ❌ | ✅ (nhận notification để biết cần sửa lại) |

---

## 5. Trang lịch sử thông báo

- URL: `/notification-history`
- Hiển thị toàn bộ lịch sử thông báo (đọc + chưa đọc)
- Phân biệt trạng thái đọc/chưa đọc bằng màu sắc
- Hỗ trợ load more (phân trang)
- Click vào thông báo chưa đọc → đánh dấu đã đọc + điều hướng đến câu hỏi tương ứng

---

## 6. Ghi chú kỹ thuật

- Tái sử dụng và mở rộng cơ chế notification hiện có
- Thêm `type = 'INQUIRY'` và `refId = inquiry.id` để phân biệt loại thông báo
- Nội dung thông báo hỗ trợ đa ngôn ngữ (vi/zh)
- Giữ nguyên kiến trúc: bảng `Notification` trong DB

# review implement 1
- bạn cho cái thanh notification khi click vào hình chuông dài ra một tý và cho nút xem tất cả pin vào dưới cùng để người dùng đỡ phải scroll to end mới có thể click vào nút đó
- hiện tại đang có lỗi là click vào 1 notification thì tất cả các unread notifications đều đc marked là read