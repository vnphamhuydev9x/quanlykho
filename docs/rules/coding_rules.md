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

---

# BACKEND RULES

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

### Error Code Standards (Chuẩn mã lỗi)

#### Format & Categorization
*   **Format**: 5 chữ số, bắt đầu bằng `99` (ví dụ: `99001`, `99004`)
*   **Consistency**: Mỗi code chỉ dùng cho 1 mục đích duy nhất
*   **Phân loại**:
    *   **99001 - 99010**: Authentication & Authorization
    *   **99011 - 99100**: Business Logic Errors
    *   **99500+**: Server/System Errors

#### HTTP Status Mapping
*   **400**: Bad Request (User Input Error, Business Logic Error)
*   **401**: Unauthorized (Missing/Invalid Credentials)
*   **403**: Forbidden (Invalid Token, Permission Denied, Account Disabled)
*   **404**: Not Found (Resource not found)
*   **500**: Internal Server Error (System/DB/Cache errors)

#### Common Error Codes Reference
| Code | HTTP | Ý nghĩa | Xử lý |
|------|------|---------|-------|
| 99001 | 400 | Missing Input | Component |
| 99002 | 401 | User not found | **Interceptor** → Redirect |
| 99003 | 401 | Token missing | **Interceptor** → Redirect |
| 99004 | 403 | Token invalid/expired | **Interceptor** → Redirect |
| 99005 | 400 | Duplicate data | Component |
| 99006 | 404 | Not found | Component |
| 99007 | 403 | Account disabled | Component (NO redirect) |
| 99008 | 403 | Permission denied | Component |
| 99500 | 500 | Server error | Component |

#### Frontend Interceptor Logic (CRITICAL)
**File**: `source/frontend/src/utils/axios.js`

**Quy tắc**:
1. **Interceptor chỉ handle Auth errors**: 401, hoặc (403 + code 99004)
2. **Tự động redirect về login**: Khi gặp 401 hoặc (403 + 99004)
3. **KHÔNG redirect**: Khi gặp 403 + 99007 (account disabled) - Component phải tự handle
4. **Component handle**: Tất cả business logic errors (99011+) và server errors (99500+)

**Logic**:
```javascript
// Interceptor handles these cases AUTOMATICALLY:
if (status === 401 || (status === 403 && errorCode === 99004)) {
    // Clear auth & redirect to login
}
// Other errors (including 403 + 99007) are passed to component
```

#### Checklist khi thêm Error Code mới
- [ ] Chọn code number chưa dùng (check bảng trên)
- [ ] Xác định HTTP Status phù hợp (400/401/403/404/500)
- [ ] Viết message tiếng Việt rõ ràng, chuyên nghiệp
- [ ] **Kiểm tra conflict với Interceptor** (nếu là 401 hoặc 403)
- [ ] Thêm vào `translation.json` (cả `vi` và `zh`)
- [ ] Test cả Backend và Frontend

## 3. API Pagination & Search Standard
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

## 4. Redis Caching Strategy

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

### Caching Processed Data (Cache dữ liệu đã xử lý)
*   **Quy tắc**: "Cache what you serve".
*   **Mô tả**: Dữ liệu lưu trong cache PHẢI là dữ liệu cuối cùng (Response DTO) đã qua xử lý logic (ví dụ: đã format ngày tháng, đã ghép full URL cho ảnh, đã tính toán tổng tiền).
*   **Lý do**:
    *   Tránh việc logic xử lý bị chạy lại nhiều lần không cần thiết.
    *   Đảm bảo tính nhất quán: Dữ liệu trả về từ Cache phải giống hệt dữ liệu trả về từ Database (sau khi qua tầng Controller/Service).
    *   **Tránh lỗi**: Cache lưu raw data -> Cache Hit trả về raw -> Frontend hiển thị sai (ví dụ thiếu domain ảnh).
*   **Pattern**:
    *   ❌ **Sai (Cache Raw)**: `Query DB` -> `Save Cache` -> `Format Data` -> `Response`.
    *   ✅ **Đúng (Cache Response)**: `Query DB` -> `Format Data` -> `Save Cache` -> `Response`.

### Chiến lược Xóa Cache Liên hoàn (Cascading Invalidation)
*   **Quy tắc**: Khi một tài nguyên (Resource A) thay đổi, hệ thống phải rà soát và xóa cache của tất cả các tài nguyên khác (Resource B, C) có chứa thông tin của A.
*   **Ví dụ thực tế**:
    *   Màn hình `Transaction` có hiển thị `Customer Name`.
    *   Khi update thông tin `Customer` (ví dụ đổi tên), bắt buộc phải xóa cache `transactions:list`.
    *   Nếu không xóa => Transaction vẫn hiện tên cũ của khách hàng => **Lỗi hiển thị**.
*   **Checklist**:
    *   [ ] Function này sửa đổi bảng nào? (VD: User).
    *   [ ] Bảng này có được "Join" hoặc hiển thị dữ liệu ở màn hình khác không? (VD: Transaction list, Order list).
    *   [ ] Nếu có, phải gọi lệnh `redisClient.del` cho cả các key liên quan đó.

## 5. Logging Strategy

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

## 6. Backend Integration Testing Standard
*   **Full Coverage**:
    *   Tests MUST cover **Happy Path**, **Edge Cases**, and **Corner Cases** (e.g., max values, empty inputs, duplicate data, invalid formats).
*   **Role Verification**:
    *   **Strict Authorization**: Tests MUST verified that unauthorized roles (e.g., User) cannot perform Admin actions.
    *   Verify both Positive (Admin succeeds) and Negative (User fails 403) flows.
*   **Cache Logic (Critical)**:
    *   **Invalidation**: MUST verify that mutations (Create/Update/Delete) clear relevant cache keys.
    *   **Cascading Invalidation**: For relational data (e.g., Employee -> Customer, Customer -> Transaction), verify that updating the parent entity clears the child lists where the parent data might be displayed.
    *   **Verification**: Use `redisClient.keys()` in tests to assert cache state before and after actions.
*   **Black-Box Principle**:
    *   Tests run against a live server and DB, simulating real HTTP requests, treating the backend as a black box.

## 7. Performance & Anti-Patterns
*   **Avoid N+1 Query Problem (CRITICAL)**:
    *   **Definition**: Vấn đề xảy ra khi code thực hiện 1 query để lấy danh sách cha (N items), sau đó dùng vòng lặp (For/Map) để thực hiện thêm N query con để lấy dữ liệu liên quan.
    *   **Forbidden**: TUYỆT ĐỐI KHÔNG query database trong vòng lặp (`for`, `map`, `forEach`).
    *   **Solution**:
        *   Sử dụng **Eager Loading** (Prisma `include` hoặc nested `select`) để lấy dữ liệu trong 1 query duy nhất.
        *   Hoặc lấy danh sách ID, query 1 lần bảng con (`where: { id: { in: ids } }`) rồi map lại trên Application Layer.

