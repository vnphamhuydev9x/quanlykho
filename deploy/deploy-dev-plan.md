# Kế hoạch Deploy Development — Quản Lý Kho

> Dùng cho môi trường **development / staging / test** — ưu tiên tiết kiệm chi phí.
> Xem [deploy-prod-plan.md](deploy-prod-plan.md) cho môi trường production.

---

## Kiến trúc

| Thành phần | Nền tảng | Tier | Region |
|---|---|---|---|
| Frontend (React) | Cloudflare Pages | Free (mãi mãi) | CDN toàn cầu |
| Backend (Node.js) | Google Cloud Run | Free tier | Singapore (`asia-southeast1`) |
| Redis | Upstash | Free tier | Singapore |
| Database (PostgreSQL) | Neon | **Free tier** | Singapore (`aws-ap-southeast-1`) |
| Ảnh | Cloudflare R2 | Free tier (10GB) | Auto CDN |

---

## Chi phí development

| Dịch vụ | Chi phí | Giới hạn free |
|---|---|---|
| Cloudflare Pages | $0 | Không giới hạn |
| Google Cloud Run | $0 | 2M requests/tháng, 360K GB-seconds compute |
| Neon | $0 | 0.5GB storage, 100 compute hours/tháng, auto-suspend 5 phút |
| Upstash | $0 | 256MB data, 10,000 commands/giây (rate limit) |
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
- **256MB data** — đủ cho dev
- **10,000 commands/giây** — đây là rate limit (tốc độ tối đa), không phải giới hạn tổng/ngày
- Không có giới hạn tổng số commands → thoải mái hơn so với những gì tưởng ban đầu
- → Chấp nhận được cho cả dev lẫn prod traffic thấp

### Google Cloud Run free tier
- **2M requests/tháng** — đủ cho dev, app nội bộ traffic thấp
- **360K GB-seconds compute/tháng** — tương đương 1 instance 256MB chạy ~16 ngày liên tục
- **Scale to zero** — cold start ~1-2 giây sau khi idle; chấp nhận được cho dev

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
| Google Cloud | cloud.google.com | ✅ Khi vượt free tier | Free tier không cần thẻ ban đầu |
| Neon | neon.tech | ❌ | Free tier không cần thẻ |
| Upstash | upstash.com | ❌ | Free tier không cần thẻ |

---

## Deploy lên môi trường dev (Cloud Run + Neon free)

### Bước 1: Tạo Neon project (free)
- Tạo tài khoản Neon — không cần thẻ
- Tạo project, chọn region `aws-ap-southeast-1`
- Lấy `DATABASE_URL`
- Chạy migration và seed admin:

```powershell
# PowerShell (Windows)
$env:DATABASE_URL="postgresql://..."
cd source/backend
npx prisma migrate deploy
npm run seed:admin
```

```bash
# Bash/Linux/Mac
cd source/backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npm run seed:admin
```

> `seed:admin` chỉ tạo 1 tài khoản admin duy nhất (không có demo data).
> Script idempotent — chạy lại nhiều lần không bị lỗi.
> Khác với `dev:reset` ở local (reset toàn bộ DB + full demo data).

### Bước 2: Tạo Upstash Redis (free)
- Tạo tài khoản Upstash — không cần thẻ
- Tạo database, chọn region Singapore
- Tab **TCP** → lấy `REDIS_URL` (dạng `redis://default:...@...upstash.io:6379`)

### Bước 2.5: Setup Cloudflare R2

**Tạo bucket:**
- Vào Cloudflare Dashboard → Storage & databases → R2 Object Storage
- Thêm thẻ để bật R2 (sẽ không bị charge trong free tier)
- Bấm **+ Create bucket** → đặt tên `quanlykho-dev`
- Location: Automatic, Storage Class: Standard → **Create bucket**

**Bật Public Development URL** (để serve ảnh public):
- Vào bucket → tab **Settings** → mục **Public Development URL** → **Enable**
- Copy URL dạng `https://pub-xxx.r2.dev` → đây là `R2_PUBLIC_URL`

