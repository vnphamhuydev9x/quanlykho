Version: SD-v1.0.1
Base on Requirement Version: Req-v1.0.0

---

# 1. Data Model (Database Schema)

## Bảng `users`

| Cột | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|-----|------|----------|----------|---------|
| `id` | Int | ✅ | autoincrement | PK |
| `username` | String | ✅ | — | Unique (manual partial index) |
| `password` | String | ✅ | — | bcrypt hash |
| `fullName` | String | ✅ | — | |
| `email` | String? | ❌ | null | Chỉ dùng cho EMPLOYEE |
| `phone` | String? | ❌ | null | |
| `role` | String | ✅ | "USER" | Giá trị: ADMIN / SALE / USER — phải dùng qua `ROLES` constant |
| `type` | UserType | ✅ | EMPLOYEE | Enum: EMPLOYEE / CUSTOMER |
| `isActive` | Boolean | ✅ | true | false = bị vô hiệu hóa bởi ADMIN |
| `customerCode` | String? | ❌ | null | Chỉ dùng cho CUSTOMER, unique |
| `address` | String? | ❌ | null | Chỉ dùng cho CUSTOMER |
| `saleId` | Int? | ❌ | null | FK → User (sale phụ trách customer) |
| `createdAt` | DateTime | ✅ | now() | |
| `updatedAt` | DateTime | ✅ | updatedAt | |
| `deletedAt` | DateTime? | ❌ | null | Soft delete |

## Database Indexing Strategy

| Index | Cột | Lý do |
|-------|-----|-------|
| Manual unique partial | `username` WHERE `deletedAt IS NULL` | Cho phép soft-delete user rồi tạo lại username |
| Manual unique partial | `customerCode` WHERE `deletedAt IS NULL` | Tương tự username |

---

# 2. API Specification

## 2.1 POST `/api/auth/login` — Đăng nhập
**Auth:** Không
**Body:** `{ username: string, password: string }`

**Response thành công (200):**
```json
{
  "code": 200,
  "message": "Login successful",
  "token": "<jwt>",
  "user": { "id", "username", "fullName", "role", "type" }
}
```

**Error cases:**
| Tình huống | HTTP | Code |
|-----------|------|------|
| Thiếu username hoặc password | 400 | 99001 |
| Sai username hoặc password | 401 | 99002 |
| Tài khoản bị vô hiệu hóa | 403 | 99007 |

## 2.2 GET `/api/profile` — Xem thông tin cá nhân
**Auth:** JWT required
**Response (200):**
```json
{
  "code": 200,
  "data": { "id", "username", "fullName", "email", "phone", "role", "type", "isActive", "customerCode", "address" }
}
```
> CUSTOMER: field `role` bị xóa khỏi response trước khi trả về.

## 2.3 PUT `/api/profile` — Cập nhật thông tin cá nhân
**Auth:** JWT required | **Chỉ EMPLOYEE**
**Body:** `{ fullName?, email?, phone?, address? }`

**Error cases:**
| Tình huống | HTTP | Code |
|-----------|------|------|
| CUSTOMER gọi endpoint này | 403 | 99008 |

## 2.4 POST `/api/profile/change-password` — Đổi mật khẩu
**Auth:** JWT required | **Tất cả user**
**Body:** `{ currentPassword: string, newPassword: string }`

**Error cases:**
| Tình huống | HTTP | Code |
|-----------|------|------|
| Thiếu currentPassword hoặc newPassword | 400 | 99001 |
| currentPassword sai | 400 | 99002 |

---

# 3. Cache Strategy (Redis)

## 3.1 `user:status:{userId}`
- **Mục đích:** Tránh query DB mỗi request để check isActive
- **TTL:** 3600 giây
- **Giá trị:** `"ACTIVE"` hoặc `"INACTIVE"`
- **Set khi:** Auth middleware check user lần đầu (cache miss)
- **Evict khi:** ADMIN cập nhật `isActive = false` cho user — **phải xóa key ngay lập tức**, không chờ TTL hết hạn
- **Cách evict:** `await redisClient.del(\`user:status:${userId}\`)`

> ⚠️ Eviction phải được implement tại bất kỳ chỗ nào xử lý update `isActive` (hiện tại nằm trong employee management feature).

---

# 4. Core Business Logic & Workflows

## 4.1 Luồng đăng nhập
1. Validate `username` và `password` có giá trị
2. Tìm user theo `username` với `deletedAt = null`
3. Nếu không tìm thấy → 401 (không tiết lộ user có tồn tại hay không)
4. Check `isActive = false` → 403
5. `bcrypt.compare(password, user.password)` → false → 401 (cùng message với bước 3)
6. Sign JWT với payload: `{ userId, username, fullName, role, type }`, expires: `JWT_EXPIRES_IN` (default 24h)
7. Trả token + user info (không trả password)

**FE sau khi nhận token:**
- Lưu `access_token` và `user_info` vào localStorage
- Redirect về `/admin` — trang `/admin` đảm nhận việc redirect tiếp theo theo type (xem mục 4.5)

## 4.2 Auth Middleware (mọi route bảo vệ)
1. Đọc `Authorization: Bearer <token>` header → thiếu → 401 code 99003
2. `jwt.verify(token)` → invalid/expired → 403 code 99004
3. Check Redis `user:status:{userId}`
   - HIT `"INACTIVE"` → 403 code 99007
   - HIT `"ACTIVE"` → gắn `req.user`, next()
   - MISS → query DB → cache kết quả → xử lý tiếp
4. Gắn `req.user = { userId, username, fullName, role, type }` vào request

## 4.3 Phân quyền profile theo type
| Action | EMPLOYEE | CUSTOMER |
|--------|----------|----------|
| Xem profile | ✅ (có email, role) | ✅ (không có email, role bị ẩn) |
| Sửa thông tin | ✅ (fullName, email, phone) | ❌ |
| Đổi mật khẩu | ✅ | ✅ |

## 4.4 Đổi mật khẩu
1. Validate cả `currentPassword` và `newPassword` có giá trị
2. `bcrypt.compare(currentPassword, user.password)` → false → 400 code 99002
3. `bcrypt.hash(newPassword, 10)`
4. Update DB

## 4.5 Routing & Navigation (FE)

### Route `/` — Trang gốc
- **Hành vi:** Luôn redirect về `/consulting`, không phân biệt trạng thái đăng nhập
- **Áp dụng cho:** Cả guest (chưa login) và user đã login

### Route `/admin` — Entry point sau login
- **Hành vi:** Đọc `user_info` từ localStorage, redirect theo `type`:

| Type | Redirect đến |
|------|-------------|
| EMPLOYEE (role: ADMIN / SALE / USER) | `/admin/customer-inquiry` |
| CUSTOMER | `/admin/product-codes` |

- **Edge case:** Nếu `user_info` không tồn tại trong localStorage (session hết hạn / chưa login) → redirect về `/login`

### Route `/login` — Trang đăng nhập
- **Sau login thành công:** Redirect về `/admin` (không redirect trực tiếp đến trang đích)
- **Lý do:** Tách biệt trách nhiệm — login chỉ xác thực, `/admin` quyết định trang đích theo role
