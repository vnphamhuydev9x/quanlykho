# Containerize Backend [Draft] [Triaged]
- Viết `Dockerfile` cho backend Node.js
- Viết `.dockerignore` để loại trừ `node_modules/`, `uploads/`, `logs/`, `temp/`, `.env*`
- Dùng `node:alpine` để image nhỏ gọn, chọn đúng major version đang dùng
- Dùng multi-stage build để tách deps và source, tránh đưa devDependencies vào image
- Thứ tự COPY phải đúng: `package*.json` → `prisma/` → `npm ci` → `source/` để tận dụng layer cache
- Chạy `npx prisma generate` trong build stage, không chạy lại ở runtime
- Set `NODE_ENV=production` trong Dockerfile
- Chạy container với user non-root (`USER node`)
- Migration không tự chạy khi container start — dùng `release_command` trong `fly.toml` hoặc chạy tay qua `fly ssh console`
- Viết `fly.toml`: internal_port=3000, force_https=true, memory=256mb, cpu shared
- Không bao giờ copy `.env` vào image — secrets inject qua Fly.io Secrets
- Test local trước khi deploy: `docker build` → `docker run --env-file .env` → verify API + DB + upload ảnh

# Lưu ý quan trọng [Draft] [Triaged]
- Fly.io là stateless — thư mục `uploads/` bị mất sau mỗi lần deploy hoặc restart
- Phải switch sang `FILE_STORAGE_PROVIDER=CLOUDFLARE_R2` trước khi golive production
- Xem Bước 1 (tích hợp R2) trong deploy-prod-plan.md phải làm trước Bước 2 (containerize)

# comment 1 [Triaged]
- khi build docker ta chưa xác định đc version của app nhỉ. với spring boot ta thường có thể config đc version của app sau đó build docker image với version đó. ở app này thì sao?
