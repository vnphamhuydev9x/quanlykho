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
- [ ] **Grid System**:
    *   Sử dụng `Col` của Ant Design với các breakpoint hợp lý.
    *   **Quy tắc An toàn**: Đối với các hàng có > 2 cột (Ví dụ: 2 Filter + 1 Button Group), chỉ nên chia cột ngang ở màn hình `lg` (>= 992px).
    *   Tại màn hình `md` (768px - 991px), hãy chia `12-12` hoặc stacked `24` để tránh vỡ giao diện.
    *   Ví dụ: Filter 1 `lg={8} md={12}`, Filter 2 `lg={8} md={12}`, Button `lg={8} md={24}`.
- [ ] **Table**:
    *   Luôn thêm `scroll={{ x: 'max-content' }}` để bảng có thể cuộn ngang trên màn hình nhỏ.
    *   **Sticky First Column Rule**: Cột đầu tiên (thường là Tên hoặc Mã định danh quan trọng) **BẮT BUỘC** phải được cố định bên trái (`fixed: 'left'`) để người dùng luôn biết mình đang xem dòng nào khi cuộn ngang.
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
    *   **Page Layout (Trang danh sách)**:
        *   Tuân thủ chuẩn "Customer List Layout".
        *   **Header**:
            *   Left: Tiêu đề "Quản lý + [Tên tính năng]".
            *   Right: Các nút thao tác (Export Excel, Thêm mới...).
            *   **Responsive**: Ở màn hình `md`, Header và nút Action nên xếp chồng (Stacked `span={24}`) để đảm bảo nút hiển thị ngang. Chỉ xếp hàng ngang (Side-by-side) ở màn hình `lg`.
        *   **Search/Filter Bar** (Trong Card):
            *   **Search Input**: Kích thước `large`, Width ~100%, Prefix icon `EyeOutlined`.
            *   **Wording**: Input placeholder là "Tìm theo ...", Label dropdown là "Lọc theo ...".
            *   **Buttons**: Nút "Tìm kiếm" và "Xóa lọc" nằm ở góc phải (Right aligned on desktop).
            *   **Buttons**: Nút "Tìm kiếm" và "Xóa lọc" nằm ở góc phải (Right aligned on desktop).
            *   **Right Alignment Rule**:
                *   Ở màn hình `lg`: Cột chứa Button chiếm toàn bộ không gian còn lại (24 - sum(filters)).
                *   Ở màn hình `md`: Cột chứa Button **PHẢI** xuống dòng (`span={24}`) để đảm bảo không gian.
            *   **Wording Consistency**:
                *   Tiêu đề của Filter **PHẢI** khớp hoàn toàn với tiêu đề cột trong bảng (bao gồm cả Chữ hoa/Chữ thường).
                *   Ví dụ: Header cột là "Trạng thái", thì Placeholder filter phải là "Lọc theo Trạng thái" (Không dùng "trạng thái").
                *   Ví dụ: Header cột là "Quyền hạn", thì Placeholder filter phải là "Lọc theo Quyền hạn" (Không dùng "quyền").

## 10. Code Style Consistency (Quy chuẩn Coding Style)
*   **Import/Require**: Giữ style nhất quán trong cùng 1 file.
    *   Ví dụ: Nếu đã dùng `const variable = require(...)` thì áp dụng cho tất cả.
    *   **TRÁNH** việc `require` trực tiếp trong hàm sử dụng (Inline require) trừ khi có lý do đặc biệt (Lazy load).

## 11. API Pagination & Search Standard
### Backend (Request)
*   **Method**: GET
*   **Params**:
    *   `page`: int (Default: 1)
    *   `limit`: int (Default: 10 or 20)
    *   `search`: string (Optional, search multiple fields with OR logic)

### Backend (Response)
*   Format `data`:
    ```json
    {
      "code": 200,
      "message": "Success",
      "data": {
        "items": [...], // Array (employees, customers...)
        "total": 100,    // Total records
        "page": 1,       // Current page
        "totalPages": 5  // Total pages
      }
    }
    ```

### Frontend (Implementation)
*   Use Ant Design `Table` with server-side pagination.
*   **Display Text**: Must be localized (e.g., "1-20 / 25").
*   **Page Size**: Allow options `[20, 30, 40, 50]`.
*   **Search**: Auto-reset to `page=1` on new search.

## 12. Localization (Đa ngôn ngữ)
*   **Missing Key Rule**:
    *   **TUYỆT ĐỐI** không được để thiếu key giữa các file ngôn ngữ (Ví dụ: `vi` có key `common.delete` thì `zh` và `en` cũng PHẢI có).
    *   **Checklist**: Trước khi commit code liên quan đến translation, phải rà soát so sánh cả 2 file `translation.json`.
    *   **Bắt buộc**: Khi thêm một key mới (ví dụ `common.status`), bắt buộc phải thêm message tương ứng vào cả 2 file ngôn ngữ (Tiếng Việt `vi` và Tiếng Trung `zh`).
*   **Placeholder**:
    *   Nội dung placeholder phải khớp với thứ tự các cột hoặc trường dữ liệu hiển thị trên UI.

### 12.1 Nguyên tắc Localization Hướng Ngữ cảnh (Context-Aware Localization)
**Mục tiêu**: Tránh việc dùng chung từ khóa gây sai lệch ngữ nghĩa khi mở rộng và đảm bảo không hardcode ngôn ngữ.

1.  **Feature-Scoped Keys (Phạm vi Tính năng)**:
    *   **QUY TẮC**: Hạn chế tối đa dùng `common.*` cho các trường nghiệp vụ chính (Business Fields).
    *   **Lý do**: Cùng là "Status" nhưng kho hàng là "Tình trạng" (Available), đơn hàng là "Trạng thái" (Pending). Dùng chung `common.status` sẽ không thể dịch chuẩn cho từng ngữ cảnh.
    *   **Chuẩn**: `[feature].[field]`. Ví dụ: `warehouse.status`, `employee.status`.

2.  **Enum/Value Mapping (Ánh xạ Giá trị)**:
    *   Đối với các trường dữ liệu dạng Enum (Status, Type, Role...), **TUYỆT ĐỐI KHÔNG** hardcode text hiển thị (như `'Hoạt động'`, `'Available'`) trong code JavaScript/React.
    *   **Phải** tạo key riêng cho từng giá trị Enum.
    *   *Ví dụ sai*: `status === 'AVAILABLE' ? 'Khả dụng' : 'Hết hàng'`
    *   *Ví dụ đúng*: `t(status === 'AVAILABLE' ? 'warehouse.available' : 'warehouse.unavailable')`

3.  **Quy trình xác minh (Definition of Done)**:
    *   Một tính năng chỉ được coi là hoàn thành khi toàn bộ text (Label, Header, Enum Value, Placeholder) đã có key trong **CẢ 2 FILE** `vi/translation.json` và `zh/translation.json`.
    *   Thiếu translation => **Bug**.
