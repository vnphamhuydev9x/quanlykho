# Phân tích Golive 1.0.0 (Landing Page & Tư Vấn Khách Hàng)

Mục tiêu của golive 1.0.0 là **chỉ public độc nhất Landing Page (cho khách vãng lai) và chức năng quản lý Tư Vấn (Inquiry) cho nhân sự công ty**, trong khi vẫn giữ nguyên toàn bộ code của các module khác (Core Nhập/Xuất kho, Công nợ, Tờ khai...) trên repo hiện tại theo định hướng Trunk-Based Development.

Để làm được điều này mà không phải tốn công xóa code (vì user vừa phục hồi lại bằng tay hàng loạt file `App.jsx`, `app.js`...), chúng ta sẽ áp dụng **Feature Toggle (Feature Flag)** qua các biến môi trường (Environment Variables).

---

## 1. Xác định phạm vi Module & Feature Flags

| Module | Golive 1.0? | Feature Flag / Biến Môi trường | Ghi chú |
|---|---|---|---|
| **Landing Page** | ✅ Có | Mặc định MỞ | Trang chủ cho khách vãng lai |
| **Auth & Profile** | ✅ Có | Mặc định MỞ | Đăng nhập + Đổi mật khẩu |
| **Tư vấn (Inquiry)** | ✅ Có | Mặc định MỞ | Core của version 1.0.0 này |
| **Notifications** | ✅ Có | Mặc định MỞ | Chuông báo cho phần Tư vấn |
| **Quản lý Nhân sự**| ✅ Có | Mặc định MỞ | Admin vẫn cần tạo acc cho ae Sale |
| **Dashboard** | ✅ Có | Mặc định MỞ | (Sẽ phải sửa UI dashboard chỉ show chart của Inquiry sau) |
| Giao dịch (Transactions) | ❌ Không | `FEATURE_TRANSACTIONS=false` | Tắt hoàn toàn |
| Quản lý Khách hàng | ❌ Không | `FEATURE_CUSTOMERS=false` | Tắt hoàn toàn |
| Core Kho (Mã hàng, Xe) | ❌ Không | `FEATURE_INVENTORY=false` | Tắt hoàn toàn UI & API |
| Tờ khai xuất nhập khẩu | ❌ Không | `FEATURE_DECLARATIONS=false` | Tắt hoàn toàn |
| Báo cáo Công nợ | ❌ Không | `FEATURE_REPORTS=false` | Tắt hoàn toàn |
| System Cấu hình | ❌ Không | `FEATURE_SETTINGS=false` | Kho bãi, Danh mục, Tình trạng |

---

## 2. Giải pháp Backend (API Level)

Chỉ API nào được phép (MỞ) mới tiếp tục xử lý và tương tác với Database. Ngay ở gateway của file `src/app.js`, mọi API bị tắt sẽ trả về `403 Forbidden` luôn.

### 2.1. Middleware `featureToggle.js`
Chúng ta tạo một middleware nhỏ `src/middlewares/featureToggle.js`:
```javascript
const featureToggle = (featureEnvVar) => {
    return (req, res, next) => {
        // Nếu server cấu hình biến môi trường này là "false" -> Từ chối
        if (process.env[featureEnvVar] === 'false') {
            return res.status(403).json({ 
                code: 403, 
                message: "Tính năng hệ thống đang được bảo trì hoặc chưa sẵn sàng golive." 
            });
        }
        next();
    };
};
module.exports = featureToggle;
```

