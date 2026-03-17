## Version SD-v1.0.1 | Base on Requirement v1.0.0

- **§3.4 FE Polling — Thêm Initialization Guard**: Bổ sung constraint kỹ thuật: lần poll đầu tiên khi component khởi tạo không được trigger inquiry refresh để tránh false-positive. Dùng sentinel value (`-1`) thay vì `0` để phân biệt trạng thái "chưa poll lần nào" với "poll xong nhưng count = 0". Chỉ từ poll thứ 2 trở đi mới so sánh count tăng lên để dispatch `inquiry:refresh`.
