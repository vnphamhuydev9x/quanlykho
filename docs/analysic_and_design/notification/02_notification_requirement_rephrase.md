# Requirement Rephrase: notification
> Version: 1.0.0 | Ngày: 2026-03-29
> Nguồn: Reverse-engineered từ code hiện tại (Source of Truth)

---

## 1. Đối tượng sử dụng (Actor) & Phân quyền

| Actor | Quyền hạn |
|-------|-----------|
| **CUSTOMER** | Nhận thông báo khi hàng hóa được cập nhật (`PRODUCT_CODE`). Xem số thông báo chưa đọc, đánh dấu tất cả đã đọc. |
| **ADMIN** | Nhận thông báo liên quan đến yêu cầu khách hàng (`INQUIRY`). Xem, đánh dấu đã đọc từng cái hoặc tất cả, xem lịch sử đầy đủ. |
| **SALE** | Như ADMIN. |
| **CHUNG_TU** | Như ADMIN. |

> Tất cả người dùng đã đăng nhập đều có thể gọi API notification. Phân loại ai nhận loại thông báo nào được kiểm soát ở tầng tạo thông báo, không phải tầng API.

---

## 2. Các luồng chức năng chính (Functional Requirements)

### 2.1 Thông báo thời gian thực (Polling)
- Hệ thống tự động kiểm tra thông báo mới mỗi **5 giây** cho tất cả user đã đăng nhập.
- Browser tab title hiển thị số thông báo chưa đọc: `(N) 3T Group Management`.
- Khi phát hiện có thông báo INQUIRY mới → trang danh sách yêu cầu khách hàng tự động làm mới dữ liệu.

### 2.2 Bell Icon (Dành cho ADMIN / SALE / CHUNG_TU)
- Hiển thị icon chuông ở header với badge đếm số thông báo **chưa đọc**.
- Click vào icon → mở panel hiển thị 10 thông báo gần nhất (cả đã đọc và chưa đọc), nhóm theo ngày.
- Phân biệt thông báo chưa đọc bằng nền xanh nhạt và chữ đậm.
- **Đánh dấu tất cả đã đọc:** nút "Đánh dấu tất cả đã đọc" (chỉ hiện khi có thông báo chưa đọc).
- **Đánh dấu 1 thông báo đã đọc:** click vào từng thông báo → tự động đánh dấu đã đọc + chuyển đến trang yêu cầu khách hàng liên quan.
- Nút "Xem tất cả" → chuyển đến trang lịch sử thông báo.

### 2.3 Product Code Badge (Dành cho CUSTOMER)
- Hiển thị badge đếm số thông báo `PRODUCT_CODE` chưa đọc trên mục menu "Tất cả" của sản phẩm.
- Hover vào menu item → hiện tooltip nội dung các thông báo chưa đọc.
- Click vào menu item → đánh dấu tất cả đã đọc + chuyển đến trang product codes.
- Hover ≥ 1 giây rồi rời chuột → cũng tự động đánh dấu tất cả đã đọc.

### 2.4 Trang lịch sử thông báo (`/admin/notification-history`)
- Hiển thị tất cả thông báo (đã đọc và chưa đọc), nhóm theo ngày.
- Phân biệt thông báo chưa đọc bằng nền xanh nhạt và tag "Chưa đọc".
- Tải thêm theo trang (20 thông báo/trang, dạng load more).
- Click vào thông báo loại `INQUIRY` có `refId` → chuyển đến trang yêu cầu khách hàng tương ứng.
- Click vào thông báo loại `PRODUCT_CODE` → chỉ đánh dấu đã đọc, không điều hướng.

### 2.5 Tạo thông báo (Triggered từ các module khác)
- **PRODUCT_CODE:** Tự động tạo thông báo cho CUSTOMER khi hàng hóa của họ được cập nhật.
- **INQUIRY:** Tự động tạo thông báo cho nhiều user cùng lúc khi có sự kiện liên quan đến yêu cầu khách hàng.

---

## 3. Các quy tắc kinh doanh (Business Rules / Constraints)

1. **Ownership:** User chỉ được đánh dấu đã đọc thông báo của chính mình. Đánh dấu thông báo của người khác → từ chối (403 Forbidden).

2. **Idempotent:** Đánh dấu đã đọc một thông báo đã đọc rồi → chấp nhận, không lỗi, không thay đổi dữ liệu.

3. **Đánh dấu tất cả:** Chỉ đánh dấu các thông báo **chưa đọc** (`isRead=false`) của user thành đã đọc. Không ảnh hưởng đến thông báo đã đọc trước đó.

4. **Nội dung thông báo:** Hỗ trợ 2 format:
   - Plain text (hiển thị trực tiếp).
   - JSON `{ key, params }` → dịch qua i18n trước khi hiển thị.

5. **Thông báo INQUIRY luôn có `refId`** (inquiryId) để điều hướng về đúng yêu cầu.

---

## 4. Non-Functional Requirements

- **Hiển thị đa ngôn ngữ:** Nội dung thông báo hỗ trợ i18n (vi/zh) thông qua format JSON `{ key, params }`.
- **Caching:** Danh sách thông báo chưa đọc được cache tối đa 60 giây để giảm tải DB khi polling tần suất cao.
- **Polling interval:** 5 giây — chấp nhận được với quy mô hiện tại (không sử dụng WebSocket/SSE).
