# Draft Requirement: login-account-management
> Tạo bởi: /reverse-draft | Ngày: 2026-03-28
> Nguồn: Reverse-engineered từ code hiện tại
> Trạng thái: Chờ review & triage

---

# Hiện trạng feature (suy ra từ code)

## Actor & Phân quyền

| Actor | Mô tả | Sau login redirect đến |
|-------|-------|----------------------|
| EMPLOYEE (role: ADMIN/SALE/USER) | Nhân viên nội bộ | `/admin/customer-inquiry` |
| CUSTOMER | Khách hàng | `/admin/product-codes` |

## Các màn hình / luồng hiện tại

### 1. Màn hình Login (`/login`)
- Form: username + password
- Language switcher góc phải trên (vi / zh)
- Submit → gọi API → lưu token + user_info vào localStorage → redirect theo type

### 2. Màn hình Profile (`/admin/profile`)
- Hiển thị thông tin: username, fullName, phone, role
- EMPLOYEE thấy thêm: email, nút "Chỉnh sửa thông tin"
- CUSTOMER không thấy: email, không có nút "Chỉnh sửa thông tin"
- Cả hai đều có nút "Đổi mật khẩu"

### 3. Modal Chỉnh sửa thông tin (chỉ EMPLOYEE)
- Sửa được: fullName, email, phone
- CUSTOMER thêm: address (nhưng không hiển thị trong Descriptions hiện tại — xem comment)

### 4. Modal Đổi mật khẩu (tất cả user)
- Nhập: mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới
- Validate confirm khớp với new trên FE

## API Endpoints đang có

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/login` | Không | Đăng nhập, trả JWT |
| GET | `/api/profile` | JWT | Xem thông tin cá nhân |
| PUT | `/api/profile` | JWT | Sửa thông tin (EMPLOYEE only) |
| POST | `/api/profile/change-password` | JWT | Đổi mật khẩu |

## Data Model hiện tại — bảng `users`

| Field | Type | Ghi chú |
|-------|------|---------|
| id | Int | PK |
| username | String | Unique (manual index) |
| password | String | bcrypt hash |
| fullName | String | |
| email | String? | |
| phone | String? | |
| role | String | "ADMIN" / "SALE" / "USER" — String, không phải enum |
| type | UserType | EMPLOYEE / CUSTOMER |
| isActive | Boolean | false = bị vô hiệu hóa |
| customerCode | String? | Chỉ dùng cho CUSTOMER |
| address | String? | Chỉ dùng cho CUSTOMER |
| saleId | Int? | FK → User (nhân viên sale phụ trách customer) |
| deletedAt | DateTime? | Soft delete |

## Business Rules đang implement

- **BR-01:** username + password thiếu → 400 code 99001
- **BR-02:** username không tồn tại hoặc sai password → 401 code 99002 (cùng message, không tiết lộ cái nào sai)
- **BR-03:** isActive = false → 403 code 99007
- **BR-04:** CUSTOMER không được gọi PUT /profile → 403 code 99008
- **BR-05:** Đổi mật khẩu: currentPassword sai → 400 code 99002

## Auth Middleware

- Mọi route (trừ login) đều qua `authenticateToken`
- JWT verify → check Redis `user:status:{userId}` (TTL 3600s)
- Cache MISS → query DB, cache lại
- isActive = false → cache "INACTIVE", trả 403
- JWT payload gắn vào `req.user`: `{ userId, username, fullName, role, type }`

## Cache

- `user:status:{userId}` — TTL 3600s — dùng để check isActive nhanh
- Không có cache cho profile data

---

# comment 1 [Triaged]
- `authController.js` và `authMiddleware.js` đang dùng `new PrismaClient()` trực tiếp. Chuẩn là import shared instance từ `../prisma.js` như các controller khác — sửa lại để dùng chung
- Login controller đang trả message tiếng Việt (vd: `'Vui lòng nhập tên đăng nhập và mật khẩu'`). Chuẩn là message chỉ dùng để dev đọc log, FE translate qua error code — sửa message sang tiếng Anh
- Khi ADMIN set `isActive = false` cho một user, Redis key `user:status:{userId}` vẫn còn sống đến hết TTL (tối đa 1 tiếng). Chuẩn là phải xóa key đó ngay khi update — thêm evict cache vào chỗ ADMIN disable user

# comment 2 [Triaged]
- `Profile.jsx` đang gọi `` t(`error.${errorCode} `) `` có trailing space sau errorCode — i18n sẽ không tìm được key, luôn fallback. Xóa space thừa
- `ChangePasswordModal.jsx` đang có sẵn trong `components/` nhưng `Profile.jsx` tự viết lại một modal đổi mật khẩu khác — xóa cái trong Profile.jsx, dùng component chung

# comment 3 [Triaged]
- `role` đang lưu dạng String thuần ("ADMIN", "SALE", "USER") trong DB. Kiểm tra `constants/enums.js` đã có `ROLES` constant chưa — nếu chưa thì thêm để tránh hardcode string rải rác trong code

# comment 4 [Triaged]
- khi đang ở trang login mà login thành công thì về trang mặc định là /admin rồi trang này sẽ xem xem role của user là gì để redirect sang trang phù hợp - cái này sẽ được define với từng role. hiện tại tại login dù đúng hay sai cũng sang trang /consulting là sai. trang /consulting này chỉ được auto redirect khi user truy cập vào trang /(cả user người dùng lạ hoặc đã login)
- login mà sai thì ở lại trang login, hiện tại login sai lại sang trang /consulting