## 8. Backend Data Validation Standards
*   **Selection Box (Dropdown) Mandatory Validation**:
    *   **Quy tắc**: Khi một trường thông tin ở Frontend là selection box thì có 2 trường hợp lấy dữ liệu:
        1. Lấy từ data của một table khác (ví dụ: Nhân viên, Khách hàng).
        2. Lấy từ một list các hard code values / Enum (ví dụ: Đơn vị kiện, Trạng thái).
    *   **Bắt buộc**: Với CẢ 2 trường hợp này, Backend **BẮT BUỘC** phải validate để chắc chắn rằng dữ liệu gửi lên từ Frontend là hợp lệ (tôn tại ID trong bảng con hoặc khớp value với list Enum đã định nghĩa). Tuyệt đối không được bỏ qua validation dẫn đến lưu rác/dữ liệu không xác định do Frontend truyền sai.

---

## 8b. Backend Constants & Enums

### Quy tắc BẮT BUỘC

*   **TUYỆT ĐỐI KHÔNG** dùng plain text string trực tiếp trong controller/route/service cho các giá trị cố định như **role**, **status**, **type**...
*   Tất cả các hằng số phải được định nghĩa tại **`src/constants/enums.js`** và import vào nơi sử dụng.

```javascript
// ❌ SAI — plain text string trực tiếp
if (role === 'CHUNG_TU') { ... }
whereClause.status = { in: ['PENDING_ANSWER', 'ANSWER_REJECTED'] };

// ✅ ĐÚNG — dùng enum
const { ROLES, INQUIRY_STATUS } = require('../constants/enums');
if (role === ROLES.CHUNG_TU) { ... }
whereClause.status = { in: [INQUIRY_STATUS.PENDING_ANSWER, INQUIRY_STATUS.ANSWER_REJECTED] };
```

*   **Role Middleware**: Khi implement API có phân quyền, **BẮT BUỘC** phải khai báo roles tường minh trong route (không để ngầm hiểu). Nếu chưa rõ roles nào được phép, **phải hỏi** trước khi implement.

```javascript
// ✅ ĐÚNG — khai báo roles rõ ràng tại route
const roleMiddleware = require('../middlewares/roleMiddleware');
router.put('/:id/review', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE]), controller.review);
```

---

# FRONTEND RULES

## 8. Frontend API Calls (axiosInstance)

### ⚠️ QUY TẮC BẮT BUỘC
**LUÔN LUÔN** sử dụng `axiosInstance` thay vì `axios` trực tiếp cho mọi API call (trừ Login page).

### Lý do:
- ✅ **Tự động thêm token** vào headers (không cần code thủ công)
- ✅ **Tự động redirect về login** khi token hết hạn (401, 403 + code 99004)
- ✅ **Nhất quán** trong toàn bộ app
- ✅ **Dễ maintain** (logic auth tập trung ở 1 chỗ)

### Cách dùng:

```javascript
// ❌ SAI - Dùng axios trực tiếp
import axios from 'axios';
const token = localStorage.getItem('access_token');
const response = await axios.get('http://localhost:3000/api/customers', {
    headers: { Authorization: `Bearer ${token}` }
});

// ✅ ĐÚNG - Dùng axiosInstance
import axiosInstance from '../utils/axios';
const response = await axiosInstance.get('/customers');
```

### Exception (Ngoại lệ):
- **Login page**: Có thể dùng `axios` trực tiếp vì chưa có token

### Checklist khi tạo Service/Page mới:
- [ ] Import `axiosInstance` từ `../utils/axios`
- [ ] Không import `axios` từ `'axios'`
- [ ] Không thêm token thủ công vào headers
- [ ] URL chỉ cần path (VD: `/customers`), không cần full URL

## 9. Xử lý Lỗi & Thông báo (Error Handling)
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

## 10. Localization (Đa ngôn ngữ)
*   **Missing Key Rule**:
    *   **TUYỆT ĐỐI** không được để thiếu key giữa các file ngôn ngữ (Ví dụ: `vi` có key `common.delete` thì `zh` và `en` cũng PHẢI có).
    *   **Checklist**: Trước khi commit code liên quan đến translation, phải rà soát so sánh cả 2 file `translation.json`.
    *   **Bắt buộc**: Khi thêm một key mới (ví dụ `common.status`), bắt buộc phải thêm message tương ứng vào cả 2 file ngôn ngữ (Tiếng Việt `vi` và Tiếng Trung `zh`).
*   **Placeholder**:
    *   Nội dung placeholder phải khớp với thứ tự các cột hoặc trường dữ liệu hiển thị trên UI.

### 10.1 Nguyên tắc Localization Hướng Ngữ cảnh (Context-Aware Localization)
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

### 10.2 Quy tắc Cấm Hardcode (No Hardcoded Strings Rule)
*   **TUYỆT ĐỐI KHÔNG** dùng chuỗi tĩnh (static string) cho các thuộc tính hiển thị trên UI.
*   **Các vị trí thường gặp lỗi**:
    *   `title="..."` (Modal title, Page title).
    *   `label="..."` (Form Item label).
    *   `placeholder="..."` (Input placeholder).
    *   `message="..."` (Rule validation message).
*   **Checklist Review**:
    *   [ ] Search toàn bộ project các string tiếng Việt có dấu (ví dụ: "Thêm", "Sửa", "Tên").
    *   [ ] Đảm bảo tất cả đều được bọc trong hàm `t('key')`.

## 11. Responsive Design (Frontend)
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

## 12. Standardized UI Design Rules (Quy chuẩn giao diện)

### 12.1 Form Components

#### InputNumber
*   **Step**: Luôn luôn đặt `step={1}` (hoặc để mặc định) để khi bấm nút mũi tên lên/xuống, giá trị tăng/giảm theo đơn vị nguyên (1, 2, 3...) thay vì tăng giảm phần thập phân.
*   **Formatter/Parser**: Sử dụng bộ định dạng chuẩn để phân cách hàng nghìn.
    ```jsx
    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
    parser={value => value.replace(/\$\s?|(,*)/g, '')}
    ```
*   **Min/Max**: Luôn xác định `min={0}` cho các trường số tiền, trọng lượng, số lượng nếu không cho phép số âm.
*   **Màu sắc (Disabled)**: Sử dụng `className="bg-gray-100"` cho các ô bị khóa (disabled) để đồng nhất giao diện màu xám. KHÔNG dùng màu xanh/vàng tự chế.

#### Status Fields (Trạng thái)
*   Sử dụng component `Switch` (Thanh gạt) cho các trường trạng thái 2 giá trị (Active/Inactive, On/Off).
*   **KHÔNG** sử dụng Dropdown/Select cho trường hợp này.
*   Logic: `checked` = Active/True, `unchecked` = Inactive/False.

#### Input with Unit Suffix (Input kèm Đơn vị)
*   **Quy tắc**: Khi Input có đơn vị đo lường (kg, m3, VND, %...), BẮT BUỘC sử dụng `Space.Compact` để hiển thị đơn vị ở cuối Input.
*   **Mục đích**: Giúp người dùng biết rõ đơn vị đang nhập mà không cần nhìn Label, đồng thời tạo giao diện hiện đại.
*   **Styling**: 
    *   Phần Suffix (Input chứa đơn vị) phải có background xám nhạt (`#fafafa`), text xám (`rgba(0,0,0,0.45)`), và `pointerEvents: 'none'`.
    *   **Width**:
        *   Đơn vị ngắn (%, kg): `width: '40px'`.
        *   Đơn vị dài (VND, USD): `width: '60px'` (Để tránh bị khuất text).
