import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, DatePicker, Switch, Row, Col, message, Upload, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import customerService from '../../services/customerService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

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

    // Image Upload State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchAllCustomers();
            if (declaration) {
                // Edit mode: populate form
                form.setFieldsValue({
                    ...declaration,
                    customerId: declaration.customerId,
                    labelDate: declaration.labelDate ? dayjs(declaration.labelDate) : null
                });

                // Set existing images
                if (declaration.images && declaration.images.length > 0) {
                    const formattedImages = declaration.images.map((img, index) => ({
                        uid: index,
                        name: `image-${index}.png`,
                        status: 'done',
                        url: img
                    }));
                    setFileList(formattedImages);
                } else {
                    setFileList([]);
                }
            } else {
                // Create mode: reset form with defaults
                form.resetFields();
                form.setFieldsValue({
                    vatPercent: 10.00,
                    isDeclared: false
                });
                setFileList([]);
            }
        }
    }, [visible, declaration]);

    const fetchAllCustomers = async () => {
        setFetchingCustomers(true);
        try {
            const res = await customerService.getAll({
                page: 1,
                limit: 0,
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

    const handleOk = () => {
        form.validateFields().then(async (values) => {
            setLoading(true);
            try {
                // Check if we have new files (originFileObj exists)
                const hasNewFiles = fileList.some(file => file.originFileObj);

                let submitData;

                if (hasNewFiles) {
                    const formData = new FormData();
                    // Append all text fields
                    Object.keys(values).forEach(key => {
                        if (values[key] !== undefined && values[key] !== null) {
                            if (key === 'labelDate') {
                                formData.append(key, values[key].format('YYYY-MM-DD'));
                            } else {
                                formData.append(key, values[key]);
                            }
                        }
                    });

                    // Append files
                    fileList.forEach(file => {
                        if (file.originFileObj) {
                            formData.append('images', file.originFileObj);
                        } else if (file.url) {
                            // Keep existing images by sending their relative paths
                            // file.url is http://localhost:3000/uploads/..., we want /uploads/...
                            // Or just send the full URL and let backend handle?
                            // Backend logic: "finalImages = [...req.body.images]"
                            // If backend expects relative paths (standard), we should strip domain.
                            // But usually backend just saves what it gets. Existing images are stored as relative paths in DB.
                            // If we send full URL, backend might double-save or save full URL.
                            // Let's check how we loaded them: url: `http://localhost:3000${img}`
                            // So we should extract the path.

                            const relativePath = file.url.replace(/^https?:\/\/[^\/]+/, '');
                            formData.append('images', relativePath);
                        }
                    });

                    submitData = formData;
                } else {
                    submitData = {
                        ...values,
                        labelDate: values.labelDate ? values.labelDate.format('YYYY-MM-DD') : null,
                        // If no new files, we might strictly speaking not need to send 'images' array 
                        // if backend handles existing images via separate logic or doesn't delete them on update.
                    };
                }

                if (declaration) {
                    await declarationService.update(declaration.id, submitData);
                    message.success(t('declaration.updateSuccess'));
                } else {
                    await declarationService.create(submitData);
                    message.success(t('declaration.createSuccess'));
                }
                form.resetFields();
                setFileList([]);
                onSuccess();
            } catch (error) {
                if (error.response && error.response.data && error.response.data.code) {
                    const errorCode = error.response.data.code;
                    message.error(t(`error.${errorCode}`));
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
            width={900}
        >
            <Form
                form={form}
                layout="vertical"
                name="declarationForm"
            >
                <Row gutter={16}>
                    {/* Left Column */}
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="invoiceRequestName"
                            label={t('declaration.invoiceRequestName')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="customerId"
                            label={t('declaration.customer')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Select
                                showSearch
                                placeholder={t('declaration.selectCustomer')}
                                loading={fetchingCustomers}
                                disabled={isViewMode}
                                filterOption={(input, option) => {
                                    const label = option?.children ? option.children.toString() : '';
                                    return label.toLowerCase().includes(input.toLowerCase());
                                }}
                            >
                                {customers.map(customer => (
                                    <Option key={customer.id} value={customer.id}>
                                        {`${customer.fullName} (${customer.username} - ${customer.phone || 'N/A'})`}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="productNameVi"
                            label={t('declaration.productNameVi')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="hsCode"
                            label={t('declaration.hsCode')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="quantity"
                            label={t('declaration.quantity')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                disabled={isViewMode}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="totalPackages"
                            label={t('declaration.totalPackages')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                disabled={isViewMode}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="totalWeight"
                            label={t('declaration.totalWeight')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                step={0.01}
                                disabled={isViewMode}
                                addonAfter="kg"
                            />
                        </Form.Item>

                        <Form.Item
                            name="totalVolume"
                            label={t('declaration.totalVolume')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                step={0.001}
                                disabled={isViewMode}
                                addonAfter="m³"
                            />
                        </Form.Item>

                        <Form.Item
                            name="productDescription"
                            label={t('declaration.productDescription')}
                        >
                            <TextArea rows={2} disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="productUsage"
                            label={t('declaration.productUsage')}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>
                    </Col>

                    {/* Right Column */}
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="contractPrice"
                            label={t('declaration.contractPrice')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Space.Compact block>
                                <InputNumber
                                    style={{ width: 'calc(100% - 60px)' }}
                                    min={0}
                                    step={0.01}
                                    disabled={isViewMode}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                />
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="productUnit"
                            label={t('declaration.productUnit')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input placeholder="VD: Cái, Chiếc, Hộp, Kg..." disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="declarationPriceVND"
                            label={t('declaration.declarationPriceVND')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Space.Compact block>
                                <InputNumber
                                    style={{ width: 'calc(100% - 60px)' }}
                                    min={0}
                                    disabled={isViewMode}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                    parser={value => value.replace(/\$\s?|(\.*)/g, '').replace(',', '.')}
                                />
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="importTaxPercent"
                            label={t('declaration.importTaxPercent')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Space.Compact block>
                                <InputNumber
                                    style={{ width: 'calc(100% - 40px)' }}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    disabled={isViewMode}
                                    decimalSeparator=","
                                />
                                <Input
                                    style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="%"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="vatPercent"
                            label={t('declaration.vatPercent')}
                            rules={[{ required: true, message: t('validation.required') }]}
                            initialValue={10.00}
                        >
                            <Space.Compact block>
                                <InputNumber
                                    style={{ width: 'calc(100% - 40px)' }}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    disabled={isViewMode}
                                    decimalSeparator=","
                                />
                                <Input
                                    style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="%"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="serviceFeePercent"
                            label={t('declaration.serviceFeePercent')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Space.Compact block>
                                <InputNumber
                                    style={{ width: 'calc(100% - 40px)' }}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    disabled={isViewMode}
                                    decimalSeparator=","
                                />
                                <Input
                                    style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="%"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item
                            name="supplierName"
                            label={t('declaration.supplierName')}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="supplierAddress"
                            label={t('declaration.supplierAddress')}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="labelCode"
                            label={t('declaration.labelCode')}
                        >
                            <Input disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="labelDate"
                            label={t('declaration.labelDate')}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            name="isDeclared"
                            label={t('declaration.isDeclared')}
                            valuePropName="checked"
                        >
                            <Switch disabled={isViewMode} />
                        </Form.Item>

                        <Form.Item
                            label={t('declaration.images')}
                        >
                            <Upload
                                listType="picture-card"
                                fileList={fileList}
                                onPreview={handlePreview}
                                onChange={handleChange}
                                beforeUpload={() => false} // Prevent auto upload
                                accept="image/*"
                                disabled={isViewMode}
                            >
                                {fileList.length >= 3 ? null : (
                                    <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>{t('declaration.uploadImage')}</div>
                                    </div>
                                )}
                            </Upload>
                            <Modal
                                open={previewOpen}
                                title={previewTitle}
                                footer={null}
                                onCancel={handleCancelPreview}
                            >
                                <img alt="example" style={{ width: '100%' }} src={previewImage} />
                            </Modal>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default DeclarationModal;
