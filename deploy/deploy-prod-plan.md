# Kế hoạch Deploy Production — Quản Lý Kho

> Dùng cho môi trường **production** — ưu tiên độ ổn định và bảo toàn data.
> Xem [deploy-dev-plan.md](deploy-dev-plan.md) cho môi trường development/test.

---

## Kiến trúc

| Thành phần | Nền tảng | Tier | Region |
|---|---|---|---|
| Frontend (React) | Cloudflare Pages | Free (mãi mãi) | CDN toàn cầu |
| Backend (Node.js) | Google Cloud Run | Pay-as-you-go (min-instances=1) | Singapore (`asia-southeast1`) |
| Redis | Upstash | Pay-as-you-go | Singapore |
| Database (PostgreSQL) | Neon | **Launch $19/month** | Singapore (`aws-ap-southeast-1`) |
| Ảnh | Cloudflare R2 | Free + overage | Auto CDN |
| Domain | Cloudflare Registrar | ~$10/năm | - |

### URL routing

```
3tgroup.com/          → Landing page  (Cloudflare Pages)
3tgroup.com/admin     → Admin panel   (Cloudflare Pages, cùng app)
api.3tgroup.com       → Backend API   (Google Cloud Run)
```

---

## Chi phí production

| Dịch vụ | Chi phí | Ghi chú |
|---|---|---|
| Cloudflare Pages | $0 | Free mãi mãi |
| Google Cloud Run | ~$10/month | min-instances=1, luôn warm, không cold start |
| **Neon Launch** | **~$5-15/month** | Pay-as-you-go $0.106/CU-hour, tùy usage |
| Upstash | ~$0/month | Free tier đủ dùng (rate limit 10K req/s, không giới hạn tổng) |
| Cloudflare R2 | ~$0-1/month | Free 10GB, overage $0.015/GB |
| Domain | ~$1/month | ~$10/năm |
| **Tổng** | **~$15-27/month ≈ 375k-675k VND** | |

> Neon Launch pay-as-you-go — **không dùng free tier cho production** vì free tier chỉ có 100 compute hours/tháng và không có point-in-time restore.

---

## Kịch bản khi vượt giới hạn từng dịch vụ

### Google Cloud Run
- **min-instances=1**: Luôn có 1 instance warm — không bao giờ cold start
- **Khi traffic tăng**: Cloud Run tự scale thêm instance, tính tiền theo request
- **Chi phí thực tế**: App nội bộ traffic thấp → gần như fixed ~$10/month

### Neon Launch (pay-as-you-go $0.106/CU-hour)
- **Storage**: $0.35/GB/month — ví dụ DB 1GB = $0.35/month
- **Compute**: $0.106/CU-hour — chỉ tính khi DB đang xử lý query, idle thì rất ít
- **Scale to zero**: DB ngủ sau 5 phút idle → cold start ~1-2s (chấp nhận được)
- **Kịch bản thực tế**: App dùng 8h/ngày, 0.25 CU → ~60 CU-hours/tháng → ~$6-7/month
- **Point-in-time restore**: có trên Launch plan

### Upstash Redis
- **Free tier**: 256MB data, rate limit 10,000 commands/giây — **không giới hạn tổng số commands**
- **Khi vượt 256MB**: upgrade Pay-as-you-go $0.2/100K commands
- **Kịch bản thực tế**: App quản lý kho traffic thấp → thường nằm trong free tier → $0

### Cloudflare R2
- **Free**: 10GB storage, 1M write ops, 10M read ops/tháng, egress miễn phí
- **Storage vượt**: $0.015/GB — ví dụ 50GB ảnh = thêm $0.60/month
- **Egress**: **Luôn miễn phí** — không bao giờ tính tiền serve ảnh

### Cloudflare Pages
- **Luôn miễn phí** — không có overage, không bao giờ bị chặn

---

## Tài khoản cần tạo

