import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, DatePicker, Switch, Row, Col, message, Upload, Space, Tabs, Divider, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import CustomNumberInput from '../../components/CustomNumberInput';
import customerService from '../../services/customerService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
import { INFO_SOURCE_OPTIONS, DECLARATION_STATUS } from '../../constants/enums';

// Helper to convert file to base64
const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

const DeclarationModal = ({ visible, declaration, initialData, isViewMode = false, onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [fetchingCustomers, setFetchingCustomers] = useState(false);

    // Image Upload State (Single Image)
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchAllCustomers();
            if (declaration) {
                // Edit mode: populate form
                const formData = {
                    ...declaration,
                    customerId: declaration.customerId,
                    entryDate: declaration.entryDate ? dayjs(declaration.entryDate) : null,
                };
                form.setFieldsValue(formData);

                // Set existing image
                if (declaration.productImage) {
                    setFileList([{
                        uid: '-1',
                        name: 'image.png',
                        status: 'done',
                        url: declaration.productImage
                    }]);
                } else {
                    setFileList([]);
                }
            } else {
                // Create mode: reset form
                form.resetFields();
                if (initialData) {
                    setTimeout(() => {
                        form.setFieldsValue(initialData);
                    }, 50);
                }
                setFileList([]);
            }
        }
    }, [visible, declaration, initialData, form]);

    const fetchAllCustomers = async () => {
        setFetchingCustomers(true);
        try {
            const res = await customerService.getAll({
                page: 1,
                limit: 100, // Fetch more for selection
                status: 'active'
            });
            setCustomers(res.data?.customers || []);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setFetchingCustomers(false);
        }
    };

    const handleCancelPreview = () => setPreviewOpen(false);

    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
        setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
    };

    const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

    // Auto calculate
    const handleValuesChange = (changedValues, allValues) => {
        // [L] Tổng cước vận chuyển = Max( [D]*[J], [E]*[K] )
        // Inputs: weight, volume, transportRate, transportRateVolume
        const getVal = (field) => {
            const val = allValues[field];
            if (typeof val === 'string') {
                return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
            }
            return parseFloat(val) || 0;
        };

        if (
            'weight' in changedValues ||
            'volume' in changedValues ||
            'weightFee' in changedValues ||
            'volumeFee' in changedValues
        ) {
            const w = getVal('weight'); // [D]
            const v = getVal('volume'); // [E]
            const rateW = getVal('weightFee'); // [J]
            const rateV = getVal('volumeFee'); // [K]

            const feeByWeight = w * rateW;
            const feeByVolume = v * rateV;
            const maxFee = Math.max(feeByWeight, feeByVolume);
            form.setFieldsValue({ totalTransportFeeEstimate: maxFee });
        }

        // [AD] Trị giá = [AA] * [AC]
        if ('declarationQuantityDeclared' in changedValues || 'declarationPrice' in changedValues) {
            const qty = getVal('declarationQuantityDeclared');
            const price = getVal('declarationPrice');
            const val = qty * price;
            form.setFieldsValue({ value: val });
        }
    };



    const handleOk = () => {
        form.validateFields().then(async (values) => {
            setLoading(true);
            try {
                const formData = new FormData();

                // Append all text/number/date fields
                Object.keys(values).forEach(key => {
                    if (values[key] !== undefined && values[key] !== null) {
                        if (dayjs.isDayjs(values[key])) {
                            formData.append(key, values[key].format('YYYY-MM-DD'));
                        } else {
                            formData.append(key, values[key]);
                        }
                    }
                });

                // Handle Image
                if (fileList.length > 0) {
                    if (fileList[0].originFileObj) {
                        formData.append('productImage', fileList[0].originFileObj);
                    } else if (fileList[0].url) {
                        const relativePath = fileList[0].url.replace(/^https?:\/\/[^\/]+/, '');
                        formData.append('productImage', relativePath);
                    }
                }

                if (declaration) {
                    await declarationService.update(declaration.id, formData);
                    message.success(t('declaration.updateSuccess'));
                } else {
                    await declarationService.create(formData);
                    message.success(t('declaration.createSuccess'));
                }

                form.resetFields();
                setFileList([]);
                onSuccess();
            } catch (error) {
                console.error(error);
                if (error.response?.data?.message) {
                    message.error(error.response.data.message);
                } else {
                    message.error(t('error.UNKNOWN'));
                }
            } finally {
                setLoading(false);
            }
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    // Tab Items
    const items = [
        {
            key: '1',
            label: t('declaration.tabShipment') || '1. Thông tin lô hàng',
            children: (
                <Row gutter={16}>
                    <Col span={12}>
                        {/* [A] Ngày nhập kho -> No Tag */}
                        <Form.Item name="entryDate" label="Ngày nhập kho" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={isViewMode} />
                        </Form.Item>
                        {/* [B] Mã khách hàng -> 1. [A] */}
                        <Form.Item name="customerId" label="1. [A] Mã khách hàng" rules={[{ required: true }]}>
                            <Select showSearch placeholder="Chọn khách hàng" loading={fetchingCustomers} disabled={isViewMode} filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                                {customers.map(c => <Option key={c.id} value={c.id}>{c.fullName} ({c.username})</Option>)}
                            </Select>
                        </Form.Item>
                        {/* [C] Tên mặt hàng -> 2. [B] */}
                        <Form.Item name="productName" label="2. [B] Tên mặt hàng">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [D] Mã đơn hàng -> No Tag */}
                        <Form.Item name="orderCode" label="Mã đơn hàng">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [E] Số Kiện -> 3. [C] */}
                        <Form.Item name="packageCount" label="3. [C] Số Kiện">
                            <CustomNumberInput style={{ width: '100%' }} disabled={isViewMode} isInteger={true} />
                        </Form.Item>
                        {/* [F] Trọng lượng -> 4. [D] */}
                        <Form.Item label="4. [D] Trọng lượng (Kg)">
                            <Space.Compact block>
                                <Form.Item name="weight" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                            </Space.Compact>
                        </Form.Item>
                        {/* [G] Khối lượng -> 5. [E] */}
                        <Form.Item label="5. [E] Khối lượng (m3)">
                            <Space.Compact block>
                                <Form.Item name="volume" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                            </Space.Compact>
                        </Form.Item>
                        {/* [H] Nguồn cung cấp thông tin -> 6. [F] */}
                        <Form.Item name="infoSource" label="6. [F] Nguồn tin (Kg, m3)">
                            <Select disabled={isViewMode}>
                                {INFO_SOURCE_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="7. [G] Phí nội địa (RMB)">
                            <Form.Item name="domesticFeeRMB" noStyle>
                                <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                            </Form.Item>
                        </Form.Item>
                        {/* [J] Phí kéo hàng (RMB) -> 8. [H] */}
                        <Form.Item label="8. [H] Phí kéo hàng (RMB)">
                            <Form.Item name="haulingFeeRMB" noStyle>
                                <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                            </Form.Item>
                        </Form.Item>
                        {/* [K] Phí dỡ hàng (RMB) -> 9. [I] */}
                        <Form.Item label="9. [I] Phí dỡ hàng (RMB)">
                            <Form.Item name="unloadingFeeRMB" noStyle>
                                <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                            </Form.Item>
                        </Form.Item>

                        {/* [L] Đơn giá cước (Kg) -> 10. [J] */}
                        <Form.Item label="10. [J] Đơn giá cước TQ_HN (Theo Kg)">
                                                <Space.Compact block>
                                                    <Form.Item name="weightFee" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>

                        {/* [M] Đơn giá cước (m3) -> 11. [K] */}
                        <Form.Item label="11. [K] Đơn giá cước TQ_HN (Theo m3)">
                                                <Space.Compact block>
                                                    <Form.Item name="volumeFee" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>

                        {/* [N] Tổng cước (Formula) -> 12. [L] */}
                        <Form.Item label="12. [L] Tổng cước TQ_HN (Tạm tính)">
                                                <Space.Compact block>
                                                    <Form.Item name="totalTransportFeeEstimate" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} disabled className="bg-gray-100" />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>

                        {/* [O] Ghi chú -> 13. [M] */}
                        <Form.Item name="note" label="13. [M] Ghi chú">
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                </Row>
            ),
        },
        {
            key: '2',
            label: t('declaration.tabProduct') || '2. Thông tin hàng hóa',
            children: (
                <Row gutter={16}>
                    <Col span={12}>
                        {/* [N] Ảnh hàng hóa -> 14. [N] */}
                        <Form.Item label="14. [N] Ảnh hàng hóa">
                            <Upload
                                listType="picture-card"
                                fileList={fileList}
                                onPreview={handlePreview}
                                onChange={handleChange}
                                beforeUpload={() => false}
                                maxCount={1}
                                disabled={isViewMode}
                            >
                                {fileList.length >= 1 ? null : <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>}
                            </Upload>
                        </Form.Item>
                        {/* [P] Tem phụ -> 16. [P] */}
                        <Form.Item name="subTag" label="16. [P] Tem phụ">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [Q] Số lượng SP -> 17. [Q] */}
                        <Form.Item name="productQuantity" label="17. [Q] Số lượng SP">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} isInteger={true} />
                        </Form.Item>
                        {/* [R] Quy cách -> 18. [R] */}
                        <Form.Item name="specification" label="18. [R] Quy cách">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [S] Mô tả SP -> 19. [S] */}
                        <Form.Item name="productDescription" label="19. [S] Mô tả sản phẩm">
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>
                        {/* [T] Nhãn hiệu -> 20. [T] */}
                        <Form.Item name="brand" label="20. [T] Nhãn hiệu">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        {/* [U] Nhu cầu khai báo -> 21. [U] */}
                        <Form.Item name="declarationNeed" label="21. [U] Nhu cầu khai báo">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [V] Chính sách khai báo -> 22. [V] */}
                        <Form.Item name="declarationPolicy" label="22. [V] Chính sách khai báo">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [W] Số lượng khai báo (Nháp) -> 23. [W] */}
                        <Form.Item name="declarationQuantity" label="23. [W] Số lượng khai báo (Nháp)">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [X] Giá xuất hóa đơn -> 24. [X] */}
                        <Form.Item label="24. [X] Giá xuất hóa đơn (Trước VAT)">
                                                <Space.Compact block>
                                                    <Form.Item name="invoicePrice" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [Y] Thông tin bổ sung -> 25. [Y] */}
                        <Form.Item name="additionalInfo" label="25. [Y] Thông tin cần bổ sung">
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                </Row>
            ),
        },
        {
            key: '3',
            label: t('declaration.tabOfficial') || '3. Thông tin khai báo chính thức',
            children: (
                <Row gutter={16}>
                    <Col span={8}>
                        {/* [Z] Tên khai báo -> 26. [Z] */}
                        <Form.Item name="declarationName" label="26. [Z] Tên khai báo">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [AA] SL khai báo -> 27. [AA] */}
                        <Form.Item name="declarationQuantityDeclared" label="27. [AA] Số lượng khai báo (Chính thức)">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} isInteger={true} />
                        </Form.Item>
                        {/* [AB] Đơn vị tính -> 28. [AB] */}
                        <Form.Item name="unit" label="28. [AB] Đơn vị tính">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [AC] Giá khai báo -> 29. [AC] */}
                        <Form.Item label="29. [AC] Giá khai báo">
                                                <Space.Compact block>
                                                    <Form.Item name="declarationPrice" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [AD] Trị giá (Formula) -> 30. [AD] */}
                        <Form.Item label="30. [AD] Trị giá (=AA*AC)">
                                                <Space.Compact block>
                                                    <Form.Item name="value" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} disabled className="bg-gray-100" />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [AE] Số kiện -> 31. [AE] */}
                        <Form.Item name="packageCountDeclared" label="31. [AE] Số kiện">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} isInteger={true} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        {/* [AF] Net weight -> 32. [AF] */}
                        <Form.Item name="netWeight" label="32. [AF] Net weight">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                        </Form.Item>
                        {/* [AG] Gross weight -> 33. [AG] */}
                        <Form.Item name="grossWeight" label="33. [AG] Gross weight">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                        </Form.Item>
                        {/* [AH] CBM -> 34. [AH] */}
                        <Form.Item name="cbm" label="34. [AH] CBM">
                            <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                        </Form.Item>
                        {/* [AI] HS Code -> 35. [AI] */}
                        <Form.Item name="hsCode" label="35. [AI] HS CODE">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        {/* [AJ] % Thuế VAT -> 36. [AJ] */}
                        <Form.Item label="36. [AJ] % Thuế VAT">
                            <Space.Compact block>
                                <Form.Item name="vatPercent" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} max={100} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="%" disabled />
                            </Space.Compact>
                        </Form.Item>
                        {/* [AK] Thuế VAT phải nộp -> 37. [AK] */}
                        <Form.Item label="37. [AK] Thuế VAT phải nộp">
                                                <Space.Compact block>
                                                    <Form.Item name="vatAmount" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                    </Col>
                    <Col span={8}>
                        {/* [AL] % Thuế NK -> 38. [AL] */}
                        <Form.Item label="38. [AL] % Thuế NK">
                            <Space.Compact block>
                                <Form.Item name="importTaxPercent" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} min={0} max={100} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="%" disabled />
                            </Space.Compact>
                        </Form.Item>
                        {/* [AM] Thuế NK USD -> 39. [AM] */}
                        <Form.Item label="39. [AM] Thuế NK (USD)">
                                                <Space.Compact block>
                                                    <Form.Item name="importTaxUSD" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="USD" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [AN] Thuế NK VNĐ -> 40. [AN] */}
                        <Form.Item label="40. [AN] Thuế NK (VNĐ)">
                                                <Space.Compact block>
                                                    <Form.Item name="importTaxVND" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [AO] Tỷ giá HQ -> 41. [AO] */}
                        <Form.Item label="41. [AO] Tỷ giá Hải Quan">
                            <Form.Item name="customsExchangeRate" noStyle>
                                <CustomNumberInput style={{ width: '100%' }} min={0} disabled={isViewMode} />
                            </Form.Item>
                        </Form.Item>
                        {/* [AP] Phí KTCL -> 42. [AP] */}
                        <Form.Item label="42. [AP] Phí KTCL">
                                                <Space.Compact block>
                                                    <Form.Item name="qualityControlFee" noStyle>
                                                        <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                                    </Form.Item>
                                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                                                </Space.Compact>
                                            </Form.Item>
                        {/* [AQ] Xác nhận PKT -> 43. [AQ] */}
                        <Form.Item name="accountingConfirmation" label="43. [AQ] Xác nhận của PKT">
                            <Input disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                </Row>
            ),
        }
    ];

    return (
        <Modal
            open={visible}
            title={isViewMode ? t('common.view') : (declaration ? t('declaration.edit') : t('declaration.add'))}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            footer={isViewMode ? null : undefined}
            width={1200}
            style={{ top: 20 }}
        >
            <Form
                form={form}
                layout="vertical"
                name="declarationForm"
                onValuesChange={handleValuesChange}
            >
                <Tabs defaultActiveKey="1" items={items} />
            </Form>

            <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={handleCancelPreview}
            >
                <img alt="example" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </Modal>
    );
};

export default DeclarationModal;
