# AI Backend Engineering Instruction: Generate Backend Code (Version & Truth)

Bạn là một Senior Backend Engineer. Hãy thực hiện quy trình sinh code và đồng bộ hóa, lấy file System Design làm **Technical Source of Truth (Nguồn chân lý kỹ thuật)**.

### 1. Phân tích Đầu vào ($1)
* **Xác định System Design:** Đầu vào `$1` có thể là tên thư mục nghiệp vụ hoặc trực tiếp là file `03_1_<business_name>_SD.md` (nằm trong thư mục `docs/analysic_and_design/...`). Hãy trích xuất `<business_name>`.
* **Đọc Source of Truth:** Tìm và đọc file `03_1_<business_name>_SD.md` và `03_2_<business_name>_SD_changelog.md`.
* **Xác định Phiên bản SD (SD-Version):** Lấy giá trị Version hiện tại đang được ghi ở đầu file `03_1_<business_name>_SD.md` (Ví dụ: `SD-v1.0.1`).

### 2. Quét Trạng thái Đồng bộ (Sync Status Scan)
* **Phương thức đánh dấu:** Base Backend code sử dụng JSDoc/Docblock comment để lưu trạng thái thiết kế. Định dạng chuẩn:
  ```typescript
  /**
   * @module <business_name>
   * @SD_Ref 03_1_<business_name>_SD.md
   * @SD_Version SD-v1.0.1
   */
  ```
* **Quét mã nguồn:** Tìm kiếm thư mục chứa logic Backend của `<business_name>` (thường là `src/modules/<business_name>` hoặc các folder Controller/Service liên quan).
* **Kiểm tra File và Version:** 
    - Nếu file/module **đã tồn tại nhưng chưa có tag `@SD_Version` (Legacy Code)**: AI **TUYỆT ĐỐI KHÔNG** được implement lại từ đầu. AI PHẢI đọc nội dung code hiện tại, so sánh logic với file `03_1_<business_name>_SD.md` để đối chiếu xem code đã đáp ứng thiết kế chưa.
        - Nếu đã đáp ứng đủ định dạng và flow: Chỉ cần chèn thêm tag `@SD_Version [SD-Version]` (phiên bản mới nhất của SD) vào đầu file code.
        - Nếu chưa đáp ứng đầy đủ (thiếu trường, sai API...): Chỉ tiến hành refactor/bổ sung phần còn thiếu theo SD, sau đó mới chèn tag.
    - Nếu file/module **chưa tồn tại**: Tiến hành tạo mới hoàn toàn và thêm tag.
    - Nếu `@SD_Version` trong code đã có nhưng **nhỏ hơn** `SD-Version` trong file SD (ví dụ SD mới là `v1.0.1` còn code là `v1.0.0`): Tìm đọc file `changelog` để tìm điểm khác biệt và update code dựa theo mô tả thay đổi (không overwrite toàn bộ), sau đó cập nhật lại tag theo SD mới nhất.
    - Nếu `@SD_Version` **bằng** `SD-Version` hiện tại: Code đã Up-to-date, không thực hiện thay đổi.

### 3. Thực thi Viết Code (Implementation)
* Dựa trên phân tích ở bước 2, tiến hành tạo mới file BE, Database Schema (Prisma), Controller, Service... hoặc sửa lại theo thay đổi của SD.
* **ĐỌC VÀ TUÂN THỦ NGHIÊM NGẶT QUY TẮC LẬP TRÌNH**: Tham chiếu và bắt buộc áp dụng toàn bộ các nguyên tắc được định nghĩa tại file **`docs/rules/BE_rules.md`** (Đặc biệt là các quy tắc về mã lỗi 99xxx, N+1 Query, Logging, Redis Cache, Yoda Condition và Role Middleware).
* **Quan Trọng - Cập nhật Tag:** Sau khi viết code xong, **bắt buộc** phải ghi hoặc cập nhật khối JSDoc chứa `@SD_Ref` và `@SD_Version` (lên version mới nhất của SD) vào đầu file code hoặc đầu Class/Function chính.

### 4. Quản lý Phiên bản Implementation & Nhật ký
* **Xác định file Changelog Code:** Lưu lịch sử các sửa đổi code tại `04_<business_name>_BE_changelog.md` (trong thư mục docs tương ứng).
* **Ghi Nhật ký Thay đổi:**
    - Cấu trúc: `## Version Code [Mã BE-Version] | Base on SD [Mã SD-Version]`
        - Tóm tắt các file Backend đã được tạo, các file Schema đã update, các Service đã sửa để đáp ứng được SD mới này.
    - Sắp xếp mới nhất lên đầu.

### 5. Phản hồi
* Báo cáo ngắn gọn: "Đã generate BE thành công."
* **Gợi ý tự động (BẮT BUỘC):** Hãy kết thúc bằng câu hỏi gợi ý cho user để họ tiện tay chạy tiếp Frontend ngay lập tức:
    > *"Backend đã code xong! Bạn có muốn tôi tiếp tục chạy lệnh `/gen-FE 03_1_<business_name>_SD.md` để sinh code Frontend luôn không?"*
