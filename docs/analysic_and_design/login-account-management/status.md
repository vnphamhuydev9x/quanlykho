# Feature Status: login-account-management
> Cập nhật lần cuối: 2026-03-29

## Tổng trạng thái: ✅ Done

## Requirements
> **Req-v1.0.0** — `02_login-account-management_requirement_rephrase.md`
- [x] FR-01: Đăng nhập (username/password, JWT, localStorage)
- [x] FR-02: Routing sau đăng nhập — `/admin` redirect theo type (EMPLOYEE → `/admin/customer-inquiry`, CUSTOMER → `/admin/product-codes`)
- [x] FR-03: Route `/` luôn redirect về `/consulting`
- [x] FR-04: Xem thông tin cá nhân (khác nhau theo type)
- [x] FR-05: Chỉnh sửa thông tin (EMPLOYEE only)
- [x] FR-06: Đổi mật khẩu (tất cả user)
- [x] NFR-01: Bảo mật login (không tiết lộ field sai)
- [x] NFR-02: Cache isActive với evict ngay khi disable

## System Design
> **SD-v1.0.1** — `03_login-account-management_SD.md`
> - Data model: bảng `users` đầy đủ (soft delete, partial unique index)
> - API: 4 endpoints (login, get/put profile, change-password)
> - Cache: `user:status:{userId}` TTL 3600s, evict ngay khi isActive=false
> - Business logic: login flow, auth middleware, profile permissions, change-password
> - **Routing (mới):** login → `/admin` → redirect theo type; `/` → `/consulting`

## Implementation Status

| Layer | Dựa trên SD  | Trạng thái  | Cập nhật lần cuối |
|-------|-------------|------------|-------------------|
| BE    | SD-v1.0.1   | ✅ Done    | 2026-03-28        |
| FE    | SD-v1.0.1   | ✅ Done    | 2026-03-29        |

## Pending Tasks

### [SD]
- [v] Cập nhật Cache Strategy: evict Redis key `user:status:{userId}` ngay khi ADMIN set isActive=false
- [v] Cập nhật Routing Specification: redirect flow sau login, mapping type → trang đích, behavior của `/`

### [BE]
- [v] Refactor: `authController.js` và `authMiddleware.js` dùng `new PrismaClient()` trực tiếp — đổi sang shared instance
- [v] Fix: Login controller message hardcode tiếng Việt — đổi sang tiếng Anh
- [v] Implement: evict Redis key `user:status:{userId}` ngay khi ADMIN update isActive=false
- [v] Check/Add: ROLES constant trong `constants/enums.js`

### [FE]
- [v] Fix: trailing space trong error key ở `Profile.jsx`
- [v] Refactor: dùng `ChangePasswordModal` từ `components/` thay vì viết lại trong `Profile.jsx`
- [v] Fix redirect sau login thành công: thay vì sang `/consulting`, redirect về `/admin`
- [v] Implement trang `/admin`: type-based redirect (EMPLOYEE → `/admin/customer-inquiry`, CUSTOMER → `/admin/product-codes`)
- [v] Fix route `/`: luôn redirect về `/consulting`
- [v] Fix: khi login thất bại, ở lại trang login — không redirect về `/consulting`
