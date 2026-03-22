Version: SD-v1.0.1
Base on Requirement Version: N/A (Technical Design only — no FR/NFR changes)

---

# Containerize Backend — System Design

> Phạm vi: Thiết kế kiến trúc container hóa backend Node.js, deploy lên Fly.io.
> Không thay đổi API, schema DB, hay business logic.

---

# 1. Container Build Strategy

## 1.1 Base Image

| Quyết định | Giá trị |
|------------|---------|
| Base image | `node:24-alpine` |
| Lý do chọn alpine | Image nhỏ gọn (~50MB so với ~300MB node slim), đủ cho production |
| Node version | **24** — phải khớp với môi trường dev (v24.14.0) |

## 1.2 Multi-Stage Build

```
Stage 1: deps
  - FROM node:24-alpine AS deps
  - COPY package*.json + prisma/
  - RUN npm ci --omit=dev
  - RUN npx prisma generate

Stage 2: runner
  - FROM node:24-alpine AS runner
  - Copy node_modules từ stage deps
  - Copy source code
  - Set NODE_ENV=production
  - USER node (non-root)
  - CMD ["node", "src/server.js"]
```

**Lý do multi-stage:**
- Stage `deps` chứa build tools, devDependencies → không đưa vào image cuối
- Image cuối chỉ có: `node_modules` (prod only) + source code
- Layer cache tối ưu: `package*.json` + `prisma/` thay đổi ít → cache hit cao

## 1.3 Thứ tự COPY (Layer Cache Strategy)

```dockerfile
# Thứ tự bắt buộc — thay đổi file nào sẽ invalidate cache từ bước đó trở đi
COPY package.json package-lock.json ./   # thay đổi ít
COPY prisma/ ./prisma/                   # thay đổi khi schema đổi
RUN npm ci --omit=dev                    # rebuild node_modules
RUN npx prisma generate                  # gen Prisma Client
COPY source/ ./source/                   # thay đổi thường xuyên nhất → để cuối
```

## 1.4 Prisma Binary Targets

> ⚠️ **Vấn đề quan trọng:** Schema hiện tại dùng `binaryTargets = ["native", "windows"]`.
> Alpine Linux dùng musl libc — cần thêm target cho Alpine.

**Cần cập nhật `schema.prisma`:**
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "windows"]
}
```

- `linux-musl-openssl-3.0.x`: Alpine Linux (x64)
- Giữ `native` + `windows` để dev local không bị ảnh hưởng

---

# 2. Migration Strategy

## 2.1 Quyết định: Migration KHÔNG tự chạy khi container start

**Lý do:**
- Nếu migrate lỗi khi container start → container crash loop, khó debug
- Fly.io có thể scale nhiều instances → nhiều instance cùng migrate = conflict
- Cần kiểm soát migrate một cách có chủ đích

## 2.2 Cơ chế: `release_command` trong `fly.toml`

```toml
[deploy]
  release_command = "npx prisma migrate deploy"
```

- Fly.io chạy `release_command` **một lần** trước khi deploy instances mới
- Nếu `release_command` fail → deploy bị hủy, instances cũ vẫn chạy
- An toàn hơn nhiều so với chạy migrate trong CMD

## 2.3 Fallback: Chạy tay qua fly ssh

```bash
fly ssh console -C "npx prisma migrate deploy"
```

Dùng khi: cần migrate khẩn trong production mà không trigger full deploy.

---

# 3. Storage Architecture (Stateless Fly.io)

## 3.1 Constraint: Fly.io là Stateless

| Vấn đề | Chi tiết |
|--------|----------|
| Ephemeral filesystem | Mọi file ghi vào container bị mất sau restart/redeploy |
| Không có persistent volume mặc định | Fly Volumes tốn phí và không scale tốt cho file storage |
| **Hệ quả** | Thư mục `uploads/` local KHÔNG được dùng trong production |

## 3.2 Giải pháp: Cloudflare R2 (đã implement)

```
FILE_STORAGE_PROVIDER=CLOUDFLARE_R2  ← BẮT BUỘC trước khi golive
```

- Backend đã có `@aws-sdk/client-s3` tích hợp với R2 (commit: `upgrade system to use cloudflare r2`)
- Mọi upload ảnh → R2, không ghi disk local
- `.dockerignore` phải exclude `uploads/` để không copy vào image

## 3.3 Checklist trước khi deploy production

- [ ] `FILE_STORAGE_PROVIDER=CLOUDFLARE_R2` được set trong Fly.io Secrets
- [ ] R2 bucket đã configured và accessible
- [ ] Không còn code path nào ghi file vào `uploads/` local

---

# 4. Secrets & Environment Variables

## 4.1 Nguyên tắc: KHÔNG bao giờ bake `.env` vào image

**Lý do:**
- Docker image có thể bị push lên registry → secrets bị lộ
- Vi phạm security best practice (12-Factor App)
- Fly.io có cơ chế Secrets native, không cần `.env` trong image

## 4.2 Cơ chế: Fly.io Secrets

```bash
# Set secrets (chạy một lần)
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="..."
fly secrets set CLOUDFLARE_R2_ACCESS_KEY_ID="..."
fly secrets set CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
fly secrets set CLOUDFLARE_R2_ENDPOINT="..."
fly secrets set CLOUDFLARE_R2_BUCKET_NAME="..."
fly secrets set FILE_STORAGE_PROVIDER="CLOUDFLARE_R2"
fly secrets set REDIS_URL="..."
```

- Fly.io inject secrets vào container dưới dạng env vars lúc runtime
- Secrets được encrypt at rest
- `.env*` phải có trong `.dockerignore`

## 4.3 Variables cần thiết (danh sách)

| Variable | Source | Bắt buộc |
|----------|--------|----------|
| `DATABASE_URL` | Fly.io Secrets | ✅ |
| `JWT_SECRET` | Fly.io Secrets | ✅ |
| `PORT` | fly.toml hoặc default 3000 | - |
| `NODE_ENV` | Dockerfile (hardcoded `production`) | ✅ |
| `REDIS_URL` | Fly.io Secrets | ✅ |
| `FILE_STORAGE_PROVIDER` | Fly.io Secrets | ✅ |
| `CLOUDFLARE_R2_*` | Fly.io Secrets | ✅ |

---

# 5. Fly.toml Configuration Design

```toml
app = "<app-name>"
primary_region = "sin"  # Singapore — gần nhất cho VN

