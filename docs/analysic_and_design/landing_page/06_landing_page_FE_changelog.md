## Version Code FE-v1.0.4 | Base on SD SD-v1.0.6

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/pages/inquiry/InquiryModal.jsx` | Bug Fix + Tag | Xóa `API_HOST` constant và sửa `src={\`${API_HOST}${inquiry.imageUrl}\`}` → `src={inquiry.imageUrl}` — fix bug double-host (SD §3.5 anti-pattern); bump `@SD_Version SD-v1.0.6` |
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.6` |
| `source/frontend/src/pages/landing/LandingPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.6` |

### I18n
- Không có key mới.

## Version Code FE-v1.0.3 | Base on SD SD-v1.0.5

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/pages/landing/LandingPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.5`; không có logic thay đổi — SD-v1.0.5 chỉ thống nhất BE env var `APP_URL` → `BE_HOST`, không ảnh hưởng FE |
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.5` |

## Version Code FE-v1.0.2 | Base on SD SD-v1.0.4

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/pages/landing/LandingPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.4`; không có logic thay đổi — `imageUrl` từ API đã là absolute URL, FE đang dùng trực tiếp trong `<Image src>` đúng chuẩn |
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Tag | Bump `@SD_Version SD-v1.0.4`; tương tự — cột imageUrl thumbnail dùng `val` trực tiếp, không ghép host |
| `docs/rules/FE_rules.md` | Rule | Thêm §7 "Image URL — Không tự ghép host" — FE không bao giờ prepend API base URL vào imageUrl, dùng trực tiếp từ response |

## Version Code FE-v1.0.1 | Base on SD SD-v1.0.3

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Feature | Bump `@SD_Version SD-v1.0.3`; (1) thêm cột `customerName`, `businessType`, `phoneNumber` (ẩn với CHUNG_TU, sau cột email) — SD §3.10; (2) thêm cột `imageUrl` thumbnail (hiển thị tất cả vai trò, trước cột status) — SD §3.10; import thêm `Image` từ antd |
| `source/frontend/src/pages/landing/LandingPage.jsx` | Feature | Bump `@SD_Version SD-v1.0.3`; cập nhật `SuccessScreen` hiển thị đầy đủ tất cả fields từ response: thêm `customerName`, `businessType`, `phoneNumber`, `imageUrl` (preview) — SD §3.11; import thêm `Image` từ antd |

### I18n
- Không có key mới — `inquiry.image` (`"Ảnh sản phẩm"` / `"产品图片"`) đã tồn tại từ trước.

## Version Code FE-v1.0.0 | Base on SD SD-v1.0.2

**Date**: 2026-03-17

### Files Updated

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `source/frontend/src/pages/landing/LandingPage.jsx` | Tag + Feature | Thêm `@SD_Version SD-v1.0.2`; thêm section "Thông tin liên hệ" với 3 fields mới: `customerName`, `phoneNumber`, `businessType` vào form gửi câu hỏi (SD §2.2 SD-v1.0.2) |
| `source/frontend/src/pages/inquiry/InquiryModal.jsx` | Tag + Fix | Thêm `@SD_Version SD-v1.0.2`; (1) fix bug email display (`!ROLES.CHUNG_TU === userRole` luôn false → đổi sang render nếu có giá trị trong response); (2) thêm display `customerName`, `businessType`, `phoneNumber` — BE tự mask với CHUNG_TU, FE chỉ render nếu field có giá trị (SD §3.3) |
| `source/frontend/src/pages/inquiry/InquiryPage.jsx` | Tag | Thêm `@SD_Version SD-v1.0.2`; các cột table theo SD §3.10 đã đúng |
| `source/frontend/src/services/inquiryService.js` | Tag | Thêm `@SD_Version SD-v1.0.2`; tất cả 6 method API đã khớp SD §2.2 & §2.3 |

### I18n
- Thêm 3 keys mới vào `vi/translation.json` và `zh/translation.json`:
  - `inquiry.customerName`: "Tên khách hàng" / "客户姓名"
  - `inquiry.businessType`: "Ngành nghề kinh doanh" / "行业类型"
  - `inquiry.phoneNumber`: "Số điện thoại" / "电话号码"
