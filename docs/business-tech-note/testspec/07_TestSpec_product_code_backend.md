# Test Spec: Module Quản lý Mã hàng (Product Code) - Backend

> **Mục tiêu**: Đảm bảo Controller, Service và Logic tính toán của Backend hoạt động chính xác theo kiến trúc Master/Detail mới nhất (BRD/TechSpec cập nhật ngày 28/02/2026).
> **Phạm vi test**: Unit/Integration test cho Backend `productCode` module. Đặc biệt tập trung vào Validation, Caching và Auto Calculation. Tài khoản test mặc định có Role là ADMIN.

---

## 1. Test Data Preparation (Dữ liệu chuẩn bị)

Trước khi chạy các test case, cần chuẩn bị sẵn các dữ liệu sau trong test database:
- User (Employee): `id: 1, role: ADMIN` (để gọi API)
- User (Employee - `id: 2`, `role: ADMIN`): dùng làm EmployeeID gán vào mã hàng
- User (Customer - `id: 3`, `role: USER`): dùng làm CustomerID
- MerchandiseCondition (Trạng thái hàng - `id: 4`, `name_vi: 'Nhập kho'`)

---

## 2. Test Scenarios (Kịch bản Test)

### Scenario 1: Validation - Relation Database (Kiểm tra ID liên kết)
- **Mục đích**: BE phải trả về lỗi nếu `employeeId`, `customerId`, `merchandiseConditionId` truyền lên không có thật trong Database.
- **Test Case 1.1**: Tạo mã hàng với `employeeId` không tồn tại (vd: 9999). 
  - **Expect**: HTTP 400 Bad Request, Message `Employee not found`.
- **Test Case 1.2**: Tạo mã hàng với `customerId` không tồn tại.
  - **Expect**: HTTP 400 Bad Request, Message `Customer not found`.
- **Test Case 1.3**: Tạo mã hàng với `merchandiseConditionId` không tồn tại.
  - **Expect**: HTTP 400 Bad Request, Message `Condition not found`.

### Scenario 2: Validation - Enum Hard-coded (Kiểm tra dữ liệu Enum)
- **Mục đích**: Xác nhận trường `packageUnit` của các Detail Items phải nằm trong mảng giá trị cho phép.
- **Test Case 2.1**: Tạo mã hàng với List items có `packageUnit` là giá trị rác (ví dụ: `HU_HONG_NANG`).
  - **Expect**: HTTP 400 Bad Request, Message `Invalid package unit in items`.
- **Test Case 2.2**: Tạo mã hàng với List items chứa giá trị Enum hợp lệ (ví dụ: `CARTON`, `PALLET`).
  - **Expect**: HTTP 201 Created (hoặc 200 OK) nếu các Data khác cũng hợp lệ.

### Scenario 3: Business Logic - Auto Calculation (Kiểm tra tính cước phí) 
- **Mục đích**: Chắc chắn rằng BE tự động tính toán lại `totalTransportFeeEstimate` và ghi đè dữ liệu gửi từ Frontend (tránh việc Frontend hack truyền số bé).
- **Công thức**: Mỗi item có `itemTransportFeeEstimate` = `Math.max(item.weight * item.weightFee, item.volume * item.volumeFee) + (item.domesticFeeTQ + item.haulingFeeTQ + item.unloadingFeeRMB) * exchangeRate`. `totalTransportFeeEstimate` cộng dồn tất cả các item.
- **Test Case 3.1**: Tạo mã hàng có tỷ giá `exchangeRate=3500` và 2 mặt hàng (Item):
  - **Item 1**: Nặng (Weight=10, WeightFee=5000) -> 50.000. Khối (Volume=0.5, VolumeFee=200000) -> 100.000. Cước phụ (RMB): (domestic=10, hauling=5, unloading=5) -> 20 RMB * 3500 = 70.000 VND. -> (itemTransportFeeEstimate = 100.000 + 70.000 = 170.000).
  - **Item 2**: Nặng (Weight=100, WeightFee=5000) -> 500.000. Khối (Volume=1, VolumeFee=200000) -> 200.000. Cước phụ (RMB): 0. -> (itemTransportFeeEstimate = 500.000).
  - Tình huống giả lập: Frontend cố tình gửi `totalTransportFeeEstimate` là 0.
  - **Expect**: DB ghi lại thành công. Giá trị `totalTransportFeeEstimate` được tính trong DB phải là **670.000** (170.000 + 500.000). Giá trị `itemTransportFeeEstimate` lưu tương ứng vào từng item.