**Tạo API Token:**
- Từ trang R2 Overview → **Manage R2 API Tokens** → **Create Account API Token**
- Token name: `R2 Account Token`
- Permission: **Object Read & Write**
- Specify bucket: **Apply to specific buckets only** → chọn `quanlykho-dev`
- TTL: Forever → **Create Account API Token**
- ⚠️ Copy ngay **Access Key ID** và **Secret Access Key** — chỉ hiện 1 lần

**Lấy Account ID:**
- Từ trang R2 Overview, copy **Account ID** ở phần Account Details

**Các biến cần lưu:**
```
R2_ACCOUNT_ID=<Account ID>
R2_ACCESS_KEY_ID=<Access Key ID>
R2_SECRET_ACCESS_KEY=<Secret Access Key>
R2_BUCKET_NAME=quanlykho-dev
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Bước 3: Deploy backend lên Google Cloud Run

**Cài Google Cloud CLI:**
- Tải installer tại cloud.google.com/sdk/docs/install → chọn Windows
- Chạy file `.exe` installer
- Mở terminal mới sau khi cài xong, chạy:

```bash
gcloud init
```

- Chọn **Y** để sign in → trình duyệt mở → đăng nhập Google account
- Chọn **Create a new project** → nhập project ID: `quanlykho-dev`

**Link Billing Account (bắt buộc để enable APIs):**

Project mới tạo chưa có billing → enable APIs sẽ báo lỗi `Billing account not found`.

Mở **Google Cloud SDK Shell với quyền Admin** (chuột phải → Run as Administrator):

```bash
# Cài beta component (chỉ cần làm 1 lần)
gcloud components install beta

# Xem billing account ID
gcloud beta billing accounts list

# Link billing vào project (thay ACCOUNT_ID bằng giá trị từ lệnh trên)
gcloud beta billing projects link quanlykho-dev --billing-account=ACCOUNT_ID
```

> Dù link billing, bạn vẫn dùng **$300 free credit** — chỉ tính tiền thật khi hết credit.

**Enable các APIs cần thiết:**

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

**Tạo Artifact Registry để lưu Docker image:**

> Chạy tất cả lệnh gcloud trong **Google Cloud SDK Shell** (không phải PowerShell hay cmd thường).
> Windows cmd/PowerShell không có `gcloud` trong PATH.

```bash
gcloud artifacts repositories create quanlykho --repository-format=docker --location=asia-southeast1
```

**Build và push image:**

Project đã có `cloudbuild.yaml` ở thư mục gốc — tự đọc version từ `package.json`, tag image cả `1.0.0` lẫn `latest`.

Chạy trong **Google Cloud SDK Shell**:

```bash
d:
cd projects\quanlykho
gcloud builds submit .
```

> ⚠️ Dockerfile nằm ở thư mục gốc (không phải `source/backend/`), phải `cd` về gốc trước.
> ⚠️ Windows cmd: `cd d:\projects\quanlykho` không đổi drive — phải chạy `d:` trước rồi `cd projects\quanlykho`.
> ℹ️ Các dòng màu đỏ trong quá trình build là **warnings** (Prisma OpenSSL, npm audit) — không phải lỗi, build vẫn thành công.

**Deploy lên Cloud Run:**

> ⚠️ `gcloud builds submit` chỉ build + push image, **không tự deploy**. Phải chạy lệnh deploy riêng.
> ⚠️ Windows cmd không hỗ trợ `\` xuống dòng — phải chạy 1 dòng liền.

```bash
gcloud run deploy quanlykho-backend --image asia-southeast1-docker.pkg.dev/quanlykho-dev/quanlykho/backend:latest --region asia-southeast1 --allow-unauthenticated --port 3000 --memory 256Mi
```

**Set environment variables:**

Tạo file `deploy/golive-1.0.0/set-env-dev.ps1` (đã có trong `.gitignore`, không bị commit). Điền credentials thật vào:

```powershell
gcloud config set project quanlykho-dev

