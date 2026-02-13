# Tài liệu Đặc tả Chức năng: Hệ thống Nhập hàng Trung Quốc (Level-based)

Tài liệu này phân chia các chức năng theo cấp độ phát triển, giúp định hướng lộ trình xây dựng sản phẩm từ MVP (Cơ bản) đến Enterprise (Cao cấp).

## Level 1: Cơ bản (Starter / MVP)
*Mục tiêu: Đủ để vận hành quy trình nhập hàng thủ công, phù hợp cho team nhỏ (1-5 người), lượng đơn ít.*

### 1. Khách hàng (User)
*   **Tài khoản & Ví**: Đăng ký/Đăng nhập cơ bản. Xem số dư ví.
*   **Đặt hàng thủ công**: Khách copy link Taobao/1688 -> Paste vào web -> Nhập màu sắc/size/giá thủ công.
*   **Quản lý đơn hàng**: Xem danh sách đơn, trạng thái đơn hàng (Đơn giản: Chờ duyệt, Đã mua, Đã về, Đã giao).
*   **Tracking**: Tra cứu mã vận đơn (Nhập text).

### 2. Quản trị (Admin)
*   **Quản lý Tỷ giá**: Cập nhật tay hàng ngày.
*   **Duyệt đơn & Báo giá**: Admin sửa giá, điền phí ship nội địa TQ thủ công.
*   **Mua hàng**: Admin cầm link đi mua ngoài, về update trạng thái "Đã mua".
*   **Tài chính**:
    *   **Nạp ví thủ công**: Khách chuyển khoản -> Chat Admin -> Admin cộng tiền vào ví user.
    *   Trừ tiền đơn hàng khi đặt cọc/thanh toán.

### 3. Kho (Warehouse)
*   **Nhập kho thủ công**: Gõ mã vận đơn vào hệ thống để báo hàng về.
*   **Xuất kho**: Tick chọn đơn hàng đã về để báo khách đến lấy.

---

## Level 2: Nâng cao (Standard / Professional)
*Mục tiêu: Tối ưu hóa quy trình, giảm thao tác tay, dùng Tool hỗ trợ. Phù hợp cho công ty Logistics vừa (5-20 nhân sự).*

### 1. Khách hàng (User)
*   **Công cụ đặt hàng (Extension)**:
    *   Chrome Extension tự động quét lấy tên, giá, ảnh, thuộc tính từ Taobao/1688/Tmall.
    *   Thêm vào giỏ hàng trực tiếp trên trang Taobao.
*   **Tính phí tự động**: Hệ thống tự tính phí dịch vụ, phí cân nặng theo bảng giá cấu hình sẵn.

### 2. Quản trị (Admin)
*   **Phân quyền (RBAC)**: Chia rõ Sale (CSKH), Order (Mua hàng), Kho, Kế toán.
*   **Khiếu nại & Đổi trả**: Quy trình xử lý khiếu nại (Gửi ảnh, hoàn tiền vào ví).
*   **Voucher & Khuyến mãi**: Mã giảm giá phí dịch vụ/vận chuyển.

### 3. Kho (Warehouse)
*   **Barcode Scanner**: Hỗ trợ súng bắn mã vạch.
    *   **Nhập kho TQ**: Bắn mã -> Tự nhận diện đơn -> Tự in tem (Label) dán kiện.
    *   **Nhập kho VN**: Bắn mã kiện -> Tự động tính cân nặng/khối lượng -> Tự trừ tiền ví khách.
*   **Bao hàng (Manifest)**: Gom nhiều kiện vào bao lớn để vận chuyển đường bộ/biển.

---

## Level 3: Cao cấp (Enterprise / Automation)
*Mục tiêu: Tự động hóa tối đa, xử lý hàng nghìn đơn/ngày, tích hợp hệ sinh thái.*

### 1. Tự động hóa (Automation)
*   **Auto-Bank (VietQR)**: Hệ thống tự động check tài khoản ngân hàng -> Tự động cộng tiền vào ví khách sau 30s.
*   **Auto-Order (Robot)**: Bot tự động login Taobao đi mua hàng (Rủi ro cao, nhưng là tính năng cao cấp).
*   **Auto-Tracking**: Tự động đồng bộ hành trình vận đơn từ các hãng chuyển phát TQ (ZTO, YTO...) về web.

### 2. Hệ sinh thái (Ecosystem)
*   **Mobile App (React Native/Flutter)**:
    *   Khách hàng: Nhận noti hàng về, nạp tiền, tracking trên điện thoại.
    *   Kho: Dùng Camera điện thoại làm máy quét mã vạch (Tiết kiệm chi phí mua súng scan).
*   **API Open**: Cho phép các bên thứ 3 (Dropship) kết nối đẩy đơn vào hệ thống.

### 3. Dữ liệu & AI (Intelligence)
*   **Tìm kiếm bằng hình ảnh**: Khách up ảnh -> Tìm nguồn hàng trên 1688 giá rẻ nhất.
*   **Gợi ý xu hướng (Trend)**: Phân tích dữ liệu mua hàng để gợi ý sản phẩm hot.
*   **Dashboard BI**: Báo cáo tài chính, hiệu suất nhân viên, dự báo dòng tiền chuyên sâu.
