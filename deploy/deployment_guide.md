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
    # Cập nhật DB (Force Update - Dùng trong giai đoạn phát triển chưa Go-live)
    npx prisma db push

    # Tạo dữ liệu mẫu (Admin account...) - Chỉ chạy lần đầu
    npx prisma db seed
    ```
    *Lưu ý: Lệnh `db push` sẽ đồng bộ schema nhanh chóng mà không tạo file migration.*
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

## 4. Quản lý Database (Chiến lược Go-live)

Hiện tại, trong giai đoạn **Phát triển (Development)** chưa Go-live, chúng ta sử dụng chiến lược **"Force Update"** để nhanh chóng đồng bộ thay đổi Database mà không cần quản lý file migration lịch sử.

### A. Giai đoạn Phát triển (Dev Phase)
Mỗi khi thay đổi `schema.prisma` (Thêm bảng, sửa cột...):
1.  Chạy lệnh:
    ```bash
    npx prisma db push
    ```
    *Lệnh này sẽ cập nhật trực tiếp vào DB hiện tại. Nếu có thay đổi gây mất dữ liệu, Prisma sẽ hỏi xác nhận.*

### B. Giai đoạn Release (Go-live)
Khi chốt phiên bản để đưa lên môi trường Production (Ví dụ: v1.0.0), chúng ta sẽ tạo một điểm mốc (Checkpoint) bằng Migration:

1.  Chạy lệnh tạo Migration Release:
    ```bash
    npx prisma migrate dev --name <ten_phien_ban>
    # Ví dụ: npx prisma migrate dev --name golive_v1.0.0
    ```
2.  Commit folder `prisma/migrations` được sinh ra lên Git.
3.  Trên Server Production:
    ```bash
    npx prisma migrate deploy
    ```

### C. Quy tắc Git (Quan trọng)
*   **CẦN Commit**: Folder `prisma/migrations` (Khi Go-live).
*   **KHÔNG Commit**:
    *   File `.env` (Chứa mật khẩu).
    *   Folder `node_modules`.
    *   Folder `dist` hoặc `build`.

### D. Reset Database (Xóa trắng dữ liệu)
Nếu bạn muốn xóa toàn bộ dữ liệu để làm lại từ đầu:

```bash
# Xóa sạch dữ liệu và đẩy lại Schema mới nhất
npx prisma db push --force-reset

# (Tùy chọn) Tạo lại dữ liệu mẫu Admin
npx prisma db seed
```
*Cảnh báo: Lệnh này sẽ xóa vĩnh viễn toàn bộ dữ liệu trong Database. Hãy cẩn thận!*
