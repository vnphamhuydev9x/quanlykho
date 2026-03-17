Version: v1.0.0

# Functional Requirements

## 1. Giao diện

- Icon chuông hiển thị cạnh avatar người dùng trên header.
- Số lượng thông báo chưa đọc hiển thị trên tab browser (dạng `(N) 3T Group Management`).
- Click vào chuông → mở dropdown danh sách thông báo. Dropdown có **chiều cao đủ lớn** (không quá ngắn).
- Nút "Đánh dấu tất cả là đã đọc" hiển thị trong dropdown.
- Nút "Xem tất cả" **được pin (sticky) ở dưới cùng** của dropdown — người dùng không cần scroll đến cuối mới thấy.
- Có trang lịch sử thông báo tại `/notification-history`.

## 2. Hành vi thông báo

- FE polling mỗi 5 giây để kiểm tra thông báo mới.
- Khi có thông báo mới: badge đỏ trên icon chuông + cập nhật tab title.
- Click vào thông báo:
  - Đánh dấu **chỉ thông báo đó** là đã đọc (không ảnh hưởng các thông báo khác).
  - Nếu là thông báo về inquiry: điều hướng đến `/customer-inquiry?inquiryId={id}` và tự động mở popup chi tiết câu hỏi.

## 3. Trang lịch sử thông báo (`/notification-history`)

- Hiển thị toàn bộ lịch sử thông báo (đọc + chưa đọc).
- Phân biệt trạng thái đọc/chưa đọc bằng màu nền.
- Thông báo được nhóm theo ngày.
- Hỗ trợ load more (phân trang).
- Click vào thông báo chưa đọc: đánh dấu đã đọc + điều hướng đến nội dung tương ứng (nếu là inquiry).

# Nonfunctional Requirements

## 1. Đa ngôn ngữ

- Nội dung thông báo hỗ trợ Tiếng Việt và Tiếng Trung. FE hiển thị theo ngôn ngữ hiện tại của người dùng.

## 2. Phân trang

- Trang lịch sử thông báo: phân trang với nút load more.
- Dropdown: hiển thị N thông báo gần nhất, sắp xếp mới nhất lên đầu.