| Service | URL | Cần thẻ? | Ghi chú |
|---|---|---|---|
| Cloudflare | cloudflare.com | ✅ Khi bật R2 | Dùng cho R2 + Pages + DNS + domain |
| Google Cloud | cloud.google.com | ✅ Bắt buộc | Để dùng Cloud Run production |
| Neon | neon.tech | ✅ Cho Launch plan | Upgrade lên Launch (pay-as-you-go) |
| Upstash | upstash.com | ✅ Khi vượt 256MB | Free tier đủ cho prod traffic thấp |

---

## Các bước triển khai

### Bước 1: Setup Neon Launch (PostgreSQL)
- [ ] Tạo tài khoản Neon, nhập thẻ
- [ ] Tạo project, chọn region `aws-ap-southeast-1` (Singapore)
- [ ] **Upgrade lên Launch plan** (pay-as-you-go $0.106/CU-hour)
- [ ] Lấy `DATABASE_URL` connection string
- [ ] Chạy `prisma migrate deploy` để migrate schema
- [ ] Verify kết nối thành công

### Bước 2: Setup Upstash (Redis)
- [ ] Tạo tài khoản Upstash, nhập thẻ
- [ ] Tạo Redis database, chọn region Singapore
- [ ] Free tier đủ dùng cho traffic thấp — chỉ cần thêm thẻ khi vượt 256MB data
- [ ] Tab **TCP** → lấy `REDIS_URL` (dạng `redis://default:...@...upstash.io:6379`)

### Bước 3: Deploy backend lên Google Cloud Run

**Tạo project production (tách biệt với dev):**

> Chạy tất cả lệnh gcloud trong **Google Cloud SDK Shell** (Admin).

```bash
gcloud auth login
gcloud projects create quanlykho-prod --name="QuanLyKho Prod"
gcloud config set project quanlykho-prod
```

Link billing account (bắt buộc):

```bash
gcloud components install beta
gcloud beta billing accounts list
gcloud beta billing projects link quanlykho-prod --billing-account=ACCOUNT_ID
```

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

**Tạo Artifact Registry:**

```bash
gcloud artifacts repositories create quanlykho --repository-format=docker --location=asia-southeast1
```

**Build và push image:**

`cloudbuild.yaml` ở thư mục gốc tự đọc version từ `package.json`.

```bash
d:
cd projects\quanlykho
gcloud builds submit .
```

> ⚠️ `gcloud builds submit` chỉ build + push image, **không tự deploy**. Phải chạy lệnh deploy riêng.

**Deploy lên Cloud Run (min-instances=1 = không cold start):**

```bash
gcloud run deploy quanlykho-backend --image asia-southeast1-docker.pkg.dev/quanlykho-prod/quanlykho/backend:latest --region asia-southeast1 --allow-unauthenticated --port 3000 --memory 256Mi --min-instances 1
```

**Set environment variables:**

Tạo file `deploy/golive-1.0.0/set-env-prod.ps1` (đã có trong `.gitignore`, không bị commit):

```powershell
gcloud config set project quanlykho-prod

gcloud run services update quanlykho-backend `
  --region asia-southeast1 `
  --set-env-vars "DATABASE_URL=postgresql://...,REDIS_URL=redis://...,JWT_SECRET=your-strong-random-secret,BE_HOST=https://api.3tgroup.com,CORS_ORIGINS=https://3tgroup.com,https://www.3tgroup.com,R2_ACCOUNT_ID=...,R2_ACCESS_KEY_ID=...,R2_SECRET_ACCESS_KEY=...,R2_BUCKET_NAME=...,R2_PUBLIC_URL=https://pub-xxx.r2.dev,RESEND_API_KEY=re_...,SMTP_FROM=...,NODE_ENV=production"
```

> ⚠️ **Không set `PORT`** — Cloud Run tự inject, set thủ công báo lỗi reserved env var.

Chạy từ **Google Cloud SDK Shell**:

```bash
powershell -ExecutionPolicy Bypass -File "D:\projects\quanlykho\deploy\golive-1.0.0\set-env-prod.ps1"
```

- [ ] Verify app chạy đúng tại Cloud Run URL

