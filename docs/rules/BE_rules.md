# Backend & General Coding Rules

Tài liệu này tổng hợp các bộ quy tắc lập trình chuẩn dành cho Backend và các quy tắc hệ thống chung (General) dùng trong dự án.

---

## 1. General Standards (Quy chuẩn chung toàn dự án)
*   **Code Style & Yoda Condition**:
    *   Nhất quán trong cách dùng `import`/`require` trong cùng một file.
    *   **Bắt buộc dùng Yoda Condition**: Hằng số/Enum phải nằm bên TRÁI phép so sánh. Mục đích: Tránh lỗi null check và gán nhầm giá trị.

    *Ví dụ Yoda Condition:*
    ```javascript
    // DỞ: role có thể undefined gây lỗi hoặc gán nhầm bằng dấu "="
    if (role === ROLES.ADMIN) { ... }

    // CHUẨN ĐÚNG
    if (ROLES.ADMIN === role) { ... }
    ```
---

## 2. API Design & Response Handling
*   **Business Error Code (Cấm Hardcode Message)**: 
    *   Backend chỉ trả về Business Error Code và Developer Message. Frontend sẽ dựa vào Code này để map hiển thị đa ngôn ngữ (I18n).
    *   Format chuẩn: `code: 99001, message: "Missing params"`.
    *   *Chuẩn mã lỗi `99xxx`*: 99001-99010 (Auth Errors), 99011-99100 (Business Errors), 99500 (System Errors).
    *   *HTTP Status*: Ánh xạ chuẩn `400` (Bad Logic/Input), `401` (No Auth), `403` (Forbidden/Role), `404` (Not Found).
*   **Pagination & Search Standard**:
    *   API `GET` list mặc định hỗ trợ: `page`, `limit` (mặc định 10/20), `search` (cho multiple fields).
    *   Payload response chuẩn: `data: { items: [...], total, page, totalPages }`.

    *Ví dụ Response Handling:*
    ```javascript
    // Chuẩn API Trả về Lỗi
    return res.status(403).json({ code: 99008, message: "Forbidden role" });

    // Chuẩn API Trả về Data Danh sách
    return res.status(200).json({
        code: 200,
        message: "Success",
        data: {
            items: records,
            total,
            page: 1,
            totalPages: 5
        }
    });
    ```

---

## 3. Database & Anti-Patterns
*   **CẤM N+1 Query Problem (Lỗi Nghiêm Trọng)**:
    *   **TUYỆT ĐỐI KHÔNG** để query gọi database nằm trong vòng lặp (`for`, `map`, `forEach`).
    *   Giải pháp: Sử dụng Eager Loading (Prisma `include`) hoặc query batch lấy toàn bộ data bằng mảng ID `where: { id: { in: ids } }` rồi map tại Application level.
*   **Xác thực Đầu vào Nghiêm ngặt (Strict Validation)**:
    *   Phải validate toàn bộ payload từ Frontend.
    *   Đặc biệt với ID từ Dropdown/Selection: Phải kiểm tra sự tồn tại trong SQL, không phó mặc hoàn toàn cho Front-end truyền gì nhận nấy.

    *Ví dụ Giải quyết N+1 bằng In Query:*
    ```javascript
    // DỞ: Gọi DB trong vòng lặp
    for (const item of orders) {
        item.customer = await prisma.customer.findFirst({ where: { id: item.customerId } });
    }

    // CHUẨN ĐÚNG
    const customerIds = orders.map(o => o.customerId);
    const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });
    // Rồi gán lại bằng array.find() bằng JS thường
    ```

---

## 4. Caching Strategy (Redis Caching)
*   **Nguyên tắc "Evict Cache" (Xóa lập tức)**: Dữ liệu bị thay đổi (Create/Update/Delete) thì phải gọi hàm xóa Cache tương ứng ngay lập tức, không đợi hết TTL.
*   **Cache What You Serve**: 
    *   Dữ liệu đem đi Cache phải là dữ liệu DTO đã được xào nấu/format hoàn thiện để response.
    *   Không Cache Raw SQL Data để tránh mỗi lần Cache Hit lại phải chạy logic biến đổi lại vòng lặp.
