# Frontend & General Coding Rules

Tài liệu này tổng hợp các bộ quy tắc lập trình chuẩn dành cho Frontend (React/Ant Design) và các quy tắc hệ thống chung (General).

---

## 1. General Standards (Quy chuẩn chung toàn dự án)
*   **Code Style & Yoda Condition**:
    *   **Yoda Condition (BẮT BUỘC)**: Hằng số/Enum phải nằm bên TRÁI phép so sánh (`if (ROLES.ADMIN === role)`).
    
    *Ví dụ chuẩn:*
    ```javascript
    // DỞ: Dễ bị lỗi gán nhầm (role = ROLES.ADMIN)
    if (role === ROLES.ADMIN) { ... }
    
    // CHUẨN: Báo lỗi ngay khi biên dịch nếu gõ thiếu dấu '='
    if (ROLES.ADMIN === role) { ... }
    ```

---

## 2. Component Structure & Architecture (Kiến trúc Component)
*   **Chia nhỏ Component (Rule N+1)**: 
    *   Không viết file quá 300-400 dòng. Tách các phân vùng UI có form độc lập, state độc lập thành component con.
*   **Sử dụng Form chuẩn Antd (Rule N+2)**:
    *   `Form.useForm()` **phải** khai báo đúng ở component nào gọi `<Form form={form}>`. Khai báo sai cấp sẽ bị lỗi connect.
    *   Dùng `Form.useWatch` thay vì nhồi nhét state (`value`/`onChange`) thủ công vào Input khi cần update UI thời gian thực.
    *   Ưu tiên dùng `setFieldsValue` thay cho `resetFields` trừ khi thực sự muốn reset trắng toàn form.

    *Ví dụ chuẩn dùng Form.useWatch:*
    ```javascript
    const [form] = Form.useForm();
    // Lắng nghe thay đổi của field "amount" mà không cần onValuesChange phức tạp
    const currentAmount = Form.useWatch('amount', form);

    useEffect(() => {
        if (currentAmount > 100) {
            form.setFieldsValue({ discount: 10 }); // Update dynamic field
        }
    }, [currentAmount, form]);
    
    return <Form form={form}><Form.Item name="amount"><InputNumber /></Form.Item></Form>;
    ```

---

## 3. Quản lý Trạng thái & Giao tiếp API
*   **API Calls (BẮT BUỘC axiosInstance)**:
    *   **LUÔN LUÔN** import `axiosInstance` từ `utils/axios` để gọi API. Tuyệt đối không import thư viện `axios` gốc vào Component (ngoại trừ Login page).
*   **Xử lý Lỗi Cơ bản**:
    *   Frontend sẽ nhận Business Error Code (vd: 99001) từ Backend, và **PHẢI** tra cứu Map text Tiếng Việt trong `translation.json` để báo lỗi cho user. 
    *   Văn phong báo lỗi cần trang trọng và chỉ rõ cách giải quyết.

    *Ví dụ chuẩn gọi API và Xử lý Lỗi:*
    ```javascript
    import axiosInstance from '@/utils/axios';
    import { useTranslation } from 'react-i18next';
    import { message } from 'antd';

    const saveData = async (payload) => {
        try {
            await axiosInstance.post('/api/data', payload);
            message.success(t('messages.saveSuccess'));
        } catch (error) {
            // Error đã được interceptor xử lý sơ bộ, nhưng có thể map thêm code
            const errorCode = error.response?.data?.code || 99500;
            message.error(t(`errors.${errorCode}`));
        }
    };
    ```

---

## 4. Đa ngôn ngữ (Localization - I18n)
*   **Quy tắc Không Hardcode (CẤM)**: TUYỆT ĐỐI không gõ text string tĩnh (Tiếng Việt tiếng Anh) vào giao diện. Mọi Title, Label, Placeholder, Message, Table Header đều BẮT BUỘC truyền qua hàm `t('key')`.
*   **Logic dịch ngữ cảnh (Context-Aware)**:
    *   Key dịch nên nhóm theo màn hình/nghiệp vụ: `[feature].[field]` (vd: `employee.status`). 
    *   Dữ liệu Enum trong JS (Status, Role) không được gán text tiếng Việt tĩnh mà phải là giá trị Key, sau này render qua `t()`.
*   **Missing Key Rule**: Bổ sung key ở bản `vi` thì phải có key bản `zh`. Hoàn thiện I18n đầy đủ cho cả 2 ngôn ngữ là "Definition of Done".

    *Ví dụ I18n Component:*
    ```javascript
    // DỞ: Hardcode text
    <Button>Thêm Mới</Button>
    <Input placeholder="Nhập tên..." />

    // CHUẨN: Dùng Trans hooks
    const { t } = useTranslation();
    <Button>{t('common.add_new')}</Button>
    <Input placeholder={t('employee.placeholder_name')} />
    
    // CHUẨN: Render enum
    <Tag>{t(`enums.status.${item.status}`)}</Tag>
    ```

