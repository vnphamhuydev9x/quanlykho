# Hướng dẫn Chạy Local (App chạy máy Host + Database chạy Docker)

## 1. Khởi chạy Database (PostgreSQL)
Project sử dụng Docker để chạy Database. Đảm bảo bạn đã cài Docker Desktop.

1.  Tại thư mục gốc `quanlykho`, chạy lệnh:
    ```bash
    docker-compose up -d
    ```
    *Lệnh này sẽ bật PostgreSQL (Port 5432), Redis (Port 6379) và Adminer.*

## 2. Start Backend (Express.js)
Backend chạy tại cổng `3000` (mặc định).

1.  Mở Terminal mới, trỏ vào thư mục backend:
    ```bash
    cd source/backend
    ```
2.  Cài đặt dependencies (nếu chưa):
    ```bash
    npm install
    ```
3.  Cấu hình Database (Lần đầu):
    ```bash
    # Tạo bảng trong DB theo schema
    npx prisma db push

    # Tạo dữ liệu mẫu (Admin account...)
    npx prisma db seed
    ```
4.  Chạy server:
    ```bash
    npm run dev
    ```
    *Backend sẽ chạy tại: http://localhost:3000*

## 3. Start Frontend (React Vite)
Frontend chạy tại cổng `5173` (mặc định).

1.  Mở Terminal mới, trỏ vào thư mục frontend:
    ```bash
    cd source/frontend
    ```
2.  Cài đặt dependencies (nếu chưa):
    ```bash
    npm install
    ```
3.  Chạy ứng dụng:
    ```bash
    npm run dev
    ```
    *Truy cập Web tại: http://localhost:5173*

---
**Tóm tắt lệnh chạy hàng ngày:**

**Terminal 1 (Backend):**
```bash
cd source/backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd source/frontend && npm run dev
```
