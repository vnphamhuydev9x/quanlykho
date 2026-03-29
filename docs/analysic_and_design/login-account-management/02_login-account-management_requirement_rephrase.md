# Requirement Rephrase: login-account-management
> Version: Req-v1.0.0
> Cập nhật: 2026-03-29
> Nguồn: 01_login-account-management_draft_requirement.md

---

## Actors

| Actor | Mô tả |
|-------|-------|
| EMPLOYEE | Nhân viên nội bộ — role: ADMIN / SALE / USER |
| CUSTOMER | Khách hàng |

---

## FR — Functional Requirements

### FR-01: Đăng nhập
- User nhập username + password
- Nếu đúng → nhận JWT token, lưu `access_token` và `user_info` vào localStorage
- Redirect về `/admin` (trang `/admin` xử lý redirect tiếp theo theo type, xem FR-02)
- Nếu sai → hiển thị lỗi qua error code (không tiết lộ username hay password cái nào sai)
- Tài khoản bị vô hiệu hóa → hiển thị lỗi riêng

### FR-02: Routing sau đăng nhập (Role-based Redirect)
- Trang `/admin` đọc `user_info` từ localStorage và redirect theo type:
  - EMPLOYEE (role: ADMIN / SALE / USER) → `/admin/customer-inquiry`
  - CUSTOMER → `/admin/product-codes`
- Mapping này là **điểm duy nhất** quyết định trang đích sau login — không redirect trực tiếp từ trang login

### FR-03: Route `/` — Trang gốc
- Bất kỳ user nào truy cập `/` (dù đã login hay chưa) đều được redirect về `/consulting`
- Không phân biệt trạng thái xác thực tại route này

### FR-04: Xem thông tin cá nhân
- EMPLOYEE thấy: username, fullName, email, phone, role — có nút "Chỉnh sửa thông tin"
- CUSTOMER thấy: username, fullName, phone — không có email, không có nút "Chỉnh sửa thông tin"
- Cả hai đều có nút "Đổi mật khẩu"

### FR-05: Chỉnh sửa thông tin (EMPLOYEE only)
- Sửa được: fullName, email, phone
- CUSTOMER không được truy cập tính năng này

### FR-06: Đổi mật khẩu (tất cả user)
- Nhập: mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới
- FE validate confirm khớp với new trước khi gửi API
- Nếu currentPassword sai → báo lỗi

---

## NFR — Non-Functional Requirements

### NFR-01: Bảo mật login
- Không tiết lộ username hay password cái nào sai (cùng error code 99002)
- Token JWT — expires theo cấu hình `JWT_EXPIRES_IN`

### NFR-02: Cache isActive
- Check `isActive` qua Redis cache — TTL 3600s
- Khi ADMIN vô hiệu hóa user: evict cache ngay lập tức (không chờ TTL hết hạn)