*   **Code Mẫu**:
    ```jsx
    <Form.Item label="Giá trị">
        <Space.Compact block>
            <InputNumber 
                style={{ width: 'calc(100% - 60px)' }} // 100% - Suffix Width
            />
            <Input
                style={{ 
                    width: '60px', 
                    textAlign: 'center', 
                    pointerEvents: 'none', 
                    backgroundColor: '#fafafa', 
                    color: 'rgba(0, 0, 0, 0.45)' 
                }}
                placeholder="VND"
                disabled
            />
        </Space.Compact>
    </Form.Item>
    ```

#### Selection/Filter Box (Standard)
*   **Always Searchable**: Tất cả `Select` box (cho dù là Filter hay Form) đều phải có prop `showSearch`.
*   **Filter Logic**: Phải implement `filterOption` để search theo text hiển thị (không phân biệt hoa thường).
    ```javascript
    filterOption={(input, option) =>
        (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
    }
    ```
*   **Display Format**:
    *   **Tổng quát**: Hiển thị dạng `Username - FullName (Phone)` để hỗ trợ tìm kiếm đa chiều.
    *   **WYSIWYS (What You See Is What You Search)**: Đối với các filter lọc theo trường liên kết (ví dụ: Người tạo, Sale phụ trách) trong bảng dữ liệu:
        *   Nếu cột trong bảng chỉ hiển thị **Tên**, thì filter cũng chỉ hiển thị và cho phép tìm theo **Tên**.
        *   **TUYỆT ĐỐI** không hiển thị thêm thông tin (SĐT, Email) trong dropdown nếu cột tương ứng trên bảng không có.
        *   Lý do: Đảm bảo tính nhất quán giữa cái nhìn thấy và cái tìm kiếm được.

#### Dropdown / Select Options (Quy tắc Option Mảng Bắt Buộc)
*   **QUY TẮC BẮT BUỘC 1**: Khi thiết kế các trường Selection Box / Dropdown (ví dụ: Đơn vị kiện, Trạng thái, Phân loại, Thuế...), **TUYỆT ĐỐI KHÔNG** dùng text (raw string) làm `value`. Luôn sử dụng hằng số chuẩn tiếng Anh (Enum, Code - ví dụ: `CARTON`, `PALLET`) làm `value` lưu xuống Database và làm key.
*   **QUY TẮC BẮT BUỘC 2 (Array Object Rendering)**: **Không** viết cứng nhiều tag `<Option>` lặp lại bên trong `<Select>`. Tất cả cấu hình dropdown phải được định nghĩa thành một mảng (Array Object) tại file `constants/enums.js` (hoặc file config tương ứng), chứa `value` và `labelKey`, rồi render qua vòng lặp `.map()`.
*   **Lý do**:
    *   Tách biệt dữ liệu config và giao diện. Tái sử dụng mảng dropdown này dễ dàng cho cả Form Chọn và Bộ Lọc (Filter).
    *   Chỉ cần sửa ở 1 nơi duy nhất (`enums.js`) nếu muốn thêm bớt tùy chọn, thay vì phải rà quét toàn bộ file giao diện.
*   **Code Mẫu Bước 1 (Định nghĩa tại constants/enums.js)**:
    ```javascript
    export const PACKAGE_UNIT_OPTIONS = [
        { value: PACKAGE_UNIT.CARTON, labelKey: 'productCode.unitThungCarton' },
        { value: PACKAGE_UNIT.PALLET, labelKey: 'productCode.unitPallet' }
    ];
    ```
*   **Code Mẫu Bước 2 (Render tại Component)**:
    *   ❌ **Sai (Hardcode Option)**:
        ```jsx
        <Select>
            <Option value={PACKAGE_UNIT.CARTON}>{t('productCode.unitThungCarton')}</Option>
            <Option value={PACKAGE_UNIT.PALLET}>{t('productCode.unitPallet')}</Option>
        </Select>
        ```
    *   ✅ **Đúng (Dùng map render)**:
        ```jsx
        <Select>
            {PACKAGE_UNIT_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
            ))}
        </Select>
        ```

### 12.2 Table Design

#### Table Fixed Columns (Cột cố định trong Table)
*   **Quy tắc Bắt buộc**: Với mọi Table có scroll ngang (`scroll={{ x: ... }}`), LUÔN LUÔN cố định cột đầu tiên bên trái (`fixed: 'left'`) và cột cuối cùng (thường là cột Thao tác/Action) bên phải (`fixed: 'right'`).
*   **Cột Đầu**: Luôn là ID, mã định danh, hoặc thông tin quan trọng nhất để người dùng luôn biết mình đang xem dòng nào.
*   **Cột Cuối**: Luôn là Action (Thao tác) để dễ dàng thao tác mà không cần cuộn ngang lại.
*   **Lý do**: Tối ưu hóa UX, giúp người dùng không bị mất ngữ cảnh và dễ dàng thao tác trên mọi kích thước màn hình.
*   **Ví dụ**:
    ```javascript
    const columns = [
        { title: 'ID', dataIndex: 'id', fixed: 'left', width: 80 }, // ✅ Fixed Left
        { title: 'Khách hàng', key: 'customer', width: 200 }, 
        { title: 'Sản phẩm', dataIndex: 'product', width: 150 }, 
        { title: 'Giá', dataIndex: 'price', width: 120 }, 
        { title: 'Action', key: 'action', fixed: 'right', width: 150 } // ✅ Fixed Right
    ];
    ```

#### Action Buttons Format (Format nút hành động trong Table)
*   **Quy tắc**: Các nút hành động trong cột Action chỉ hiển thị **icon**, không có text.
*   **Component**: Sử dụng `Button` với `icon` prop, không có children text.
*   **Tooltip**: Sử dụng `title` attribute để hiển thị tooltip khi hover.
*   **Spacing**: Sử dụng `Space size="middle"` để bọc các nút.
*   **Lý do**:
    *   Tiết kiệm không gian trong table (đặc biệt khi có nhiều cột).
    *   Giao diện gọn gàng, hiện đại.
    *   Icon đã đủ rõ ràng để user hiểu chức năng.
*   **Ví dụ**:
    ```jsx
    {
        title: t('common.action'),
        key: 'action',
        render: (_, record) => (
            <Space size="middle">
                <Button icon={<EyeOutlined />} onClick={() => handleView(record)} title={t('common.view')} />
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} title={t('common.edit')} />
                <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                    <Button icon={<DeleteOutlined />} danger title={t('common.delete')} />
                </Popconfirm>
            </Space>
        )
    }
    ```
*   **Các icon thường dùng**:
    *   View: `<EyeOutlined />`
    *   Edit: `<EditOutlined />`
    *   Delete: `<DeleteOutlined />` với `danger` prop
    *   Reset Password: `<KeyOutlined />` với style orange
