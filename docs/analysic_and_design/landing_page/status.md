# Feature Status: landing_page (Customer Inquiry)
> Cập nhật lần cuối: 2026-03-29

## Tổng trạng thái: ✅ Done

## Requirements
> Version: 1.0.7 — `02_landing_page_requirement_rephrase.md`

- [x] FR: Form gửi câu hỏi từ Guest trên Landing Page
- [x] FR: Quản lý Menu "Tư vấn khách hàng" (Admin Portal)
- [x] FR: Danh sách câu hỏi (Phân trang, Filter, Search, Sort)
- [x] FR: Luồng xử lý nội bộ 2 cấp (Admin duyệt câu hỏi -> Chứng từ trả lời -> Admin duyệt trả lời)
- [x] FR: Phân quyền hiển thị theo Role (Admin/Sale vs CHUNG_TU)
- [x] FR: Tự động gửi Email phản hồi khách sau khi duyệt lần 2
- [x] NFR: Trả về Absolute Image URL từ Backend

## System Design
> SD-v1.0.0 — `03_landing_page_SD.md`

- **Data Model:** Bảng `CustomerInquiry` theo dõi trạng thái từ `PENDING_REVIEW` đến `EMAIL_SENT`
- **Indexing:** Theo `status`, `createdAt`
- **API:** API public tạo inquiry, API nội bộ (CRUD, duyệt, reject)
- **Role Control:** Ẩn thông tin liên hệ khách hàng với `CHUNG_TU`
- **External Integration:** Gửi email qua Nodemailer/Resend

## Implementation Status

| Layer | Dựa trên SD  | Trạng thái   | Cập nhật lần cuối |
|-------|-------------|-------------|-------------------|
| BE    | SD-v1.0.0   | ✅ Done     | 2026-03-29        |
| FE    | SD-v1.0.0   | ✅ Done     | 2026-03-29        |

## Pending Tasks
<!-- Sync từ task_board.md — không sửa tay -->
Không có task nào đang chờ xử lý.