gcloud run services update quanlykho-backend `
  --region asia-southeast1 `
  --set-env-vars "DATABASE_URL=postgresql://...,REDIS_URL=redis://...,JWT_SECRET=dev-secret-not-for-prod,NODE_ENV=production,R2_ACCOUNT_ID=...,R2_ACCESS_KEY_ID=...,R2_SECRET_ACCESS_KEY=...,R2_BUCKET_NAME=quanlykho-dev,R2_PUBLIC_URL=https://pub-xxx.r2.dev"
```

> ⚠️ **Không set `PORT`** — Cloud Run tự inject, set thủ công báo lỗi reserved env var.
> ⚠️ PowerShell dùng backtick `` ` `` để xuống dòng (không phải `\`).

Chạy script từ **Google Cloud SDK Shell**:

```bash
powershell -ExecutionPolicy Bypass -File "D:\projects\quanlykho\deploy\golive-1.0.0\set-env-dev.ps1"
```

**Kiểm tra app đang chạy:**

```bash
gcloud run services describe quanlykho-backend --region asia-southeast1 --format="value(status.url)"
```

Truy cập `<URL>/api/health` để verify.

> Sau khi deploy, Cloud Run cấp URL dạng `https://quanlykho-backend-xxxx-as.a.run.app`.
> Copy URL này để dùng ở Bước 4.

### Bước 4: Deploy frontend lên Cloudflare Pages

**Build frontend:**

```powershell
# PowerShell (Windows)
cd source/frontend
$env:VITE_API_URL="https://quanlykho-backend-xxxx-as.a.run.app/api"
npm run build
```

```bash
# Bash/Linux/Mac
cd source/frontend
VITE_API_URL="https://quanlykho-backend-xxxx-as.a.run.app/api" npm run build
```

**Deploy lên Cloudflare Pages (không cần connect GitHub):**
- Vào Cloudflare Dashboard → Compute → Workers & Pages → **Create application**
- Chọn **"Looking to deploy Pages? Get started"** ở dưới
- Chọn **"Drag and drop your files"** → Get started
- Kéo thả thư mục `source/frontend/dist` vào
- Đặt tên project: `quanlykho-dev`
- Deploy → lấy URL dạng `https://quanlykho-dev.pages.dev`

**URL routing sau khi deploy:**
- `https://quanlykho-dev.pages.dev/` → redirect về `/consulting`
- `https://quanlykho-dev.pages.dev/consulting` → Landing page (public)
- `https://quanlykho-dev.pages.dev/admin/login` → Trang đăng nhập
- `https://quanlykho-dev.pages.dev/admin/*` → Management app (cần login)

**Deploy lại khi có code mới:**
- Build lại: `npm run build`
- Vào project trên Cloudflare Pages → **Create deployment** → kéo thả `dist` mới
- Domain chính tự động trỏ vào deployment mới nhất — không cần cấu hình gì thêm, không bị cache cũ

---

## Tên miền để test

### Không cần đăng ký gì thêm (khuyến nghị cho dev)

Sau khi deploy xong, hệ thống đã có sẵn 2 domain miễn phí:

| Thành phần | Domain miễn phí có sẵn |
|---|---|
| Frontend | `https://your-project.pages.dev` (Cloudflare Pages) |
| Backend | `https://quanlykho-backend-xxxx-as.a.run.app` (Cloud Run) |

Dùng 2 domain này là đủ để test — không cần đăng ký gì thêm.

### Nếu muốn domain riêng để test (tùy chọn)

**Lấy subdomain miễn phí từ DuckDNS:**
- Vào duckdns.org — đăng nhập bằng Google/GitHub
- Tạo subdomain: `quanlykho.duckdns.org`
- Miễn phí vĩnh viễn, không cần thẻ

> **Kết luận:** Dùng `*.pages.dev` + Cloud Run URL là đủ cho dev. Mua domain thật khi chuyển production.

---

## Khi nào chuyển sang production?

Chuyển sang [deploy-prod-plan.md](deploy-prod-plan.md) khi:
- Có **user thật** bắt đầu dùng
- Cần **data không được mất** (backup quan trọng)
- DB cần **luôn sẵn sàng**, không chấp nhận cold start