*   **Lưu ý quan trọng**:
    *   **PHẢI** đảm bảo mỗi nút gọi đúng handler function tương ứng:
        *   Nút View → `handleView(record)`
        *   Nút Edit → `handleEdit(record)`
        *   Nút Delete → `handleDelete(record.id)`
    *   **KHÔNG** được nhầm lẫn giữa các handler (ví dụ: nút View gọi `handleEdit`).
    *   Nếu chưa có `handleView`, cần implement function này để xử lý chế độ view-only.

### 12.3 Display Format Standards

#### Customer Display Format (Format hiển thị Khách hàng)
*   **Quy tắc**: Khi hiển thị thông tin khách hàng trong bảng hoặc danh sách, luôn sử dụng format 2 dòng:
    *   **Dòng 1**: Họ và tên (`Typography.Text strong`)
    *   **Dòng 2**: `<Tên đăng nhập> - <Số điện thoại>` (`Typography.Text type="secondary"`, `fontSize: 12px`)
*   **Component**: Sử dụng `Space direction="vertical" size={0}` để bọc 2 dòng.
*   **Áp dụng**: Tất cả màn hình có hiển thị thông tin khách hàng (Transaction, Declaration, ProductCode...).
*   **Ví dụ**:
    ```jsx
    <Space direction="vertical" size={0}>
        <Typography.Text strong>{customer.fullName}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            {customer.username} - {customer.phone}
        </Typography.Text>
    </Space>
    ```

#### Customer Selection Box Format (Format hiển thị Khách hàng trong Dropdown)
*   **Quy tắc**: Khi hiển thị khách hàng trong Select/Dropdown, sử dụng format: `<Họ và tên> (<Tên đăng nhập> - <Số điện thoại>)`
*   **Áp dụng**: Tất cả Select box cho phép chọn khách hàng (Form, Filter...).
*   **Ví dụ**:
    ```jsx
    <Select showSearch filterOption={...}>
        {customers.map(customer => (
            <Option key={customer.id} value={customer.id}>
                {`${customer.fullName} (${customer.username} - ${customer.phone || 'N/A'})`}
            </Option>
        ))}
    </Select>
    ```
*   **Kết quả hiển thị**: `Nguyễn Văn A (nguyenvana - 0123456789)`

#### Number Format (Format hiển thị Số)
*   **Quy tắc**: Sử dụng chuẩn Việt Nam cho việc hiển thị số:
    *   **Dấu chấm (.)**: Phân tách hàng nghìn
    *   **Dấu phẩy (,)**: Phân tách phần thập phân
*   **Ví dụ**:
    *   `1.000.000,29` = 1 triệu lẻ 0,29 đơn vị
    *   `50.000` = 50 nghìn
    *   `123,45` = 123 phẩy 45
*   **Implementation**:
    ```javascript
    // Số nguyên (hàng nghìn)
    new Intl.NumberFormat('de-DE').format(1000000) // "1.000.000"
    
    // Số thập phân
    new Intl.NumberFormat('de-DE', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    }).format(1000000.29) // "1.000.000,29"
    
    // Tiền tệ VND (không có phần thập phân)
    new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(1000000) // "1.000.000 ₫"
    ```
*   **Lưu ý**: 
    *   Sử dụng locale `'de-DE'` cho số thông thường (vì de-DE dùng dấu chấm/phẩy giống Việt Nam)
    *   Sử dụng locale `'vi-VN'` cho tiền tệ VND

#### Number Format Standard (Chuẩn định dạng số)
*   **Loại 1: Float Format (Số thực - 2 số lẻ)**:
    *   **Mục tiêu**: Dùng cho Tiền tệ, Trọng lượng, Khối lượng... Luôn hiển thị 2 số thập phân.
    *   **Quy chuẩn**: Hàng nghìn dấu chấm (.), thập phân dấu phẩy (,).
    *   **Cấu hình InputNumber (Edit Mode)**:
        ```jsx
        <InputNumber
            precision={2}
            step={0.01}
            formatter={(value, { userTyping }) => {
                if (userTyping) return value;
                if (value === null || value === undefined || value === '') return '';
                const parts = value.toString().split('.');
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                const decimalPart = parts[1] || '00';
                return `${integerPart},${decimalPart}`;
            }}
            parser={value => {
                if (!value) return '';
                // Nếu có dấu phẩy, coi đó là dấu thập phân (chuẩn VN: 1.234,56)
                if (value.includes(',')) {
                    return value.replace(/\./g, '').replace(',', '.');
                }
                // Nếu không có dấu phẩy nhưng có nhiều dấu chấm, coi đó là phân cách hàng nghìn (1.234.567)
                const dotCount = (value.match(/\./g) || []).length;
                if (dotCount > 1) {
                    return value.replace(/\./g, '');
                }
                // Còn lại (không có dấu phẩy, 0 hoặc 1 dấu chấm) thì giữ nguyên để parseFloat xử lý (2.1 hoặc 1234)
                return value;
            }}
        />
        ```
    *   **Hiển thị (Display Mode / Table)**: Sử dụng hàm `formatFloat(amount)` từ `utils/format.js`.
*   **Loại 2: Integer Format (Số nguyên - 0 số lẻ)**:
    *   **Mục tiêu**: Dùng cho Số kiện, Số lượng sản phẩm (nếu không có lẻ)...
    *   **Quy chuẩn**: Hàng nghìn dấu chấm (.), không có phần thập phân.
    *   **Cấu hình InputNumber (Edit Mode)**:
        ```jsx
        <InputNumber
            precision={0}
            step={1}
            formatter={(value, { userTyping }) => {
                if (userTyping) return value;
                if (value === null || value === undefined || value === '') return '';
                return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }}
            parser={value => value.replace(/\./g, '')}
        />
        ```
    *   **Hiển thị (Display Mode / Table)**: Sử dụng hàm `formatInteger(amount)` từ `utils/format.js`.
*   **Lưu ý quan trọng**: BẮT BUỘC giữ tính đồng nhất giữa chế độ chỉnh sửa (Edit Mode) và hiển thị (Display Mode). Nếu một trường đã được định nghĩa là Float, thì cả khi nhập liệu và khi xem trong bảng/báo cáo đều phải hiển thị đúng 2 số thập phân.
*   **Lưu ý chung**: 
    *   Luôn disable `InputNumber` khi ở chế độ `isViewMode` và thêm `className="bg-gray-100"`.
    *   Luôn để `min={0}` trừ khi có yêu cầu đặc biệt.
    *   **Hiển thị Đơn vị (Unit)**: Sử dụng `Space.Compact block` kết hợp thẻ `Input` (disabled) làm hậu tố đơn vị cho Form.Item để đảm bảo chiều rộng hiển thị chiếm 100%. **KHÔNG** sử dụng `addonAfter` vì nó sẽ không hiển thị tốt.
<!-- Ví dụ:
<Form.Item label="Trọng lượng">
    <Space.Compact block>
        <Form.Item name="weight" noStyle>
            <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} />
        </Form.Item>
        <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
    </Space.Compact>
</Form.Item>
-->

#### Currency Display in Table (Hiển thị Tiền trong Bảng)
*   **Quy tắc**:
    *   **Align**: `right` (Căn phải).
    *   **Style**: Màu xanh lá (`#389e0d`), in đậm (`fontWeight: 'bold'`).
    *   **Format**: Sử dụng nhãn chữ viết tắt (VND, RMB) thay vì ký hiệu (₫, ¥). Các số phải được phân cách hàng nghìn bằng dấu chấm (.).
