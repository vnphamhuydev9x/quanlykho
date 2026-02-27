import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, Spin, Upload, DatePicker, Divider, Space, Tooltip, Tabs, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axios';
import { formatFloat } from '../../utils/format';
import dayjs from 'dayjs';
import productCodeService from '../../services/productCodeService';
import customerService from '../../services/customerService';
import merchandiseConditionService from '../../services/merchandiseConditionService';

import CustomNumberInput from '../../components/CustomNumberInput';
import { PACKAGE_UNIT_OPTIONS, VAT_STATUS_OPTIONS, PRODUCT_STATUS, LOADING_STATUS_OPTIONS } from '../../constants/enums';

const { Option } = Select;
const { TextArea } = Input;
import { ReloadOutlined } from '@ant-design/icons';

// Helper for layout: 3 columns per row
const Col3 = ({ children }) => <Col xs={24} md={8}>{children}</Col>;
const Col2 = ({ children }) => <Col xs={24} md={12}>{children}</Col>;

const ProductCodeModal = ({ visible, onClose, editingRecord, viewOnly, userType }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [customers, setCustomers] = useState([]);
    const [conditions, setConditions] = useState([]);

    // Parse user on init
    const [currentUser] = useState(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                return JSON.parse(atob(token.split('.')[1]));
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    // Dropdown data

    useEffect(() => {
        if (currentUser && currentUser.type !== 'CUSTOMER') {
            fetchCustomers();
            fetchConditions();
        }
    }, [currentUser]);

    const fetchCustomers = async () => {
        try {
            const response = await customerService.getAll({ limit: 0 }); // Fetch all
            setCustomers(response.data.customers || []);
        } catch (error) {
            console.error("Failed to fetch customers");
        }
    };

    const fetchConditions = async () => {
        try {
            const response = await merchandiseConditionService.getAll({ limit: 0 });
            setConditions(response.data.items || []);
        } catch (error) {
            console.error("Failed to fetch conditions");
        }
    };

    // Auto-refresh when user returns to this tab
    useEffect(() => {
        const handleFocus = () => {
            if (visible && currentUser && currentUser.type !== 'CUSTOMER') {
                fetchCustomers();
                fetchConditions();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [visible, currentUser]);

    // Upload


    // Upload
    const [fileList, setFileList] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [taggedFileList, setTaggedFileList] = useState([]);
    const [existingTaggedImages, setExistingTaggedImages] = useState([]);

    // Total amount for display
    const [totalAmount, setTotalAmount] = useState(0);

    const disabledGeneral = viewOnly || (userType === 'CUSTOMER');

    useEffect(() => {
        if (visible) {
            if (editingRecord) {
                loadEditData();
            } else {
                form.resetFields();
                form.setFieldsValue({ entryDate: dayjs() });
                setFileList([]);
                setExistingImages([]);
                setTaggedFileList([]);
                setExistingTaggedImages([]);
                setExistingTaggedImages([]);
                setTotalAmount(0); // Reset total amount
                setActiveTab('1');
                if (currentUser && currentUser.type === 'CUSTOMER') {
                    form.setFieldsValue({
                        customerCodeInput: currentUser.username,
                        customerId: currentUser.userId
                    });
                }
            }
        }
    }, [visible, editingRecord, currentUser]);



    const loadEditData = async () => {
        try {
            const response = await productCodeService.getById(editingRecord.id);
            const data = response.data;
            setExistingImages(data.images || []);
            setExistingTaggedImages(data.taggedImages || []);
            form.setFieldsValue({
                ...data,
                entryDate: data.entryDate ? dayjs(data.entryDate) : null,
                domesticFeeRMB: data.domesticFeeRMB || data.domesticFeeTQ,
                haulingFeeRMB: data.haulingFeeRMB || data.haulingFeeTQ,
                packing: data.packing || data.packageUnit,
                declarationPolicy: data.declarationPolicy || data.importPolicy,
                feeAmount: data.feeAmount || data.otherFee,
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
        multiple: true,
        disabled: disabledGeneral
    };

    const taggedUploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            return isImage ? false : Upload.LIST_IGNORE;
        },
        fileList: taggedFileList,
        onChange: ({ fileList: newFileList }) => setTaggedFileList(newFileList),
        listType: 'picture-card',
        multiple: true,
        disabled: disabledGeneral
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

        // 1. [M] Total Transport Fee TQ_HN = Max( [L1] volumeFee * [H] volume, [L2] weightFee * [G] weight )
        const weightFee = getVal('weightFee'); // [L2]
        const volumeFee = getVal('volumeFee'); // [L1]
        const volume = getVal('volume'); // [H]
        const weight = getVal('weight'); // [G]

        const val_M = Math.max(weightFee * weight, volumeFee * volume) || 0;

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
        const vatPercent = getVal('vatPercent'); // [AF1]
        const importTaxPercent = getVal('importTaxPercent'); // [AF2]
        const val_AI = (val_AE * vatPercent) / 100;
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
        const val_AJ = (val_AE * importTaxPercent) / 100;
        if (allValues.importTax !== val_AJ) {
            updates.importTax = val_AJ;
            shouldUpdate = true;
        }
        // importTax is now val_AJ, no need to getVal
        const feeAmount = getVal('feeAmount'); // [AG]
        const domesticFeeVN = getVal('domesticFeeVN'); // [N]
        const domesticFeeRMB = getVal('domesticFeeRMB'); // [I]
        const haulingFeeRMB = getVal('haulingFeeRMB'); // [J]
        const exchangeRate = getVal('exchangeRate'); // [K]

        const val_CostTQ_VND = (domesticFeeRMB + haulingFeeRMB) * exchangeRate;
        const val_AL = val_AJ + val_AI + feeAmount + domesticFeeVN + val_M + val_AK + val_CostTQ_VND;

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
            footer={[
                <Button key="back" onClick={() => onClose()}>
                    {t('common.cancel')}
                </Button>,
                activeTab !== '1' && (
                    <Button key="prev" onClick={() => setActiveTab(String(parseInt(activeTab) - 1))}>
                        {t('common.prev')}
                    </Button>
                ),
                activeTab !== '3' && (
                    <Button key="next" type="primary" ghost onClick={() => setActiveTab(String(parseInt(activeTab) + 1))}>
                        {t('common.next')}
                    </Button>
                ),
                !viewOnly && (
                    <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
                        {t('common.save')}
                    </Button>
                )
            ]}
        >
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" onValuesChange={handleValuesChange} disabled={viewOnly}>



                    {/* EXCEL ORDER FIELDS A -> AM */}
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            {
                                key: '1',
                                label: t('productCode.tabGeneral'),
                                children: (
                                    <Row gutter={16}>
                                        {/* 1. [A] Ngày nhập kho */}
                                        <Col3>
                                            <Form.Item name="entryDate" label={t('productCode.entryDate')} rules={[{ required: true, message: t('productCode.entryDateRequired') }]}>
                                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 2. [B] Mã khách hàng */}
                                        <Col3>
                                            <Form.Item name="customerId" hidden><Input /></Form.Item>
                                            <Form.Item name="customerCodeInput" label={
                                                <Space>
                                                    {t('productCode.customerCode')}
                                                    {currentUser && currentUser.type !== 'CUSTOMER' && (
                                                        <Tooltip title={t('common.reload')}>
                                                            <ReloadOutlined
                                                                style={{ cursor: 'pointer', color: '#1890ff' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fetchCustomers();
                                                                    message.success(t('common.reloaded'));
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Space>
                                            } rules={[{ required: true, message: t('productCode.customerCodeRequired') }]}>
                                                {currentUser && currentUser.type === 'CUSTOMER' ? (
                                                    <Input disabled />
                                                ) : (
                                                    <Select
                                                        showSearch
                                                        placeholder={t('productCode.selectCustomer')}
                                                        optionFilterProp="children"
                                                        filterOption={(input, option) =>
                                                            (option?.labelProp ?? '').toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        onSelect={(value) => {
                                                            if (value === 'ADD_NEW_CUSTOMER') {
                                                                window.open('/customers?action=add', '_blank');
                                                                // Immediately reset the field to previous value or undefined
                                                                // to prevent it from appearing in the input
                                                                setTimeout(() => {
                                                                    form.setFieldsValue({ customerCodeInput: undefined });
                                                                }, 0);
                                                                return;
                                                            }
                                                            const cust = customers.find(c => c.username === value);
                                                            if (cust) {
                                                                form.setFieldsValue({ customerId: cust.id });
                                                            } else {
                                                                form.setFieldsValue({ customerId: null });
                                                            }
                                                        }}
                                                        options={[
                                                            {
                                                                value: 'ADD_NEW_CUSTOMER',
                                                                label: (
                                                                    <div style={{ color: '#1890ff', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px' }}>
                                                                        <PlusOutlined /> {t('productCode.addNewCustomer')}
                                                                    </div>
                                                                ),
                                                                labelProp: t('productCode.addNewCustomer') // For filtering
                                                            },
                                                            ...customers.map(c => ({
                                                                value: c.username,
                                                                label: `${c.username} - ${c.fullName}`,
                                                                labelProp: `${c.username} ${c.fullName}`
                                                            }))
                                                        ]}
                                                    />
                                                )}
                                            </Form.Item>
                                        </Col3>

                                        {/* 3. [C] Mã đơn hàng */}
                                        <Col3>
                                            <Form.Item name="orderCode" label={t('productCode.orderCode')} rules={[{ required: true, message: t('productCode.orderCodeRequired') }]}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 4. [D] Tên mặt hàng */}
                                        <Col3>
                                            <Form.Item name="productName" label={t('productCode.productNameLabel')} rules={[{ required: true, message: t('productCode.productNameRequired') }]}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 5. [E] Số Kiện */}
                                        <Col3>
                                            <Form.Item name="packageCount" label={t('productCode.packageCount')} rules={[{ required: true, message: t('productCode.packageCountRequired') }]}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    isInteger={true}
                                                    disabled={disabledGeneral}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 6. [F] Đơn vị kiện */}
                                        <Col3>
                                            <Form.Item name="packing" label={t('productCode.packageUnit')} rules={[{ required: true, message: t('productCode.packageUnitRequired') }]}>
                                                <Select placeholder={t('productCode.selectUnit')} disabled={disabledGeneral}>
                                                    {PACKAGE_UNIT_OPTIONS.map(opt => (
                                                        <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col3>

                                        {/* 7. [G] Trọng lượng */}
                                        <Col3>
                                            <Form.Item label={t('productCode.weight')} rules={[{ required: true, message: t('productCode.weightRequired') }]}>
                                                <Space.Compact block>
                                                    <Form.Item name="weight" noStyle rules={[{ required: true, message: t('productCode.weightRequired') }]}>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 40px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 8. [H] Khối lượng */}
                                        <Col3>
                                            <Form.Item label={t('productCode.volume')} rules={[{ required: true, message: t('productCode.volumeRequired') }]}>
                                                <Space.Compact block>
                                                    <Form.Item name="volume" noStyle rules={[{ required: true, message: t('productCode.volumeRequired') }]}>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 40px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 9. [I] Phí nội địa TQ */}
                                        <Col3>
                                            <Form.Item label={t('productCode.domesticFeeTQ')}>
                                                <Space.Compact block>
                                                    <Form.Item name="domesticFeeRMB" noStyle>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 10. [J] Phí kéo hàng TQ */}
                                        <Col3>
                                            <Form.Item label={t('productCode.haulingFeeTQ')}>
                                                <Space.Compact block>
                                                    <Form.Item name="haulingFeeRMB" noStyle>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 11. [K] Tỷ giá */}
                                        <Col3>
                                            <Form.Item name="exchangeRate" label={t('productCode.exchangeRateLabel')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    disabled={disabledGeneral}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 12. [L1] Đơn giá cước TQ_HN (khối) */}
                                        <Col3>
                                            <Form.Item label={t('productCode.volumeFee')}>
                                                <Space.Compact block>
                                                    <Form.Item name="volumeFee" noStyle rules={[{ required: true, message: t('productCode.volumeFeeRequired') }]}>
                                                        <CustomNumberInput isInteger={true}
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 13. [L2] Đơn giá cước TQ_HN (cân) */}
                                        <Col3>
                                            <Form.Item label={t('productCode.weightFee')}>
                                                <Space.Compact block>
                                                    <Form.Item name="weightFee" noStyle rules={[{ required: true, message: t('productCode.weightFeeRequired') }]}>
                                                        <CustomNumberInput isInteger={true}
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>



                                        {/* 13. [M] Tổng cước TQ_HN */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.totalTransportFeeEstimate')}
                                                        <Tooltip title="Tổng cước TQ_HN = Max(Đơn giá cước khối [L1] * Khối lượng [H], Đơn giá cước cân [L2] * Trọng lượng [G])">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="totalTransportFeeEstimate" noStyle>
                                                    <CustomNumberInput isInteger={true}
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 14. [N] Phí nội địa VN */}
                                        <Col3>
                                            <Form.Item label={t('productCode.domesticFeeVN')}>
                                                <Space.Compact block>
                                                    <Form.Item name="domesticFeeVN" noStyle>
                                                        <CustomNumberInput isInteger={true}
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 15. [O] Ghi chú */}
                                        <Col3>
                                            <Form.Item name="notes" label={t('productCode.notesLabel')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 16. [P] Tình trạng hàng hoá */}
                                        <Col3>
                                            <Form.Item name="status" label={t('productCode.statusLabel')}>
                                                <Select placeholder={t('productCode.selectStatus')} disabled={disabledGeneral}>
                                                    {conditions.map(c => (
                                                        <Option key={c.id} value={c.name_vi}>{c.name_vi}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col3>

                                        {/* 16.1 Trạng thái xếp xe */}
                                        <Col3>
                                            <Form.Item name="loadingStatus" label={t('productCode.loadingStatusLabel')}>
                                                <Select placeholder={t('productCode.selectLoadingStatus')} disabled={disabledGeneral}>
                                                    {LOADING_STATUS_OPTIONS.map(opt => (
                                                        <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col3>


                                    </Row>
                                ),
                            },
                            {
                                key: '2',
                                label: t('productCode.tabProduct'),
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
                                                        <div><PlusOutlined /><div style={{ marginTop: 8 }}>{t('common.upload')}</div></div>
                                                    )}
                                                </Upload>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    {existingImages.map((img, idx) => (
                                                        <img key={idx} src={img} alt="existing" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                                    ))}
                                                </div>
                                            </Form.Item>
                                        </Col>

                                        {/* 18. [S] Tem chính */}
                                        <Col3>
                                            <Form.Item name="mainTag" label={t('productCode.mainTag')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 19. [T] Tem phụ */}
                                        <Col3>
                                            <Form.Item name="subTag" label={t('productCode.subTag')}>
                                                <Input disabled={disabledGeneral} />
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
                                                        <img key={idx} src={img} alt="existing" style={{ width: 80, height: 80, objectFit: 'cover' }} />
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
                                                    isInteger={true}
                                                    disabled={disabledGeneral}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 22.1 [V2] Đơn vị */}
                                        <Col3>
                                            <Form.Item name="productUnit" label={t('productCode.productUnit')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>



                                        {/* 23. [X] Mô Tả sản phẩm */}
                                        <Col3>
                                            <Form.Item name="productDescription" label={t('productCode.productDescription')}>
                                                <TextArea rows={4} disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 24. [Y] Nhãn Hiệu */}
                                        <Col3>
                                            <Form.Item name="brand" label={t('productCode.brand')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 25. [Z] Mã Số Thuế */}
                                        <Col3>
                                            <Form.Item name="supplierTaxCode" label={t('productCode.supplierTaxCode')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 26. [AA] Tên Công Ty bán hàng */}
                                        <Col3>
                                            <Form.Item name="supplierName" label={t('productCode.supplierName')}>
                                                <Input disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>
                                    </Row>
                                ),
                            },
                            {
                                key: '3',
                                label: t('productCode.tabDeclaration'),
                                children: (
                                    <Row gutter={16}>
                                        {/* 22. [W] Quy cách */}
                                        <Col3>
                                            <Form.Item name="specification" label={t('productCode.specification')}>
                                                <TextArea rows={4} disabled={disabledGeneral} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 27. [AB] Nhu cầu khai báo */}
                                        <Col3>
                                            <Form.Item name="declarationNeed" label={t('productCode.declarationNeed')}>
                                                <TextArea rows={4} disabled={viewOnly} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 28. [AC] Số lượng khai báo */}
                                        <Col3>
                                            <Form.Item name="declarationQuantity" label={t('productCode.declarationQuantity')}>
                                                <CustomNumberInput
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    isInteger={true}
                                                    disabled={disabledGeneral}
                                                />
                                            </Form.Item>
                                        </Col3>

                                        {/* 29. [AD] Giá xuất hoá đơn */}
                                        <Col3>
                                            <Form.Item label={t('productCode.invoicePriceExport')}>
                                                <Space.Compact block>
                                                    <Form.Item name="invoicePriceExport" noStyle>
                                                        <CustomNumberInput isInteger={true}
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
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
                                                    <CustomNumberInput isInteger={true}
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>


                                        {/* 31. [AF][1] Thuế VAT */}
                                        <Col3>
                                            <Form.Item label={t('productCode.vatPercent')}>
                                                <Space.Compact block>
                                                    <Form.Item name="vatPercent" noStyle>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 40px)' }}
                                                            min={0}
                                                            max={100}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="%" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>


                                        {/* 31. [AF][2] Thuế NK */}
                                        <Col3>
                                            <Form.Item label={t('productCode.importTaxPercent')}>
                                                <Space.Compact block>
                                                    <Form.Item name="importTaxPercent" noStyle>
                                                        <CustomNumberInput
                                                            style={{ width: 'calc(100% - 40px)' }}
                                                            min={0}
                                                            max={100}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="%" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 32. [AG] Phí phải nộp */}
                                        <Col3>
                                            <Form.Item label={t('productCode.otherFeeLabel')}>
                                                <Space.Compact block>
                                                    <Form.Item name="feeAmount" noStyle>
                                                        <CustomNumberInput isInteger={true}
                                                            style={{ width: 'calc(100% - 60px)' }}
                                                            min={0}
                                                            disabled={disabledGeneral}
                                                        />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                                        </Col3>

                                        {/* 33. [AH] Ghi chú */}
                                        <Col3>
                                            <Form.Item name="otherNotes" label={t('productCode.otherNotes')}>
                                                <Input disabled={viewOnly} />
                                            </Form.Item>
                                        </Col3>

                                        {/* 34. [AI] Thuế VAT nhập khẩu */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.vatImportTax')}
                                                        <Tooltip title="Thuế VAT phải nộp = Tổng giá trị [AE] * Thuế VAT [AF][1]">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="vatImportTax" noStyle>
                                                    <CustomNumberInput isInteger={true}
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
                                            </Form.Item>
                                        </Col3>

                                        {/* 35. [AJ] Thuế NK phải nộp */}
                                        <Col3>
                                            <Form.Item
                                                label={
                                                    <Space>
                                                        {t('productCode.importTaxLabel')}
                                                        <Tooltip title="Thuế nhập khẩu phải nộp = Tổng giá trị [AE] * Thuế nhập khẩu [AF][2]">
                                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                                        </Tooltip>
                                                    </Space>
                                                }
                                            >
                                                <Form.Item name="importTax" noStyle>
                                                    <CustomNumberInput isInteger={true}
                                                        style={{ width: '100%' }}
                                                        disabled
                                                        className="bg-gray-100"
                                                    />
                                                </Form.Item>
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
                                                    <CustomNumberInput isInteger={true}
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
                                                    <CustomNumberInput isInteger={true}
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
                                                <Select placeholder={t('productCode.selectStatus')} disabled={disabledGeneral}>
                                                    {VAT_STATUS_OPTIONS.map(opt => (
                                                        <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                                    ))}
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
