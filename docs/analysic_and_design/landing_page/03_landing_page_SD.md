# System Design: landing_page
> Version: SD-v1.0.0 | Ngày: 2026-03-29
> Base on Requirement: 1.0.7

---

# 1. Data Model (Database Schema)

## 1.1 Bảng `customer_inquiries`

| Cột | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|---|
| `id` | Int | ✅ | autoincrement | PK |
| `email` | String | ✅ | — | Email khách hàng — trường duy nhất BE validate bắt buộc; **ẩn với CHUNG_TU** |
| `customerName` | String? | ❌ | null | Tên khách hàng; **ẩn với CHUNG_TU** |
| `businessType` | String? | ❌ | null | Ngành nghề kinh doanh; **ẩn với CHUNG_TU** |
| `phoneNumber` | String? | ❌ | null | Số điện thoại; **ẩn với CHUNG_TU** |
| `productName` | Text? | ❌ | null | Tên sản phẩm |
| `material` | Text? | ❌ | null | Chất liệu |
| `usage` | Text? | ❌ | null | Công dụng |
| `size` | String? | ❌ | null | Kích thước / kích cỡ |
| `brand` | String? | ❌ | null | Nhãn hàng |
| `specialInfo` | Text? | ❌ | null | Thông tin đặc thù (pin, điện áp...) |
| `techSpec` | Text? | ❌ | null | Thông số kỹ thuật / catalogue / tem etiket |
| `demand` | String? | ❌ | null | Nhu cầu (CSNK, giá khai...) |
| `imageUrl` | String? | ❌ | null | URL ảnh đính kèm (upload tối đa 1 ảnh) |
| `answer` | Text? | ❌ | null | Câu trả lời của nhân viên chứng từ |
| `internalNote` | Text? | ❌ | null | Ghi chú nội bộ — KHÔNG gửi trong email |
| `status` | Int | ✅ | 1 | Mã trạng thái (xem bảng INQUIRY_STATUS bên dưới) |
| `createdAt` | DateTime | ✅ | now() | — |
| `updatedAt` | DateTime | ✅ | updatedAt | — |
| `deletedAt` | DateTime? | ❌ | null | Soft delete |

### Mapping INQUIRY_STATUS (Int)

Dùng `Int` (không phải enum text) để hỗ trợ `ORDER BY status ASC` ở DB-level theo đúng thứ tự ưu tiên hiển thị.

| Giá trị | Tên hằng số | Mô tả |
|---|---|---|
| 1 | `PENDING_REVIEW` | Khách vừa gửi, chờ admin/sale review lần 1 |
| 2 | `PENDING_ANSWER` | Admin approve, chờ chứng từ trả lời |
| 3 | `PENDING_SEND` | Chứng từ đã trả lời, chờ admin review lần 2 |
| 4 | `EMAIL_SENT` | Đã gửi email phản hồi khách |
| 5 | `ANSWER_REJECTED` | Admin/Sale reject câu trả lời (lần 2), chứng từ cần sửa lại |
| 6 | `QUESTION_REJECTED` | Admin/Sale reject câu hỏi (lần 1) |

Định nghĩa tại: `source/backend/src/constants/enums.js` → `INQUIRY_STATUS`.

## 1.2 Bảng `notifications`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `userId` | Int | FK → `users.id` — người nhận |
| `content` | String | JSON string `{ key: string, params: object }` — hỗ trợ i18n |
| `isRead` | Boolean | default `false` |
| `type` | String? | `"PRODUCT_CODE"` hoặc `"INQUIRY"` |
| `refId` | Int? | ID entity liên quan (inquiryId, productCodeId...) |
| `createdAt` | DateTime | — |
| `updatedAt` | DateTime | — |

Nội dung `content` là JSON string có cấu trúc `{ key: "notification.xxx", params: {} }` để FE dịch theo ngôn ngữ hiện tại.

## 1.3 File Storage

- **Service**: `source/backend/src/services/fileStorageService.js`
- **Root thư mục**: `source/backend/uploads/`
- **Cấu trúc thư mục**: `uploads/inquiries/{YYYY}/{MM}/{inquiryId}/{uuid}{ext}`
- **Lưu ý upload**: Tạo bản ghi `CustomerInquiry` trước để lấy `id`, sau đó lưu file vào thư mục theo `id`, rồi `UPDATE imageUrl`.