- **Test Case 3.2**: Update (PUT) mã hàng ở trên, xóa Item 1 đi, sửa Item 2 lại (Weight=100 -> Weight=10).
  - **Expect**: Giá trị Tổng của Item 2 giờ là Max(50.000, 200.000) = 200.000 => `itemTransportFeeEstimate` là 200.000. DB ghi `totalTransportFeeEstimate` là **200.000**.

### Scenario 4: Master-Detail Database Consistency (Tính toàn vẹn Dữ liệu)
- **Mục đích**: Thao tác CRUD lên Master phải kéo theo sự đồng bộ ở Detail (Item)
- **Test Case 4.1**: Gọi cập nhật PUT API, truyền vào danh sách items hoàn toàn mới (khác với lúc tạo).
  - **Expect**: Item cũ trong DB phải bị thay thế/dọn dẹp bằng Item mới, số lượng items trong Database của riêng `productCodeId` tương ứng bằng độ dài danh sách gửi lên.
- **Test Case 4.2**: Gọi Delete API xóa một Product Code.
  - **Expect**: Product Code master chuyển trạng thái `deletedAt` IS NOT NULL (hoặc bị xoá cứng). Nếu xoá cứng thì Detail chi tiết cũng bị DELETE do `Cascade`.

### Scenario 5: Caching Invalidation (Xóa/Cập nhật Caching)
- **Mục đích**: Xác minh khi Admin thêm/sửa/xóa mã hàng, Redis Cache trả về cho API List và API Detail bị Invalid.
  - **Expect**: Key list trong Redis phải NOT FOUND.

### Scenario 6: Tích hợp Khai báo (Declaration Integration)
- **Mục đích**: Chắc chắn rằng khi một Mã hàng/Mặt hàng được sinh ra, bản ghi Khai báo tương ứng cũng phải xuất hiện.
- **Test Case 6.1**: Tạo mã hàng có 1 mặt hàng.
  - **Expect**: Truy vấn DB thấy 1 `ProductCode`, 1 `ProductItem`. Và phải thấy 1 `Declaration` có `productItemId` trỏ về Item vừa tạo.
- **Test Case 6.2**: Cập nhật Mã hàng (thay đổi danh sách items).
  - **Expect**: Các `Declaration` cũ bị xóa (theo item cũ), và `Declaration` mới được sinh ra cho item mới.
- **Test Case 5.2 (Detail Cache)**:
  - (1) Gọi GET `/api/product-codes/:id` để tạo detail Cache: `product-codes:detail:{id}`.
  - (2) Gọi PUT `/api/product-codes/:id` để edit giá trị. 
  - (3) Lấy từ redis `get('product-codes:detail:{id}')`. 
  - **Expect**: Key phải là NULL để lần GET API sau trả về giá trị từ DataBase mới nhất.
  
---

## 3. Checklist Implementation Testing

- [ ] Đã mock/set up Redis cho testing.
- [ ] Hàm tính `totalTransportFeeEstimate` đang được áp dụng đồng bộ ở 2 endpoints là CREATE và UPDATE.
- [ ] Quá trình UPDATE mảng list items được diễn ra an toàn thông qua Prisma Transaction (Xóa items cũ -> Tạo items mới / Upsert logic).
- [ ] Admin User Role middleware cho API Product Code được test thành công (User có quyền access endpoint, người lạ bị 403 Forbidden).