*   **Code Mẫu**:
    ```jsx
    {
        title: t('customer.totalPaid'),
        dataIndex: 'totalPaid',
        key: 'totalPaid',
        align: 'right', // ⚠️ Bắt buộc
        render: (value) => (
            <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                {value ? `${new Intl.NumberFormat('de-DE').format(value)} VND` : '0 VND'}
            </span>
        ),
    }
    ```
    *   Đối với RMB: `{value ? `${new Intl.NumberFormat('de-DE').format(value)} RMB` : '0 RMB'}`

#### 12.5 Unit Display in Tables (Hiển thị đơn vị trong Bảng)
*   **Quy tắc**: Với các cột có đơn vị đo lường (kg, m³, kiện...), **KHÔNG** để đơn vị trong ngoặc ở tiêu đề cột. Thay vào đó, hãy hiển thị đơn vị trực tiếp trong từng ô dữ liệu.
*   **Lý do**: Làm tiêu đề cột gọn gàng hơn và dữ liệu trong bảng tự giải thích (self-explanatory).
*   **Ví dụ**:
    *   ❌ **Sai**: Tiêu đề: `Trọng lượng (kg)`, Giá trị: `14`
    *   ✅ **Đúng**: Tiêu đề: `Trọng lượng`, Giá trị: `14 kg`
*   **Code Mẫu**:
    ```javascript
    {
        title: 'Tổng Trọng lượng',
        dataIndex: 'totalWeight',
        align: 'right',
        render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} kg` : '0 kg'
    }
    ```

### 12.6 Multi-Section Detail View — Tab Layout (Xem chi tiết nhiều vùng thông tin)

#### Quy tắc (BẮT BUỘC)

> **Khi một màn hình xem chi tiết (Modal View / Detail Page) có từ 3 vùng thông tin trở lên, BẮT BUỘC tổ chức thành các Tab thay vì để người dùng phải cuộn dọc (scroll).**

**Tiêu chí áp dụng**: Từ 3 nhóm thông tin có tiêu đề riêng, thuộc về các entity khác nhau (ví dụ: Mã hàng / Mặt hàng / Khai báo).

**Nguyên tắc đặt tên Tab**:
- Tên tab = Tên entity hoặc nhóm thông tin, ngắn gọn (2–4 từ).
- Có thể kèm icon để nhận diện nhanh (tùy chọn).
- Ví dụ: `Thông tin Mã hàng`, `Thông tin Mặt hàng`, `Thông tin Khai báo`.

**Quy tắc Tab mặc định (Active Tab)**:
- Tab đầu tiên (Tab 1) luôn là vùng thông tin "chủ thể chính" của màn hình hiện tại.
- **BẮT BUỘC** reset về Tab 1 mỗi khi modal mở lại (dùng `useEffect` watch `open` prop).
- Lý do: Tránh UX lỗi khi user đóng modal đang ở Tab 3 rồi mở record khác → vẫn nhìn thấy Tab 3.

**Quy tắc Tab chứa lỗi validation**:
- Khi form submit và có lỗi ở Tab không đang active, **PHẢI** tự động chuyển sang Tab chứa lỗi đầu tiên.
- Cách detect: Dùng `form.getFieldsError()` để lấy danh sách field lỗi, map ngược lại Tab chứa field đó.

#### Code Mẫu (Ant Design Tabs trong Modal)

```jsx
import { Tabs, Modal } from 'antd';
import { FileTextOutlined, InboxOutlined, FileSearchOutlined } from '@ant-design/icons';

const TAB_KEYS = {
    DECLARATION:  'declaration',  // Tab 1 — chủ thể chính
    MERCHANDISE:  'merchandise',
    PRODUCT_CODE: 'productCode',
};

// Map field name → tab key (dùng để nhảy tab khi có lỗi validation)
const FIELD_TAB_MAP = {
    brand: TAB_KEYS.DECLARATION,
    declarationQuantity: TAB_KEYS.DECLARATION,
    merchandiseName: TAB_KEYS.MERCHANDISE,
    packageUnit: TAB_KEYS.MERCHANDISE,
    productCodeName: TAB_KEYS.PRODUCT_CODE,
};

