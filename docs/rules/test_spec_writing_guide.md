# Hướng dẫn Viết Test Spec & Integration Test Chuẩn

> Tài liệu này ra đời sau sự cố: *Declaration module đổi schema lớn nhưng Integration Test không được cập nhật, dẫn đến toàn bộ test file sử dụng schema cũ và không thể chạy được.*

---

## 🔴 Chẩn đoán: 3 Điểm gãy trong quy trình cũ

| # | Điểm gãy | Hậu quả |
|---|---|---|
| 1 | **Test Spec quá sơ sài** — Chỉ có Scenario cấp cao, không có Input/Output cụ thể | AI/Dev không có đủ ngữ cảnh để viết test đúng |
| 2 | **Test chưa bao giờ được chạy sau khi schema thay đổi** | Schema mismatch âm thầm tồn tại, bị phát hiện muộn |
| 3 | **Không có convention ràng buộc Test Spec ↔ Test Code** | Test code "trôi dạt" khỏi spec, không ai biết TC nào đã được cover |

---

## ✅ Giải pháp: 3 Thay đổi Quy trình

---

### THAY ĐỔI 1: Test Spec phải viết đến cấp Input/Output (Granular Test Case)

#### ❌ Chuẩn cũ (quá sơ sài — KHÔNG dùng nữa)
```
### Scenario 2: Tính toán công thức ngầm
- Test Case 2.1: Update Declaration API PUT /api/declarations/:id
  - Body Valid: invoicePriceBeforeVat = 100000, declarationQuantity = 10
  - Expect: totalLotValueBeforeVat = 1000000
```

#### ✅ Chuẩn mới (Granular — BẮT BUỘC áp dụng)

Mỗi Test Case trong file `.md` phải có đủ 4 phần: **ID, Input, Expected Output, Ghi chú logic**.

```markdown
### TC-DECL-UPDATE-01: Happy Path — Cập nhật thành công các trường text

- **Endpoint**: `PUT /api/declarations/:id`
- **Auth**: ADMIN token
- **Precondition**: Declaration tồn tại (id = X), được tạo qua ProductCode
- **Input Body**:
  ```json
  {
    "brand": "Nike",
    "sellerCompanyName": "Nike China Ltd",
    "declarationNeed": "Nhập khẩu thương mại",
    "notes": "Ghi chú test"
  }
  ```
- **Expected HTTP Status**: `200`
- **Expected Response**:
  ```json
  { "code": 200, "message": "Success", "data": { "brand": "Nike", ... } }
  ```
- **DB Verify**: `declaration.brand = "Nike"`, `declaration.sellerCompanyName = "Nike China Ltd"`

---

### TC-DECL-UPDATE-02: Secure Recalculation — totalLotValueBeforeVat

- **Endpoint**: `PUT /api/declarations/:id`
- **Auth**: ADMIN token
- **Input Body**:
  ```json
  {
    "invoicePriceBeforeVat": 100000,
    "declarationQuantity": 10,
    "importTax": 5,
    "vatTax": 10,
    "totalLotValueBeforeVat": 99000000
  }
  ```
  > ⚠️ `totalLotValueBeforeVat: 99000000` là giá trị giả mạo từ Client
- **Expected HTTP Status**: `200`
- **DB Verify** (giá trị thực tế Server tự tính):
  - `totalLotValueBeforeVat = 100000 × 10 = 1,000,000` (KHÔNG phải 99,000,000)
  - `importTaxPayable = 1,000,000 × 5% = 50,000`
  - `vatTaxPayable = 1,000,000 × 10% = 100,000`
```

#### Checklist Test Spec đủ granular
Mỗi API Endpoint cần có Test Case cho:
- [ ] **Happy Path**: Input hợp lệ đầy đủ → 200/201
- [ ] **Auth — No Token**: Không có Bearer token → 401
- [ ] **Auth — Wrong Role**: Token của role không đủ quyền → 403
- [ ] **Not Found**: ID không tồn tại → 404
- [ ] **Validation — Missing Required**: Thiếu field bắt buộc → 400
- [ ] **Validation — Invalid Type**: Sai kiểu dữ liệu (string thay vì number) → 400
- [ ] **Business Logic**: Verify dữ liệu tính toán tự động đúng công thức → DB check
- [ ] **Cache**: Verify cache bị xóa sau mutation (POST/PUT/DELETE) → Redis check
- [ ] **Edge Case**: Giá trị biên (0, null, số âm, rất lớn...)