### Image URL Strategy

| Storage type | DB lưu | Response `imageUrl` | Ghi chú |
|---|---|---|---|
| `LOCAL` (hiện tại) | Relative path — `/uploads/inquiries/{YYYY}/{MM}/{id}/{uuid}{ext}` | Absolute URL — `{BE_HOST}{stored_path}` | BE ghép host từ env var `BE_HOST` |
| `S3` (tương lai) | Full S3 URL — `https://bucket.s3.amazonaws.com/...` | Giữ nguyên — không ghép thêm | S3 trả URL đầy đủ sẵn |

> **Nguyên tắc bất biến**: `imageUrl` trong API response **luôn là absolute URL**. Client (FE) không cần và không được tự ghép host. BE có trách nhiệm xây dựng URL đầy đủ trước khi trả response.

---

# 2. API Specification

## 2.1 Env Variables

| Biến | Mô tả |
|---|---|
| `HOTLINE` | Số hotline hiển thị trên landing page |
| `BE_HOST` | **Canonical env var** cho host của BE — dùng để build absolute file URL (ví dụ: `http://localhost:3000` hoặc `https://api.example.com`). Không có trailing slash. **Thay thế toàn bộ** `APP_URL` trong toàn dự án — `APP_URL` bị deprecated. |
| `VITE_LANDING_PAGE_URL` | URL landing page dùng ở FE (configable dev/prod) |

## 2.2 Public API (không cần auth)

### POST `/api/inquiries/public`

Khách hàng gửi câu hỏi tư vấn. Hỗ trợ multipart/form-data để upload ảnh.

**Request** (multipart/form-data):
| Field | Type | Bắt buộc | Ghi chú |
|---|---|---|---|
| `email` | string | ✅ | BE validate — trả 400 nếu thiếu |
| `customerName` | string | ❌ | Tên khách hàng |
| `businessType` | string | ❌ | Ngành nghề kinh doanh |
| `phoneNumber` | string | ❌ | Số điện thoại |
| `productName` | string | ❌ | |
| `material` | string | ❌ | |
| `usage` | string | ❌ | |
| `size` | string | ❌ | |
| `brand` | string | ❌ | |
| `specialInfo` | string | ❌ | |
| `techSpec` | string | ❌ | |
| `demand` | string | ❌ | |
| `image` | file | ❌ | Tối đa 1 ảnh — multer field name: `image` |

**Response 201**:
```json
{
  "code": 201,
  "message": "Success",
  "data": {
    "id": 42,
    "email": "customer@example.com",
    "customerName": "Nguyen Van A",
    "businessType": "Thương mại",
    "phoneNumber": "0901234567",
    "productName": "...",
    "material": null,
    "usage": null,
    "size": null,
    "brand": null,
    "specialInfo": null,
    "techSpec": null,
    "demand": null,
    "imageUrl": "http://localhost:3000/uploads/inquiries/2025/03/42/uuid.jpg",
    "answer": null,
    "internalNote": null,
    "status": 1,
    "createdAt": "2025-03-16T10:00:00Z",
    "updatedAt": "2025-03-16T10:00:00Z",
    "deletedAt": null
  }
}
```

**Response 400**: `{ "code": 400, "message": "Missing required field: email" }`

**Side effects**:
- Tạo bản ghi `CustomerInquiry`
- Nếu có file: lưu file, update `imageUrl`
- Invalidate list cache
- Gửi notification đến tất cả ADMIN + SALE: `{ key: "notification.newInquiry", params: { email } }`

## 2.3 Internal API (cần auth)

### GET `/api/inquiries`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, SALE, CHUNG_TU])`

**Query params**:
| Param | Type | Ghi chú |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | default 20; options [20,30,40,50] |
| `search` | string | Full-text search không phân biệt hoa/thường trên: productName, material, usage, size, brand, specialInfo, demand, techSpec, email/customerName/businessType/phoneNumber (ADMIN/SALE only), id |
| `status` | number | Filter theo INQUIRY_STATUS Int |

