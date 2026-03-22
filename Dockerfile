# =============================================================================
# Stage 1: deps — cài đặt prod dependencies + generate Prisma client
# =============================================================================
FROM node:24-alpine AS deps
WORKDIR /app

# Thứ tự COPY tối ưu layer cache:
# 1. package files (ít thay đổi nhất)
COPY source/backend/package.json source/backend/package-lock.json ./

# 2. Prisma schema & migrations (thay đổi khi schema đổi)
COPY source/backend/prisma/ ./prisma/
COPY source/backend/prisma.config.ts ./

# 3. Cài đặt production deps (prisma CLI included để chạy migrate deploy)
RUN npm ci --omit=dev

# 4. Generate Prisma Client cho Alpine Linux (musl libc)
RUN npx prisma generate

# =============================================================================
# Stage 2: runner — image production gọn nhẹ
# =============================================================================
FROM node:24-alpine AS runner
WORKDIR /app

ARG APP_VERSION=unknown
LABEL org.opencontainers.image.version=$APP_VERSION
LABEL org.opencontainers.image.title="quanlykho-backend"

ENV NODE_ENV=production
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

# Copy node_modules đã build từ stage deps (bao gồm Prisma Client đã generate)
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema + migrations (cần cho release_command: prisma migrate deploy)
COPY source/backend/prisma/ ./prisma/
COPY source/backend/prisma.config.ts ./

# Copy source code (thay đổi thường xuyên nhất — để cuối)
COPY source/backend/src/ ./src/

# Tạo thư mục logs và cấp quyền cho user node
RUN mkdir -p /app/logs /app/temp && chown -R node:node /app/logs /app/temp

# Chạy với user non-root để tăng bảo mật
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
