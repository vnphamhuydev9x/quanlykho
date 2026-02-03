# Error Codes Reference

Tài liệu tổng hợp tất cả error codes trong hệ thống để đảm bảo consistency giữa Backend và Frontend.

---

## 📋 Quy tắc Error Code

1. **Format**: 5 chữ số, bắt đầu bằng `99` (ví dụ: `99001`, `99004`)
2. **HTTP Status**: Phải tương ứng với loại lỗi
3. **Message**: Tiếng Việt, rõ ràng, hướng dẫn user
4. **Consistency**: Mỗi code chỉ dùng cho 1 mục đích duy nhất

---

## 🔐 Authentication & Authorization (99001 - 99010)

| Code | HTTP Status | Message | Handler Location | Notes |
|------|-------------|---------|------------------|-------|
| 99001 | 400 | Vui lòng nhập tên đăng nhập và mật khẩu | Component | Missing credentials |
| 99002 | 401 | Người dùng không tồn tại | **Interceptor** | Redirect to login |
| 99003 | 401 | Không tìm thấy Token | **Interceptor** | Redirect to login |
| 99004 | 403 | Token không hợp lệ hoặc hết hạn | **Interceptor** | Redirect to login |
| 99005 | 400 | Username/Email đã tồn tại | Component | Duplicate user |
| 99006 | 404 | Không tìm thấy | Component | Resource not found |
| 99007 | 403 | Tài khoản đã bị vô hiệu hóa | Component | **DO NOT redirect** |
| 99008 | 403 | Bạn không có quyền thực hiện thao tác này | Component | Permission denied |

---

## 💼 Business Logic Errors (99011 - 99100)

| Code | HTTP Status | Message | Handler Location | Notes |
|------|-------------|---------|------------------|-------|
| 99011 | 400 | Mật khẩu hiện tại không đúng | Component | Change password |
| 99012 | 400 | Số dư không đủ | Component | Transaction |
| 99013 | 400 | Giao dịch đã bị hủy | Component | Transaction |
| 99014 | 400 | Không thể hủy giao dịch đã hoàn thành | Component | Transaction |

---

## 🔧 Server Errors (99500+)

| Code | HTTP Status | Message | Handler Location | Notes |
|------|-------------|---------|------------------|-------|
| 99500 | 500 | Lỗi server | Component | Generic server error |
| 99501 | 500 | Lỗi kết nối Database | Component | DB connection |
| 99502 | 500 | Lỗi Redis | Component | Cache error |

---

## 🎯 Frontend Interceptor Logic

**File**: `source/frontend/src/utils/axios.js`

```javascript
// Interceptor handles these cases AUTOMATICALLY:
if (status === 401 || (status === 403 && errorCode === 99004)) {
    // Clear auth & redirect to login
}

// Other errors (including 403 + 99007) are passed to component
```

### ⚠️ CRITICAL RULES

1. **Interceptor chỉ handle Auth errors**: 401, 403 + 99004
2. **Không redirect khi**: 403 + 99007 (account disabled)
3. **Component phải handle**: Tất cả business logic errors

---

## 📝 Checklist khi thêm Error Code mới

- [ ] Chọn code number chưa dùng (check bảng trên)
- [ ] Thêm vào bảng tương ứng (Auth/Business/Server)
- [ ] Xác định HTTP Status phù hợp
- [ ] Viết message tiếng Việt rõ ràng
- [ ] **Kiểm tra conflict với Interceptor**
- [ ] Update file này (`error_codes.md`)
- [ ] Test cả Backend và Frontend

---

## 🔍 Cách rà soát khi sửa code

### Backend (thêm/sửa error response):
```bash
# Tìm tất cả error codes
grep -r "code: 99" source/backend/src
```

### Frontend (check interceptor):
1. Mở `source/frontend/src/utils/axios.js`
2. Verify logic không conflict với error code mới
3. Nếu là auth error → Thêm vào interceptor
4. Nếu là business error → Component handle

---

## 📚 Ví dụ thực tế

### Case 1: Token hết hạn
- **BE**: `res.status(403).json({ code: 99004, message: "..." })`
- **FE Interceptor**: Tự động redirect về `/login`
- **Component**: Không cần handle

### Case 2: Account bị khóa
- **BE**: `res.status(403).json({ code: 99007, message: "..." })`
- **FE Interceptor**: **KHÔNG** redirect (vì code !== 99004)
- **Component**: Hiển thị error message cho user

### Case 3: Username đã tồn tại
- **BE**: `res.status(400).json({ code: 99005, message: "..." })`
- **FE Interceptor**: Không handle (status !== 401/403)
- **Component**: Hiển thị error dưới form field

---

**Last Updated**: 2026-02-04
**Maintainer**: Development Team
