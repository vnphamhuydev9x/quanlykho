## Version SD-v1.0.6 | Base on Requirement v1.0.4

- **[Section 3.5] Anti-pattern FE ghép double-host**: Bổ sung ví dụ code cụ thể cho lỗi double-host (`http://localhost:3000http://localhost:3000/...`) do FE vẫn prefix `VITE_BE_URL` vào `imageUrl` dù API đã trả absolute URL. Cũ: chỉ có rule text. Mới: thêm snippet ❌/✅ để FE nhận diện và xóa bỏ pattern nguy hiểm này.

## Version SD-v1.0.5 | Base on Requirement v1.0.4

- **[Section 2.1] Env Variables — BE_HOST là canonical**: Cập nhật mô tả `BE_HOST` thành canonical env var duy nhất cho host BE, thay thế toàn bộ `APP_URL` (deprecated). Yêu cầu đổi tên `APP_URL` → `BE_HOST` trong `.env`.
- **[Section 3.5] Thống nhất env var toàn dự án**: Bổ sung migration rule — mọi controller dùng `APP_URL` trực tiếp (e.g. `declarationController.js`) phải migrate sang `buildImageUrl()` từ `fileStorageService`. `buildImageUrl()` dùng `BE_HOST`, không fallback `APP_URL`.

## Version SD-v1.0.4 | Base on Requirement v1.0.4

- **[Section 1.3] Image URL Strategy**: Bổ sung bảng "Image URL Strategy" — DB luôn lưu relative path; BE build absolute URL bằng cách prepend `BE_HOST` trước khi trả response; tương lai S3 thì DB lưu full URL, BE không cần prepend. Response `imageUrl` sample cập nhật từ `/uploads/...` sang `http://localhost:3000/uploads/...`.
- **[Section 2.1] Env Variables**: Thêm `BE_HOST` — host của BE, dùng để build absolute imageUrl.
- **[Section 3.5] File Upload & Image URL Building**: Mở rộng flow — thêm bước build absolute URL trước khi trả response (step 5-6). Bổ sung coding rule cho BE_rules.md (luôn prepend BE_HOST) và FE_rules.md (không tự ghép host).

## Version SD-v1.0.3 | Base on Requirement v1.0.3

- **[Section 3.10] Table columns — Bổ sung cột Ảnh sản phẩm**: Cũ: không có cột ảnh. Mới: thêm cột "Ảnh sản phẩm" (thumbnail, hiển thị với tất cả vai trò kể cả CHUNG_TU). Đồng thời chuẩn hóa danh sách cột đầy đủ: ID, Email, Tên khách hàng, Ngành nghề kinh doanh, Số điện thoại (3 cột ẩn với CHUNG_TU), Tên sản phẩm, Chất liệu, Công dụng, Kích thước, Nhãn hàng, Nhu cầu, Ảnh sản phẩm, Trạng thái, Thời gian gửi, Thời gian chờ.
- **[Section 3.11 — Mới] Landing Page màn hình xác nhận**: Đặc tả FE phải hiển thị đầy đủ tất cả trường có giá trị từ response 201 trên màn hình xác nhận, bao gồm preview ảnh (`imageUrl`), tên khách hàng, ngành nghề, số điện thoại.

## Version SD-v1.0.2 | Base on Requirement v1.0.2

- **[Section 1.1] Bảng `customer_inquiries` — Thêm 3 trường mới**: Bổ sung `customerName` (String?), `businessType` (String?), `phoneNumber` (String?) — tất cả tùy chọn, mặc định null. Cả 3 trường bị ẩn với CHUNG_TU tại BE (masking cùng cơ chế với `email`).
- **[Section 2.2] POST `/api/inquiries/public` — Request fields**: Bổ sung 3 field mới `customerName`, `businessType`, `phoneNumber` vào request body và response.
- **[Section 2.3] GET `/api/inquiries` & GET `/:id` — Masking**: Cập nhật danh sách trường bị ẩn với CHUNG_TU: Cũ: chỉ `email`. Mới: `email`, `customerName`, `businessType`, `phoneNumber`.
- **[Section 3.3] Visibility của CHUNG_TU**: Cập nhật ghi chú masking để phản ánh 4 trường bị ẩn.
- **[Section 3.8] Full-Text Search**: Bổ sung `customerName`, `businessType`, `phoneNumber` vào danh sách trường search (chỉ ADMIN/SALE).

## Version SD-v1.0.1 | Base on Requirement v1.0.1

- **[Section 3.6] Phạm vi Notification System**: Thu hẹp phạm vi thiết kế — Cũ: mô tả đầy đủ cơ chế polling, unread count, click behavior trong system design này. Mới: chỉ liệt kê các inquiry events cần trigger notification và i18n key tương ứng; toàn bộ kiến trúc notification (polling, lưu trữ, đọc/chưa đọc, trang lịch sử) được reuse từ module notification hiện có, không thiết kế lại ở đây.
