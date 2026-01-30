# Technical Specification: Warehouse Management System

## 1. Tổng quan Project
Xây dựng hệ thống quản lý kho với kiến trúc tách biệt Frontend và Backend, sử dụng ngôn ngữ JavaScript thuần (Không TypeScript).

## 2. Kiến trúc & Công nghệ (Revised)

### Architecture: Client-Server
Hệ thống chia làm 2 phần riêng biệt, giao tiếp qua RESTful API.

### Tech Stack

| Thành phần | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Backend** | **Express.js** | Node.js Framework phổ biến nhất. Viết bằng JavaScript thuần. |
| **Frontend** | **React.js (Vite)** | Single Page Application. Template JavaScript. |
| **Database** | **PostgreSQL** | Chạy trên Docker. |
| **ORM** | **Prisma** | Kết nối DB. Cấu hình schema rành mạch. |
| **Communication**| **REST API** | Frontend gọi Backend qua HTTP Request (Axios). |
| **UI Library** | **Ant Design** | Bộ component UI chuyên nghiệp cho Admin Dashboard. |

## 4. Authentication & Security (Chi tiết)
- **Công nghệ**: jsonwebtoken (JWT) + bcryptjs.
- **Cơ chế**: Stateless Authentication.
- **Flow**:
  1. Client gửi `username` + `password` (POST /api/auth/login).
  2. Backend kiểm tra `username` trong DB.
  3. Nếu tồn tại, so sánh `password` (hash) bằng `bcrypt.compare()`.
  4. Nếu khớp: Backend sign 1 `access_token` (JWT chứa `id`, `role`, `exp`).
  5. Server trả về Token cho Client.
  6. Client lưu token (localStorage/Cookie).
  7. Request bảo mật: Gửi header `Authorization: Bearer <token>`.
  8. Middleware `authMiddleware` verify token, gán `req.user` nếu hợp lệ.

## 3. Cấu trúc Source Code
```
quanlykho/
├── source/
│   ├── backend/            # Chứa code API Express
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── middlewares/  # Auth Middleware
│   │   │   └── server.js
│   │   └── prisma/
│   ├── frontend/           # Chứa code React UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── App.jsx
│   │   └── package.json
├── deploy/             # Docker & Manual Guide
└── docker-compose.yml  # Database Service

```