**Phân quyền dữ liệu**:
- `CHUNG_TU`: tự động ẩn `status IN (1, 6)` (PENDING_REVIEW, QUESTION_REJECTED); ẩn các trường `email`, `customerName`, `businessType`, `phoneNumber` trong response
- Nếu `CHUNG_TU` filter theo status bị ẩn → trả về danh sách rỗng

**Sort (DB-level)**: `ORDER BY status ASC, createdAt ASC`

**Caching**:
- Chỉ cache khi **không có** search/status filter
- Cache key: `inquiries:list:{role_group}:p{page}:l{limit}`
  - `role_group` = `admin_sale` hoặc `chung_tu`
- TTL: 300 giây
- Invalidate: khi có bất kỳ thay đổi nào trên inquiry

**Response 200**:
```json
{
  "code": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "totalPages": 5
  }
}
```

---

### GET `/api/inquiries/:id`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, SALE, CHUNG_TU])`

**Phân quyền**:
- `CHUNG_TU`: 403 nếu `status IN (1, 6)`; ẩn các trường `email`, `customerName`, `businessType`, `phoneNumber`

**Caching**:
- Cache key: `inquiries:detail:{id}`; TTL: 300 giây
- Invalidate: khi inquiry đó có thay đổi

**Response 200**: `{ "code": 200, "data": { ...inquiry } }`
**Response 404**: `{ "code": 404, "message": "Inquiry not found" }`
**Response 403**: `{ "code": 99008, "message": "Forbidden" }`

---

### PUT `/api/inquiries/:id/review`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, SALE])`
**Body**: `{ "approved": boolean }`

| approved | Chuyển sang status | Notification |
|---|---|---|
| `true` | `PENDING_ANSWER` (2) | Gửi CHUNG_TU: `notification.inquiryNeedsAnswer` |
| `false` | `QUESTION_REJECTED` (6) | Không gửi noti |

**Precondition**: status hiện tại phải là `PENDING_REVIEW` (1) → 400 nếu sai
**Side effects**: Invalidate list cache + detail cache

---

### PUT `/api/inquiries/:id/answer`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, CHUNG_TU])`
**Body**: `{ "answer": string }`

**Precondition**: status phải là `PENDING_ANSWER` (2) hoặc `ANSWER_REJECTED` (5) → 400 nếu sai
**Chuyển sang**: `PENDING_SEND` (3)
**Notification**: Gửi ADMIN + SALE: `notification.inquiryAnswered`
**Side effects**: Invalidate list cache + detail cache

---

### PUT `/api/inquiries/:id/note`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, SALE, CHUNG_TU])`
**Body**: `{ "internalNote": string }`

Cập nhật ghi chú nội bộ — không ảnh hưởng status, không gửi email.
**Side effects**: Chỉ invalidate detail cache (không invalidate list cache)

---

### PUT `/api/inquiries/:id/send`

**Auth**: `authMiddleware` + `roleMiddleware([ADMIN, SALE])`
**Body**: `{ "approved": boolean }`

**Precondition**: status phải là `PENDING_SEND` (3) → 400 nếu sai

| approved | Hành động | Status mới | Notification |
|---|---|---|---|
| `true` | Gửi email phản hồi khách | `EMAIL_SENT` (4) | Không gửi noti |
| `false` | Reject câu trả lời | `ANSWER_REJECTED` (5) | Gửi CHUNG_TU: `notification.answerRejected` |

**Email format** (khi approved = true):
```
Từ: 3T Group

Câu hỏi của quý khách:
Tên sản phẩm: ...
Chất liệu: ...
[các trường có giá trị]

Phản hồi từ chúng tôi:
[nội dung answer]
```

**Side effects**: Invalidate list cache + detail cache

---

# 3. Core Business Logic & Workflows

## 3.1 Luồng trạng thái (State Machine)

