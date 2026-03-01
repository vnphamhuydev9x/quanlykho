import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Space, Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import CustomNumberInput from '../../components/CustomNumberInput';
import { PACKAGE_UNIT_OPTIONS } from '../../constants/enums';
import { formatCurrency } from '../../utils/format';

const { Option } = Select;
const { TextArea } = Input;
const Col2 = ({ children }) => <Col xs={24} md={12}>{children}</Col>;

const ProductItemModal = ({ visible, onClose, onSave, initialValues, viewOnly, exchangeRate, onViewDeclaration }) => {
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
            title={initialValues ? "Sửa mặt hàng" : "Thêm mặt hàng mới"}
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            width={1500}
            footer={
                <Space>
                    <Button onClick={onClose}>{t('common.cancel', 'Huỷ')}</Button>
                    {!viewOnly && (
                        <Button type="primary" loading={submitting} onClick={handleSubmit}>
                            {t('common.save', 'Lưu lại')}
                        </Button>
                    )}
                </Space>
            }
        >
            <Form form={form} layout="vertical" disabled={viewOnly}>
                <Row gutter={16}>
                    <Col2>
                        <Form.Item label="Tên mặt hàng" required>
                            <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Form.Item name="productName" noStyle rules={[{ required: true, message: 'Nhập tên' }]}>
                                    <Input placeholder="Nhập tên" style={{ width: '100%' }} />
                                </Form.Item>
                                {initialValues?.declaration?.id && (
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={() => onViewDeclaration && onViewDeclaration(initialValues.declaration.id)}
                                        style={{ padding: 0 }}
                                    >
                                        Khai báo đã tạo
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>
                    </Col2>
                    <Col2>
                    </Col2>
                    <Col2>
                        <Form.Item label="Số kiện">
                            <Space.Compact block>
                                <Form.Item name="packageCount" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kiện" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="packageUnit" label="Đơn vị kiện">
                            <Select placeholder="Chọn ĐVT">
                                {PACKAGE_UNIT_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col2>

                    <Col2>
                        <Form.Item label="Trọng lượng">
                            <Space.Compact block>
                                <Form.Item name="weight" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Cước cân">
                            <Space.Compact block>
                                <Form.Item name="weightFee" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Khối lượng">
                            <Space.Compact block>
                                <Form.Item name="volume" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Cước khối">
                            <Space.Compact block>
                                <Form.Item name="volumeFee" noStyle>
                                    <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phí dỡ hàng">
                            <Space.Compact block>
                                <Form.Item name="unloadingFeeRMB" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phí kéo hàng">
                            <Space.Compact block>
                                <Form.Item name="haulingFeeTQ" noStyle>
                                    <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                </Form.Item>
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item label="Phí nội địa">
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
                                    Cước TQ_HN tạm tính
                                    <Tooltip title="Tự động tính: Max(Khối lượng × Cước khối, Trọng lượng × Cước cân) + (Phí nội địa + Phí kéo hàng + Phí dỡ hàng) × Tỷ giá">
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
                        <Form.Item name="notes" label="Ghi chú">
                            <TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal >
    );
};

export default ProductItemModal;
