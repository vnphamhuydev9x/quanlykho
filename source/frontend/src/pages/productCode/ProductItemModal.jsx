import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Space, Button, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import CustomNumberInput from '../../components/CustomNumberInput';
import { PACKAGE_UNIT_OPTIONS } from '../../constants/enums';
import { formatCurrency } from '../../utils/format';

const { Option } = Select;
const { TextArea } = Input;
const Col2 = ({ children }) => <Col xs={24} md={12}>{children}</Col>;

const ProductItemModal = ({ visible, onClose, onSave, initialValues, viewOnly, exchangeRate, onViewDeclaration, userRole = 'USER', onSwitchToEdit }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const weightFee = Number(Form.useWatch('weightFee', form)) || 0;
    const weight = Number(Form.useWatch('weight', form)) || 0;
    const volumeFee = Number(Form.useWatch('volumeFee', form)) || 0;
    const volume = parseFloat(Form.useWatch('volume', form)) || 0;
    const domesticFeeTQ = parseFloat(Form.useWatch('domesticFeeTQ', form)) || 0;
    const haulingFeeTQ = parseFloat(Form.useWatch('haulingFeeTQ', form)) || 0;
    const unloadingFeeRMB = parseFloat(Form.useWatch('unloadingFeeRMB', form)) || 0;

    const feeByVolume = volumeFee * volume;
    const feeByWeight = weightFee * weight;
    const maxFeeForItem = Math.max(feeByVolume || 0, feeByWeight || 0);
    const extraFeeVND = (domesticFeeTQ + haulingFeeTQ + unloadingFeeRMB) * (exchangeRate || 0);
    const itemFeeEstimate = maxFeeForItem + extraFeeVND;

    useEffect(() => {
        if (visible) {
            form.resetFields();
            if (initialValues) {
                form.setFieldsValue(initialValues);
            }
        }
    }, [visible, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            onSave(values);
        } catch (error) {
            // Validation failed
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={viewOnly ? 'Xem chi tiet mat hang' : (initialValues ? 'Sua mat hang' : 'Them mat hang moi')}
            open={visible}
            onCancel={onClose}
            width={1500}
            footer={[
                viewOnly && userRole === 'ADMIN' && (
                    <Button key="edit" type="primary" icon={<EditOutlined />}
                        onClick={() => onSwitchToEdit?.()}
                    >
                        Chinh sua mat hang
                    </Button>
                ),
                <Button key="close" onClick={onClose}>{viewOnly ? 'Dong' : t('common.cancel', 'Huy')}</Button>,
                !viewOnly && (
                    <Button key="save" type="primary" loading={submitting} onClick={handleSubmit}>
                        {t('common.save', 'Luu lai')}
                    </Button>
                )
            ].filter(Boolean)}
        >
            <Form form={form} layout="vertical" disabled={viewOnly}>
                <Row gutter={16}>
                    <Col2>
                        <Form.Item label="Ten mat hang" required>
                            <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Form.Item name="productName" noStyle rules={[{ required: true, message: 'Nhap ten' }]}>
                                    <Input placeholder="Nhap ten" style={{ width: '100%' }} />
                                </Form.Item>
                                {initialValues?.declaration?.id && (
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={() => onViewDeclaration && onViewDeclaration(initialValues.declaration.id)}
                                        style={{ padding: 0 }}
                                    >
                                        Khai bao da tao
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>
                    </Col2>
                    <Col2>
                    </Col2>
                    <Col2>
                        <Form.Item label="So kien">
                            <Space.Compact block>
                                <Form.Item name="packageCount" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kien" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="packageUnit" label="Don vi kien">
                            <Select placeholder="Chon DVT">
                                {PACKAGE_UNIT_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col2>

                    <Col2>
                        <Form.Item label="Trong luong">
                            <Space.Compact block>
                                <Form.Item name="weight" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Cuoc can">
                            <Space.Compact block>
                                <Form.Item name="weightFee" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Khoi luong">
                            <Space.Compact block>
                                <Form.Item name="volume" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m3" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Cuoc khoi">
                            <Space.Compact block>
                                <Form.Item name="volumeFee" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phi do hang">
                            <Space.Compact block>
                                <Form.Item name="unloadingFeeRMB" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phi keo hang">
                            <Space.Compact block>
                                <Form.Item name="haulingFeeTQ" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phi noi dia">
                            <Space.Compact block>
                                <Form.Item name="domesticFeeTQ" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>

                    <Col2>
                        <Form.Item
                            label={
                                <Space>
                                    Cuoc TQ_HN tam tinh
                                    <Tooltip title="Tu dong tinh: Max(Khoi luong x Cuoc khoi, Trong luong x Cuoc can) + (Phi noi dia + Phi keo hang + Phi do hang) x Ty gia">
                                        <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                    </Tooltip>
                                </Space>
                            }
                        >
                            <Input
                                value={formatCurrency(itemFeeEstimate, 'VND')}
                                readOnly
                                style={{
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    color: '#389e0d',
                                    backgroundColor: '#f5f5f5',
                                    cursor: 'default'
                                }}
                            />
                        </Form.Item>
                    </Col2>
                    <Col xs={24}>
                        <Form.Item name="notes" label="Ghi chu">
                            <TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal >
    );
};

export default ProductItemModal;
