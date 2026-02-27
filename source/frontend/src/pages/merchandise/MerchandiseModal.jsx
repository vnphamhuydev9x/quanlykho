import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, Spin, Upload, DatePicker, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import productCodeService from '../../services/productCodeService';
import customerService from '../../services/customerService';
import warehouseService from '../../services/warehouseService';
import categoryService from '../../services/categoryService';
import declarationService from '../../services/declarationService';
import CustomNumberInput from '../../components/CustomNumberInput';

const { Option } = Select;
import { INFO_SOURCE_OPTIONS } from '../../constants/enums';
// Helper for layout: 3 columns per row
const Col3 = ({ children }) => <Col xs={24} md={8}>{children}</Col>;
const { TextArea } = Input;

const MerchandiseModal = ({ visible, onClose, editingRecord }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [declarations, setDeclarations] = useState([]);

    // Upload
    const [fileList, setFileList] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [taggedFileList, setTaggedFileList] = useState([]);
    const [existingTaggedImages, setExistingTaggedImages] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchDropdownData();
            if (editingRecord) {
                loadEditData();
            } else {
                form.resetFields();
                setFileList([]);
                setExistingImages([]);
                setTaggedFileList([]);
                setExistingTaggedImages([]);
            }
        }
    }, [visible, editingRecord]);

    const fetchDropdownData = async () => {
        setLoading(true);
        try {
            const [customersRes, warehousesRes, categoriesRes, declarationsRes] = await Promise.all([
                customerService.getAll({ page: 1, limit: 1000 }),
                warehouseService.getAll({ page: 1, limit: 1000 }),
                categoryService.getAll({ page: 1, limit: 1000 }),
                declarationService.getAll({ page: 1, limit: 1000 })
            ]);

            setCustomers(customersRes.data?.customers || customersRes.customers || []);
            setWarehouses(warehousesRes.data || warehousesRes || []);
            setCategories(categoriesRes.data?.items || categoriesRes.items || []);
            setDeclarations(declarationsRes.data?.items || declarationsRes.items || []);
        } catch (error) {
            message.error(t('common.loadError') || 'Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const loadEditData = async () => {
        try {
            const response = await productCodeService.getById(editingRecord.id);
            const data = response.data;
            setExistingImages(data.images || []);
            setExistingTaggedImages(data.taggedImages || []);
            form.setFieldsValue({
                ...data,
                entryDate: data.entryDate ? dayjs(data.entryDate) : null,
                customerId: data.customerId,
                warehouseId: data.warehouseId,
                categoryId: data.categoryId,
                declarationId: data.declarationId,
            });
        } catch (error) {
            message.error(t('common.loadError') || 'Lỗi khi tải dữ liệu');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const submitData = {
                ...values,
                entryDate: values.entryDate ? values.entryDate.toISOString() : null,
            };

            let productCodeId;
            if (editingRecord) {
                await productCodeService.update(editingRecord.id, submitData);
                productCodeId = editingRecord.id;
                message.success(t('productCode.updateSuccess') || 'Cập nhật thành công');
            } else {
                const response = await productCodeService.create(submitData);
                productCodeId = response.data.id;
                message.success(t('productCode.createSuccess') || 'Tạo mới thành công');
            }

            // Handle Image Uploads
            if (fileList.length > 0) {
                const filesToUpload = fileList.filter(file => file.originFileObj);
                if (filesToUpload.length > 0) {
                    await productCodeService.uploadImages(productCodeId, filesToUpload.map(f => f.originFileObj));
                }
            }
            if (taggedFileList.length > 0) {
                const filesToUpload = taggedFileList.filter(file => file.originFileObj);
                if (filesToUpload.length > 0) {
                    await productCodeService.uploadImages(productCodeId, filesToUpload.map(f => f.originFileObj), 'taggedImages');
                }
            }

            onClose(true);
        } catch (error) {
            console.error(error);
            message.error(t('common.saveError') || 'Lỗi khi lưu dữ liệu');
        } finally {
            setSubmitting(false);
        }
    };

    const uploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            return isImage ? false : Upload.LIST_IGNORE;
        },
        fileList,
        onChange: ({ fileList: newFileList }) => setFileList(newFileList),
        listType: 'picture-card',
        multiple: true
    };
    const taggedUploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            return isImage ? false : Upload.LIST_IGNORE;
        },
        fileList: taggedFileList,
        onChange: ({ fileList: newFileList }) => setTaggedFileList(newFileList),
        listType: 'picture-card',
        multiple: true
    };


    // Calculation Logic
    const handleValuesChange = (changedValues, allValues) => {
        const updates = {};
        let shouldUpdate = false;

        const getVal = (field) => {
            const val = allValues[field];
            if (typeof val === 'string') return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
            return parseFloat(val) || 0;
        };

        // [P] Tổng cước = Max( [H]*[N], [I]*[O] )
        if (changedValues.weight !== undefined || changedValues.weightFee !== undefined ||
            changedValues.volume !== undefined || changedValues.volumeFee !== undefined) {

            const weight = getVal('weight'); // [H]
            const vol = getVal('volume'); // [I]
            const rateKg = getVal('weightFee'); // [N]
            const rateVol = getVal('volumeFee'); // [O]

            const costByKg = weight * rateKg;
            const costByVol = vol * rateVol;
            const maxCost = Math.max(costByKg, costByVol);

            if (maxCost !== allValues.totalTransportFeeEstimate) {
                updates.totalTransportFeeEstimate = maxCost;
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            form.setFieldsValue(updates);
        }
    };

    return (
        <Modal
            title={editingRecord ? 'Sửa Hàng hóa' : 'Thêm Hàng hóa'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            confirmLoading={submitting}
            width={1200}
            style={{ top: 20 }}
            maskClosable={false}
        >
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
                    {/* System Fields */}
                    <Divider orientation="left" style={{ borderColor: '#d9d9d9', color: '#666', fontSize: '12px' }}>Thông tin Hệ thống</Divider>
                    <Row gutter={16}>
                        <Col3>
                            <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true }]}>
                                <Select showSearch placeholder="Chọn khách hàng" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                                    {customers.map(c => <Option key={c.id} value={c.id}>{`${c.fullName} (${c.username})`}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col3>
                        <Col3>
                            <Form.Item name="warehouseId" label="Kho nhận">
                                <Select showSearch placeholder="Chọn kho">
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col3>
                        <Col3>
                            <Form.Item name="categoryId" label="Loại hàng">
                                <Select showSearch placeholder="Chọn chatbot">
                                    {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col3>
                    </Row>

                    <Divider orientation="left">Thông tin Chi tiết (A-AN)</Divider>
                    <Row gutter={16}>
                        {/* 1. [A] Ngày nhập kho */}
                        <Col3>
                            <Form.Item name="entryDate" label="1. [A] Ngày nhập kho" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col3>
                        {/* 2. [B] NVKD - Derived from Customer */}
                        {/* 3. [C] Mã khách hàng */}
                        <Col3>
                            <Form.Item name="customerCodeInput" label="3. [C] Mã khách hàng">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 4. [D] Tên mặt hàng */}
                        <Col3>
                            <Form.Item name="productName" label="4. [D] Tên mặt hàng">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 5. [E] Mã đơn hàng */}
                        <Col3>
                            <Form.Item name="orderCode" label="5. [E] Mã đơn hàng">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 6. [F] Số Kiện */}
                        <Col3>
                            <Form.Item name="packageCount" label="6. [F] Số Kiện">
                                <CustomNumberInput style={{ width: '100%' }} min={0} isInteger={true} />
                            </Form.Item>
                        </Col3>
                        {/* 7. [G] Đóng gói */}
                        <Col3>
                            <Form.Item name="packing" label="7. [G] Đóng gói">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 8. [H] Trọng lượng */}
                        <Col3>
                            <Form.Item label="8. [H] Trọng lượng (Kg)">
                                                <Space.Compact block>
                                                    <Form.Item name="weight" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 9. [I] Khối lượng */}
                        <Col3>
                            <Form.Item label="9. [I] Khối lượng (m3)">
                                                <Space.Compact block>
                                                    <Form.Item name="volume" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 10. [J] Nguồn cung cấp thông tin */}
                        <Col3>
                            <Form.Item name="infoSource" label="10. [J] Nguồn tin (Kg, m3)">
                                <Select placeholder="Chọn nguồn">
                                    {INFO_SOURCE_OPTIONS.map(opt => (
                                        <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col3>
                        {/* 11. [K] Phí nội địa (RMB) */}
                        <Col3>
                            <Form.Item label="11. [K] Phí nội địa (RMB)">
                                                <Space.Compact block>
                                                    <Form.Item name="domesticFeeRMB" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 12. [L] Phí kéo hàng (RMB) */}
                        <Col3>
                            <Form.Item label="12. [L] Phí kéo hàng (RMB)">
                                                <Space.Compact block>
                                                    <Form.Item name="haulingFeeRMB" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 13. [M] Phí dỡ hàng (RMB) */}
                        <Col3>
                            <Form.Item label="13. [M] Phí dỡ hàng (RMB)">
                                                <Space.Compact block>
                                                    <Form.Item name="unloadingFeeRMB" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 14. [N] Đơn giá cước TQ_HN (Kg) */}
                        <Col3>
                            <Form.Item name="weightFee" label="14. [N] Cước TQ_HN (Kg)">
                                <CustomNumberInput style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col3>
                        {/* 15. [O] Đơn giá cước TQ_HN (m3) */}
                        <Col3>
                            <Form.Item name="volumeFee" label="15. [O] Cước TQ_HN (m3)">
                                <CustomNumberInput style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col3>
                        {/* 16. [P] Tổng cước TQ_HN tạm tính */}
                        <Col3>
                            <Form.Item label="16. [P] Tổng cước TQ_HN">
                                                <Space.Compact block>
                                                    <Form.Item name="totalTransportFeeEstimate" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} disabled className="bg-gray-100" />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 17. [Q] Ghi chú */}
                        <Col3>
                            <Form.Item name="notes" label="17. [Q] Ghi chú">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 18. [R] Ảnh hàng hóa 1 */}
                        <Col xs={24}>
                            <Form.Item label="18. [R] Ảnh hàng hóa">
                                <Upload
                                    {...uploadProps}
                                    maxCount={3 - existingImages.length}
                                >
                                    {fileList.length + existingImages.length < 3 && (
                                        <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>
                                    )}
                                </Upload>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    {existingImages.map((img, idx) => (
                                        <img key={idx} src={`${import.meta.env.VITE_API_URL}${img}`} alt="existing" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                    ))}
                                </div>
                            </Form.Item>
                        </Col>
                        {/* 20. [T] Tem chính */}
                        <Col3>
                            <Form.Item name="mainTag" label="20. [T] Tem chính">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 21. [U] Tem phụ */}
                        <Col3>
                            <Form.Item name="subTag" label="21. [U] Tem phụ">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 22. [V] Xác nhận PCT */}
                        <Col3>
                            <Form.Item name="pctConfirmation" label="22. [V] Xác nhận PCT">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 23. [W] SL SP */}
                        <Col3>
                            <Form.Item name="productQuantity" label="23. [W] SL Sản phẩm">
                                <CustomNumberInput style={{ width: '100%' }} min={0} isInteger={true} />
                            </Form.Item>
                        </Col3>
                        {/* 24. [X] Quy cách */}
                        <Col3>
                            <Form.Item name="specification" label="24. [X] Quy cách">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 25. [Y] Mô tả */}
                        <Col3>
                            <Form.Item name="productDescription" label="25. [Y] Mô tả">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 26. [Z] Nhãn hiệu */}
                        <Col3>
                            <Form.Item name="brand" label="26. [Z] Nhãn hiệu">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 27. [AA] MST */}
                        <Col3>
                            <Form.Item name="supplierTaxCode" label="27. [AA] MST Người bán">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 28. [AB] Tên Cty */}
                        <Col3>
                            <Form.Item name="supplierName" label="28. [AB] Tên Cty Bán">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 29. [AC] Nhu cầu KB */}
                        <Col3>
                            <Form.Item name="declarationNeed" label="29. [AC] Nhu cầu KB">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 30. [AD] Chính sách KB */}
                        <Col3>
                            <Form.Item name="declarationPolicy" label="30. [AD] Chính sách KB">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 31. [AE] SL Khai báo */}
                        <Col3>
                            <Form.Item name="declarationQuantity" label="31. [AE] SL Khai báo">
                                <CustomNumberInput style={{ width: '100%' }} min={0} isInteger={true} />
                            </Form.Item>
                        </Col3>
                        {/* 32. [AF] Giá xuất hóa đơn */}
                        <Col3>
                            <Form.Item label="32. [AF] Giá xuất HĐ">
                                                <Space.Compact block>
                                                    <Form.Item name="invoicePriceExport" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 33. [AG] Giá khai báo */}
                        <Col3>
                            <Form.Item label="33. [AG] Giá khai báo">
                                                <Space.Compact block>
                                                    <Form.Item name="declarationPrice" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 34. [AH] Phí ủy thác */}
                        <Col3>
                            <Form.Item label="34. [AH] Phí ủy thác">
                                                <Space.Compact block>
                                                    <Form.Item name="trustFee" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 35. [AI] Tên khai báo */}
                        <Col3>
                            <Form.Item name="declarationName" label="35. [AI] Tên khai báo">
                                <Input />
                            </Form.Item>
                        </Col3>
                        {/* 36. [AJ] Phí phải nộp */}
                        <Col3>
                            <Form.Item label="36. [AJ] Phí phải nộp">
                                                <Space.Compact block>
                                                    <Form.Item name="feeAmount" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 37. [AK] Thuế NK phải nộp */}
                        <Col3>
                            <Form.Item label="37. [AK] Thuế NK">
                                                <Space.Compact block>
                                                    <Form.Item name="importTax" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 38. [AL] Thuế VAT NK */}
                        <Col3>
                            <Form.Item label="38. [AL] Thuế VAT NK">
                                                <Space.Compact block>
                                                    <Form.Item name="vatImportTax" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 39. [AM] Phí mua hàng */}
                        <Col3>
                            <Form.Item label="39. [AM] Phí mua hàng">
                                                <Space.Compact block>
                                                    <Form.Item name="purchaseFee" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        </Col3>
                        {/* 40. [AN] Xác nhận PKT */}
                        <Col3>
                            <Form.Item name="accountingConfirmation" label="40. [AN] Xác nhận PKT">
                                <Input />
                            </Form.Item>
                        </Col3>
                    </Row>
                </Form>
            </Spin>
        </Modal>
    );
};

export default MerchandiseModal;
