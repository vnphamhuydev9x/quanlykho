# Hướng dẫn Quản lý Environment Variables

> 3 môi trường: **Local** | **Dev (Cloud Free)** | **Production**

---

## Tổng quan nhanh

| | Local | Dev (Cloud) | Production |
|---|---|---|---|
| DB | PostgreSQL local | Neon free tier | Neon Launch $19/month |
| Redis | Redis local | Upstash free | Upstash pay-as-you-go |
| Storage ảnh | Disk local (`uploads/`) | Cloudflare R2 free | Cloudflare R2 |
| Backend host | `localhost:3000` | `*.fly.dev` | `api.3tgroup.com` |
| **Nơi lưu secrets** | **`.env` (commit được)** | **Fly.io Secrets** | **Fly.io Secrets** |
| Secret bị lộ có sao? | Không sao | Không sao | ❌ Nghiêm trọng |

---

## 1. Môi trường LOCAL

> Chạy toàn bộ ở máy tính cá nhân. Ảnh lưu vào disk local (thư mục `uploads/`).

### File dùng: `.env` (commit được — chỉ chứa throwaway credentials)

```bash
# Khởi tạo lần đầu — copy từ .env.example rồi điền giá trị local vào
cp source/backend/.env.example source/backend/.env
```

### Nội dung `.env` cho local

```env
# Database — PostgreSQL local của bạn
DATABASE_URL="postgresql://postgres:rootpassword@localhost:5432/quanlykho?schema=public"

# App
PORT=3000
BE_HOST="http://localhost:3000"
JWT_SECRET="any-random-string-ok-for-local"
JWT_EXPIRES_IN="24h"
DEFAULT_ADMIN_PASSWORD="123456"

# Redis — local
REDIS_URL="redis://localhost:6379"

# Email — dùng throwaway key hoặc để trống
RESEND_API_KEY="re_dev_xxxxxxxxxx"
SMTP_FROM="onboarding@resend.dev"

# Storage — ĐỂ TRỐNG để dùng local disk (thư mục uploads/)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

> **Khi R2 để trống**, `fileStorageService.js` tự động fallback về lưu ảnh vào `uploads/` trên disk local.

### Script chạy

```bash
cd source/backend
npm run dev          # Server + .env thường
npm run dev:test     # Server + .env.test (DB test riêng, port 5001)
```

---

## 2. Môi trường DEV (Cloud Free Tier)

> Backend chạy trên Fly.io, DB trên Neon free, Redis Upstash free, ảnh trên R2 free.
> Credentials có thể bị lộ — **không sao**, đây là free tier throwaway.

### Nơi lưu secrets: **Fly.io Secrets**

Không có file `.env` nào trên server — tất cả secrets set qua CLI:

```bash
# Set một lần, Fly.io tự inject vào container khi deploy
fly secrets set DATABASE_URL="postgresql://...neon.tech/..."
fly secrets set REDIS_URL="rediss://...upstash.io:..."
fly secrets set JWT_SECRET="dev-secret-not-for-prod"
fly secrets set BE_HOST="https://your-app.fly.dev"
fly secrets set NODE_ENV="development"
fly secrets set PORT="3000"

# Email
fly secrets set RESEND_API_KEY="re_dev_xxxxxxxxxx"
fly secrets set SMTP_FROM="onboarding@resend.dev"

# R2 (nếu bật)
fly secrets set R2_ACCOUNT_ID="..."
fly secrets set R2_ACCESS_KEY_ID="..."
fly secrets set R2_SECRET_ACCESS_KEY="..."
fly secrets set R2_BUCKET_NAME="..."
fly secrets set R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

### Xem secrets đã set

```bash
fly secrets list        # Xem tên các secrets (không xem giá trị)
```

### Frontend (Cloudflare Pages)

Set trong Cloudflare Pages dashboard → Settings → Environment variables:
```
VITE_API_URL = https://your-app.fly.dev/api
```

---

## 3. Môi trường PRODUCTION

> Data thật, user thật. Secrets phải được bảo vệ nghiêm túc.

### Nơi lưu secrets: **Fly.io Secrets** (cơ chế giống Dev nhưng giá trị thật)

```bash
# Set secrets production — dùng giá trị thật, mạnh hơn
fly secrets set DATABASE_URL="postgresql://...neon.tech/..."    # Neon Launch plan
fly secrets set REDIS_URL="rediss://...upstash.io:..."          # Upstash pay-as-you-go
fly secrets set JWT_SECRET="super-strong-random-64-char-secret" # Random thật, mạnh
fly secrets set BE_HOST="https://api.3tgroup.com"
fly secrets set CORS_ORIGINS="https://3tgroup.com,https://www.3tgroup.com"
fly secrets set NODE_ENV="production"
fly secrets set PORT="3000"

# Email
fly secrets set RESEND_API_KEY="re_REAL_KEY_HERE"
fly secrets set SMTP_FROM="no-reply@3tgroup.com"

# Cloudflare R2
fly secrets set R2_ACCOUNT_ID="..."
fly secrets set R2_ACCESS_KEY_ID="..."
fly secrets set R2_SECRET_ACCESS_KEY="..."
fly secrets set R2_BUCKET_NAME="..."
fly secrets set R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

### Frontend (Cloudflare Pages)

```
VITE_API_URL = https://api.3tgroup.com/api
```

---

## Quy tắc "file nào commit lên Git?"

```
.env              ✅  Commit được — local chỉ dùng throwaway credentials, không có secret thật
.env.example      ✅  Commit được — template hướng dẫn
.env.test         ✅  Commit được — DB test local, không nhạy cảm
.env.test.temp    ❌  Không cần commit — file tạm sinh ra khi chạy test
.env.local        ❌  KHÔNG commit — dùng khi cần override với secret thật
.env.*.local      ❌  KHÔNG commit — tương tự
```

> **Nguyên tắc cốt lõi**: Secret thật (dev/prod) **không bao giờ nằm trong file** — luôn quản lý qua Fly.io Secrets.

---

## Flow khi thêm thành viên mới vào team

```bash
# 1. Clone repo
git clone ...

# 2. .env đã có sẵn trong repo (throwaway credentials) — chạy luôn được
# Nếu muốn sửa (đổi DB password, port...): chỉnh trực tiếp file source/backend/.env

# 3. Cài dependencies + chạy
cd source/backend && npm install
npm run dev
```

---

## Checklist trước khi deploy Production

- [ ] Rotate `RESEND_API_KEY` — tạo key mới trên Resend dashboard trước khi deploy
- [ ] `JWT_SECRET` phải dài ≥ 32 ký tự, random thật (dùng `openssl rand -hex 32`)
- [ ] `DEFAULT_ADMIN_PASSWORD` phải đổi khỏi `123456`
- [ ] Fly.io secrets set đầy đủ trước khi `fly deploy`
