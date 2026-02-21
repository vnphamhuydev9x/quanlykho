# Báo cáo: Sự sai lệch giữa Technical Specs (BRD) và Prisma Schema hiện tại

Sau khi đối chiếu tài liệu Nghiệp vụ (đã được viết thành detail specs: `01_` -> `09_`) với File `source/backend/prisma/schema.prisma`, mình phát hiện ra một số điểm khác biệt. 

Phần lớn là **Code Schema (Prisma) đang thiếu hoặc thiết kế sai lệch** so với yêu cầu chuẩn trong BRD.

Dưới đây là danh sách chi tiết để bạn quyết định xem nên sửa Code hay sửa lại Specs.

---

## 1. Module Quản lý Khách hàng (Customer - Model `User`)
*   **Thiếu trường**:
    *   Trường `companyName` (Tên công ty) không có trong Model `User`. BRD yêu cầu trường này cho Khách hàng.
    *   Trường `zalo` (Zalo) không có trong Model `User`. BRD yêu cầu trường này.
    *   Trường `creditLimit` (Hạn mức công nợ) và `currentDebt` (Công nợ hiện tại) không có trong Model `User`.
*   **Khác biệt logic**: BRD định nghĩa các trường bổ sung ở 1 tab riêng cho Khách hàng, nhưng Prisma đang gộp chung vào bảng `User` (vd: `customerCode`, `address`).

## 2. Module Quản lý Hàng hóa / Mã hàng (Model `ProductCode`)
*   **Thiếu trường**:
    *   `[O] Đơn giá cước vận chuyển TQ_HN (Theo m3)` (`transportRateVolume`) -> Prisma CÓ trường này.
    *   `[M] Phí dỡ hàng (RMB)` (`unloadingFeeRMB`) -> Prisma CÓ trường này.
    *   *Nhìn chung User Model ProductCode đã được Migrate khá sát với 40 trường*. Tuy nhiên, trong Code hiện tại `packageCount` đang là `Int?`, nên cân nhắc có đổi thành `Decimal` giống các trường số lượng khác không.
*   **Trường Legacy thừa**: 
    *   `status` (String?), `packageUnit`, `exchangeRate`, `domesticFeeVN`, `taggedImages`, `invoicePriceXXX`, `totalValueExport`, `importPolicy`, `otherFee`, `otherNotes`, `totalImportCost`, `vatExportStatus`, `partnerName`. => Có thể cần dọn dẹp (Xóa bỏ).

## 3. Module Quản lý Khai báo (Model `Declaration`)
*   **Khác biệt lớn nhất**: Model `Declaration` trong Prisma schema **HIỆN TẠI KHÁC HOÀN TOÀN** với thiết kế 43 cột trong Specs `06_declaration_management.md`.
*   **Chi tiết sự khác biệt**:
    *   Prisma Model `Declaration` đang có 43 trường (từ [A] -> [AQ]), copy gần giống hệt model `ProductCode`.
    *   **TRONG KHI ĐÓ, BRD & Specs KHAI BÁO (06_):** Yêu cầu 43 trường này nhưng TÊN CÁC TRƯỜNG lại khác đôi chút và mục đích là tính toán riêng biệt cho tờ khai. 
    *   *Nhận định:* Model `Declaration` trong Prisma có vẻ như đã được tạo ra từ trước và có chứa các trường `importTaxUSD`, `qualityControlFee`, nhưng thiết kế hiện tại đang lưu `customerCodeInput` thay vì reference trực tiếp. Sẽ cần sync lại Tên Field giữa Prisma và Specs `06_` (Ví dụ trong Spec 06 mình đã map 43 trường cho bạn xem).

## 4. Module Nhập Khẩu Khác / Danh mục (Model `Warehouse`, `Category`)
*   Trạng thái: Khá khớp.
*   `WarehouseStatus`, `CategoryStatus` đang dùng Enum nhưng BRD thiên về việc có thể tạo/sửa/xóa động.

---

## **Câu hỏi dành cho bạn:**

1.  **Về Model `User` (Khách hàng)**: Bạn muốn THÊM các trường còn thiếu (`companyName`, `zalo`, hệ thống công nợ) vào `schema.prisma` hay bỏ các yêu cầu đó trong Specs BRD `02_`?
2.  **Về Model `ProductCode`**: Có nên xóa các trường Legacy (như `invoicePriceXXX`, `packageUnit`, `status` string) để DB sạch sẽ giống Spec 100% không?
3.  **Về Model `Declaration`**: Field list trong DB Prisma đang có một số tên cột khác với tên mình đã map trong file Spec `06_`. Bạn muốn mình cập nhật Prisma hay cập nhật file `06_` theo Data Model bạn đang có sẵn?