---

## 5. UI/UX & Responsive Design (Quy chuẩn Giao diện)
*   **Responsive Desktop/Mobile**:
    *   Dùng Grid (Col/Row) breakpoint chuẩn. Ở màn hình `md` (Tablet/Mobile), hãy dùng full chiều ngang (24 grid span) đối với các Form Filter hoặc nút Action stack chồng lên nhau.
    *   KHÔNG dùng `px` fix tĩnh cho layout chính.
*   **Bảng Dữ Liệu (Table Standards)**:
    *   **Cột cố định**: Nếu có scroll ngang, dòng đầu (Cột ID/Tên) luôn phải `fixed: left`, dòng cuối (Cột Action) luôn `fixed: right`.
    *   **Nút Action**: Dùng Icon (không text) + Tooltip. Nút Xóa mang màu đỏ (danger).
    *   Hiển thị Tiền tệ: Căn lề phải (`align: right`), chữ màu xanh lá `style={{ color: '#389e0d' }}`, có hậu tố VND hoặc RMB, phân cách hàng nghìn bằng dấu chấm.
    *   Đơn vị đo lường thả trực tiếp vào từng dòng cell, KHÔNG ghi đơn vị ở Header cột.
*   **Form Items**:
    *   Trường Số Học (InputNumber): Input có Đơn vị (kg, m3) phải dùng `<Space.Compact block>` kẹp `Input` xám readonly ở đuôi.
    *   Option/Dropdown (CẤM HARDCODE): Không bao giờ code chay `<Option>`. Cấu hình thành Array Constant ở `enums.js` rồi export thả vòng lặp `.map()`.
    *   Select Filters phải luôn có `showSearch`. Hiển thị (WYSIWYS): Tìm cái gì thì Render dropdown text đủ thông tin phần đó.
*   **Tab vs Scroll (Multi-Section Detail)**:
    *   Nếu Detail Modal có từ 3 nhóm Thông tin (Section) trở lên -> **BẮT BUỘC chia Tabs**. Không để User cuộn mỏi tay.
    *   Active Tab luôn reset về Tab 1 mỗi khi mở Modal.
    *   Validate nếu lỗi nằm vùng Tab đang bị ẩn -> Tự động chuyển Tab về chỗ có lỗi.

---

## 6. Luồng Điều Hướng Liên Đối Tượng (Quick Peek & Actions)
*   **Quick Peek Modal (KHÔNG Navigate Vòng Tròn)**:
    *   Khi đang ở Trang A xem Thông tin Mã Hàng, click link Trang B thì KHÔNG chuyển trang. BẮT BUỘC mở Modal "Quick Peek" hiển thị nhanh dữ liệu B dạng Read-only (Chỉ Xem).
    *   Tuyệt đối tránh vòng lặp Vô nghĩa: Chặn click Link về ngược lại A nếu đang ở trong Modal quick peek B (Bằng cách điều phối Prop `onView...`).
*   **View-first Table Action Pattern**:
    *   100% người dùng truy cập Page -> Có quyền Bấm nút `Mắt` (View) để xem Modal chi tiết ReadOnly.
    *   Cột Action bên ngoài Table KHÔNG có Nút Chỉnh Sửa `[✏]`.
    *   Muốn sửa? Phải mở View Modal lên, nếu có quyền Admin thì Footer của Modal View sẽ có nút "Chỉnh Sửa" -> Switch form sang Edit Mode ngay tại chỗ. Lệnh Xóa thì chỉ Admin thấy Icon ở Cột Table Action ngoài cùng.

    *Ví dụ Action Table View-First:*
    ```javascript
    const columns = [
        //...
        {
            title: t('common.action'),
            key: 'action',
            fixed: 'right', // Cố định cột phải
            render: (_, record) => (
                <Space>
                    {/* Chỉ có View và Delete ở ngoài bảng */}
                    <Tooltip title={t('common.view')}><Button icon={<EyeOutlined />} onClick={() => openViewModal(record)}/></Tooltip>
                    {isAdmin && (
                        <Popconfirm title={t('common.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                            <Tooltip title={t('common.delete')}><Button danger icon={<DeleteOutlined />} /></Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ]
    ```

---

## 7. Image URL — Không tự ghép host

*   **Nguyên tắc bất biến**: Mọi `imageUrl` (hay bất kỳ field URL file nào) nhận từ API đã là **absolute URL** — dùng trực tiếp trong `<img src>` hoặc Ant Design `<Image src>`.
*   **CẤM** tự nối host vào URL ảnh trong FE (ví dụ: `const fullUrl = API_BASE + imageUrl`).
*   BE có trách nhiệm build absolute URL trước khi trả response.

    *Ví dụ chuẩn:*
    ```javascript
    // DỞ: tự ghép host
    <Image src={`${import.meta.env.VITE_API_URL}${record.imageUrl}`} />

    // CHUẨN: dùng trực tiếp
    <Image src={record.imageUrl} />
    ```
