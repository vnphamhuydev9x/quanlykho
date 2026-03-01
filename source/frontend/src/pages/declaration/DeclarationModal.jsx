import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Row, Col, message, Upload, Space, Divider, Typography, Card, Collapse, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import CustomNumberInput from '../../components/CustomNumberInput';
import { formatCurrency } from '../../utils/format';
import moment from 'moment';

const { TextArea } = Input;
const { Text } = Typography;

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

const { Panel } = Collapse;

const DeclarationModal = ({ visible, declaration, onCancel, onSuccess, onViewProductCode, isViewMode }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    // Watch các input field để tính toán trực tiếp trong render (giống ProductItemModal)
    const declarationQuantity = Number(Form.useWatch('declarationQuantity', form)) || 0;
    const invoicePriceBeforeVat = Number(Form.useWatch('invoicePriceBeforeVat', form)) || 0;
    const importTax = Number(Form.useWatch('importTax', form)) || 0;
    const vatTax = Number(Form.useWatch('vatTax', form)) || 0;
    const payableFee = Number(Form.useWatch('payableFee', form)) || 0;
    const entrustmentFee = Number(Form.useWatch('entrustmentFee', form)) || 0;

    // Tính toán các giá trị phát sinh
    const totalLotValueBeforeVat = declarationQuantity * invoicePriceBeforeVat;
    const importTaxPayable = Math.round(totalLotValueBeforeVat * importTax / 100);
    const vatTaxPayable = Math.round(totalLotValueBeforeVat * vatTax / 100);
    const transportFee = parseFloat(declaration?.productItem?.itemTransportFeeEstimate || 0);
    const importCostToCustomer = Math.round(transportFee + importTaxPayable + vatTaxPayable + payableFee + entrustmentFee);

    // Image Upload State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        if (visible) {
            if (declaration) {
                form.setFieldsValue({
                    ...declaration,
                    // Join fields (Read-only)
                    pc_id: declaration.productCodeId || '-',
                    pc_customerCode: declaration.productCode?.customer?.customerCode || declaration.productCode?.customer?.fullName || '-',
                    pc_orderCode: declaration.productCode?.orderCode || '-',
                    pc_entryDate: declaration.productCode?.entryDate ? moment(declaration.productCode.entryDate).format('DD/MM/YYYY') : '-',

                    pi_id: declaration.productItemId || '-',
                    pi_productName: declaration.productItem?.productName || '-',
                    pi_infoSource: declaration.productCode?.infoSource || '-',
                    pi_packageCount: declaration.productItem?.packageCount || 0,
                    pi_packageUnit: declaration.productItem?.packageUnit ? t(`productCode.unit${declaration.productItem.packageUnit.charAt(0) + declaration.productItem.packageUnit.slice(1).toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`) : '-',
                    pi_weight: declaration.productItem?.weight || 0,
                    pi_volume: declaration.productItem?.volume || 0,
                    pi_itemTransportFeeEstimate: declaration.productItem?.itemTransportFeeEstimate || 0,
                });

                // Set existing images
                if (declaration.imageUrls && declaration.imageUrls.length > 0) {
                    setFileList(declaration.imageUrls.map((url, index) => ({
                        uid: `-${index}`,
                        name: `image-${index}.png`,
                        status: 'done',
                        url: url
                    })));
                } else {
                    setFileList([]);
                }
            } else {
                form.resetFields();
                setFileList([]);
            }
        }
    }, [visible, declaration, form, t]);

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
                const formData = new FormData();
                Object.keys(values).forEach(key => {
                    // Skip read-only/join fields when submitting
                    if (values[key] !== undefined && values[key] !== null && !key.startsWith('pc_') && !key.startsWith('pi_')) {
                        formData.append(key, values[key]);
                    }
                });

                const existingImages = [];
                fileList.forEach(file => {
                    if (file.originFileObj) {
                        formData.append('images', file.originFileObj);
                    } else if (file.url) {
                        const relativePath = file.url.replace(/^https?:\/\/[^\/]+/, '');
                        existingImages.push(relativePath);
                    }
                });
                if (existingImages.length > 0) {
                    formData.append('existingImages', JSON.stringify(existingImages));
                }

                // Gắn thêm các giá trị tính toán (không còn trong form store)
                formData.append('totalLotValueBeforeVat', totalLotValueBeforeVat);
                formData.append('importTaxPayable', importTaxPayable);
                formData.append('vatTaxPayable', vatTaxPayable);
                formData.append('importCostToCustomer', importCostToCustomer);

                if (declaration) {
                    await declarationService.update(declaration.id, formData);
                    message.success(t('declaration.updateSuccess'));
                }

                form.resetFields();
                setFileList([]);
                onSuccess();
            } catch (error) {
                console.error(error);
                message.error(error.response?.data?.message || t('error.UNKNOWN'));
            } finally {
                setLoading(false);
            }
        });
    };

    const disabledInputStyle = { backgroundColor: '#f5f5f5', color: '#000', fontWeight: 'bold' };

    return (
        <Modal
            open={visible}
            title={isViewMode ? t('declaration.viewDetail', 'Xem chi tiết khai báo') : t('declaration.edit')}
            footer={[
                <Button key="close" onClick={onCancel}>{t('common.cancel')}</Button>,
                !isViewMode && (
                    <Button key="save" type="primary" loading={loading} onClick={handleOk}>
                        {t('common.save')}
                    </Button>
                )
            ].filter(Boolean)}
            onCancel={onCancel}
            width={1200}
            style={{ top: 20 }}
        >
            <Form
                form={form}
                layout="vertical"
                name="declarationForm"
                disabled={isViewMode}
            >
                <Collapse defaultActiveKey={['pc', 'pi']} ghost expandIconPosition="right" style={{ marginBottom: 16 }}>
                    <Panel header={<Divider orientation="left" style={{ margin: 0 }}>{t('declaration.tabProductCode')}</Divider>} key="pc">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.productCodeId')} name="pc_id">
                                    <Input
                                        readOnly
                                        style={{ ...disabledInputStyle, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }}
                                        onClick={() => onViewProductCode && onViewProductCode(declaration.productCodeId)}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.customerCode')} name="pc_customerCode">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.orderCode')} name="pc_orderCode">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.entryDate')} name="pc_entryDate">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Panel>

                    <Panel header={<Divider orientation="left" style={{ margin: 0 }}>{t('declaration.tabProductItem')}</Divider>} key="pi">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.productItemId')} name="pi_id">
                                    <Input
                                        readOnly
                                        style={{ ...disabledInputStyle, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }}
                                        onClick={() => onViewProductCode && onViewProductCode(declaration.productCodeId, declaration.productItemId)}
                                    />
                                </Form.Item>
                            </Col>

                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.productName')} name="pi_productName">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.infoSource')} name="pi_infoSource">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.packageCount')} name="pi_packageCount">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.packageUnit')} name="pi_packageUnit">
                                    <Input disabled style={disabledInputStyle} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.weight')}>
                                    <Space.Compact block>
                                        <Form.Item name="pi_weight" noStyle>
                                            <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 40px)' }} />
                                        </Form.Item>
                                        <Input
                                            style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                            placeholder="Kg"
                                            disabled
                                        />
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('declaration.volume')}>
                                    <Space.Compact block>
                                        <Form.Item name="pi_volume" noStyle>
                                            <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 40px)' }} />
                                        </Form.Item>
                                        <Input
                                            style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                            placeholder="m³"
                                            disabled
                                        />
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('declaration.shippingFeeEstimate')}>
                                    <Space.Compact block>
                                        <Input
                                            disabled
                                            style={{ ...disabledInputStyle, color: '#389e0d', textAlign: 'right', width: 'calc(100% - 60px)' }}
                                            value={formatCurrency(declaration?.productItem?.itemTransportFeeEstimate || 0, '')}
                                        />
                                        <Input
                                            style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                            placeholder="VND"
                                            disabled
                                        />
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Panel>
                </Collapse>

                {/* 3. Thông tin khai báo */}
                <Divider orientation="left">{t('declaration.tabCalculation', '3. Thông tin khai báo')}</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.images')} extra={t('declaration.imagesLimit')}>
                            <Upload
                                listType="picture-card"
                                fileList={fileList}
                                onPreview={handlePreview}
                                onChange={handleChange}
                                beforeUpload={() => false}
                                maxCount={3}
                            >
                                {fileList.length >= 3 ? null : (
                                    <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>{t('common.upload')}</div>
                                    </div>
                                )}
                            </Upload>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.mainStamp')} name="mainStamp">
                            <TextArea rows={4} placeholder={t('declaration.mainStamp')} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.subStamp')} name="subStamp">
                            <TextArea rows={4} placeholder={t('declaration.subStamp')} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.productQuantity')} name="productQuantity">
                            <CustomNumberInput isInteger={true} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.specification')} name="specification">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.brand')} name="brand">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.productDescription')} name="productDescription">
                            <TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.sellerTaxCode')} name="sellerTaxCode">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.sellerCompanyName')} name="sellerCompanyName">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.declarationNeed')} name="declarationNeed">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.declarationQuantity')} name="declarationQuantity">
                            <CustomNumberInput isInteger={true} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.invoicePriceBeforeVat')}>
                            <Space.Compact block>
                                <Form.Item name="invoicePriceBeforeVat" noStyle>
                                    <CustomNumberInput isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.totalLotValueBeforeVat')}>
                            <Space.Compact block>
                                <Input
                                    disabled
                                    style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }}
                                    value={formatCurrency(totalLotValueBeforeVat || 0, '')}
                                />
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.importTax')}>
                            <Space.Compact block>
                                <Form.Item name="importTax" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} />
                                </Form.Item>
                                <Input
                                    style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="%"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.vatTax')}>
                            <Space.Compact block>
                                <Form.Item name="vatTax" noStyle>
                                    <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} />
                                </Form.Item>
                                <Input
                                    style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="%"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.importTaxPayable')}>
                            <Space.Compact block>
                                <Input
                                    disabled
                                    style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }}
                                    value={formatCurrency(importTaxPayable || 0, '')}
                                />
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.vatTaxPayable')}>
                            <Space.Compact block>
                                <Input
                                    disabled
                                    style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }}
                                    value={formatCurrency(vatTaxPayable || 0, '')}
                                />
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={t('declaration.payableFee')}>
                            <Space.Compact block>
                                <Form.Item name="payableFee" noStyle>
                                    <CustomNumberInput isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label={t('declaration.entrustmentFee')}>
                            <Space.Compact block>
                                <Form.Item name="entrustmentFee" noStyle>
                                    <CustomNumberInput isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input
                                    style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }}
                                    placeholder="VND"
                                    disabled
                                />
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item label={t('declaration.notes')} name="notes">
                            <TextArea rows={1} />
                        </Form.Item>
                    </Col>
                </Row>

                <Card size="small" style={{ backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', marginBottom: 16 }}>
                    <Row justify="end" align="middle">
                        <Col>
                            <Space size="large">
                                <Text strong style={{ fontSize: 16 }}>{t('declaration.importCostToCustomer')}</Text>
                                <Text strong style={{ fontSize: 24, color: '#cf1322' }}>
                                    {formatCurrency(importCostToCustomer || 0, 'VND')}
                                </Text>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </Form>

            <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={handleCancelPreview}
            >
                <img alt="preview" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </Modal>
    );
};

export default DeclarationModal;
