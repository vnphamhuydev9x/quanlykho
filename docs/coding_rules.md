# Coding Rules & Best Practices

## 0. QUAN TRỌNG NHẤT (CRITICAL RULES)
*   **Ngôn ngữ (Language)**:
    *   **Giao tiếp**: Luôn sử dụng **Tiếng Việt**.
    *   **Tài liệu**: Các file kế hoạch (`implementation_plan.md`, `task.md`) **BẮT BUỘC** viết bằng **Tiếng Việt**.
    *   **Code**: Comment và Log có thể dùng Tiếng Việt hoặc Tiếng Anh (Ưu tiên Tiếng Anh cho code, Tiếng Việt cho log nghiệp vụ).

## 1. Environment & Setup
*   **OS**: Windows.
*   **Shell**: PowerShell (`pwsh`).
*   **Browsing**: Ưu tiên sử dụng `browser_subagent` để tra cứu tài liệu mới nhất.

## 2. API Error Handling & Multi-language (I18n)

### Quy tắc
Backend **KHÔNG** trả về message string hardcode bằng tiếng Việt hay tiếng Trung. Backend chỉ trả về **Business Error Code**. Frontend sẽ chịu trách nhiệm mapping code này ra ngôn ngữ tương ứng.

### Format Response
```json
// Thất bại
{
  "code": 99001,
  "message": "Generic debug message (ex: Missing Input)"
}

// Thành công
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}
```

### Quy ước Mã lỗi (99xxx)
*   **99001**: User Input Error (Thiếu thông tin, sai định dạng).
*   **99002**: Auth Error (Sai user/pass).
*   **99003 - 99004**: Token Error (Missing, Invalid).
*   **99005**: Conflict Error (Trùng lặp dữ liệu).
*   **99500**: System/Server Error.
*   **99xxx**: Các mã business cụ thể khác.

### Frontend Implementation
Sử dụng `translation.json` để map code:
```json
"error": {
  "99001": "Vui lòng nhập đủ thông tin",
  "99005": "Tên đăng nhập đã tồn tại"
}
```

---

## 2. Redis Caching Strategy

### Quy tắc
Khi sử dụng Redis Cache cho các dữ liệu ít thay đổi (Ví dụ: Danh sách nhân viên, Danh mục), **BẮT BUỘC** phải đảm bảo tính nhất quán dữ liệu (Consistensy).

### Nguyên tắc "Evict Cache" (Xóa Cache)
Bất cứ khi nào dữ liệu gốc (Database) thay đổi, Cache tương ứng phải bị xóa ngay lập tức. Không chờ hết hạn (TTL).

### Implementation Pattern (Ví dụ: Employee)
1.  **READ (GET)**:
    *   Check Cache `employees:list`.
    *   Có -> Trả về ngay.
    *   Không -> Query DB -> Set Cache (TTL 1h) -> Trả về.

2.  **WRITE (CREATE, UPDATE, DELETE)**:
    *   Thực hiện thay đổi vào DB.
    *   **CRITICAL STEP**: `redisClient.del('employees:list')`.
    *   Nếu quên bước này => **LỖI NGHIỆM TRỌNG** (Người dùng thấy dữ liệu cũ).

### Checklist khi Code tính năng mới có Cache
- [ ] Xác định Key Cache là gì?
- [ ] API GET đã check cache chưa?
- [ ] API POST/PUT/DELETE đã gọi lệnh xóa cache chưa?

---

## 3. Logging Strategy

### Thư viện
Sử dụng `winston` (App Logs) và `morgan` (Request Logs).

### Quy tắc ("Audit Trail")
*   **Entrance**: Khi vào 1 function/API, log ngay input/params quan trọng (trừ password).
*   **Logic**: Log các bước xử lý quan trọng (Query DB, External Call, Calc).
*   **Exit**: Log kết quả thành công/thất bại và thời gian xử lý (nếu được).
*   **Context**: Log phải chứa ID (UserId, EmpId, OrderId) để trace được đối tượng.

