import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, DatePicker, Switch, Row, Col, message, Upload, Space, Tabs, Divider, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import customerService from '../../services/customerService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

// Helper to convert file to base64
const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

const DeclarationModal = ({ visible, declaration, isViewMode = false, onCancel, onSuccess }) => {
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
                // Create mode: reset form with defaults
                form.resetFields();
                setFileList([]);
            }
        }
    }, [visible, declaration]);

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

    // Auto calculate: Weight * TransportRate
    const handleValuesChange = (changedValues, allValues) => {
        // Placeholder for auto-calculation logic if requested
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
            label: t('declaration.tabShipment') || 'Thông tin lô hàng',
            children: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="entryDate" label={t('declaration.entryDate')} rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="customerId" label={t('declaration.customer')} rules={[{ required: true }]}>
                            <Select showSearch placeholder={t('declaration.selectCustomer')} loading={fetchingCustomers} disabled={isViewMode} filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                                {customers.map(c => <Option key={c.id} value={c.id}>{c.fullName} ({c.username})</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="customerCodeInput" label={t('declaration.customerCodeInput')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="orderCode" label={t('declaration.orderCode')} rules={[{ required: true }]}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="packageCount" label={t('declaration.packageCount')}>
                            <InputNumber style={{ width: '100%' }} min={0} disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="infoSource" label={t('declaration.infoSource')}>
                            <Select disabled={isViewMode}>
                                <Option value="Wechat">Wechat</Option>
                                <Option value="Kuaidi">Kuaidi</Option>
                                <Option value="Other">Khác</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('declaration.weight')}>
                            <Space.Compact block>
                                <Form.Item name="weight" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 40px)' }} min={0} step={0.01} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="kg" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.volume')}>
                            <Space.Compact block>
                                <Form.Item name="volume" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 40px)' }} min={0} step={0.001} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="m³" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.domesticFeeRMB')}>
                            <Space.Compact block>
                                <Form.Item name="domesticFeeRMB" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} step={0.01} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.haulingFeeRMB')}>
                            <Space.Compact block>
                                <Form.Item name="haulingFeeRMB" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} step={0.01} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.unloadingFeeRMB')}>
                            <Space.Compact block>
                                <Form.Item name="unloadingFeeRMB" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} step={0.01} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.transportRate')}>
                            <Space.Compact block>
                                <Form.Item name="transportRate" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} step={0.01} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.totalTransportFeeEstimate')}>
                            <Space.Compact block>
                                <Form.Item name="totalTransportFeeEstimate" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} step={0.01} disabled={isViewMode} className="highlight-input" />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item name="note" label={t('declaration.note')}>
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                </Row>
            ),
        },
        {
            key: '2',
            label: t('declaration.tabProduct') || 'Thông tin hàng hóa',
            children: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="productName" label={t('declaration.productName')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="productQuantity" label={t('declaration.productQuantity')}>
                            <InputNumber style={{ width: '100%' }} min={0} disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="specification" label={t('declaration.specification')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="productDescription" label={t('declaration.productDescription')}>
                            <TextArea rows={3} disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="brand" label={t('declaration.brand')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('declaration.productImage')}>
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
                    </Col>
                </Row>
            ),
        },
        {
            key: '3',
            label: t('declaration.tabDeclaration') || 'Thông tin khai báo',
            children: (
                <Row gutter={16}>
                    <Col span={8}>
                        <Divider orientation="left" plain>Khai báo</Divider>
                        <Form.Item name="declarationNeed" label={t('declaration.declarationNeed')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="declarationPolicy" label={t('declaration.declarationPolicy')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="declarationName" label={t('declaration.declarationName')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="declarationQuantity" label={t('declaration.declarationQuantity')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="invoicePrice" label={t('declaration.invoicePrice')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="additionalInfo" label={t('declaration.additionalInfo')}>
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Divider orientation="left" plain>Chi tiết</Divider>
                        <Form.Item name="declarationQuantityDeclared" label={t('declaration.declarationQuantityDeclared')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="unit" label={t('declaration.unit')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="declarationPrice" label={t('declaration.declarationPrice')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="value" label={t('declaration.value')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="packageCountDeclared" label={t('declaration.packageCountDeclared')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="netWeight" label={t('declaration.netWeight')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="grossWeight" label={t('declaration.grossWeight')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="cbm" label={t('declaration.cbm')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Divider orientation="left" plain>Thuế & Kế toán</Divider>
                        <Form.Item name="hsCode" label={t('declaration.hsCode')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item label={t('declaration.vatPercent')}>
                            <Space.Compact block>
                                <Form.Item name="vatPercent" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 40px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="%" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.vatAmount')}>
                            <Space.Compact block>
                                <Form.Item name="vatAmount" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 40px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.importTaxPercent')}>
                            <Space.Compact block>
                                <Form.Item name="importTaxPercent" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 40px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="%" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.importTaxUSD')}>
                            <Space.Compact block>
                                <Form.Item name="importTaxUSD" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="USD" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('declaration.importTaxVND')}>
                            <Space.Compact block>
                                <Form.Item name="importTaxVND" noStyle>
                                    <InputNumber style={{ width: 'calc(100% - 60px)' }} min={0} disabled={isViewMode} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item name="customsExchangeRate" label={t('declaration.customsExchangeRate')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="qualityControlFee" label={t('declaration.qualityControlFee')}>
                            <Input disabled={isViewMode} />
                        </Form.Item>
                        <Form.Item name="accountingConfirmation" label={t('declaration.accountingConfirmation')}>
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
