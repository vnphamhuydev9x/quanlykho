# Task Board: containerize
> Triage lần cuối: 2026-03-22 | Draft: containerize_draf_requirement.md | SD cập nhật: 2026-03-22 | SD-Version: SD-v1.0.1

---

## [SD] Tasks — Cần /gen-SD xử lý
<!-- Thay đổi cần cập nhật vào System Design (schema, API spec, business logic, cache strategy...) -->
- [v] Xác định migration strategy: migration KHÔNG tự chạy khi container start — dùng `release_command` trong `fly.toml` hoặc chạy tay qua `fly ssh console`
- [v] Xác nhận kiến trúc stateless Fly.io: thư mục `uploads/` bị mất sau deploy/restart — confirm toàn bộ file upload phải đi qua `FILE_STORAGE_PROVIDER=CLOUDFLARE_R2`
- [v] Security decision: KHÔNG bao giờ copy `.env` vào image — secrets phải được inject qua Fly.io Secrets
- [v] Xác định app version strategy cho Docker image: quyết định cách định nghĩa và truyền version vào image (e.g., đọc từ `package.json`, dùng `ARG APP_VERSION`, hay `LABEL`) — tương đương Spring Boot version config

## [BE] Tasks — Cần /gen-BE xử lý
<!-- Backend implementation, refactor, fix bug server... -->
- [v] Viết `Dockerfile` cho backend Node.js: dùng `node:alpine` (đúng major version), multi-stage build tách deps/source, `USER node` (non-root), `NODE_ENV=production`
- [v] Viết `.dockerignore` loại trừ: `node_modules/`, `uploads/`, `logs/`, `temp/`, `.env*`
- [v] Cấu hình thứ tự COPY trong Dockerfile: `package*.json` → `prisma/` → `npm ci --omit=dev` → copy `source/` — tận dụng layer cache
- [v] Chạy `npx prisma generate` trong build stage, KHÔNG chạy lại ở runtime
- [v] Viết `fly.toml`: `internal_port=3000`, `force_https=true`, `memory=256mb`, `cpu shared`, thêm `release_command` cho migration
- [ ] Test local trước deploy: `docker build` → `docker run --env-file .env` → verify API hoạt động + DB connect + upload ảnh lên R2 ← MANUAL STEP
- [v] Implement version labeling trong Dockerfile: dùng `ARG APP_VERSION` và `LABEL version=$APP_VERSION`, truyền qua `--build-arg` khi build (theo quyết định từ SD task trên)

## [FE] Tasks — Cần /gen-FE xử lý
<!-- Frontend implementation, fix UI, thay đổi component... -->
