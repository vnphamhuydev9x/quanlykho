import { useState, useEffect } from 'react';
import { Modal, Form, Input, Row, Col, message, Upload, Space, Typography, Card, Button, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, FileSearchOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';

import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import CustomNumberInput from '../../components/CustomNumberInput';
import { formatCurrency } from '../../utils/format';
import { MANIFEST_STATUS_OPTIONS } from '../../constants/enums';
import ManifestModal from '../manifest/ManifestModal';
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

const TAB_KEYS = {
    DECLARATION: 'declaration',  // Tab 1 — chủ thể chính
    MERCHANDISE: 'merchandise',
    PRODUCT_CODE: 'productCode',
};

const DeclarationModal = ({ visible, declaration, onCancel, onSuccess, onViewProductCode, isViewMode, userRole, onSwitchToEdit }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_KEYS.DECLARATION);

    // Quick Peek — ManifestModal (Rule 16)
    const [peekManifestId, setPeekManifestId] = useState(null);
    const [peekManifestVisible, setPeekManifestVisible] = useState(false);

    // Watch các input field để tính toán trực tiếp trong render
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
    const declarationCost = Math.round(importTaxPayable + vatTaxPayable + payableFee + entrustmentFee);
    const importCostToCustomer = Math.round(transportFee + declarationCost);

    // Image Upload State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        if (visible) {
            // Reset về Tab 1 mỗi khi modal mở (Rule 12.6)
            setActiveTab(TAB_KEYS.DECLARATION);

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
                    pc_vehicleStatus: declaration.productCode?.vehicleStatus || null,
                    pc_vehicleStatusOverridden: declaration.productCode?.vehicleStatusOverridden || false,
                });

                if (declaration.images && declaration.images.length > 0) {
                    // Dùng images[] để có imageId cho keepImageIds; imageUrls[] để có absolute URL
                    const sorted = [...declaration.images].sort((a, b) => a.sortOrder - b.sortOrder);
                    const urls = declaration.imageUrls || [];
                    setFileList(sorted.map((img, index) => ({
                        uid: `-${index}`,
                        name: `image-${index}.png`,
                        status: 'done',
                        url: urls[index] || img.url,
                        imageId: img.id,
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
                    if (values[key] !== undefined && values[key] !== null && !key.startsWith('pc_') && !key.startsWith('pi_')) {
                        formData.append(key, values[key]);
                    }
                });

                const keepImageIds = [];
                fileList.forEach(file => {
                    if (file.originFileObj) {
                        formData.append('images', file.originFileObj);
                    } else if (file.imageId) {
                        keepImageIds.push(file.imageId);
                    }
                });
                formData.append('keepImageIds', JSON.stringify(keepImageIds));

                formData.append('totalLotValueBeforeVat', totalLotValueBeforeVat);
                formData.append('importTaxPayable', importTaxPayable);
                formData.append('vatTaxPayable', vatTaxPayable);
                formData.append('declarationCost', declarationCost);
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

    // ── Tab 1: Thông tin Khai báo (chủ thể chính) ────────────────────────
    const declarationTabContent = (
        <>
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
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label={t('declaration.totalLotValueBeforeVat')}>
                        <Space.Compact block>
                            <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }} value={formatCurrency(totalLotValueBeforeVat || 0, '')} />
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={t('declaration.importTax')}>
                        <Space.Compact block>
                            <Form.Item name="importTax" noStyle>
                                <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} />
                            </Form.Item>
                            <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="%" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={t('declaration.vatTax')}>
                        <Space.Compact block>
                            <Form.Item name="vatTax" noStyle>
                                <CustomNumberInput style={{ width: 'calc(100% - 40px)' }} />
                            </Form.Item>
                            <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="%" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label={t('declaration.importTaxPayable')}>
                        <Space.Compact block>
                            <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }} value={formatCurrency(importTaxPayable || 0, '')} />
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={t('declaration.vatTaxPayable')}>
                        <Space.Compact block>
                            <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 60px)', textAlign: 'right' }} value={formatCurrency(vatTaxPayable || 0, '')} />
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={t('declaration.payableFee')}>
                        <Space.Compact block>
                            <Form.Item name="payableFee" noStyle>
                                <CustomNumberInput isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                            </Form.Item>
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
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
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={16}>
                    <Form.Item label={t('declaration.notes')} name="notes">
                        <TextArea rows={1} />
                    </Form.Item>
                </Col>
            </Row>

            <Card size="small" style={{ backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', marginTop: 8 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space size="large">
                            <Text strong style={{ fontSize: 16 }}>Chi phí khai báo</Text>
                            <Text strong style={{ fontSize: 18, color: '#f5222d' }}>
                                {formatCurrency(declarationCost || 0, 'VND')}
                            </Text>
                        </Space>
                    </Col>
                    <Col>
                        <Space size="large">
                            <Text strong style={{ fontSize: 16 }} title="Cước TQ_HN tạm tính + Chi phí khai báo">{t('declaration.importCostToCustomer')}</Text>
                            <Text strong style={{ fontSize: 24, color: '#cf1322' }}>
                                {formatCurrency(importCostToCustomer || 0, 'VND')}
                            </Text>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </>
    );

    // ── Tab 2: Thông tin Mặt hàng (read-only) ────────────────────────────
    const merchandiseTabContent = (
        <>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label={t('declaration.productItemId')} name="pi_id">
                        <Input
                            readOnly
                            style={onViewProductCode
                                ? { ...disabledInputStyle, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }
                                : disabledInputStyle
                            }
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
                            <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="Kg" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={t('declaration.volume')}>
                        <Space.Compact block>
                            <Form.Item name="pi_volume" noStyle>
                                <Input disabled style={{ ...disabledInputStyle, width: 'calc(100% - 40px)' }} />
                            </Form.Item>
                            <Input style={{ width: '40px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="m³" disabled />
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
                            <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fafafa', color: 'rgba(0, 0, 0, 0.45)' }} placeholder="VND" disabled />
                        </Space.Compact>
                    </Form.Item>
                </Col>
            </Row>
        </>
    );

    // ── Tab 3: Thông tin Mã hàng (read-only) ─────────────────────────────
    const productCodeTabContent = (
        <>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label={t('declaration.productCodeId')} name="pc_id">
                        <Input
                            readOnly
                            style={onViewProductCode
                                ? { ...disabledInputStyle, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }
                                : disabledInputStyle
                            }
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
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Tình trạng xếp xe">
                        {(() => {
                            const vs = declaration?.productCode?.vehicleStatus;
                            const mid = declaration?.productCode?.manifestId;
                            const opt = MANIFEST_STATUS_OPTIONS.find(o => o.value === vs);
                            return (
                                <Space>
                                    {opt ? (
                                        <Tag
                                            color={opt.color}
                                            style={mid ? { cursor: 'pointer' } : undefined}
                                            onClick={mid ? () => { setPeekManifestId(mid); setPeekManifestVisible(true); } : undefined}
                                        >
                                            {opt.label}{mid && ' ↗'}
                                        </Tag>
                                    ) : (
                                        <Tag color="default">Chưa xếp xe</Tag>
                                    )}
                                    {declaration?.productCode?.vehicleStatusOverridden && (
                                        <span style={{ color: '#faad14', fontSize: 12 }}>⚠ Thủ công</span>
                                    )}
                                </Space>
                            );
                        })()}
                    </Form.Item>
                </Col>
            </Row>
        </>
    );

    const tabItems = [
        {
            key: TAB_KEYS.DECLARATION,
            label: <span><FileSearchOutlined /> {t('declaration.tabCalculation')}</span>,
            children: declarationTabContent,
        },
        {
            key: TAB_KEYS.MERCHANDISE,
            label: <span><InboxOutlined /> {t('declaration.tabProductItem')}</span>,
            children: merchandiseTabContent,
        },
        {
            key: TAB_KEYS.PRODUCT_CODE,
            label: <span><FileTextOutlined /> {t('declaration.tabProductCode')}</span>,
            children: productCodeTabContent,
        },
    ];

    return (
        <Modal
            open={visible}
            title={isViewMode ? t('declaration.viewDetail', 'Xem chi tiết khai báo') : t('declaration.edit')}
            footer={[
                isViewMode && userRole === 'ADMIN' && (
                    <Button key="edit" type="primary" icon={<EditOutlined />}
                        onClick={() => onSwitchToEdit?.()}
                    >
                        Chỉnh sửa khai báo
                    </Button>
                ),
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
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                />
            </Form>

            <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={handleCancelPreview}
            >
                <img alt="preview" style={{ width: '100%' }} src={previewImage} />
            </Modal>

            {/* Quick Peek — Manifest (Rule 16) */}
            {peekManifestVisible && (
                <ManifestModal
                    visible={peekManifestVisible}
                    mode="view"
                    manifestId={peekManifestId}
                    onClose={() => setPeekManifestVisible(false)}
                    onSuccess={() => setPeekManifestVisible(false)}
                />
            )}
        </Modal>
    );
};

export default DeclarationModal;