### 2.2. Nhúng vào file `src/app.js`
Bọc middleware này trước các router không thuộc scope golive:
```javascript
const featureToggle = require('./middlewares/featureToggle');

// -- CÁC MODULE CHO PHÉP CHẠY LUÔN (GOLIVE 1.0.0) --
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employees', employeeRoutes); 

// -- CÁC MODULE BỊ KHÓA BẰNG FEATURE FLAGS --
app.use('/api/customers', featureToggle('FEATURE_CUSTOMERS'), customerRoutes);
app.use('/api/product-codes', featureToggle('FEATURE_INVENTORY'), productCodeRoutes);
app.use('/api/manifests', featureToggle('FEATURE_INVENTORY'), require('./routes/manifestRoutes'));
app.use('/api/export-orders', featureToggle('FEATURE_INVENTORY'), exportOrderRoutes);
app.use('/api/transactions', featureToggle('FEATURE_TRANSACTIONS'), transactionRoutes);
app.use('/api/warehouses', featureToggle('FEATURE_SETTINGS'), warehouseRoutes);
// ... chặn tương tự với category, tờ khai, công nợ
```
=> **Kịch bản thực tế**: Dưới local dev, biến môi trường nếu không khai báo thì mặc định API hiểu là "undefined" (cơ bản là "khác false") nên code dev không thay đổi, local vẫn xài 100% chức năng. Nhưng khi đưa lên Fly.io (Production), ta inject các biến `FEATURE_...=false`.

---

## 3. Giải pháp Frontend (UI Level)

Ở FE có 2 chỗ phải chặn tàng hình đi: **Menu bên trái (Sidebar)** và **App Router (URL)**.

### 3.1. Cấu hình Env
Thêm các biến cho VITE vào nền tảng host FE tĩnh (ví dụ Cloudflare Pages Environment Variables):
```env
VITE_FEATURE_INVENTORY=false
VITE_FEATURE_CUSTOMERS=false
VITE_FEATURE_TRANSACTIONS=false
# ...
```

### 3.2. Chặn Menu trong `MainLayout.jsx`
Tận dụng mảng `items` ban đầu, ta bọc dòng điều kiện bằng cú pháp `VITE_... !== 'false' && {...}` và filter:
```javascript
const items = [
    {
        key: '/customer-inquiry',
        icon: <CustomerServiceOutlined />,
        label: t('menu.inquiry'),
        onClick: () => navigate('/customer-inquiry'),
    },
    // Chặn hoàn toàn menu Khách hàng nếu Env = false
    import.meta.env.VITE_FEATURE_CUSTOMERS !== 'false' && {
        key: '/customers',
        icon: <TeamOutlined />,
        label: t('menu.customers'),
        onClick: () => navigate('/customers'),
    },
    // ...
].filter(Boolean); // Lọc bỏ đi các giá trị bị false
```

### 3.3. Chặn Navigate URL trong `App.jsx`
Để tránh trường hợp người ta nhớ Route `/product-codes` gõ thẳng lên thanh địa chỉ trình duyệt, ta tạo HOC `FeatureRoute`:
```javascript
const FeatureRoute = ({ featureEnv, children }) => {
    // Nếu bị flag false
    if (import.meta.env[featureEnv] === 'false') {
        // Đá bay về trang Tư vấn thay vì render màn hình
        return <Navigate to="/customer-inquiry" replace />; 
    }
    return children;
};
```
Sử dụng bọc bên ngoài các page hiện tại trong `App.jsx`:
```javascript
<Route
  path="/product-codes"
  element={
    <ProtectedRoute>
      <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
        <MainLayout><ProductCodePage /></MainLayout>
      </FeatureRoute>
    </ProtectedRoute>
  }
/>
```

---

## Tổng kết Lợi thế 

Áp dụng phương pháp phân tích Trunk Based Development trên mang lại các hiệu ứng sau:
1. **Source Control an toàn**: Quá trình code không cần đẻ branch song song, không lo bị conflict code khi merg code sau này. Toàn bộ tính năng nâng cao vẫn nằm yên trong nhánh `main/develop` của bạn.
2. **Bảo mật API triệt để**: Dù đoạn code Xử lý nghiệp vụ Kho/Tiền của phần bị đóng đang sẵn lỗi hay bốc mùi, người dùng dù có mở được UI test gửi Payload đi thì Backend vẫn chém đứt API trả về `403`.
3. **Mở khóa Roll-out chớp mắt cực mượt**: Khi nào các Module Giao dịch, Mã Hàng ... sẵn sàng Golive đợt 2, Công ty chỉ việc thay đổi chữ `false` thành `true` ở Setting Cloudflare/Fly.io và nhấn nút Reploy, Không chạm tay tý nào vào mã nguồn!