```
[Public] POST /public
    → status = PENDING_REVIEW (1)
    → Notify: ADMIN + SALE

[ADMIN/SALE] PUT /review { approved: true }
    PENDING_REVIEW (1) → PENDING_ANSWER (2)
    → Notify: CHUNG_TU

[ADMIN/SALE] PUT /review { approved: false }
    PENDING_REVIEW (1) → QUESTION_REJECTED (6)
    → Không notify

[ADMIN/CHUNG_TU] PUT /answer { answer }
    PENDING_ANSWER (2) → PENDING_SEND (3)
    ANSWER_REJECTED (5) → PENDING_SEND (3)
    → Notify: ADMIN + SALE

[ADMIN/SALE] PUT /send { approved: false }
    PENDING_SEND (3) → ANSWER_REJECTED (5)
    → Notify: CHUNG_TU

[ADMIN/SALE] PUT /send { approved: true }
    PENDING_SEND (3) → EMAIL_SENT (4)
    → Gửi email thực tế cho khách
```

## 3.2 Phân quyền

| Endpoint | ADMIN | SALE | CHUNG_TU |
|---|---|---|---|
| POST `/public` | — (public) | — | — |
| GET `/` | ✅ | ✅ | ✅ (bị lọc status) |
| GET `/:id` | ✅ | ✅ | ✅ (bị chặn 1,6) |
| PUT `/:id/review` | ✅ | ✅ | ❌ |
| PUT `/:id/answer` | ✅ | ❌ | ✅ |
| PUT `/:id/note` | ✅ | ✅ | ✅ |
| PUT `/:id/send` | ✅ | ✅ | ❌ |

Tất cả role constants được định nghĩa trong `source/backend/src/constants/enums.js` → `ROLES`. **Không dùng plain text string trong controller/route.**

## 3.3 Visibility của CHUNG_TU

- **Danh sách**: Tự động `WHERE status NOT IN (1, 6)` → không thấy PENDING_REVIEW, QUESTION_REJECTED
- **Chi tiết**: 403 nếu status là 1 hoặc 6
- **Thông tin khách hàng bị ẩn**: Các trường `email`, `customerName`, `businessType`, `phoneNumber` bị loại khỏi response khi CHUNG_TU truy cập (masking tại BE — không xử lý ở FE)
- **Filter dropdown** ở FE: không hiển thị option PENDING_REVIEW và QUESTION_REJECTED cho CHUNG_TU
- **Menu**: CHUNG_TU chỉ thấy menu "Tư vấn khách hàng", ẩn tất cả menu còn lại

## 3.4 Caching Strategy (Redis)

| Cache key | TTL | Khi nào cache | Khi nào invalidate |
|---|---|---|---|
| `inquiries:list:admin_sale:p{n}:l{n}` | 300s | GET list không có filter | Bất kỳ thay đổi inquiry |
| `inquiries:list:chung_tu:p{n}:l{n}` | 300s | GET list không có filter | Bất kỳ thay đổi inquiry |
| `inquiries:detail:{id}` | 300s | GET detail | Inquiry đó thay đổi |
| `roles_user_ids:{roles_sorted}` | 600s | Lookup user IDs theo role | Không invalidate thủ công (TTL) |

**Invalidation method**: SCAN+DEL theo prefix (xóa toàn bộ page cache khi có thay đổi). Phù hợp keyspace nhỏ, không để lại orphaned keys.
**Lưu ý**: Request có search/status filter → **bỏ qua cache hoàn toàn** (không đọc, không ghi).

## 3.5 File Upload & Image URL Building

1. Nhận request qua multer (field name: `image`)
2. Tạo bản ghi `CustomerInquiry` trước → lấy `id`
3. Lưu file vào `uploads/inquiries/{YYYY}/{MM}/{id}/{uuid}{ext}` qua `fileStorageService`
4. DB lưu **relative path**: `/uploads/inquiries/{YYYY}/{MM}/{id}/{uuid}{ext}`
5. Trước khi trả response: build absolute URL = `process.env.BE_HOST + stored_path`
6. Response field `imageUrl` = absolute URL (e.g. `http://localhost:3000/uploads/inquiries/...`)

**Coding rule (bắt buộc ghi vào `docs/rules/BE_rules.md`)**:
> Khi trả `imageUrl` (hoặc bất kỳ file URL nào) trong API response, **luôn** build absolute URL bằng cách prepend `process.env.BE_HOST`. DB chỉ lưu relative path. Nếu storage là S3, DB lưu full S3 URL — trả nguyên không cần prepend.

