## Version v1.0.7

- **[NFR] Preview ảnh thumbnail có dark overlay**: Bổ sung §2.2 — Click thumbnail ảnh trong table phải hiển thị image preview với nền tối mờ và đủ nút điều hướng, đồng nhất với preview ảnh trong modal chi tiết. (Trước: không có yêu cầu tường minh về UX preview ảnh ở table.)

## Version v1.0.6

- **[NFR] Bỏ zebra striping**: Cập nhật §2.2 — Xóa yêu cầu màu nền xen kẽ (zebra striping). Cũ: dòng chẵn/lẻ xen kẽ trắng/xám. Mới: dùng Ant Design default hover highlight — zebra striping gây rối mắt khi kết hợp với hover effect.

## Version v1.0.5

- **[FR] Bỏ row-click auto-view**: Bổ sung §2.2 — Click vào dòng table không còn tự động mở popup chi tiết. Chỉ click icon mắt mới mở. (Trước: click bất kỳ vị trí trên dòng đều mở modal.)
- **[NFR] Zebra striping**: Bổ sung §2.2 — Table danh sách câu hỏi áp dụng màu nền xen kẽ (trắng / xám nhạt) để dễ đọc theo chiều ngang.

## Version v1.0.4

- **[NFR] Image URL phải là absolute URL**: Bổ sung §NFR.3 — Tất cả `imageUrl` trong API response phải là absolute URL có host. BE có trách nhiệm ghép host; FE không tự ghép. (Trước: không có yêu cầu tường minh về format URL.)

## Version v1.0.3

- **[FR] Màn hình xác nhận sau gửi câu hỏi**: Cụ thể hóa §1.2 — FE phải hiển thị đầy đủ tất cả các trường khách hàng đã điền, bao gồm Ảnh sản phẩm, Tên khách hàng, Ngành nghề kinh doanh, Số điện thoại (trước chỉ ghi chung chung "toàn bộ nội dung").
- **[FR] Cột Ảnh sản phẩm trong table**: Bổ sung cột Ảnh sản phẩm (thumbnail, hiển thị với tất cả vai trò kể cả CHUNG_TU) vào table danh sách câu hỏi §2.2.

## Version v1.0.2

- **[FR] Thêm trường thông tin khách hàng**: Bổ sung 3 trường mới vào form inquiry — Tên khách hàng, Ngành nghề kinh doanh, Số điện thoại (đều tùy chọn, không bắt buộc). Cả 3 trường bị ẩn với CHUNG_TU tại BE (tương tự email) — chỉ Admin và Sale mới thấy.
- **[FR] Cột table cập nhật**: Table danh sách câu hỏi bổ sung thêm cột Tên khách hàng, Ngành nghề kinh doanh, Số điện thoại (ẩn với CHUNG_TU).

## Version v1.0.1

- **[FR] Upload ảnh**: Bổ sung tính năng upload tối đa 1 ảnh khi khách hàng gửi câu hỏi.
- **[FR] Config hotline**: Bổ sung yêu cầu hiển thị số hotline trên landing page, cấu hình qua env var (không hardcode).
- **[FR] Filter/Search UI layout**: Cập nhật layout — search bar full-width ở trên, filter status dropdown ở dưới, có nút "Tìm kiếm" và "Xóa lọc", CSS responsive đồng nhất với menu Khách hàng.
- **[FR] Link landing page**: Cụ thể hóa vị trí — link nằm **cạnh title "Tư vấn khách hàng"** (không phải sublink riêng).
- **[FR] Filter dropdown thứ tự trạng thái**: FE filter dropdown hiển thị danh sách trạng thái theo đúng thứ tự sort priority (`PENDING_REVIEW` → `PENDING_ANSWER` → `PENDING_SEND` → `EMAIL_SENT` → `ANSWER_REJECTED` → `QUESTION_REJECTED`).