---

### THAY ĐỔI 2: Convention "TC-ID Comment" ràng buộc Test Spec ↔ Test Code

#### Quy tắc bắt buộc
Mỗi `it()` block trong Integration Test phải bắt đầu bằng comment chứa **Test Case ID** tương ứng từ Test Spec.

#### ✅ Chuẩn mới
```javascript
describe('PUT /api/declarations/:id — Update', () => {

    // [TC-DECL-UPDATE-01] Happy Path — Cập nhật thành công các trường text
    it('should update text fields successfully', async () => { ... });

    // [TC-DECL-UPDATE-02] Secure Recalculation — chặn fake totalLotValueBeforeVat
    it('should recalculate totalLotValueBeforeVat server-side, ignoring client value', async () => { ... });

    // [TC-DECL-UPDATE-AUTH-01] Auth — Non-admin bị từ chối
    it('should return 403 when non-admin tries to update', async () => { ... });

    // [TC-DECL-UPDATE-404] Not Found — Declaration không tồn tại
    it('should return 404 for non-existent declaration', async () => { ... });
});
```

**Lợi ích**:
- Scan nhanh xem TC nào đã có `it()` tương ứng, TC nào bị bỏ sót
- Khi Test Spec thay đổi, grep theo ID để tìm ngay test cần update
- AI có đủ ngữ cảnh để hiểu **tại sao** `it()` block đó tồn tại

---

### THAY ĐỔI 3: Checklist bắt buộc trước khi nói "Implementation Done"

Khi một feature/module được coi là **Done**, phải pass hết checklist sau:

```
☐ 1. BRD cập nhật đầy đủ
☐ 2. Tech Spec cập nhật đầy đủ (schema, API contract)
☐ 3. Test Spec viết đủ granular (có TC-ID, Input, Expected Output)
☐ 4. Integration Test viết xong (mỗi TC trong Spec có 1 it() block, có TC-ID comment)
☐ 5. Chạy Integration Test: npm run test -- --testPathPattern=<tên-module>.test.js
☐ 6. Tất cả test PASS (màu xanh 100%)
☐ 7. Không có SKIP test (không dùng it.skip() để trốn lỗi)
```

> 🔴 **Bất kỳ bước nào chưa xong = Feature chưa Done.**
> Tuyệt đối không chuyển sang làm Frontend khi test chưa xanh.

---

## 📐 Template Test Spec chuẩn

Dưới đây là template mỗi file TestSpec mới nên sử dụng:

```markdown
# Test Spec: Module [Tên Module] — Backend

> **Phiên bản**: v1.0 | **Cập nhật**: YYYY-MM-DD
> **Tham chiếu**: [BRD link], [Tech Spec link]
> **Schema hiện tại**: Liệt kê các trường model Prisma đang dùng (để tránh mismatch)

## Danh sách API cần test

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/xxx` | GET | Any | Lấy danh sách |
| `/api/xxx/:id` | PUT | ADMIN | Cập nhật |

---

## Test Cases

### [TC-XXX-GET-01] — GET danh sách: Happy Path
...

### [TC-XXX-GET-AUTH-01] — GET danh sách: Không có token → 401
...

### [TC-XXX-UPDATE-01] — PUT update: Happy Path
...
```

---

## 🔄 Quy trình Change Management khi Schema thay đổi

Khi có thay đổi schema (thêm/xóa/đổi tên field), bắt buộc thực hiện theo thứ tự:

```
1. Cập nhật schema.prisma + chạy migration
        ↓
2. Cập nhật BRD (nếu thay đổi nghiệp vụ)
        ↓
3. Cập nhật Tech Spec (Data Dictionary)
        ↓
4. Cập nhật Test Spec:
   - Xóa/sửa Test Case dùng field cũ
   - Thêm Test Case cho field mới
        ↓
5. Cập nhật Integration Test:
   - Sửa tất cả prisma.create/createMany đang dùng field cũ
   - Thêm it() block cho Test Case mới
        ↓
6. Chạy lại toàn bộ test suite của module đó
   npm run test -- --testPathPattern=<module>.test.js
        ↓
7. 100% PASS → Done
```

> ⚠️ **Anti-pattern cần tránh**: Chỉ sửa code Controller/Service mà KHÔNG chạy lại test.
> Đây chính xác là nguyên nhân tạo ra file test với schema cũ.

---

*Tài liệu này là Rule bắt buộc, áp dụng cho cả Engineers và AI Agent.*
