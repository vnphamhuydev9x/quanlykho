# Kế hoạch Deploy Production — Quản Lý Kho

> Dùng cho môi trường **production** — ưu tiên độ ổn định và bảo toàn data.
> Xem [deploy-dev-plan.md](deploy-dev-plan.md) cho môi trường development/test.

---

## Kiến trúc

| Thành phần | Nền tảng | Tier | Region |
|---|---|---|---|
| Frontend (React) | Cloudflare Pages | Free (mãi mãi) | CDN toàn cầu |
| Backend (Node.js) | Fly.io | Pay-as-you-go | Singapore (`sin`) |
| Redis | Upstash | Pay-as-you-go | Singapore |
| Database (PostgreSQL) | Neon | **Launch $19/month** | Singapore (`aws-ap-southeast-1`) |
| Ảnh | Cloudflare R2 | Free + overage | Auto CDN |
| Domain | Cloudflare Registrar | ~$10/năm | - |

### URL routing

```
3tgroup.com/          → Landing page  (Cloudflare Pages)
3tgroup.com/admin     → Admin panel   (Cloudflare Pages, cùng app)
api.3tgroup.com       → Backend API   (Fly.io)
```

---

## Chi phí production

| Dịch vụ | Chi phí | Ghi chú |
|---|---|---|
| Cloudflare Pages | $0 | Free mãi mãi |
| Fly.io | ~$5-10/month | Free allowance + overage |
| **Neon Launch** | **$19/month** | Từ ngày 1, có backup 7 ngày |
| Upstash | ~$0-3/month | $0.2/100K commands vượt free |
| Cloudflare R2 | ~$0-1/month | Free 10GB, overage $0.015/GB |
| Domain | ~$1/month | ~$10/năm |
| **Tổng** | **~$25-34/month ≈ 625k-850k VND** | |

> Neon dùng Launch $19/month ngay từ đầu — **không dùng free tier cho production** vì free tier không có point-in-time restore, DB tự ngủ sau 5 phút.

---

## Kịch bản khi vượt giới hạn từng dịch vụ

### Fly.io
- **Free allowance**: 3 máy shared-cpu-1x 256MB, 160GB outbound/tháng
- **Khi vượt**: Tính tiền thêm theo giờ chạy (~$0.0001/giây cho 256MB machine)
- **Kịch bản thực tế**: App nhỏ, 1 máy, traffic thấp → thường nằm trong free allowance → $0 thêm
- **Nếu traffic tăng**: ~$5-10/month thêm, không bị chặn đột ngột

### Neon Launch $19/month
- **Included**: Compute + 10GB storage
- **Storage vượt**: +$0.35/GB/month — ví dụ DB 15GB = thêm $1.75/month
- **Compute vượt**: +$0.106/CU-hour — với traffic thấp gần như không xảy ra
- **Kịch bản thực tế**: DB < 10GB, traffic thấp → không tốn thêm gì ngoài $19

### Upstash Redis
- **Free**: 10,000 commands/ngày
- **Khi vượt**: $0.2 per 100,000 commands — **không bị chặn, chỉ tính tiền thêm**
- **Ví dụ**: Vượt thêm 1 triệu commands/ngày = +$2/ngày → cần xem lại ngay
- **Kịch bản thực tế**: App quản lý kho, traffic thấp, có cache → thường dưới 10K/ngày → $0 thêm

### Cloudflare R2
- **Free**: 10GB storage, 1M write ops, 10M read ops/tháng, egress miễn phí
- **Storage vượt**: $0.015/GB — ví dụ 50GB ảnh = thêm $0.60/month
- **Ops vượt**: $4.50/triệu write, $0.36/triệu read — với app nhỏ gần như không xảy ra
- **Egress**: **Luôn miễn phí** — không bao giờ tính tiền serve ảnh

### Cloudflare Pages
- **Luôn miễn phí** — không có overage, không bao giờ bị chặn

---

## Tài khoản cần tạo

| Service | URL | Cần thẻ? | Ghi chú |
|---|---|---|---|
| Cloudflare | cloudflare.com | ✅ Khi bật R2 | Dùng cho R2 + Pages + DNS + domain |
| Fly.io | fly.io | ✅ Bắt buộc | Kể cả free allowance |
| Neon | neon.tech | ✅ Cho Launch plan | Upgrade ngay lên $19/month |
| Upstash | upstash.com | ✅ Bật pay-as-you-go | Tránh bị chặn khi vượt free |

---

## Các bước triển khai

### Bước 1: Tích hợp Cloudflare R2 cho ảnh
- [ ] Tạo tài khoản Cloudflare, bật R2
- [ ] Tạo R2 bucket
- [ ] Sửa `fileStorageService.js`: upload ảnh lên R2 thay vì disk local
- [ ] Sửa `buildImageUrl()`: trả về R2 URL trực tiếp
- [ ] Cập nhật env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- [ ] Test upload + hiển thị ảnh

### Bước 2: Containerize app bằng Docker
- [ ] Viết `Dockerfile` cho backend
- [ ] Viết `docker-compose.prod.yml` để test local trước
- [ ] Verify app chạy đúng trong container

