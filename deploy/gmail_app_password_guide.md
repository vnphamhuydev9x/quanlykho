# 📧 Hướng Dẫn Lấy App Password từ Gmail

Tài liệu này hướng dẫn cách tạo **App Password** trên Google Account để sử dụng Gmail gửi email qua SMTP trong hệ thống Quản Lý Kho.

> **Khi nào cần?** Khi bạn muốn dùng **Cách 2 (SMTP Gmail)** trong file `.env` thay vì Resend API.

---

## ⚡ Yêu Cầu Trước Khi Bắt Đầu

- Tài khoản Gmail đang hoạt động
- **Bật xác minh 2 bước (2-Step Verification)** — _bắt buộc_, Google chỉ cho tạo App Password khi đã bật tính năng này.

---

## 📋 Các Bước Thực Hiện

### Bước 1 — Bật Xác Minh 2 Bước (nếu chưa bật)

1. Truy cập: **https://myaccount.google.com/security**
2. Kéo xuống phần **"How you sign in to Google"**
3. Nhấp vào **"2-Step Verification"**
4. Làm theo hướng dẫn để kích hoạt

> Nếu đã bật rồi, bỏ qua bước này.

---

### Bước 2 — Tạo App Password

1. Truy cập trực tiếp: **https://myaccount.google.com/apppasswords**  
   _(hoặc: Google Account → Security → App passwords)_

2. Đăng nhập lại nếu được yêu cầu

3. Trong ô **"App name"**, nhập tên gợi nhớ, ví dụ:
   ```
   Quan Ly Kho SMTP
   ```

4. Nhấp **"Create"**

5. Google sẽ hiển thị một mật khẩu **16 ký tự** dạng:
   ```
   xxxx xxxx xxxx xxxx
   ```
   > ⚠️ **Sao chép ngay lập tức!** Mật khẩu này chỉ hiển thị **một lần duy nhất**.

---

### Bước 3 — Cấu Hình vào File `.env`

Mở file `source/backend/.env`, **xoá hoặc comment** dòng `RESEND_API_KEY`, rồi **bỏ comment và điền** các biến SMTP:

```env
# Cách 2: SMTP Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"       # ← Email Gmail của bạn
SMTP_PASS="xxxx xxxx xxxx xxxx"        # ← App Password vừa tạo (có thể bỏ dấu cách)
SMTP_FROM="your-email@gmail.com"       # ← Thường giống SMTP_USER
```

**Ví dụ thực tế:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="quanlykho.app@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"
SMTP_FROM="quanlykho.app@gmail.com"
```

---

### Bước 4 — Kiểm Tra Cấu Hình

Restart lại backend service để áp dụng thay đổi:

```bash
# Nếu dùng Docker
docker compose restart backend

# Nếu chạy trực tiếp
npm run dev
```

Sau đó thử tính năng gửi email (ví dụ: quên mật khẩu, thông báo đơn hàng).

---

## 🔒 Lưu Ý Bảo Mật

| Mục | Hướng Dẫn |
|-----|-----------|
| **Không commit** | Đảm bảo `.env` đã có trong `.gitignore` |
| **Mỗi môi trường một App Password** | Tạo riêng cho dev, staging, production |
| **Thu hồi khi không dùng** | Vào lại trang App Passwords → nhấn ✕ để xoá |
| **Không dùng mật khẩu chính** | App Password khác với mật khẩu đăng nhập Google |

---

## 🛠️ Xử Lý Lỗi Thường Gặp

### Lỗi: `Invalid login: 535 Authentication failed`
- ❌ Sai App Password — kiểm tra lại, bỏ dấu cách nếu có
- ❌ `SMTP_USER` không khớp với email đã tạo App Password
- ❌ Chưa bật 2-Step Verification

### Lỗi: `Connection timeout` hoặc `ECONNREFUSED`
- Kiểm tra `SMTP_HOST=smtp.gmail.com` và `SMTP_PORT=587`
- Đảm bảo firewall/server không block port 587

### Không thấy mục "App passwords" trên Google
- Tài khoản chưa bật 2-Step Verification → thực hiện Bước 1
- Tài khoản Google Workspace có thể bị admin tắt tính năng này

---

## 🔄 So Sánh Resend API vs SMTP Gmail

| Tiêu chí | Resend API | SMTP Gmail |
|----------|-----------|------------|
| **Tốc độ** | ⚡ Cao hơn | 🐌 Chậm hơn |
| **Giới hạn** | 100 email/ngày (free) | ~500 email/ngày |
| **Cài đặt** | Đơn giản | Cần App Password |
| **Deliverability** | Cao | Trung bình |
| **Phù hợp** | Production | Dev/Testing |

> **Khuyến nghị:** Dùng **Resend API** cho môi trường production. Dùng **SMTP Gmail** khi cần test nhanh không cần đăng ký dịch vụ ngoài.

---

*Cập nhật lần cuối: 2026-03-18*