**Coding rule (bắt buộc ghi vào `docs/rules/FE_rules.md`)**:
> FE không bao giờ tự ghép host vào `imageUrl`. Mọi URL ảnh nhận từ API đã là absolute URL — dùng trực tiếp trong `<img src>` hoặc Ant Design `<Image src>`.

**Anti-pattern nghiêm cấm (gây lỗi double-host)**:
```jsx
// ❌ SAI — gây ra src="http://localhost:3000http://localhost:3000/uploads/..."
<Image src={`${import.meta.env.VITE_BE_URL}${record.imageUrl}`} />

// ✅ ĐÚNG — imageUrl từ API đã là absolute URL
<Image src={record.imageUrl} />
```
Bất kỳ đoạn code FE nào prefix `VITE_BE_URL` / `VITE_API_URL` / host string vào một trường URL nhận từ API đều phải được xóa bỏ ngay.

File storage service: `source/backend/src/services/fileStorageService.js`.

**Thống nhất env var toàn dự án**:
- `BE_HOST` là env var duy nhất cho host của BE trong toàn bộ codebase.
- `APP_URL` trong `.env` phải được **đổi tên thành `BE_HOST`**.
- Mọi controller đang dùng `process.env.APP_URL` trực tiếp (ví dụ: `declarationController.js`) phải migrate sang dùng hàm `buildImageUrl()` từ `fileStorageService`.
- `buildImageUrl()` nội bộ dùng `process.env.BE_HOST` — không fallback sang `APP_URL`.

## 3.6 Notification System

> **Phạm vi thiết kế**: Phần này chỉ mô tả các sự kiện inquiry cần trigger notification và i18n key tương ứng. Kiến trúc notification (cơ chế polling, lưu trữ, đọc/chưa đọc, trang lịch sử) được **reuse từ module notification hiện có** — không thiết kế lại ở đây.

**Inquiry events cần trigger notification**:

| Sự kiện | Người nhận | i18n key |
|---|---|---|
| Câu hỏi mới từ khách | ADMIN + SALE | `notification.newInquiry` |
| Câu hỏi approved lần 1 | CHUNG_TU | `notification.inquiryNeedsAnswer` |
| Chứng từ submit câu trả lời | ADMIN + SALE | `notification.inquiryAnswered` |
| Câu trả lời bị reject | CHUNG_TU | `notification.answerRejected` |

**Content format**: JSON string `{ "key": "notification.xxx", "params": { ... } }` — FE dùng `i18next.t(key, params)` để render theo ngôn ngữ người dùng (vi/zh). Type = `"INQUIRY"`, `refId` = `inquiryId`.

**Inquiry-specific behavior**:
- Khi có noti mới loại `INQUIRY` → FE fetch lại danh sách inquiries.
- Click noti inquiry → điều hướng `/customer-inquiry?inquiryId={id}` → tự động mở popup → đánh dấu đã đọc.

## 3.7 Sắp xếp và Phân trang (DB-Level)

- **Sort**: `ORDER BY status ASC, createdAt ASC` tại DB — `status` là Int nên có thể dùng trực tiếp mà không cần custom compare
- **Paging**: Server-side, `SKIP (page-1)*limit TAKE limit`
- **Default**: page=1, limit=20; options [20, 30, 40, 50]

## 3.8 Full-Text Search

Search không phân biệt hoa/thường (Prisma `mode: 'insensitive'`) trên các trường:
`productName`, `material`, `usage`, `size`, `brand`, `specialInfo`, `demand`, `techSpec`, `email`, `customerName`, `businessType`, `phoneNumber` (các trường sau chỉ ADMIN/SALE), `id` (nếu là số nguyên dương).

## 3.9 Frontend Configuration

| Env var | Nơi dùng | Mục đích |
|---|---|---|
| `HOTLINE` (BE env) | Landing page — render qua API hoặc inject qua build | Số hotline công khai |
| `VITE_LANDING_PAGE_URL` | FE — link cạnh title "Tư vấn khách hàng" | URL landing page configable cho dev/prod |