### Bước 4: Deploy Frontend lên Cloudflare Pages
- [ ] Vào Cloudflare Dashboard → Pages → Create project
- [ ] Connect GitHub repo, chọn branch `main`
- [ ] Build command: `npm run build`, Output: `dist`
- [ ] Set env: `VITE_API_URL=https://api.3tgroup.com/api`
- [ ] Deploy → verify chạy đúng trên domain `*.pages.dev`

### Bước 5: Setup domain & DNS
- [ ] Mua domain tại Cloudflare Registrar (hoặc trỏ nameserver về Cloudflare nếu mua chỗ khác)
- [ ] Map custom domain `api.3tgroup.com` vào Cloud Run:

```bash
gcloud run domain-mappings create \
  --service quanlykho-backend \
  --domain api.3tgroup.com \
  --region asia-southeast1
```

- [ ] Vào Cloudflare DNS, thêm các records:

```
Type    Name    Value                              Proxy
CNAME   @       your-app.pages.dev                 ON  (landing + admin)
CNAME   www     your-app.pages.dev                 ON
CNAME   api     ghs.googlehosted.com               OFF (DNS only — Cloud Run)
```

- [ ] Vào Cloudflare Pages → Custom domains → thêm `3tgroup.com`
- [ ] Verify HTTPS hoạt động trên cả 2 domain

### Bước 6: Kiểm tra production
- [ ] Test đăng nhập
- [ ] Test upload ảnh → R2
- [ ] Test xem ảnh
- [ ] Test các chức năng chính
- [ ] Kiểm tra log lỗi

---

## Quản lý Secret & Environment Variables

### Nguyên tắc

```
Local dev:   .env (commit được — chỉ chứa throwaway credentials)
Dev cloud:   Cloud Run env vars (quanlykho-dev project)
Production:  Cloud Run env vars (quanlykho-prod project)
Git repo:    .env.example (template tham khảo)
```

> Xem chi tiết tại [env-management-guide.md](../deploy/env-management-guide.md)

### Update secrets khi cần thay đổi

```bash
# Thêm hoặc cập nhật 1 biến (không ảnh hưởng các biến khác)
gcloud run services update quanlykho-backend \
  --region asia-southeast1 \
  --update-env-vars "JWT_SECRET=new-secret-value"
```

### Set env trên Cloudflare Pages
```
VITE_API_URL = https://api.3tgroup.com/api
```

---

## Lưu ý quan trọng

### Redis fallback khi Upstash hết limit

**Đã xử lý trong code** ([redisClient.js](../source/backend/src/config/redisClient.js)):
- Redis lỗi → trả `null` → fallback về DB, không trả 500 cho user
- Tất cả lỗi đều `logger.warn` → xuất hiện trong `combined.log`
- Theo dõi: tìm pattern `[Redis] GET failed` trong log → khi thấy liên tục thì kiểm tra Upstash dashboard

### Neon Launch — Backup

- **Point-in-time restore**: lỡ tay xóa data → restore về đúng thời điểm trước đó
- **Scale to zero sau 5 phút idle** — cold start ~1-2s khi có request mới
- Nếu không chấp nhận cold start: tắt scale-to-zero trong Neon settings (tốn thêm compute cost)
- Không cần workflow backup GitHub Actions khi dùng Launch plan

### Ảnh cũ trên local
- Trước khi deploy, migrate ảnh cũ từ `uploads/` lên R2
- Hoặc chấp nhận ảnh cũ mất nếu chỉ là test data

### Bảo mật
- ⚠️ **Rotate Resend API key** trước khi deploy — key cũ đã bị lộ trong git history
- Nếu repo public: dùng BFG Repo Cleaner để xóa secrets khỏi git history

---

## So sánh đã cân nhắc (lý do không chọn AWS)

| | AWS (EC2+RDS) | Stack hiện tại |
|---|---|---|
| Giá | ~$33-35/month | ~$30-34/month |
| Free tier | Hết (đã dùng rồi) | Còn |
| Độ phức tạp | Cao | Thấp |
| Singapore region | ✅ | ✅ |
| DB reliability | Rất tốt | Tốt |
| Lock-in | Cao | Thấp (Docker = đổi platform dễ) |
