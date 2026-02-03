# Hướng dẫn & Nhật ký Prisma

Tài liệu này tổng hợp các câu lệnh Prisma thường dùng và phân tích sự cố "Database Drift" điển hình để rút kinh nghiệm.

## 1. Các câu lệnh cơ bản (Basic Commands)

### 1.1 Khởi tạo & Cập nhật (`migrate dev`)
*   **Lệnh**: `npx prisma migrate dev --name <ten_thay_doi>`
*   **Khi nào dùng**: Khi bạn sửa file `schema.prisma` và muốn áp dụng thay đổi đó vào Database.
*   **Tác dụng**:
    1.  Tạo file SQL trong `prisma/migrations`.
    2.  Chạy SQL đó vào Database.
    3.  Cập nhật Prisma Client (`generate`).
*   **Lưu ý**: Đây là lệnh **CHUẨN** để phát triển dự án.

### 1.2 Đồng bộ Code (`generate`)
*   **Lệnh**: `npx prisma generate`
*   **Khi nào dùng**: Sau khi kéo code mới về (git pull) hoặc khi sửa `schema.prisma` mà không đụng đến DB (ví dụ chỉ đổi tên field map).
*   **Tác dụng**: Cập nhật thư viện `@prisma/client` trong `node_modules` để code JS gợi ý đúng các trường mới.

### 1.3 Xem dữ liệu (`studio`)
*   **Lệnh**: `npx prisma studio`
*   **Khi nào dùng**: Muốn xem/sửa dữ liệu trực quan trên trình duyệt (như PHPMyAdmin).

### 1.4 Reset Database (`migrate reset`)
*   **Lệnh**: `npx prisma migrate reset`
*   **Tác dụng**: XÓA SẠCH toàn bộ dữ liệu, chạy lại tất cả migration từ đầu và chạy seed data. Cẩn thận!

---

## 2. Case Study: Sự cố "Drift Detected" (Lệch Database)

### 2.1 Bối cảnh
*   **Tình huống**: Chúng ta cần thêm cột `deletedAt` cho tính năng Soft Delete.
*   **Dự án**: Đã có thư mục `migrations` (tức là đang quản lý version DB chặt chẽ).
*   **Sai lầm**: Thay vì dùng `migrate dev`, Developer lại dùng lệnh **`db push`**.

### 2.2 Tại sao `db push` lại gây lỗi trong trường hợp này?
*   `db push` được thiết kế cho việc "làm nhanh" (prototyping), nó nhìn thẳng vào DB và sửa cấu trúc cho khớp với Schema mà **KHÔNG** tạo file migration lưu lịch sử.
*   **Hậu quả**:
    *   Cột `deletedAt` ĐÃ ĐƯỢC thêm vào Database thật.
    *   Nhưng bảng lịch sử migration (`_prisma_migrations`) KHÔNG ghi nhận thay đổi này.
    *   Lần sau chạy `migrate dev`, Prisma thấy Database "lạ quá" (có cột `deletedAt` ở đâu chui ra?) -> Nó báo **Drift Detected** và đề nghị **Reset (Xóa sạch)** Database để đồng bộ lại. -> **RỦI RO MẤT DỮ LIỆU**.

### 2.3 Cách giải quyết (Không mất dữ liệu)
Thay vì đồng ý Reset, chúng ta thực hiện quy trình "Đánh dấu thủ công":

1.  **Bước 1: Tạo file Migration rỗng hoặc thủ công**
    *   Tạo thư mục `prisma/migrations/2026xxxx_add_soft_delete`.
    *   Tạo file `migration.sql` chứa lệnh SQL tương ứng với thay đổi đã trót làm (`ALTER TABLE ... ADD ...`).

2.  **Bước 2: Đánh dấu đã chạy (`resolve --applied`)**
    *   Lệnh: `npx prisma migrate resolve --applied 2026xxxx_add_soft_delete`
    *   **Ý nghĩa**: "Này Prisma, cái thay đổi trong file migration này tôi đã lỡ chạy vào DB rồi (bằng `db push`). Đừng chạy lại nữa, chỉ cần đánh dấu vào lịch sử là Xong rồi thôi."

3.  **Kết quả**:
    *   Prisma và Database đã hiểu nhau trở lại.
    *   Không cần xóa dữ liệu.
    *   Tiếp tục phát triển bình thường.

## 3. Bài học rút ra (Best Practice)
> [!IMPORTANT]
> **Quy tắc Bất di bất dịch**:
> Nếu dự án đã có thư mục `migrations`, **KHÔNG BAO GIỜ** dùng `prisma db push`. Chỉ dùng `prisma migrate dev`.
