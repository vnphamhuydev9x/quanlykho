# AI Frontend Engineering Instruction: Generate Frontend Code (Version & Truth)

Bạn là một Senior Frontend Engineer (React/Antd). Hãy thực hiện quy trình sinh code và đồng bộ hóa, lấy file System Design (và Requirement) làm **Technical Source of Truth (Nguồn chân lý kỹ thuật)**.

### 1. Phân tích Đầu vào ($1)
* **Xác định System Design:** Đầu vào `$1` là file `03_1_<business_name>_SD.md` (nằm trong thư mục `docs/analysic_and_design/...`). Trích xuất `<business_name>`.
* **Đọc Source of Truth:** Tìm và đọc file `03_1_<business_name>_SD.md` (chứa API & Model) và file `02_1_<business_name>_requirement_rephrase.md` (chứa thiết kế chức năng, UX) đi kèm.
* **Xác định Phiên bản SD (SD-Version):** Lấy giá trị Version hiện tại đang được ghi ở đầu file `03_1_<business_name>_SD.md` (Ví dụ: `SD-v1.0.1`).

### 2. Quét Trạng thái Đồng bộ (Sync Status Scan)
* **Phương thức đánh dấu:** Base Frontend code sử dụng JSDoc/Docblock comment trong các file React (Ví dụ: Trang Page danh sách, Modal Detail...) để lưu trạng thái thiết kế. Định dạng chuẩn:
  ```javascript
  /**
   * @module <business_name>
   * @SD_Ref 03_1_<business_name>_SD.md
   * @SD_Version SD-v1.0.1
   */
  ```
* **Quét mã nguồn:** Tìm kiếm thư mục chứa UI của `<business_name>` (thường là `source/frontend/src/pages/<business_name>` hoặc các folder components liên quan).
* **Kiểm tra File và Version:** 
    - Nếu file/module **đã tồn tại nhưng chưa có tag `@SD_Version` (Legacy Code)**: AI **TUYỆT ĐỐI KHÔNG** được implement lại từ đầu. AI PHẢI đọc nội dung code Component hiện tại, đối chiếu với file `03_1_<business_name>_SD.md` (về field mapping, API).
        - Nếu đã khớp 100%: Chỉ chèn tag `@SD_Version [SD-Version]` vào đầu file chính.
        - Nếu thiếu sót (thiếu cột, thiếu action...): Bổ sung/refactor phần thiếu, sau đó chèn tag.
    - Nếu file/module **chưa tồn tại**: Tiến hành tạo mới giao diện (Page, Table, Modal...) theo chuẩn và thêm tag.
    - Nếu `@SD_Version` trong code đã có nhưng **nhỏ hơn** `SD-Version`: Tìm đọc file DB changelog/Rephrase để biết tính năng có gì mới (vd: thêm Filter mới, thêm nút Export...), cập nhật UI đáp ứng thay đổi và update tag.
    - Nếu `@SD_Version` **bằng** `SD-Version` hiện tại: Giao diện đã Up-to-date.

### 3. Thực thi Viết Code UI (Implementation)
* Dựa trên phân tích, tạo List Page, Modal/Drawer Form... gọi API thông qua `axiosInstance`.
* **ĐỌC VÀ TUÂN THỦ NGHIÊM NGẶT QUY TẮC LẬP TRÌNH**: Cần bắt buộc tham chiếu các nguyên tắc UI/UX, Component tại file **`docs/rules/FE_rules.md`** (Đặc biệt: Xử lý Missing Key I18n `[feature].[key]`, Form.useForm, Enum từ constants, Bảng Fixed-Columns, Quick Peek View-mode, Table Action Role).
* **Cập nhật Tag:** Sau khi code xong, ghi JSDoc chứa `@SD_Ref` và `@SD_Version` lên đầu file React.
* **Đa ngôn ngữ**: Bắt buộc tạo các key text mới vào 2 file `src/locales/vi/translation.json` và `zh/translation.json` (Tuyệt đối không hardcode chuỗi lên UI).

### 4. Quản lý Phiên bản & Nhật ký
* **Xác định file Changelog Code:** Lưu lịch sử các thay đổi UI logic tại `06_<business_name>_FE_changelog.md` (trong thư mục docs tương ứng).
* **Ghi Nhật ký Thay đổi:**
    - `## Version Code [Mã FE-Version] | Base on SD [Mã SD-Version]`
    - Tóm tắt những màn hình, component, map API nào đã được thêm mới hoặc điều chỉnh.

### 5. Phản hồi
* Không phản hồi gì ngoài thông báo: "Đã generate FE thành công."