### Mẫu Log Chuẩn
```javascript
// 1. Entrance
logger.info(`[CreateEmployee] Request received. Admin: ${req.user.username}, TargetUser: ${username}, Role: ${role}`);

// 2. Logic Step
logger.info(`[CreateEmployee] Checking if username ${username} exists...`);

// 3. Error Case
logger.warn(`[CreateEmployee] Failed. Username ${username} already exists.`);

// 4. Success Case
logger.info(`[CreateEmployee] Success. New ID: ${newUser.id}`);
```

### File Logs
*   `logs/combined.log`: Chứa tất cả log.
*   `logs/error.log`: Chỉ chứa log level `error`.

## 6. Xử lý Lỗi & Thông báo (Error Handling)
### Backend
*   Luôn trả về `code` (Business Code) và `message` (Technical Message).
*   **KHÔNG** trả về message hiển thị trực tiếp cho User từ Backend (trừ trường hợp debug).

### Frontend
*   Bắt buộc map `code` từ backend sang key trong `translation.json`.
*   **Văn phong thông báo**:
    *   **Chuyên nghiệp**: Tránh dùng từ ngữ suồng sã hoặc quá kỹ thuật.
    *   **Rõ ràng**: User hiểu ngay vấn đề là gi.
    *   **Hướng giải quyết**: Nếu được, hãy gợi ý hành động tiếp theo (Ví dụ: "Vui lòng liên hệ quản trị viên").
    *   *Ví dụ Tốt*: "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên."
    *   *Ví dụ Xấu*: "Lỗi, tài khoản bị khóa rồi."

## 7. Responsive Design (Frontend)
### Quy tắc Bắt buộc
*   Tất cả giao diện Frontend **PHẢI** hiển thị tốt trên cả Desktop và Mobile (Điện thoại/Tablet).
*   **KHÔNG** được sử dụng kích thước cố định (`px`) cho các layout chính (Ví dụ: `width: 1200px` là **CẤM**, phải dùng `width: 100%` hoặc `max-width`).

### Checklist Responsive
- [ ] **Grid System**: Sử dụng `Col` của Ant Design với các breakpoint `xs`, `sm`, `md`, `lg` (Ví dụ: `xs={24} md={12}` -> Mobile 1 cột, PC 2 cột).
- [ ] **Table**: Luôn thêm `scroll={{ x: 'max-content' }}` để bảng có thể cuộn ngang trên màn hình nhỏ.
- [ ] **Modal/Drawer**:
    *   Modal trên Mobile nên set `width: 90%` hoặc `100%`.
    *   Menu bên trái (Sidebar) trên PC -> Chuyển thành Drawer (Menu ẩn) trên Mobile.

---

## 8. Communication Rules (Quy tắc giao tiếp)
*   **Language**: Luôn trả lời và giao tiếp bằng **Tiếng Việt** (Vietnamese) trong mọi tình huống (trừ khi viết code hoặc tên biến tiếng Anh).
*   **Plan**: Các file kế hoạch (`implementation_plan.md`) phải được viết hoàn toàn bằng **Tiếng Việt**.


## 9. Standardized UI Design Rules (Quy chuẩn giao diện)
*   **Status Fields (Trạng thái)**:
    *   Sử dụng component `Switch` (Thanh gạt) cho các trường trạng thái 2 giá trị (Active/Inactive, On/Off).
    *   **KHÔNG** sử dụng Dropdown/Select cho trường hợp này.
    *   Logic: `checked` = Active/True, `unchecked` = Inactive/False.

## 10. Code Style Consistency (Quy chuẩn Coding Style)
*   **Import/Require**: Giữ style nhất quán trong cùng 1 file.
    *   Ví dụ: Nếu đã dùng `const variable = require(...)` thì áp dụng cho tất cả.
    *   **TRÁNH** việc `require` trực tiếp trong hàm sử dụng (Inline require) trừ khi có lý do đặc biệt (Lazy load).