### Bước 3: Setup Neon Launch (PostgreSQL)
- [ ] Tạo tài khoản Neon, nhập thẻ
- [ ] Tạo project, chọn region `aws-ap-southeast-1` (Singapore)
- [ ] **Upgrade lên Launch plan $19/month ngay**
- [ ] Lấy `DATABASE_URL` connection string
- [ ] Chạy `prisma migrate deploy` để migrate schema
- [ ] Verify kết nối thành công

### Bước 4: Setup Upstash (Redis)
- [ ] Tạo tài khoản Upstash, nhập thẻ
- [ ] Tạo Redis database, chọn region Singapore
- [ ] **Bật pay-as-you-go** để không bị chặn khi vượt free
- [ ] Lấy `REDIS_URL` (format: `rediss://...`)

### Bước 5: Deploy lên Fly.io
- [ ] Cài `flyctl` CLI
- [ ] Đăng ký tài khoản Fly.io, nhập thẻ
- [ ] `fly launch` — chọn region `sin` (Singapore)
- [ ] Set secrets (xem mục bên dưới)
- [ ] `fly deploy`
- [ ] Verify app chạy đúng

### Bước 6: Deploy Frontend lên Cloudflare Pages
- [ ] Vào Cloudflare Dashboard → Pages → Create project
- [ ] Connect GitHub repo, chọn branch `main`
- [ ] Build command: `npm run build`, Output: `dist`
- [ ] Set env: `VITE_API_URL=https://api.3tgroup.com/api`
- [ ] Deploy → verify chạy đúng trên domain `*.pages.dev`

### Bước 7: Setup domain & DNS
- [ ] Mua domain tại Cloudflare Registrar (hoặc trỏ nameserver về Cloudflare nếu mua chỗ khác)
- [ ] Vào Cloudflare DNS, thêm các records:

```
Type    Name    Value                        Proxy
CNAME   @       your-app.pages.dev           ON  (landing + admin)
CNAME   www     your-app.pages.dev           ON
CNAME   api     your-backend.fly.dev         OFF (DNS only)
```

- [ ] Vào Fly.io → Certificates → thêm `api.3tgroup.com`
- [ ] Vào Cloudflare Pages → Custom domains → thêm `3tgroup.com`
- [ ] Verify HTTPS hoạt động trên cả 2 domain

### Bước 8: Kiểm tra production
- [ ] Test đăng nhập
- [ ] Test upload ảnh → R2
- [ ] Test xem ảnh
- [ ] Test các chức năng chính
- [ ] Kiểm tra log lỗi

---

## Quản lý Secret & Environment Variables

### Nguyên tắc

```
Local dev:   .env (không commit, có trong .gitignore)
Dev sharing: .env.dev (được commit, chỉ chứa credentials throwaway)
Production:  Fly.io Secrets + Cloudflare Pages env vars + GitHub Secrets
Git repo:    .env.example (placeholder, để tham khảo)
```

### Set secrets trên Fly.io

```bash
fly secrets set DATABASE_URL="postgresql://...neon.tech/..."
fly secrets set REDIS_URL="rediss://...upstash.io:..."
fly secrets set JWT_SECRET="your-strong-random-secret"
fly secrets set BE_HOST="https://api.3tgroup.com"
fly secrets set CORS_ORIGINS="https://3tgroup.com,https://www.3tgroup.com"
fly secrets set R2_ACCOUNT_ID="..."
fly secrets set R2_ACCESS_KEY_ID="..."
fly secrets set R2_SECRET_ACCESS_KEY="..."
fly secrets set R2_BUCKET_NAME="..."
fly secrets set R2_PUBLIC_URL="https://pub-xxx.r2.dev"
fly secrets set RESEND_API_KEY="re_..."
fly secrets set SMTP_FROM="..."
fly secrets set NODE_ENV="production"
fly secrets set PORT="3000"
```

### Set env trên Cloudflare Pages
```
VITE_API_URL = https://api.3tgroup.com/api
```

### Set secrets cho GitHub Actions (backup workflow)
- Repo → Settings → Secrets and variables → Actions
- Thêm: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

---

## Lưu ý quan trọng

### Redis fallback khi Upstash hết limit

**Đã xử lý trong code** ([redisClient.js](../source/backend/src/config/redisClient.js)):
- Redis lỗi → trả `null` → fallback về DB, không trả 500 cho user
- Tất cả lỗi đều `logger.warn` → xuất hiện trong `combined.log`
- Theo dõi: tìm pattern `[Redis] GET failed` trong log → khi thấy liên tục thì kiểm tra Upstash dashboard

### Neon Launch — Backup

- **Point-in-time restore 7 ngày**: lỡ tay xóa data → restore về đúng thời điểm trước đó
- **Auto-suspend**: tắt hoàn toàn trên Launch plan → DB luôn sẵn sàng, không có cold start
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
| Giá | ~$33-35/month | ~$25-34/month |
| Free tier | Hết (đã dùng rồi) | Còn |
| Độ phức tạp | Cao | Thấp |
| Singapore region | ✅ | ✅ |
| DB reliability | Rất tốt | Tốt |
| Lock-in | Cao | Thấp (Docker = đổi platform dễ) |
