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

## 2. Frontend API Calls (axiosInstance)

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

---

## 3. Redis Caching Strategy

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
*   **Table Fixed Columns (Cột cố định trong Table)**:
    *   **Quy tắc**: Chỉ cố định tối đa 2 cột đầu tiên bên trái (`fixed: 'left'`).
    *   **Cột 1**: Luôn là ID hoặc mã định danh chính.
    *   **Cột 2**: Thông tin quan trọng nhất (thường là tên, khách hàng, hoặc đối tượng chính).
    *   **KHÔNG** cố định cột Action ở bên phải (`fixed: 'right'`).
    *   **Lý do**: 
        *   Tránh tình trạng table bị "kẹp" giữa 2 cột fixed, gây khó khăn khi scroll.
        *   Cột Action không cần thiết phải luôn hiển thị, user có thể scroll để thấy.
        *   Cải thiện UX trên màn hình nhỏ.
    *   **Ví dụ**:
        ```javascript
        const columns = [
            { title: 'ID', dataIndex: 'id', fixed: 'left', width: 80 }, // ✅ Fixed
            { title: 'Khách hàng', key: 'customer', fixed: 'left', width: 200 }, // ✅ Fixed
            { title: 'Sản phẩm', dataIndex: 'product', width: 150 }, // ❌ Không fixed
            { title: 'Giá', dataIndex: 'price', width: 120 }, // ❌ Không fixed
            { title: 'Action', key: 'action', width: 150 } // ❌ KHÔNG fixed right
        ];
        ```
*   **Action Buttons Format (Format nút hành động trong Table)**:
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
                *   Ví dụ: Header cột là "Trạng thái", thì Placeholder filter phải là "Lọc theo Trạng thái" (Không dùng "trạng thái").
                *   Ví dụ: Header cột là "Quyền hạn", thì Placeholder filter phải là "Lọc theo Quyền hạn" (Không dùng "quyền").
            *   **Search Placeholder**:
                *   **Format**: "Tìm theo [Field 1], [Field 2]" (Không dùng dấu ba chấm "..." ở cuối).
                *   **Capitalization**: Các tên trường phải viết In Hoa Chữ Cái Đầu (Title Case) để trang trọng.
                    *   Đúng: "Tìm theo Tên kho", "Tìm theo Loại hàng"
                    *   Sai: "Tìm theo tên kho..." (Lỗi: chữ thường, có "...")
                *   Phải liệt kê rõ các trường có thể tìm kiếm, khớp với Header của bảng.
                *   Ví dụ: "Tìm theo Khách hàng (Tên, SĐT), Nội dung" thay vì "Tìm kiếm...".
            *   **Selection/Filter Box (Standard)**:
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
            *   **Customer Display Format (Format hiển thị Khách hàng)**:
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
            *   **Customer Selection Box Format (Format hiển thị Khách hàng trong Dropdown)**:
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
            *   **Number Format (Format hiển thị Số)**:
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

            *   **Number Input Standard (Quy chuẩn Nhập liệu Số)**:
                *   **Loại 1: Số Nguyên (Integer)** - Dùng cho Tiền VND, Số lượng...
                    *   **Mục tiêu**: Tự động thêm dấu chấm phân cách hàng nghìn khi nhập.
                    *   **Cấu hình**:
                        ```jsx
                        <InputNumber
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            parser={value => value.replace(/\$\s?|(\.*)/g, '')}
                        />
                        ```
                *   **Loại 2: Số Thập phân (Decimal)** - Dùng cho %, Tỷ giá...
                    *   **Mục tiêu**: Sử dụng dấu phẩy (`,`) làm dấu phân cách thập phân thay vì dấu chấm.
                    *   **Cấu hình**:
                        ```jsx
                        <InputNumber
                            decimalSeparator="," // Quan trọng để hiểu dấu phẩy là thập phân
                            step={0.01} // Hoặc step phù hợp
                        />
                        ```
                *   **Lưu ý chung**: Luôn disable InputNumber khi ở chế độ `isViewMode`.

            *   **Input with Unit Suffix (Input kèm Đơn vị)**:
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

            *   **Currency Display in Table (Hiển thị Tiền trong Bảng)**:
                *   **Quy tắc**:
                    *   **Align**: `right` (Căn phải).
                    *   **Style**: Màu xanh lá (`#389e0d`), in đậm (`fontWeight: 'bold'`).
                    *   **Format**: Có đơn vị tiền tệ chuẩn (VD: `1.000.000 ₫`).
                *   **Code Mẫu**:
                    ```jsx
                    {
                        title: t('customer.totalPaid'),
                        dataIndex: 'totalPaid',
                        key: 'totalPaid',
                        align: 'right', // ⚠️ Bắt buộc
                        render: (value) => (
                            <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                                {value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '0 ₫'}
                            </span>
                        ),
                    }
                    ```

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

### 12.2 Quy tắc Cấm Hardcode (No Hardcoded Strings Rule)
*   **TUYỆT ĐỐI KHÔNG** dùng chuỗi tĩnh (static string) cho các thuộc tính hiển thị trên UI.
*   **Các vị trí thường gặp lỗi**:
    *   `title="..."` (Modal title, Page title).
    *   `label="..."` (Form Item label).
    *   `placeholder="..."` (Input placeholder).
    *   `message="..."` (Rule validation message).
*   **Checklist Review**:
    *   [ ] Search toàn bộ project các string tiếng Việt có dấu (ví dụ: "Thêm", "Sửa", "Tên").
    *   [ ] Đảm bảo tất cả đều được bọc trong hàm `t('key')`.

## 13. Backend Integration Testing Standard
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

## 14. Test-Driven Development (TDD) Methodology
*   **TDD Workflow**:
    *   **Red**: Write a failing test case *before* implementing any feature or fix.
    *   **Green**: Write just enough code to make the test pass.
    *   **Refactor**: Improve the code without changing behavior (test must remain green).
*   **Immutable Tests Rule** (QUAN TRỌNG):
    *   **Source of Truth**: Test assertions phản ánh Requirements.
    *   **Restricted Modification**: Không được phép sửa đổi Test Case đã viết trừ khi Requirements thay đổi.
    *   **Approval Process**: Nếu cần sửa Test Case (do logic cũ sai hoặc đổi nghiệp vụ), **BẮT BUỘC** phải hỏi ý kiến User và được sự đồng ý mới được sửa. Code phải sửa để theo Test, không được sửa Test để theo Code.

## 15. Performance & Anti-Patterns
*   **Avoid N+1 Query Problem (CRITICAL)**:
    *   **Definition**: Vấn đề xảy ra khi code thực hiện 1 query để lấy danh sách cha (N items), sau đó dùng vòng lặp (For/Map) để thực hiện thêm N query con để lấy dữ liệu liên quan.
    *   **Forbidden**: TUYỆT ĐỐI KHÔNG query database trong vòng lặp (`for`, `map`, `forEach`).
    *   **Solution**:
        *   Sử dụng **Eager Loading** (Prisma `include` hoặc nested `select`) để lấy dữ liệu trong 1 query duy nhất.
        *   Hoặc lấy danh sách ID, query 1 lần bảng con (`where: { id: { in: ids } }`) rồi map lại trên Application Layer.
