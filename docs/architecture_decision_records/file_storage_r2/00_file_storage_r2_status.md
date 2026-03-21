# Feature Status: file_storage_r2
> Cập nhật lần cuối: 2026-03-21

## Tổng trạng thái: ✅ Done

## Requirements
> Technical Design only — không có FR/NFR từ góc độ khách hàng

## System Design
> **SD-v1.2.0** (2026-03-21)

**Tóm tắt thay đổi:**

| Hạng mục | Nội dung |
|----------|----------|
| Data Model | NEW bảng `images` (id, url, provider, sortOrder, declarationId?, inquiryId?); Declaration: xóa JSON field `images`, thêm relation; CustomerInquiry: xóa JSON field `image`, thêm relation |
| Indexing | `@@index([declarationId])` + `@@index([inquiryId])` trên bảng `images` |
| API | Declaration GET: trả `images[]` + `imageUrls[]`; Declaration PUT: nhận `keepImageIds` thay vì `existingImages`; CustomerInquiry GET: trả `images[]` + `imageUrl` |
| Business Logic | Upload → INSERT Image row; Update → giữ keepImageIds, delete còn lại; Delete → enqueue R2 + hard-delete Image rows + soft-delete entity |
| Storage | Không thay đổi (facade, providers, buildKey, env vars) |
| Cache | Không thay đổi |

## Implementation Status

| Layer | Dựa trên SD  | Trạng thái   | Cập nhật lần cuối |
|-------|-------------|-------------|-------------------|
| BE    | SD-v1.2.0   | ✅ Done     | 2026-03-21        |
| FE    | SD-v1.2.0   | ✅ Done     | 2026-03-21        |

## Pending Tasks
<!-- Sync từ task_board.md — không sửa tay -->

### [SD] — Tất cả đã xong ✅

### [BE]
- [v] Migrate dữ liệu từ `Declaration.images` JSON và `CustomerInquiry.image` JSON sang bảng `images` mới; cập nhật toàn bộ controller/query để CRUD qua bảng images thay vì JSON field (comment 6)