[build]
  # Fly tự detect Dockerfile

[deploy]
  release_command = "npx prisma migrate deploy"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

**Lý do các config:**
- `internal_port = 3000`: khớp với `process.env.PORT || 3000` trong server.js
- `force_https = true`: redirect HTTP → HTTPS tự động
- `memory = 256mb`: đủ cho Node.js + Prisma + Express (có thể tăng nếu cần)
- `auto_stop_machines`: tiết kiệm chi phí khi không có traffic
- `min_machines_running = 0`: free tier optimization (cold start chấp nhận được)

---

# 6. Local Testing Workflow

```bash
# Bước 1: Build image
docker build -t quanlykho-backend .

# Bước 2: Run với env vars từ file
docker run --rm \
  --env-file source/backend/.env \
  -p 3000:3000 \
  quanlykho-backend

# Bước 3: Verify
curl http://localhost:3000/health       # API hoạt động
# Kiểm tra DB connect trong logs
# Test upload ảnh → verify ảnh lên R2 (không ghi local)
```

---

# 7. .dockerignore Strategy

```
node_modules/
uploads/
logs/
temp/
.env
.env.*
.git/
*.md
source/frontend/
```

**Lý do exclude `source/frontend/`**: Frontend deploy riêng (Vercel/Netlify), không cần build cùng backend image.

---

# 8. App Version Strategy

## 8.1 Nguồn chân lý của version

Version của app Node.js lấy từ **`source/backend/package.json`** → field `"version"`.

```json
{
  "name": "quanlykho-backend",
  "version": "1.2.0",   ← đây là app version
  ...
}
```

Tương đương với `<version>` trong `pom.xml` của Spring Boot.

## 8.2 Truyền version vào Docker image qua `ARG`

```dockerfile
# Stage runner trong Dockerfile
ARG APP_VERSION=unknown
LABEL org.opencontainers.image.version=$APP_VERSION
LABEL org.opencontainers.image.title="quanlykho-backend"
```

- `ARG APP_VERSION` nhận giá trị khi `docker build --build-arg APP_VERSION=...`
- `LABEL` embed version vào metadata của image — có thể inspect bằng `docker inspect`
- Default `unknown` để build không fail khi không truyền arg

## 8.3 Cách build image có version

```bash
# Đọc version từ package.json tự động
APP_VERSION=$(node -p "require('./source/backend/package.json').version")

# Build image với tag version + tag latest
docker build \
  --build-arg APP_VERSION=$APP_VERSION \
  -t quanlykho-backend:$APP_VERSION \
  -t quanlykho-backend:latest \
  .
```

**So sánh với Spring Boot:**

| Spring Boot | Node.js (project này) |
|-------------|----------------------|
| `mvn package` → `app-1.2.0.jar` | `docker build --build-arg APP_VERSION=1.2.0` |
| Version từ `pom.xml` | Version từ `package.json` |
| Artifact name chứa version | Image tag chứa version |

## 8.4 Verify version sau khi build

```bash
# Xem LABEL đã embed đúng chưa
docker inspect quanlykho-backend:latest \
  --format='{{json .Config.Labels}}' | jq

# Output mong đợi:
# {
#   "org.opencontainers.image.version": "1.2.0",
#   "org.opencontainers.image.title": "quanlykho-backend"
# }
```

## 8.5 Quy trình nâng version trước khi release

1. Cập nhật `"version"` trong `source/backend/package.json`
2. Commit: `git commit -m "bump version to x.y.z"`
3. Build image với version mới (câu lệnh ở 8.3)
4. Deploy lên Fly.io

> **Lưu ý:** Fly.io deploy không yêu cầu version tag bắt buộc — đây là convention nội bộ để traceability, không phải hard requirement của platform.
