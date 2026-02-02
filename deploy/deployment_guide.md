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
    # Cập nhật DB (Sử dụng Migration để đảm bảo an toàn dữ liệu)
    npx prisma migrate dev
    
    # Tạo dữ liệu mẫu (Admin account...) - Chỉ chạy lần đầu
    npx prisma db seed
    ```
    *Lưu ý: Không sử dụng `db push` nữa.*
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

---

## 4. Quản lý Database (Go-live Strategy)

Chúng ta sử dụng chiến lược **"Evolutive Database Design"** với Prisma Migrate.

### A. Lần đầu Go-live (Khởi tạo)
Khi triển khai lên môi trường mới (Production/Staging) lần đầu tiên:
```bash
# Lệnh này sẽ chạy toàn bộ lịch sử migration để tạo bảng
npx prisma migrate deploy

# Seed dữ liệu admin ban đầu
npx prisma db seed
```

### B. Cập nhật tính năng mới (Các lần Go-live sau)
Ví dụ: Thêm bảng `Customer` sau khi hệ thống đã chạy được 1 tháng.
1.  Tại máy Dev, chạy: `npx prisma migrate dev --name <ten_thay_doi>` (như bạn đã làm).
2.  Commit folder `prisma/migrations` lên Git.
3.  Tại máy Server (Production), pull code về và chạy:
    ```bash
    npx prisma migrate deploy
    ```
    *Lệnh `deploy` này rất an toàn: Nó chỉ chạy những file migration mới chưa từng chạy (dựa vào bảng `_prisma_migrations`), tuyệt đối không reset DB hay mất dữ liệu cũ.*

