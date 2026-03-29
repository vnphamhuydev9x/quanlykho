# Task Board: login-account-management
> Triage lần cuối: 2026-03-29 (2) | Draft: 01_login-account-management_draft_requirement.md | SD cập nhật: 2026-03-29 | SD-Version: SD-v1.0.1

---

## [SD] Tasks — Cần /gen-SD xử lý
<!-- Thay đổi cần cập nhật vào System Design (schema, API spec, business logic, cache strategy...) -->
- [v] Cập nhật Cache Strategy: khi ADMIN set isActive=false cho một user, phải evict ngay Redis key `user:status:{userId}` — không chờ TTL hết hạn
- [v] Cập nhật Routing Specification: sau login thành công → redirect về `/admin` (trang `/admin` đảm nhận redirect tiếp theo theo role); define rõ mapping role → trang đích; trang `/` luôn redirect về `/consulting` (cả guest và đã login)

## [BE] Tasks — Cần /gen-BE xử lý
<!-- Backend implementation, refactor, fix bug server... -->
- [v] Refactor: `authController.js` và `authMiddleware.js` đang dùng `new PrismaClient()` trực tiếp — đổi sang import shared instance từ `../prisma.js`
- [v] Fix: Login controller trả message tiếng Việt hardcode — đổi sang dev message tiếng Anh, FE translate qua error code
- [v] Implement: evict Redis key `user:status:{userId}` ngay khi ADMIN update isActive=false (tại employeeController hoặc nơi xử lý update user)
- [v] Check/Add: `constants/enums.js` có ROLES constant chưa (`ADMIN`, `SALE`, `USER`) — nếu chưa thì thêm vào, rà soát hardcode string trong auth-related code

## [FE] Tasks — Cần /gen-FE xử lý
<!-- Frontend implementation, fix UI, thay đổi component... -->
- [v] Fix: `Profile.jsx` gọi `` t(`error.${errorCode} `) `` có trailing space — xóa space thừa
- [v] Refactor: `Profile.jsx` tự viết modal đổi mật khẩu riêng trong khi đã có `ChangePasswordModal.jsx` trong `components/` — xóa duplicate, dùng component chung
- [v] Fix redirect sau login thành công: thay vì sang `/consulting`, redirect về `/admin`
- [v] Implement trang `/admin`: đọc role từ user_info trong localStorage, redirect sang trang đích theo role (theo mapping trong SD)
- [v] Fix route `/`: luôn redirect về `/consulting` (cả guest lẫn đã login)
- [v] Fix: khi login thất bại, ở lại trang login — không redirect về `/consulting`
