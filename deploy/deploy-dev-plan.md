# Kế hoạch Deploy Development — Quản Lý Kho

> Dùng cho môi trường **development / staging / test** — ưu tiên tiết kiệm chi phí.
> Xem [deploy-prod-plan.md](deploy-prod-plan.md) cho môi trường production.

---

## Kiến trúc

| Thành phần | Nền tảng | Tier | Region |
|---|---|---|---|
| Frontend (React) | Cloudflare Pages | Free (mãi mãi) | CDN toàn cầu |
| Backend (Node.js) | Fly.io | Free allowance | Singapore (`sin`) |
| Redis | Upstash | Free tier | Singapore |
| Database (PostgreSQL) | Neon | **Free tier** | Singapore (`aws-ap-southeast-1`) |
| Ảnh | Cloudflare R2 | Free tier (10GB) | Auto CDN |

---

## Chi phí development

| Dịch vụ | Chi phí | Giới hạn free |
|---|---|---|
| Cloudflare Pages | $0 | Không giới hạn |
| Fly.io | $0 | 3 máy 256MB, 160GB outbound/tháng |
| Neon | $0 | 0.5GB storage, auto-suspend 5 phút |
| Upstash | $0 | 10,000 commands/ngày |
| Cloudflare R2 | $0 | 10GB storage, egress miễn phí |
| **Tổng** | **$0/month** | |

---

## Giới hạn của free tier cần biết

### Neon free tier
- **0.5GB storage** — đủ cho dev, không đủ cho production data thật
- **Auto-suspend sau 5 phút idle** — query đầu tiên sau khi ngủ chậm ~1-2 giây (cold start)
- **Không có point-in-time restore** — nếu mất data thì mất hẳn
- → **Không dùng cho production**

### Upstash free tier
- **10,000 commands/ngày** — khi vượt, Redis bị chặn đến 00:00 UTC hôm sau
- App vẫn chạy được nhờ Redis fallback trong code ([redisClient.js](../source/backend/src/config/redisClient.js)) — chỉ chậm hơn vì phải query DB
- → Chấp nhận được cho dev, không chấp nhận được cho production

### Fly.io free allowance
- **3 máy shared-cpu-1x 256MB** — đủ cho 1 backend dev
- Nếu vượt → tính tiền thêm (không bị tắt đột ngột)

---

## Setup nhanh cho dev local

Clone repo xong chạy:

```bash
cp source/backend/.env.dev source/backend/.env
cp source/frontend/.env.dev source/frontend/.env
npm install
```

File `.env.dev` đã được commit lên git với credentials throwaway — an toàn dù bị lộ.

---

## Tài khoản cần tạo

| Service | URL | Cần thẻ? | Ghi chú |
|---|---|---|---|
| Cloudflare | cloudflare.com | ✅ Khi bật R2 | Dùng cho R2 + Pages |
| Fly.io | fly.io | ✅ Bắt buộc | Dù dùng free allowance |
| Neon | neon.tech | ❌ | Free tier không cần thẻ |
| Upstash | upstash.com | ❌ | Free tier không cần thẻ |

---

## Deploy lên môi trường dev (Fly.io + Neon free)

### Bước 1: Tạo Neon project (free)
- Tạo tài khoản Neon — không cần thẻ
- Tạo project, chọn region `aws-ap-southeast-1`
- Lấy `DATABASE_URL`
- Chạy migration và seed admin:

```bash
cd source/backend
DATABASE_URL="..." npx prisma migrate deploy
DATABASE_URL="..." npm run seed:admin
```

> `seed:admin` chỉ tạo 1 tài khoản admin duy nhất (không có demo data).
> Script idempotent — chạy lại nhiều lần không bị lỗi.
> Khác với `dev:reset` ở local (reset toàn bộ DB + full demo data).

### Bước 2: Tạo Upstash Redis (free)
- Tạo tài khoản Upstash — không cần thẻ
- Tạo database, chọn region Singapore
- Lấy `REDIS_URL`

### Bước 3: Deploy backend lên Fly.io
- Cài `flyctl`, đăng ký tài khoản (cần thẻ dù free)
- `fly launch` → chọn region `sin`
- Set secrets tối thiểu:

```bash
fly secrets set DATABASE_URL="..."
fly secrets set REDIS_URL="..."
fly secrets set JWT_SECRET="dev-secret-not-for-prod"
fly secrets set BE_HOST="https://your-app.fly.dev"
fly secrets set NODE_ENV="development"
fly secrets set PORT="3000"
```

### Bước 4: Deploy frontend lên Cloudflare Pages
- Connect GitHub repo
- Build command: `npm run build`, Output: `dist`
- Set env: `VITE_API_URL=https://your-app.fly.dev/api`

---

## Khi nào chuyển sang production?

Chuyển sang [deploy-prod-plan.md](deploy-prod-plan.md) khi:
- Có **user thật** bắt đầu dùng
- Cần **data không được mất** (backup quan trọng)
- DB cần **luôn sẵn sàng**, không chấp nhận cold start