## 3.10 Admin Portal UI — Menu "Tư vấn khách hàng"

- **Vị trí**: Menu đầu tiên trong sidebar
- **Path**: `/customer-inquiry`
- **Link landing page**: Nằm inline cạnh title (button/icon), không phải sublink riêng; URL = `VITE_LANDING_PAGE_URL`
- **Table columns**: ID, Email (ẩn với CHUNG_TU), Tên khách hàng (ẩn với CHUNG_TU), Ngành nghề kinh doanh (ẩn với CHUNG_TU), Số điện thoại (ẩn với CHUNG_TU), Tên sản phẩm, Chất liệu, Công dụng, Kích thước, Nhãn hàng, Nhu cầu, Ảnh sản phẩm (thumbnail — hiển thị với tất cả vai trò), Trạng thái, Thời gian gửi, Thời gian chờ
- **Image preview trong table**: Dùng `<Image.PreviewGroup>` bọc toàn bộ thumbnail trong Table để khi click ảnh hiển thị overlay tối (dark mask) và đầy đủ nút điều hướng (đóng, xoay, zoom). Không dùng `<Image>` đơn lẻ với `preview={{ mask: false }}` cho thumbnail trong table.
- **Cột thời gian chờ**: FE tự tính real-time (không gọi API), cập nhật mỗi giây:
  - < 24h: `Xg Yp Zs`
  - ≥ 24h: `N ngày` (chỉ ngày, không tuần/tháng/năm)
- **Nút xem chi tiết**: Icon mắt (`EyeOutlined`). **Chỉ click icon mắt mới mở modal** — không đặt `onRow` click handler trên Table. Không có row-click navigation.
- **Phân biệt dòng**: **Không dùng zebra striping** (màu xen kẽ trắng/xám gây rối mắt kết hợp với hover). Dùng Ant Design default hover highlight (tự động) để phân biệt dòng khi di chuột. Không cần `rowClassName` hay CSS bổ sung.
- **Filter layout**: Search bar full-width ở trên (Input với prefix icon) → Filter status dropdown ở dưới → Nút "Tìm kiếm" và "Xóa lọc" căn phải. Dùng `Row/Col` Ant Design, CSS đồng nhất menu Khách hàng
- **Filter dropdown thứ tự**: Hiển thị đúng thứ tự sort priority: PENDING_REVIEW → PENDING_ANSWER → PENDING_SEND → EMAIL_SENT → ANSWER_REJECTED → QUESTION_REJECTED

**Coding rules bổ sung vào `docs/rules/FE_rules.md`**:
> **No Row-Click Navigation (BẮT BUỘC)**: KHÔNG đặt `onRow` click handler để mở modal/navigate khi click vào dòng table. Mọi hành động mở chi tiết/navigate đều phải thông qua nút action rõ ràng (icon mắt, icon edit...). Việc click nhầm vào dòng dữ liệu không được kích hoạt side-effect nào.
> **Không dùng Zebra Striping**: KHÔNG áp dụng `rowClassName` xen kẽ màu nền dòng — zebra striping gây rối mắt khi kết hợp với Ant Design hover effect. Dùng default Ant Design hover highlight để phân biệt dòng.

## 3.11 Landing Page — Màn hình xác nhận sau gửi câu hỏi

Sau khi POST `/api/inquiries/public` thành công (201), FE hiển thị màn hình xác nhận với **đầy đủ tất cả các trường** mà khách hàng đã điền:

| Trường | Ghi chú |
|---|---|
| `productName` | Nếu có |
| `material` | Nếu có |
| `usage` | Nếu có |
| `size` | Nếu có |
| `brand` | Nếu có |
| `specialInfo` | Nếu có |
| `techSpec` | Nếu có |
| `demand` | Nếu có |
| `imageUrl` | Hiển thị preview ảnh nếu có |
| `customerName` | Nếu có |
| `businessType` | Nếu có |
| `phoneNumber` | Nếu có |

FE lấy dữ liệu hiển thị từ response 201 (không cần gọi thêm API). Chỉ hiển thị các trường có giá trị, bỏ qua trường null/rỗng.