const DetailModal = ({ open, onClose, data }) => {
    const [activeTab, setActiveTab] = useState(TAB_KEYS.DECLARATION);
    const [form] = Form.useForm();

    // ✅ Reset về Tab 1 mỗi khi modal mở
    useEffect(() => {
        if (open) setActiveTab(TAB_KEYS.DECLARATION);
    }, [open]);

    // ✅ Nhảy sang tab chứa lỗi đầu tiên khi submit fail
    const handleFinishFailed = ({ errorFields }) => {
        if (errorFields.length > 0) {
            const firstErrorField = errorFields[0].name[0];
            const targetTab = FIELD_TAB_MAP[firstErrorField];
            if (targetTab && targetTab !== activeTab) {
                setActiveTab(targetTab);
            }
        }
    };

    const tabItems = [
        {
            key: TAB_KEYS.DECLARATION,
            label: <span><FileSearchOutlined /> {t('declaration.tabTitle')}</span>,
            children: <DeclarationInfoSection form={form} data={data} />,
        },
        {
            key: TAB_KEYS.MERCHANDISE,
            label: <span><InboxOutlined /> {t('merchandise.tabTitle')}</span>,
            children: <MerchandiseInfoSection data={data?.merchandise} />,
        },
        {
            key: TAB_KEYS.PRODUCT_CODE,
            label: <span><FileTextOutlined /> {t('productCode.tabTitle')}</span>,
            children: <ProductCodeInfoSection data={data?.merchandise?.productCode} />,
        },
    ];

    return (
        <Modal open={open} onCancel={onClose} width={900} footer={/* ... */}>
            <Form form={form} onFinishFailed={handleFinishFailed}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    destroyInactiveTabPane={false}
                />
            </Form>
        </Modal>
    );
};
```

#### Checklist khi implement Multi-Section Detail

- [ ] Từ 3 vùng thông tin trở lên → dùng `Tabs`, không dùng scroll
- [ ] Tab 1 là entity chủ thể chính của màn hình
- [ ] Tên tab ngắn gọn, dùng translation key (không hardcode tiếng Việt)
- [ ] `useEffect` reset `activeTab` về Tab 1 khi `open` prop thay đổi sang `true`
- [ ] `destroyInactiveTabPane={false}` để không mất state khi chuyển tab
- [ ] Có `FIELD_TAB_MAP` và `onFinishFailed` để tự nhảy sang tab chứa lỗi
- [ ] Modal width đủ rộng (≥ 800px) để tab không bị xuống dòng

---

### 12.4 Page Layout (Trang danh sách)
*   Tuân thủ chuẩn "Customer List Layout".
*   **Header**:
    *   Left: Tiêu đề "Quản lý + [Tên tính năng]".
    *   Right: Các nút thao tác (Export Excel, Thêm mới...).
    *   **Responsive**: Ở màn hình `md`, Header và nút Action nên xếp chồng (Stacked `span={24}`) để đảm bảo nút hiển thị ngang. Chỉ xếp hàng ngang (Side-by-side) ở màn hình `lg`.
*   **Search/Filter Bar** (Trong Card):
    *   **Search Input**: Kích thước `large`, Width ~100%, Prefix icon `EyeOutlined`.
    *   **Wording**: Input placeholder là "Tìm theo ...", Label dropdown là "Lọc theo ...".
    *   **Buttons**: Nút "Tìm kiếm" và "Xóa lọc" nằm ở góc phải (Right aligned on desktop).
    *   **Right Alignment Rule**:
        *   Ở màn hình `lg`: Cột chứa Button chiếm toàn bộ không gian còn lại (24 - sum(filters)).
        *   Ở màn hình `md`: Cột chứa Button **PHẢI** xuống dòng (`span={24}`) để đảm bảo không gian.
    *   **Wording Consistency**:
        *   Ví dụ: Header cột là "Trạng thái", thì Placeholder filter phải là "Lọc theo Trạng thái" (Không dùng "trạng thái").
        *   Ví dụ: Header cột là "Quyền hạn", thì Placeholder filter phải là "Lọc theo Quyền hạn" (Không dùng "quyền").
    *   **Search Placeholder**:
        *   **Format**: "Tìm theo [Field 1], [Field 2]" (Không dùng dấu ba chấm "..." ở cuối).
        *   **Capitalization**: Các tên trường phải viết In Hoa Chữ Cái Đầu (Title Case) để trang trọng.
            *   Đúng: "Tìm theo Tên kho", "Tìm theo Loại hàng"
            *   Sai: "Tìm theo tên kho..." (Lỗi: chữ thường, có "...")
        *   Phải liệt kê rõ các trường có thể tìm kiếm, khớp với Header của bảng.
        *   Ví dụ: "Tìm theo Khách hàng (Tên, SĐT), Nội dung" thay vì "Tìm kiếm...".

---

# GENERAL DEVELOPMENT RULES

## 13. Code Style Consistency (Quy chuẩn Coding Style)
*   **Import/Require**: Giữ style nhất quán trong cùng 1 file.
    *   Ví dụ: Nếu đã dùng `const variable = require(...)` thì áp dụng cho tất cả.
    *   **TRÁNH** việc `require` trực tiếp trong hàm sử dụng (Inline require) trừ khi có lý do đặc biệt (Lazy load).
*   **Yoda Condition (BẮT BUỘC)**: Khi so sánh biến với hằng số / enum, **hằng số / enum luôn đứng bên trái**.
    *   ✅ Đúng: `if (ROLES.CHUNG_TU === role)`, `if (INQUIRY_STATUS.PENDING_REVIEW === status)`
    *   ❌ Sai: `if (role === ROLES.CHUNG_TU)`, `if (status === INQUIRY_STATUS.PENDING_REVIEW)`
    *   **Lý do**: Tránh null pointer exception — nếu `role` là `undefined`/`null`, phép so sánh vẫn trả về `false` đúng; tránh lỗi gán nhầm (`=` thay vì `===`) vì constant không thể đứng bên trái phép gán.

## 14. Test-Driven Development (TDD) Methodology
*   **TDD Workflow**:
    *   **Red**: Write a failing test case *before* implementing any feature or fix.
    *   **Green**: Write just enough code to make the test pass.
    *   **Refactor**: Improve the code without changing behavior (test must remain green).
*   **Immutable Tests Rule** (QUAN TRỌNG):
    *   **Source of Truth**: Test assertions phản ánh Requirements.
    *   **Restricted Modification**: Không được phép sửa đổi Test Case đã viết trừ khi Requirements thay đổi.
    *   **Approval Process**: Nếu cần sửa Test Case (do logic cũ sai hoặc đổi nghiệp vụ), **BẮT BUỘC** phải hỏi ý kiến User và được sự đồng ý mới được sửa. Code phải sửa để theo Test, không được sửa Test để theo Code.

## 15. Communication Rules (Quy tắc giao tiếp)
*   **Language**: Luôn trả lời và giao tiếp bằng **Tiếng Việt** (Vietnamese) trong mọi tình huống (trừ khi viết code hoặc tên biến tiếng Anh).
*   **Plan**: Các file kế hoạch (`implementation_plan.md`) phải được viết hoàn toàn bằng **Tiếng Việt**.
*   **Rephrase Doc Update (BẮT BUỘC)**:

    ### Cấu trúc tài liệu requirement
    Mỗi chức năng có 2 file đặt trong `docs/business-tech-note/Draft_requirement/<tên-chức-năng>/`:
    - `<tên-chức-năng>_requirement.md` — Draft gốc do user viết tay (thô, ngắn gọn)
    - `<tên-chức-năng>_requirement_rephrase.md` — Bản chính thức được chuẩn hóa, **luôn phản ánh trạng thái requirement hiện tại**

    ### Quy tắc BẮT BUỘC
    Khi user viết **review implement** trong file `*_requirement.md` và có bất kỳ thay đổi nào về **business requirement** (functional hoặc non-functional), **BẮT BUỘC** phải cập nhật file `*_requirement_rephrase.md` trước hoặc cùng lúc với việc fix code.

    ### Ví dụ cụ thể
    User thêm vào `landing_page_requirement.md`:
    ```
    # review implement 2
    - nhân viên chứng từ họ chỉ nhìn thấy như sau:
        - đã có những câu hỏi nào (PENDING_ANSWER, PENDING_SEND, EMAIL_SENT)
        - họ không biết là trước đó có cái nào đã bị reject
    ```

    ✅ **Đúng quy trình**:
    1. Đọc thay đổi trong `landing_page_requirement.md`
    2. Cập nhật `landing_page_requirement_rephrase.md` → thêm bảng visibility của CHUNG_TU (mục 3.4)
    3. Fix code controller/route tương ứng

    ❌ **Sai quy trình**:
    - Fix code ngay mà không update `*_rephrase.md`
    - Chỉ update `*_rephrase.md` sau khi code xong

    ### Phân biệt loại thay đổi
    | Loại thay đổi | Phải update rephrase? |
    |---|---|
    | Functional requirement (luồng, phân quyền, visibility...) | ✅ BẮT BUỘC |
    | Non-functional requirement (notification, performance...) | ✅ BẮT BUỘC |
    | Bug fix thuần kỹ thuật (không đổi business logic) | ❌ Không cần |
    | Refactor code (không đổi behavior) | ❌ Không cần |

---

## 16. Cross-Entity Navigation — "Quick Peek" Pattern (Điều hướng liên đối tượng)

### Vấn đề
Trong một ứng dụng quản lý có nhiều đối tượng liên kết (Mã hàng → Khai báo → Xe...), user thường cần xem chi tiết đối tượng B trong khi đang ở màn hình đối tượng A. Nếu navigate hẳn sang trang khác → mất context của trang hiện tại.

### Quy tắc (BẮT BUỘC)

> **"Quick Peek Modal" — Không bao giờ navigate trang để xem chi tiết entity liên kết."**

Khi user click vào một thông tin liên kết (link, tag, ID...):
- ✅ **Mở Modal** hiển thị thông tin entity đó ở chế độ **View (read-only)**
- ✅ **Footer Modal** có 2 nút: `[Đóng]` + `[✏ Chỉnh sửa]`
- ✅ Bấm `[✏ Chỉnh sửa]` → **cùng modal switch sang Edit mode** (không đóng, không navigate)
- ❌ **KHÔNG** navigate sang trang khác khi chỉ cần xem thông tin tham chiếu
- ❌ **KHÔNG** mở tab mới
- ❌ **KHÔNG** navigate rồi quay lại (browser Back) — gây mất context

### Khi nào dùng Navigate thay vì Modal?
Chỉ navigate trang khi entity đích có quá nhiều sub-data phức tạp đến mức Modal không đủ chỗ hiển thị (ví dụ: dashboard phân tích với nhiều chart). Đây là trường hợp **rất hiếm** và phải có lý do rõ ràng.

### Implementation Pattern

```jsx
// 1. State trong component cha
const [peekManifestId, setPeekManifestId] = useState(null);
const [peekManifestVisible, setPeekManifestVisible] = useState(false);

