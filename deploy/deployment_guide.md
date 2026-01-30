# Hướng dẫn Chạy Local (App chạy máy Host + Database chạy Docker)

Đây là mô hình phát triển phổ biến: Code chạy trực tiếp trên máy để debug nhanh, còn Database chạy trong Docker để sạch sẽ hệ thống.

## 1. Khởi chạy Database (PostgreSQL) bằng Docker

1.  Mở Terminal tại thư mục gốc `d:/projects/quanlykho`.
2.  Chạy lệnh:
    ```bash
    docker-compose up -d
    ```
    *Lệnh này sẽ bật PostgreSQL (Port 5432), User: `postgres`, Pass: `rootpassword`.*

3.  Kiểm tra:
    -   Dùng Docker Desktop hoặc chạy `docker ps` để thấy container `quanlykho-db` đang chạy.

## 2. Cấu hình Ứng dụng (Next.js)

1.  Mở file `.env` trong thư mục `source`.
2.  Cập nhật `DATABASE_URL` trỏ về port 5432 của Docker:

```env
# Kết nối PostgreSQL (Port 5432)
DATABASE_URL="postgresql://postgres:rootpassword@localhost:5432/quanlykho?schema=public"

AUTH_SECRET="...giu-nguyen-secret-cu..."
```

## 3. Đồng bộ Database Schema (Prisma)

Lần đầu chạy hoặc khi sửa file `schema.prisma`, cần đồng bộ cấu trúc xuống PostgreSQL trong Docker:

```bash
cd source
npx prisma db push
```

## 4. Chạy Ứng dụng

```bash
cd source
npm run dev
```
Truy cập: http://localhost:3000

---
**Tóm tắt 2 lệnh cần nhớ mỗi khi code:**
1.  `docker-compose up -d` (Để bật DB - thường chỉ cần bật 1 lần)
2.  `npm run dev` (Để chạy App)
