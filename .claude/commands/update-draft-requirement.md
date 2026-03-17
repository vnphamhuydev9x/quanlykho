# AI Analyst Instruction: Update Documentation (Version & Truth)

Bạn là một AI Analyst chuyên nghiệp. Hãy thực hiện quy trình đồng bộ hóa tài liệu, lấy file Rephrase làm **Source of Truth (Nguồn chân lý duy nhất)** cho Requirement (FR/NFR).

### 1. Phân tích Đầu vào ($1)
* **Đọc file draft:** Truy cập file `$1`.
* **Quét dữ liệu mới:** Tìm các khối dữ liệu `# comment <number>` chưa có nhãn `[Requirement-Checked]`.
* **Xác định ý cần xử lý:** Trong các khối chưa có nhãn này, tìm các dòng gạch đầu dòng chưa có dấu `[v]` hoặc `[ ]`.
* **Phân loại nghiêm ngặt:** - Chỉ những ý thuộc **Functional Requirements (FR)** và **Non-functional Requirements (NFR)** mới được đưa vào file Rephrase và Nhật ký thay đổi.
    - Các ý về Technical Solution hoặc Issue Report sẽ bị loại biên khỏi luồng này.

### 2. Quản lý Phiên bản & Nhật ký
* **Xác định Business Name:** Từ tên file đầu vào `$1` (có định dạng `01_<business_name>_draft_requirement.md`), trích xuất ra `<business_name>`.
* **Xác định file Rephrase:** Tên file đích sẽ là `02_1_<business_name>_requirement_rephrase.md`.
* **Kiểm tra trạng thái (Versioning):**
    - Nếu file `02_1_<business_name>_requirement_rephrase.md` **chưa tồn tại**: Đặt version là `v1.0.0`. Đây là bản gốc ban đầu. **TUYỆT ĐỐI KHÔNG ghi nhật ký.**
    - Nếu file **đã tồn tại**: Đọc version hiện tại và tăng lên (ví dụ: `v1.0.1`). 
* **Ghi Nhật ký Thay đổi (Chỉ cho FR/NFR và khi Version > v1.0.0):**
    - File: `02_2_<business_name>_requirement_rephrase_changelog.md`.
    - **Nội dung:** Chỉ ghi lại các thay đổi liên quan đến nghiệp vụ (FR/NFR).
    - **Cấu trúc:** ## Version [Mã Version Mới]
        - <Mô tả chi tiết sự thay đổi nghiệp vụ: Nội dung cũ -> Nội dung mới>.
    - **Sắp xếp:** Đưa Version mới nhất lên đầu file.

### 3. Ánh xạ vào File Rephrase (The Source of Truth)
* **Nguyên tắc:** File này **CHỈ** chứa FR và NFR. Tuyệt đối không ghi log, không ghi issue, không ghi tech note.
* **Cấu trúc file:**
    - Dòng 1: `Version: [Mã Version]`
    - Mục 1: `# Functional Requirements`
    - Mục 2: `# Nonfunctional Requirements`
* **Xử lý nội dung:** Rephrase ngắn gọn, súc tích, chuyên nghiệp.

### 4. Đánh dấu Trạng thái tại File Draft ($1)
* Sửa trực tiếp file `$1`:
    * **Tại tiêu đề khối:** Thêm nhãn `[Requirement-Checked]` vào sau `# comment <number>`. 
    * **Lưu ý:** Nếu khối đã có nhãn khác (ví dụ: `[Tech-Checked]`), hãy ghi đè hoặc viết tiếp vào sau (Ví dụ: `# comment 1 [Tech-Checked] [Requirement-Checked]`).
    * **Tại từng dòng gạch đầu dòng:**
        * **Thêm `[v]`**: Cho các ý FR/NFR đã được ánh xạ thành công.
        * **Thêm `[ ]`**: Cho các ý Technical Solution hoặc Issue Report.

### 5. Phản hồi (Gợi ý luồng làm việc)
* **Kiểm tra trạng thái:** Quét lại file `$1` xem còn dòng gạch đầu dòng nào chứa `[ ]` (thuộc về Technical Solution / Issue) CHƯA được giải quyết ở System Design, HOẶC lướt xem version của Requirement vừa có bị tăng lên hay không.
* **Phản hồi:**
    - Báo cáo ngắn gọn: "Đã update draft requirement thành công."
    - **Gợi ý tự động (BẮT BUỘC):** Nếu phát hiện có tín hiệu thay đổi cần cập nhật System Design (còn tồn đọng item `[ ]` hoặc version requirement nhảy số), hãy kết thúc bằng câu hỏi:
      > *"Phát hiện có thay đổi ảnh hưởng đến System Design. Bạn có muốn tôi tự động chạy lệnh `/gen-SD $1` để đồng bộ thiết kế hệ thống luôn không?"*