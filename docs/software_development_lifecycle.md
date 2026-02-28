# Quy Trình Phát Triển Phần Mềm (Software Development Lifecycle)

Tài liệu này mô tả chi tiết quy trình phát triển và bảo trì hệ thống/tính năng mới trong dự án, đảm bảo tính đồng bộ giữa luồng nghiệp vụ kinh doanh, kiến trúc kỹ thuật hệ thống và chất lượng code ở mức tối đa.

---

## 1. Giai đoạn Phân tích và Thiết kế (Analysis & Design)

1.  **Business Requirement Document (BRD - Tài liệu nghiệp vụ)**
    *   **Thư mục**: `docs/business-tech-note/BRD/`
    *   **Mục đích**: Phân tích chi tiết yêu cầu nghiệp vụ từ khách hàng hoặc team BA. Tài liệu này là "nguồn chân lý" (Source of Truth) về mặt tính năng và luồng dữ liệu. Mọi sự thay đổi về yêu cầu đều phải được phản ánh và cập nhật vào BRD trước tiên. Luôn tuân thủ nguyên tắc định tính các trường dữ liệu và Validation logic tại đây.

2.  **Technical Specification (Tech Spec - Đặc tả kỹ thuật)**
    *   **Thư mục**: `docs/business-tech-note/technical_specs/`
    *   **Mục đích**: Chuyển hoá cấu trúc dữ liệu từ BRD sang ngôn ngữ kỹ thuật. Team kỹ thuật (hoặc AI) sẽ thiết kế Database Schema (Prisma Models), API Endpoints chi tiết (còn gọi là Spec of Contract), định nghĩa chiến lược Caching (như lưu vào Redis như thế nào, Invalidation lúc nào), và thuật toán xử lý nghiệp vụ phức tạp.
    *   *Lưu ý*: Tech Spec phải bám sát BRD và tuân thủ các quy định chuẩn mực về Code trong thư mục `docs/rules`.

3.  **Test Specification (Test Spec - Kịch bản kiểm thử)**
    *   **Thư mục**: `docs/business-tech-note/testspec/`
    *   **Mục đích**: Xác định các kịch bản kiểm thử (Test Scenarios & Test Cases) dựa vào BRD và Tech Spec để định hướng cho hệ thống Automation Test dưới Backend theo phương pháp hộp đen. Bộ Test Spec này sẽ vạch rõ các Output cho từng Input cụ thể, đảm bảo Validation, Business Logic tính toán, Caching, và Phân quyền (RBAC) trả về kết quả chính xác như kỳ vọng.

---

## 2. Giai đoạn Triển khai Backend & QA (BE Implementation & Testing)

1.  **Chỉnh sửa Database & Viết logic Backend**
    *   **Cập nhật cấu trúc DB**: Thay đổi file Prisma và thực hiện update Schema. Trong bước phát triển hoặc làm lại feature, Developer có thể chạy lệnh `npm run dev:reset` để đập bảng xây lại từ đầu lấy DB mới nhất một cách sạch sẽ bằng các script tự dựng từ trước.
    *   **Implement logic**: Viết code tại Controller, Middleware, Service Repository và đảm bảo các API chạy tuân thủ đúng định nghĩa Contract có trong Tech Spec.

2.  **Viết và Chạy Integration Test (Kiểm thử Tích hợp Đen - Black-box testing)**
    *   **Tài liệu tham khảo bắt buộc**: Đọc kỹ `deploy/deployment_test_guide.md`
    *   **Thư mục Test**: `source/integration_tests/`
    *   **Cách thức hoạt động**:
        *   Sử dụng Docker (`docker-compose.test.yml`) chạy một nền tảng CSDL và Redis riêng dùng dành riêng để chạy Test, ngăn chặn hoàn toàn việc sửa/xoá lầm dữ liệu của hệ thống thật (hoặc môi trường Staging/Dev chung).
        *   Bài test Integration phải viết theo dạng **hộp đen (Black-box)** sử dụng Supertest và Jest, có nghĩa là Test Scripts đóng vai trò như Client. Sẽ gửi các gói tin HTTP (Req) trực tiếp vào Root Endpoints của System và đánh giá Output (Res), chứ **tuyệt đối không mock hay bypass các Service/Function nội bộ** bên dưới.
        *   Tất cả các Cases nằm trong file Test Spec tương ứng phải chạy và Pass 100%. Luôn dọn dẹp Database (Reset db / Flush redis) sau mỗi lần Test xong hoặc trước mỗi Use Case để hoàn trả môi trường sạch sẽ (`beforeAll` / `afterAll`).