*   **Cascading Invalidation (Xóa liên hoàn)**: Nếu Update thông tin bản ghi cha (VD: Customer), bắt buộc rà soát và xóa Cache của các bản ghi con mượn thuộc tính cha để hiển thị (VD: Transaction List).
*   **Cách thức xóa (KHÔNG DÙNG KEYS)**: 
    *   Không được dùng lệnh `KEYS` gây block threads của Redis.
    *   Bắt buộc dùng `SCAN` thông qua hàm tiện ích `deleteByPrefix()` có sẵn trong Utils.
*   **Chuẩn đặt tên Key**: Ngăn cách bằng dấu hai chấm `{domain}:{type}:{scope}:{params}` (Ví dụ: `employees:list:admin:p1:l20`).

    *Ví dụ Tương tác Cache:*
    ```javascript
    // Lưu DTO chuẩn thay vì raw sql list
    const mappedResponse = formatDTO(sqlData);
    await redisClient.setEx('users:list:admin:p1', 300, JSON.stringify(mappedResponse));

    // Xóa liên hoàn dùng SCAN utility (Không dùng await redisClient.keys('*'))
    const { deleteByPrefix } = require('../utils/redisUtils');
    await deleteByPrefix('users:list');
    ```

---

## 5. Security, Enums & Role Management 
*   **CẤM Hardcode String Magic**:
    *   Không dùng trực tiếp string rời rạc cho `status`, `role`, `type` trong code Controller/Service.
    *   **Bắt Buộc** tạo Enum trong `src/constants/enums.js` và import tái sử dụng.
*   **Tường minh Phân quyền (Role Middleware)**: 
    *   Khi implement Route, phải khai báo roles giới hạn rõ ràng.
    *   Tuyệt đối không để ẩn hoặc ngầm hiểu role nếu API giới hạn tác vụ.

    *Ví dụ RBAC & Constants:*
    ```javascript
    const { ROLES, STATUS } = require('../constants/enums');

    // Chặn Role tường minh ngay tại Route declaration
    router.put('/:id', authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.SALE]), controller.update);

    // Không dùng string "PENDING"
    await prisma.order.update({ data: { status: STATUS.PENDING } }); 
    ```

---

## 6. Logging
*   **Chiến lược Log (Audit Trail)**:
    *   **Entrance**: Vào hàm bắt buộc log ID, UserId, Entity Target để traceback. (Giấu Password).
    *   **Process & Exit**: Log bước xử lý và log Result (Success/Fail).
*   **Bắt Buộc Log Lỗi (Error Logging)**:
    *   Bất cứ khi nào bắt được lỗi (trong block `catch`) hoặc trong các đoạn rẽ nhánh (if) cần ném ra một lỗi tùy chỉnh (throw Error), **TUYỆT ĐỐI BẮT BUỘC phải dùng `logger.error(...)`** để ghi lại nguyên nhân trước khi thực hiện `throw` rỗng hoặc return HTTP 500. Tránh tình trạng quăng lỗi mà server console hoặc file log im ru không có vết tích để debug.

    *Ví dụ Logging Information:*
    ```javascript
    exports.createOrder = async (req, res) => {
        logger.info(`[OrderService][Create] Initiated by User ID: ${req.user.id}, Payload: ${JSON.stringify(req.body)}`);
        try {
            // Check condition failure
            if (!validRole) {
                // Phải log trước khi quăng lỗi
                logger.error(`[OrderService][Create] Validation failed for User ${req.user.id}: Invalid Role`);
                return res.status(403).json({ message: "Forbidden" });
            }

            // ... processing
            logger.info(`[OrderService][Create] Success. Order ID: ${newOrder.id}`);
        } catch (e) {
            // Khi ném lỗi tổng hoặc lỗi từ DB ra, bắt buộc phải log lại error message
            logger.error(`[OrderService][Create] Failed processing User ${req.user.id}: ${e.message}`);
            return res.status(500).json({ message: 'Internal Error' });
        }
    };
    ```

---

## 7. File Upload Strategy (Temp-to-Permanent)
*   **Tránh RAM/Disk Leak**:
    *   **TUYỆT ĐỐI KHÔNG** dùng `memoryStorage` của Multer, ưu tiên dùng `diskStorage` đổ thẳng ra đĩa qua hàm `createTempUpload`.
    *   Sử dụng kiến trúc Temp-to-Permanent: Đầu tiên Multer tự động lưu file từ request vào thư mục tạm `temp/YYYY/MM/DD`.
    *   Trong Controller, sau khi thực thi block `try` và **đã đảm bảo mọi dữ liệu hợp lệ** (DB, quyền, đầu vào), mới dùng hàm `moveTempFileToStorage()` để copy file đó vào thư mục sống (VD: `uploads/...`).