// 2. Click vào Tag/Link → mở Quick Peek
const handleViewManifest = (manifestId) => {
    setPeekManifestId(manifestId);
    setPeekManifestVisible(true);
};

// 3. Trong JSX — Tag/Link có thể click
<Tag
    color="blue"
    style={{ cursor: 'pointer' }}
    onClick={() => handleViewManifest(record.manifestId)}
>
    {statusLabel}
</Tag>

// 4. ManifestModal ở cuối JSX
<ManifestModal
    visible={peekManifestVisible}
    mode="view"
    manifestId={peekManifestId}
    onClose={() => setPeekManifestVisible(false)}
    onSuccess={() => { setPeekManifestVisible(false); fetchData(); }}
/>
```

### ManifestModal — View Mode với nút Edit
```jsx
// Trong ManifestModal footer khi mode='view':
footer={[
    <Button key="edit" type="primary" icon={<EditOutlined />}
        onClick={() => setMode('edit')}   // ← switch inline, không re-mount
    >
        Chỉnh sửa
    </Button>,
    <Button key="close" onClick={onClose}>Đóng</Button>
]}
```

### Circular Navigation — Tránh Link Vòng Tròn

**Vấn đề**: Khi Modal B được mở như một Quick Peek từ bên trong Modal A, nếu trong Modal B lại có link dẫn ngược về Modal A → người dùng click vào link đó sẽ thấy Modal A mở ra chồng lên chính Modal A đang mở → **vòng tròn vô nghĩa**.

**Ví dụ cụ thể**:
- Màn hình **Mã hàng** → mở Quick Peek **Khai báo**
- Trong modal Khai báo có tab "Thông tin Mã hàng" → có link ID dẫn về Mã hàng
- Nếu link đó còn hoạt động → mở thêm 1 modal Mã hàng nữa ở trên cùng → **vòng tròn**

**Quy tắc**:
- Prop callback điều hướng (ví dụ: `onViewProductCode`) **đóng vai trò Context Indicator**.
- **Không truyền prop** → link hiển thị như text thường (không có màu xanh, không có underline, không click được).
- **Có truyền prop** → link hiển thị đầy đủ, click được.

**Implementation**:
```jsx
// ✅ Style có điều kiện — chỉ hiện link khi có context điều hướng
<Input
    readOnly
    style={onViewProductCode
        ? { ...disabledStyle, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }
        : disabledStyle
    }
    onClick={() => onViewProductCode && onViewProductCode(id)}
/>

// ✅ Caller từ trang gốc — truyền prop → hiện link
<EntityModal onViewProductCode={(id) => openProductCodeModal(id)} />

// ✅ Caller từ trong modal con — KHÔNG truyền prop → ẩn link, tránh vòng tròn
<EntityModal /> {/* onViewProductCode omitted */}
```

### Checklist khi có entity liên kết
- [ ] Link/Tag entity liên kết có `cursor: 'pointer'` và onClick handler
- [ ] Click → mở Quick Peek Modal ở mode View
- [ ] Modal View có nút `[✏ Chỉnh sửa]` → switch mode inline
- [ ] Không có navigate() nào được gọi khi mở thông tin tham chiếu
- [ ] Kiểm tra circular: nếu modal B được mở từ modal A, đừng truyền callback điều hướng về A vào modal B
- [ ] Sau khi đóng modal, user ở nguyên vị trí trang cũ

---

## 17. View-first Table Action Pattern (Phân quyền nút hành động)

### Quy tắc (BẮT BUỘC)

Tất cả table action columns phải tuân theo pattern sau:

| Nút | Hiển thị với ai | Vị trí |
|---|---|---|
| `👁 Xem` | **Tất cả** (ai vào được trang đều xem được) | Luôn có |
| `🗑 Xóa` | **Chỉ ADMIN** | Table action |
| `✏ Chỉnh sửa` | **Chỉ ADMIN** | **Trong footer modal View**, KHÔNG ở table |

**Nguyên tắc cốt lõi:**
- ❌ **KHÔNG** có nút Edit riêng ở cột action của table
- ✅ Edit **chỉ available** bên trong modal sau khi đã View (thông qua nút `[✏ Chỉnh sửa]` ở footer)
- ✅ Ai có quyền View trang → có quyền click View bất kỳ record nào
- ✅ Admin click View → thấy nút `[✏ Chỉnh sửa]` trong footer → switch inline sang edit mode

### Quan trọng: Sub-list bên trong Modal tuân theo cùng pattern

Khi một modal có chứa danh sách con (ví dụ: Modal Mã hàng có table Mặt hàng bên trong):

> **Nút hành động (View/Delete) của sub-list LUÔN hiển thị đúng theo role, ĐỘC LẬP với trạng thái view/edit của form cha.**

Cụ thể với Modal Mã hàng ở chế độ View:
- Form fields của Mã hàng: **disabled** (chỉ enable khi admin bấm `[✏ Chỉnh sửa mã hàng]` ở footer)
- Sub-list Mặt hàng: vẫn có `[👁 Xem mặt hàng]` + `[🗑 Xóa mặt hàng]` (admin) — **không bị ẩn đi**
- Sub-list Khai báo (trong từng mặt hàng): chỉ `[👁 Xem khai báo]` (Quick Peek)

**Sai lầm cần tránh:**
```jsx
// ❌ SAI: Delete bị ẩn khi đang view mode
{!viewOnly && (
    <Popconfirm onConfirm={() => handleDeleteItem(index)}>
        <Button danger icon={<DeleteOutlined />} />
    </Popconfirm>
)}

// ✅ ĐÚNG: Delete theo role, không phụ thuộc viewOnly của form cha
{userRole === 'ADMIN' && (
    <Popconfirm onConfirm={() => handleDeleteItem(index)}>
        <Button danger icon={<DeleteOutlined />} />
    </Popconfirm>
)}
```

### Implementation Pattern

```jsx
// ─── Table action column ─────────────────────────────
render: (_, record) => (
    <Space size="small">
        <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
        {userRole === 'ADMIN' && (
            <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
        )}
    </Space>
)