---

## 3. Giai đoạn Triển khai UI Frontend (Frontend Implementation)

Giai đoạn xây dựng giao diện UI (ReactJS) chỉ được phép chạy khi toàn bộ BE API và hệ thống Integration Tests đã "xanh" hoàn toàn ở bước 2. Đảm bảo Backend là một cái nền vững vàng, sau này có bug UI thì biết chắc là do JS nằm trên Client-side.

1.  **Tích hợp Service API**: Khai báo các fetchers method trong `source/frontend/src/services/` với cấu hình chuẩn.
2.  **Phát triển UI Component & Logic (React + Ant Design)**:
    *   Tuân thủ nghiêm ngặt cẩm nang `docs/rules/coding_rules.md`.
    *   *(Ví dụ)*: Cách dùng Component `Space.Compact` (Có đơn vị kg, m3, RMB ở cuối các input number), Input phân tách bằng phẩy cho số tiền nghìn/triệu, cơ chế dịch thuật, cách tách Select Dropdown Options ra một mảng tĩnh chứa tại `constants/enums` trước khi render map để dễ tái sử dụng ở Table Filter.
    *   Tái cấu trúc UI theo xu hướng mới: Biến đổi thành dạng Master-Detail chuyên nghiệp (như table con cho product items thay vì dùng row list kéo dài), phân tầng Modal cho các trường tuỳ biến chi tiết (như ProductItemModal)...
3.  **Tối ưu UX tự động (Realtime UX)**:
    *   Lắng nghe Event thay đổi của Input (onValuesChange), tự động re-fetch danh sách mới khi có event Window Focus.
4.  **Kiểm tra Trải nghiệm người dùng (E2E Manual Check)**:
    *   Bật dev server (`npm run dev`), nhập vai thành End-User và trải nghiệm toàn bộ đường đi của Layout/Data, kiểm chứng lại các Auto-calculation fields tự động nhảy số, Auto fetch, các rule disable input...

---

## 4. Giai đoạn Bảo trì & Quản lý Thay đổi (Change Management & Maintaince)

**🌟 Nguyên tắc Tối thượng**: **KHÔNG ĐƯỢC JUMP (NHẢY CÓC) CÁC GIAI ĐOẠN NẾU XẢY RA THAY ĐỔI YÊU CẦU NGHIỆP VỤ**.

*   Mô hình hệ thống của chúng ta là Code sinh ra từ mô tả ngôn ngữ con người chứ không phải là Code sinh Code. Nếu giữa chừng trong tiến trình làm hoặc sau này muốn sửa lại / thêm bớt các logic tính phí, thay đổi flow: **BẮT BUỘC** bạn phải bắt đầu quy trình vòng lặp lại từ đầu.
    `Cập nhật lại file BRD` ➡️ `Cập nhật Tech Spec` ➡️ `Cập nhật Test Spec` ➡️ `Sửa logic Test chạy cho Pass (nếu Fail)` ➡️ `Sửa logic code BE` ➡️ `Làm lại UI Frontend`.
*   Việc _Tiện tay_ nhảy vào sửa ngay Code mà _Quên_ cập nhật sửa đổi đó lên hệ thống Tài liệu (*Tài liệu hết đát - Out of date document*) là nguyên nhân trí mạng hàng đầu dẫn đến sự sụp đổ kiến trúc của một dự án. Việc này khiến luồng suy luận của AI Generated Code hoặc các Engineer Transfer về sau bị gãy mạch, họ sẽ không hiểu logic nghiệp vụ ngầm định dẫn đến Overwrite hoặc tạo ra Big Bugs cho hệ thống mới.

---
*Tài liệu này được định danh làm Rule cho mọi thành viên thuộc hệ sinh thái (bao gồm Software Engineers và quy chuẩn cho mọi Agent AI Dev) nhằm đảm bảo chúng ta làm việc trên một pipeline nhất quán, Test-driven và Architecture-first.*