*   **Luôn dọn dẹp rác ở block `finally`**:
    *   Bắt buộc luôn có đoạn dọn dẹp tại block `finally` trong API Controller chặn xử lý File.
    *   Cấm viết lại logic dọn file bằng `fs.unlinkSync()`, mà hãy gọi hàm tái sử dụng `fileStorageService.deleteTempFiles(req.file)` (hoặc `req.files`) để xóa sạch file nháp trong `temp/`. Điều này triệt tiêu hoàn toàn khả năng tắc nghẽn rác hệ thống dù logic có ném ra Exception.

---

## 9. DRY — Không lặp lại Logic (Don't Repeat Yourself)

*   **Không được viết lại logic inline khi đã có hàm đóng gói sẵn ở nơi khác.**
    *   Khi nhiều nơi cùng cần một đoạn logic giống nhau, dù một nơi đã đóng gói thành hàm còn nơi kia viết inline — đó vẫn là vi phạm DRY.
    *   Giải pháp: extract hàm đó ra file shared utility riêng, tất cả nơi dùng đều import chung.
*   **Vị trí file shared utility**: Đặt cùng thư mục với các file dùng chung (VD: `src/services/storage/storageUtils.js`).

    *Ví dụ (lỗi thực tế):*
    ```javascript
    // r2StorageProvider.js — đã đóng gói thành hàm buildKey()
    const buildKey = (entityType, entityId, originalname) => {
        const ext = path.extname(originalname);
        return `${entityType}/${entityId}/${uuidv4()}${ext}`;
    };

    // SAI: localStorageProvider.js viết lại logic tương đương inline thay vì reuse
    const ext      = path.extname(originalname);
    const filename = `${uuidv4()}${ext}`;
    const subDir   = `${entityType}/${entityId}`;

    // ĐÚNG: tách buildKey ra storageUtils.js, cả 2 provider import dùng chung
    // storageUtils.js
    const buildKey = (entityType, entityId, originalname) => { ... };
    module.exports = { buildKey };

    // localStorageProvider.js & r2StorageProvider.js
    const { buildKey } = require('./storageUtils');
    ```

---

## 8. Image URL — Luôn trả Absolute URL

*   **DB lưu relative path**: Các trường URL file (imageUrl, avatarUrl...) trong DB **luôn lưu dạng relative path** (`/uploads/...`). Không bao giờ lưu full URL có domain vào DB (trừ S3 — S3 trả full URL sẵn).
*   **BE build absolute URL trước khi respond**: Trước khi đưa field URL vào response, **bắt buộc** prepend `process.env.BE_HOST`. Sử dụng hàm `buildImageUrl(storedPath)` trong `fileStorageService.js`:
    ```javascript
    const { buildImageUrl } = require('../services/fileStorageService');
    // Trong controller, trước khi respond:
    data.imageUrl = buildImageUrl(record.imageUrl);
    ```
*   **FE không ghép host**: Client nhận URL đã là absolute — dùng trực tiếp trong `<img src>`, không tự ghép thêm gì.
*   **S3 exception**: Nếu storage type là S3, DB lưu full S3 URL. `buildImageUrl` tự detect URL bắt đầu bằng `http` và return nguyên không prepend.
*   **Env var**: `BE_HOST` — host của BE, không có trailing slash (ví dụ: `http://localhost:3000`, `https://api.example.com`).

    *Ví dụ chuẩn xử lý Controller Upload:*
    ```javascript
    const fileStorageService = require('../services/fileStorageService');

    exports.uploadAvatar = async (req, res) => {
        try {
            // 1. Logic kiểm tra/xác thực
            if (!req.file) return res.status(400).json({ message: "No file" });
            const user = await User.findById(req.user.id);

            // 2. Chuyển file NHÁP thành file THẬT nếu mọi thứ OK
            const finalImageUrl = await fileStorageService.moveTempFileToStorage(req.file.path, 'avatars', req.user.id, req.file.originalname);
            
            // 3. Cập nhật DB
            await User.update({ id: user.id }, { avatar: finalImageUrl });
            return res.status(200).json({ url: finalImageUrl });
            
        } catch (error) {
            return res.status(500).json({ message: error.message });
        } finally {
            // 4. LUÔN LUÔN DỌN RÁC (cả khi success và khi error)
            fileStorageService.deleteTempFiles(req.file);
        }
    };
    ```