// ─── Modal footer (view mode) ─────────────────────────
footer={[
    isView && userRole === 'ADMIN' && (
        <Button key="edit" type="primary" icon={<EditOutlined />}
            onClick={() => setMode('edit')}  // hoặc setViewOnly(false)
        >
            Chỉnh sửa
        </Button>
    ),
    <Button key="close" onClick={onClose}>Đóng</Button>
].filter(Boolean)}

// ─── Lấy userRole từ JWT token ───────────────────────
const [userRole, setUserRole] = useState('USER');
useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserRole(payload.role || 'USER');
        } catch (e) {}
    }
}, []);
```

### Checklist khi implement/review table
- [ ] Table action: chỉ có `👁 Xem` + `🗑 Xóa` (admin only)
- [ ] **Không có** nút Edit ở table action
- [ ] Modal có `viewOnly` prop hoặc `mode` state
- [ ] Footer modal view mode: admin thấy `[✏ Chỉnh sửa]`, non-admin chỉ thấy `[Đóng]`
- [ ] `userRole` được parse từ JWT và truyền đúng vào modal **và cả sub-modal**
- [ ] Sub-list bên trong modal: Delete/View **không** bị điều kiện bởi `viewOnly` của form cha
- [ ] Nút `[+ Thêm mới]` ở header page: chỉ hiện cho ADMIN (modal tạo mới không cần view mode)

---

## Rule N+1: Tách Component — Tránh Component Quá Dài

### Nguyên tắc
Một component **không nên vừa quản lý state tổng thể vừa render nhiều UI phức tạp** trong cùng một file. Khi một component dài hơn ~300-400 dòng, **hãy tách** những phần UI độc lập ra thành component con riêng biệt.

### Dấu hiệu cần tách
- Component có nhiều hơn 2-3 `render*()` functions lớn bên trong.
- Một "section" UI có state/logic riêng (form riêng, xử lý riêng).
- File dài hơn 400 dòng và khó đọc.

### Cách tách đúng
```
// ❌ Sai: renderDelivery() là một hàm khổng lồ bên trong component cha
const ExportOrderModal = () => {
    const [deliveryForm] = Form.useForm(); // form ở parent
    const renderDelivery = () => (
        <Form form={deliveryForm}>  // nhưng <Form> render ở child render fn
            ...
        </Form>
    );
};

// ✅ Đúng: Tách thành component riêng, form sống đúng level
const DeliveryForm = ({ order, formRef }) => {
    const [form] = Form.useForm(); // form ở đúng component render nó
    useEffect(() => { formRef?.(form); }, [form]);
    return <Form form={form}>...</Form>;
};
```

### Lợi ích
- Dễ maintain, dễ đọc.
- Tránh bug Ant Design Form context bị disconnect khi form instance khai báo sai level.
- Mỗi component chịu trách nhiệm một việc duy nhất.

---

## Rule N+2: Ant Design Form — Quy tắc dùng đúng cách

### Nguyên tắc
`Form.useForm()` **phải được khai báo tại chính component** mà render `<Form form={...}>` đó. Nếu khai báo ở component cha nhưng `<Form>` render ở component con (hoặc render function), form instance sẽ bị **disconnect** — `validateFields()` trả về `{}`.

### Form.useWatch — Dùng để đọc giá trị realtime
```jsx
// ✅ Pattern chuẩn (xem ProductItemModal.jsx)
const [form] = Form.useForm();
const deliveryCost = Number(Form.useWatch('deliveryCost', form)) || 0;
// → Dùng để cập nhật UI realtime (tính tổng, hiển thị preview...)
// → KHÔNG cần value/onChange thủ công trên input
```

### Reset Form — Dùng đúng method
```jsx
// ✅ setFieldsValue: chỉ cập nhật giá trị, KHÔNG unregister fields
form.setFieldsValue({ deliveryCost: null, paymentReceived: false });

// ⚠️ resetFields: unregister toàn bộ fields rồi re-register
// → Có thể gây race condition nếu gọi trước khi form mount
// → Chỉ dùng khi thực sự muốn reset toàn bộ (vd: đóng modal xong mở lại)
form.resetFields();
```

### Không cần value/onChange khi dùng Form.Item
```jsx
// ❌ Không cần — Form.Item tự inject value/onChange
<Form.Item name="deliveryCost">
    <CustomNumberInput
        value={someState}        // ← bỏ đi
        onChange={v => setState} // ← bỏ đi
    />
</Form.Item>

// ✅ Đúng — Form.Item tự quản lý
<Form.Item name="deliveryCost">
    <CustomNumberInput />
</Form.Item>
```

### Checkbox với Form.Item
```jsx
// ✅ Dùng valuePropName="checked" để bind boolean
<Form.Item name="paymentReceived" valuePropName="checked">
    <Checkbox>Đã nhận tiền</Checkbox>
</Form.Item>
// → values.paymentReceived sẽ là true/false khi validateFields()
```

---

## Rule N+3: Redis Cache — Quy tắc sử dụng (Backend)

### Nguyên tắc cốt lõi

**KHÔNG được dùng `KEYS pattern`** để tìm và xóa cache. Dùng `SCAN` thay thế.

| | `KEYS` | `SCAN` (via `scanIterator`) |
|---|---|---|
| Blocking | ✅ Block Redis thread | ❌ Non-blocking |
| An toàn production | ❌ | ✅ |
| Keyspace lớn | Gây lag toàn hệ thống | Xử lý từng batch ~100 keys |

### Utility dùng chung

Tất cả logic xóa cache theo prefix **phải** dùng hàm `deleteByPrefix` từ `src/utils/redisUtils.js`:

```javascript
const { deleteByPrefix } = require('../utils/redisUtils');

// ✅ Đúng — SCAN+DEL, non-blocking
await deleteByPrefix('inquiries:list:admin_sale:');

// ❌ Sai — KEYS block Redis
const keys = await redisClient.keys('inquiries:list:admin_sale:*');
```

### Quy ước đặt tên cache key

```
{domain}:{type}:{scope}:{params}
```

Ví dụ:
- `inquiries:list:admin_sale:p1:l20` — list, trang 1, limit 20, role admin/sale
- `inquiries:detail:42` — detail của inquiry id=42
- `roles_user_ids:ADMIN,SALE` — danh sách userId theo role (sorted)

### TTL chuẩn

| Loại data | TTL gợi ý | Lý do |
|---|---|---|
| List / paginated | 30s | Thay đổi thường xuyên |
| Detail | 30s | Có thể bị update |
| Role → userIds | 600s (10 phút) | Ít thay đổi, tốn query |

### `COUNT` trong `scanIterator`

`COUNT: 100` là **hint** (gợi ý) cho Redis mỗi batch trả về ~100 keys — không phải giới hạn cứng. Giá trị 100 phù hợp cho internal app keyspace nhỏ.

### Invalidation Strategy

- Khi dữ liệu thay đổi → **xóa cache liên quan ngay**, không chờ TTL hết hạn.
- Với paginated list: dùng `deleteByPrefix` xóa toàn bộ page cache của prefix đó.
- `updateNote` (chỉ cập nhật note): chỉ xóa detail cache, **không** cần xóa list cache.
- Cache failure là **non-critical** — wrap trong `try/catch`, không để lỗi Redis ảnh hưởng đến response.
