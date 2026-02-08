import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, Spin, Upload, DatePicker, Divider, Space, Tooltip, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axios';
import { formatFloat } from '../../utils/format';
import dayjs from 'dayjs';
import productCodeService from '../../services/productCodeService';

import CustomNumberInput from '../../components/CustomNumberInput';

const { Option } = Select;
const { TextArea } = Input;

// Helper for layout: 3 columns per row
const Col3 = ({ children }) => <Col xs={24} md={8}>{children}</Col>;
const Col2 = ({ children }) => <Col xs={24} md={12}>{children}</Col>;

const ProductCodeModal = ({ visible, onClose, editingRecord }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Dropdown data


    // Upload
    const [fileList, setFileList] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [taggedFileList, setTaggedFileList] = useState([]);
    const [existingTaggedImages, setExistingTaggedImages] = useState([]);

    // Total amount for display
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (visible) {
            if (editingRecord) {
                loadEditData();
            } else {
                form.resetFields();
                setFileList([]);
                setExistingImages([]);
                setTaggedFileList([]);
                setExistingTaggedImages([]);
                setTotalAmount(0); // Reset total amount
            }
        }
    }, [visible, editingRecord]);



    const loadEditData = async () => {
        try {
            const response = await productCodeService.getById(editingRecord.id);
            const data = response.data;
            setExistingImages(data.images || []);
            setExistingTaggedImages(data.taggedImages || []);
            form.setFieldsValue({
                ...data,
                entryDate: data.entryDate ? dayjs(data.entryDate) : null,
            });
            setTotalAmount(data.totalImportCost || 0); // Set total amount on load
        } catch (error) {
            message.error(t('common.loadError'));
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const submitData = {
                ...values,
                entryDate: values.entryDate ? values.entryDate.toISOString() : null,
                // Nested structures are preserved if backend needs them, but UI is flat
            };

            let productCodeId;
            if (editingRecord) {
                await productCodeService.update(editingRecord.id, submitData);
                productCodeId = editingRecord.id;
                message.success(t('productCode.updateSuccess'));
            } else {
                const response = await productCodeService.create(submitData);
                productCodeId = response.data.id;
                message.success(t('productCode.createSuccess'));
            }

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
            if (error.errorFields) {
                message.error(t('common.validationError'));
            } else if (error.response && error.response.data && error.response.data.message) {
                message.error(error.response.data.message);
            } else {
                message.error(t('common.saveError'));
            }
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


    // Calculation logic
    const handleValuesChange = (changedValues, allValues) => {
        const updates = {};
        let shouldUpdate = false;

        // Extract values (parse as float for safety)
        const getVal = (field) => {
            const val = allValues[field];
            if (typeof val === 'string') {
                if (val.includes(',')) return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
                const dotCount = (val.match(/\./g) || []).length;
                if (dotCount > 1) return parseFloat(val.replace(/\./g, '')) || 0;
                return parseFloat(val) || 0;
            }
            return parseFloat(val) || 0;
        };

        // 1. [M] Total Transport Fee TQ_HN = Max( [L] transportRate * [G] weight, [L1] transportRateVolume * [H] volume )
        // 1. [M] Total Transport Fee TQ_HN = [L] transportRate * [H] volume
        // Formula in spec: =L2*H2
        const transportRate = getVal('transportRate'); // [L]
        const volume = getVal('volume'); // [H]

        const val_M = transportRate * volume;

        if (allValues.totalTransportFeeEstimate !== val_M) {
            updates.totalTransportFeeEstimate = val_M;
            shouldUpdate = true;
        }

        // 2. [AE] Total Value Export = [AD] Invoice Price * [AC] Declaration Quantity
        // Re-enabling [AD] for input is necessary for this chain.
        const invoicePriceExport = getVal('invoicePriceExport'); // [AD]
        const declarationQuantity = getVal('declarationQuantity'); // [AC]
        const val_AE = invoicePriceExport * declarationQuantity;

        if (allValues.totalValueExport !== val_AE) {
            updates.totalValueExport = val_AE;
            shouldUpdate = true;
        }

        // 3. [AI] VAT Import Tax = [AE] * 8%
        const val_AI = val_AE * 0.08;
        if (allValues.vatImportTax !== val_AI) {
            updates.vatImportTax = val_AI;
            shouldUpdate = true;
        }

        // 4. [AK] Trust Fee = [AE] * 1%
        const val_AK = val_AE * 0.01;
        if (allValues.trustFee !== val_AK) {
            updates.trustFee = val_AK;
            shouldUpdate = true;
        }

        // 5. [AL] Total Import Cost = [AJ] + [AI] + [AG] + [N] + [M] + [AK] + (([I] + [J]) * [K])
        const importTax = getVal('importTax'); // [AJ]
        const otherFee = getVal('otherFee'); // [AG]
        const domesticFeeVN = getVal('domesticFeeVN'); // [N]
        const domesticFeeTQ = getVal('domesticFeeTQ'); // [I]
        const haulingFeeTQ = getVal('haulingFeeTQ'); // [J]
        const exchangeRate = getVal('exchangeRate'); // [K]

        const val_CostTQ_VND = (domesticFeeTQ + haulingFeeTQ) * exchangeRate;
        const val_AL = importTax + val_AI + otherFee + domesticFeeVN + val_M + val_AK + val_CostTQ_VND;

        if (allValues.totalImportCost !== val_AL) {
            updates.totalImportCost = val_AL;
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            form.setFieldsValue(updates);
            setTotalAmount(val_AL); // Update total amount state
        }
    };

    return (
        <Modal
            title={editingRecord ? t('productCode.edit') : t('productCode.add')}
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



                    {/* EXCEL ORDER FIELDS A -> AM */}
                    <Tabs
                        defaultActiveKey="1"
                        items={[
                            {
                                key: '1',
                                label: 'Thông tin chung',
                                children: (
                                    <Row gutter={16}>
                                        {/* 1. [A] Ngày nhập kho */}
                                        <Col3>
                                            <Form.Item name="entryDate" label={t('productCode.entryDate')} rules={[{ required: true, message: t('productCode.entryDateRequired') }]}>
                                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 2. [B] Mã khách hàng */}
                                        <Col3>
                                            <Form.Item name="customerCodeInput" label={t('productCode.customerCode')} rules={[{ required: true, message: t('productCode.customerCodeRequired') }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 3. [C] Mã đơn hàng */}
                                        <Col3>
                                            <Form.Item name="orderCode" label={t('productCode.orderCode')} rules={[{ required: true, message: t('productCode.orderCodeRequired') }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 4. [D] Tên mặt hàng */}
                                        <Col3>
                                            <Form.Item name="productName" label={t('productCode.productNameLabel')} rules={[{ required: true, message: t('productCode.productNameRequired') }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 5. [E] Số Kiện */}
                                        <Col3>
                                            <Form.Item name="packageCount" label={t('productCode.packageCount')} rules={[{ required: true, message: t('productCode.packageCountRequired') }]}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    isInteger={true}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 6. [F] Đơn vị kiện */}
                                        <Col3>
                                            <Form.Item name="packageUnit" label={t('productCode.packageUnit')} rules={[{ required: true, message: t('productCode.packageUnitRequired') }]}>
                                                <Select placeholder={t('productCode.selectUnit')}>
                                                    <Option value="Thùng cotton">Thùng cotton</Option>
                                                    <Option value="Pallet">Pallet</Option>
                                                    <Option value="Chiếc">Chiếc</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col3>

                                        {/* 7. [G] Trọng lượng */}
                                        <Col3>
                                            <Form.Item name="weight" label={t('productCode.weight')} rules={[{ required: true, message: t('productCode.weightRequired') }]}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 8. [H] Khối lượng */}
                                        <Col3>
                                            <Form.Item name="volume" label={t('productCode.volume')} rules={[{ required: true, message: t('productCode.volumeRequired') }]}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 9. [I] Phí nội địa TQ */}
                                        <Col3>
                                            <Form.Item name="domesticFeeTQ" label={t('productCode.domesticFeeTQ')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 10. [J] Phí kéo hàng TQ */}
                                        <Col3>
                                            <Form.Item name="haulingFeeTQ" label={t('productCode.haulingFeeTQ')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 11. [K] Tỷ giá */}
                                        <Col3>
                                            <Form.Item name="exchangeRate" label={t('productCode.exchangeRateLabel')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 12. [L] Đơn giá cước TQ_HN */}
                                        <Col3>
                                            <Form.Item label={t('productCode.transportRate')}>
                                                <Form.Item name="transportRate" noStyle rules={[{ required: true, message: t('productCode.transportRateRequired') }]}>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        min={0}
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>



                                        {/* 13. [M] Tổng cước TQ_HN */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.totalTransportFeeEstimate')}
                                                        <Tooltip title="Tổng cước TQ_HN = Đơn giá cước TQ_HN [L] * Khối lượng [H]">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="totalTransportFeeEstimate" noStyle>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 14. [N] Phí nội địa VN */}
                                        <Col3>
                                            <Form.Item name="domesticFeeVN" label={t('productCode.domesticFeeVN')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 15. [O] Ghi chú */}
                                        <Col3>
                                            <Form.Item name="notes" label={t('productCode.notesLabel')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 16. [P] Tình trạng hàng hoá */}
                                        <Col3>
                                            <Form.Item name="status" label={t('productCode.statusLabel')}>
                                                <Select placeholder={t('productCode.selectStatus')}>
                                                    <Option value="Kho TQ">{t('productCode.statusNhapKhoTQ')}</Option>
                                                    <Option value="Đã xếp xe">{t('productCode.statusDaXepXe')}</Option>
                                                    <Option value="Kho VN">{t('productCode.statusNhapKhoVN')}</Option>
                                                    <Option value="Kiểm hoá">{t('productCode.statusKiemHoa')}</Option>
                                                    <Option value="Đã giao, chưa thanh toán">{t('productCode.statusGiaoChuaThanhToan')}</Option>
                                                    <Option value="đã giao, đã thanh toán">{t('productCode.statusGiaoDaThanhToan')}</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col3>
                                    </Row>
                                ),
                            },
                            {
                                key: '2',
                                label: 'Thông tin hàng hóa',
                                children: (
                                    <Row gutter={16}>
                                        {/* 17. [Q] Ảnh hàng hóa - Upload */}
                                        <Col xs={24}>
                                            <Form.Item label={t('productCode.productImage')}>
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
                                                        <img key={idx} src={`${import.meta.env.VITE_API_URL}${img} `} alt="existing" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                                    ))}
                                                </div>
                                            </Form.Item>
                                        </Col>

                                        {/* 18. [S] Tem chính */}
                                        <Col3>
                                            <Form.Item name="mainTag" label={t('productCode.mainTag')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 19. [T] Tem phụ */}
                                        <Col3>
                                            <Form.Item name="subTag" label={t('productCode.subTag')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 20. [U] Ảnh hàng dán tem */}
                                        <Col xs={24}>
                                            <Form.Item label={t('productCode.taggedImage')}>
                                                <Upload
                                                    {...taggedUploadProps}
                                                    maxCount={3 - existingTaggedImages.length}
                                                >
                                                    {taggedFileList.length + existingTaggedImages.length < 3 && (
                                                        <div><PlusOutlined /><div style={{ marginTop: 8 }}>{t('common.add')}</div></div>
                                                    )}
                                                </Upload>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    {existingTaggedImages.map((img, idx) => (
                                                        <img key={idx} src={`${import.meta.env.VITE_API_URL}${img} `} alt="existing" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                                    ))}
                                                </div>
                                            </Form.Item>
                                        </Col>

                                        {/* 21. [V] Số Lượng sản phẩm */}
                                        <Col3>
                                            <Form.Item name="productQuantity" label={t('productCode.productQuantity')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 22. [W] Quy cách */}
                                        <Col3>
                                            <Form.Item name="specification" label={t('productCode.specification')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 23. [X] Mô Tả sản phẩm */}
                                        <Col3>
                                            <Form.Item name="productDescription" label={t('productCode.productDescription')}>
                                                <TextArea rows={4} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 24. [Y] Nhãn Hiệu */}
                                        <Col3>
                                            <Form.Item name="brand" label={t('productCode.brand')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 25. [Z] Mã Số Thuế */}
                                        <Col3>
                                            <Form.Item name="supplierTaxCode" label={t('productCode.supplierTaxCode')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 26. [AA] Tên Công Ty bán hàng */}
                                        <Col3>
                                            <Form.Item name="supplierName" label={t('productCode.supplierName')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>
                                    </Row>
                                ),
                            },
                            {
                                key: '3',
                                label: 'Thông tin khai báo',
                                children: (
                                    <Row gutter={16}>
                                        {/* 27. [AB] Nhu cầu khai báo */}
                                        <Col3>
                                            <Form.Item name="declarationNeed" label={t('productCode.declarationNeed')}>
                                                <TextArea rows={4} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 28. [AC] Số lượng khai báo */}
                                        <Col3>
                                            <Form.Item name="declarationQuantity" label={t('productCode.declarationQuantity')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 29. [AD] Giá xuất hoá đơn */}
                                        <Col3>
                                            <Form.Item name="invoicePriceExport" label={t('productCode.invoicePriceExport')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>


                                        {/* 30. [AE] Tổng giá trị lô hàng */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.totalValueExport')}
                                                        <Tooltip title="Tổng giá trị = Giá xuất hoá đơn [AD] * Số lượng khai báo [AC]">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="totalValueExport" noStyle>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 31. [AF] Chính sách NK */}
                                        <Col3>
                                            <Form.Item name="importPolicy" label={t('productCode.importPolicy')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 32. [AG] Phí phải nộp */}
                                        <Col3>
                                            <Form.Item name="otherFee" label={t('productCode.otherFeeLabel')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 33. [AH] Ghi chú */}
                                        <Col3>
                                            <Form.Item name="otherNotes" label={t('productCode.otherNotes')}>
                                                <Input />
                                            </Form.Item>
                                        </Col3>

                                        {/* 34. [AI] Thuế VAT nhập khẩu */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.vatImportTax')}
                                                        <Tooltip title="Thuế VAT NK = Tổng giá trị [AE] * 8%">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="vatImportTax" noStyle>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 35. [AJ] Thuế NK phải nộp */}
                                        <Col3>
                                            <Form.Item name="importTax" label={t('productCode.importTaxLabel')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 36. [AK] Phí uỷ thác */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.trustFee')}
                                                        <Tooltip title="Phí uỷ thác = Tổng giá trị [AE] * 1%">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="trustFee" noStyle>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 37. [AL] Tổng chi phí nhập khẩu */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.totalImportCost')}
                                                        <Tooltip title="Tổng chi phí = Thuế NK [AJ] + VAT NK [AI] + Phí nộp [AG] + Phí nội VN [N] + Cước TQ_HN [M] + Phí uỷ thác [AK] + (([I] + [J]) * [K])">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="totalImportCost" noStyle>
                                                    <CustomNumberInput
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 38. [AM] Tình trạng xuất VAT */}
                                        <Col3>
                                            <Form.Item name="vatExportStatus" label={t('productCode.vatExportStatus')}>
                                                <Select placeholder={t('productCode.selectStatus')}>
                                                    <Option value="Chưa xuất VAT">{t('productCode.vatChuaXuat')}</Option>
                                                    <Option value="đã xuất VAT , chưa đóng gói hs">{t('productCode.vatDaXuatChuaDongGoi')}</Option>
                                                    <Option value="đã xuất VAT. đã đóng gói hồ sơ">{t('productCode.vatDaXuatDaDongGoi')}</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col3>
                                    </Row>
                                ),
                            },
                        ]}
                    />
                </Form>
            </Spin>
            <Divider />
            <h3 style={{ textAlign: 'right', color: '#1890ff' }}>{t('productCode.total')}: {formatFloat(totalAmount)}</h3>
        </Modal>
    );
};

export default ProductCodeModal;
