# Feature Status: containerize
> Cập nhật lần cuối: 2026-03-22

## Tổng trạng thái: 🟡 In Progress — Chờ test local

## Requirements
> N/A — Đây là Technical Design (không có FR/NFR mới)

## System Design
> **SD-v1.0.1** — `03_1_containerize_SD.md`

Tóm tắt:
- **Container Build**: Multi-stage build, `node:24-alpine`, USER node, NODE_ENV=production
- **Prisma Binary Targets**: Thêm `linux-musl-openssl-3.0.x` cho Alpine
- **Migration Strategy**: `release_command` trong fly.toml, không tự chạy khi start
- **Storage**: Fly.io stateless → bắt buộc dùng `FILE_STORAGE_PROVIDER=CLOUDFLARE_R2`
- **Secrets**: Inject qua Fly.io Secrets, không copy `.env` vào image
- **fly.toml**: `internal_port=3000`, `force_https=true`, `memory=256mb`, `cpu shared`
- **App Version Strategy** *(mới SD-v1.0.1)*: Version từ `package.json`, truyền qua `--build-arg APP_VERSION`, embed bằng `LABEL org.opencontainers.image.version`

## Implementation Status

| Layer | Dựa trên SD  | Trạng thái                       | Cập nhật lần cuối |
|-------|-------------|----------------------------------|-------------------|
| BE    | SD-v1.0.1   | 🟡 Done — chờ test local manual | 2026-03-22        |
| FE    | —           | ✅ N/A                           | —                 |

## Pending Tasks
<!-- Sync từ task_board.md — không sửa tay -->

### [SD] — ✅ Done
- [v] Xác định migration strategy
- [v] Xác nhận kiến trúc stateless Fly.io + R2
- [v] Security decision: secrets qua Fly.io Secrets
- [v] Xác định app version strategy cho Docker image

### [BE] — 🟡 Có task mới từ SD-v1.0.1
- [v] Viết `Dockerfile` (multi-stage, node:24-alpine, USER node, NODE_ENV=production)
- [v] Update `schema.prisma`: thêm `binaryTargets linux-musl-openssl-3.0.x`
- [v] Move `prisma` CLI từ devDeps → dependencies (cần cho release_command)
- [v] Viết `.dockerignore`
- [v] Cấu hình thứ tự COPY trong Dockerfile
- [v] Chạy `npx prisma generate` trong build stage
- [v] Viết `fly.toml`
- [ ] Test local: `docker build` → `docker run --env-file .env` → verify ← MANUAL STEP
- [v] Implement version labeling trong Dockerfile: `ARG APP_VERSION` + `LABEL version=$APP_VERSION`
