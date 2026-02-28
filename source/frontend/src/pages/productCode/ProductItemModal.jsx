import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Space, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import CustomNumberInput from '../../components/CustomNumberInput';
import { PACKAGE_UNIT_OPTIONS } from '../../constants/enums';

const { Option } = Select;
const { TextArea } = Input;
const Col2 = ({ children }) => <Col xs={24} md={12}>{children}</Col>;

const ProductItemModal = ({ visible, onClose, onSave, initialValues, viewOnly }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

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
            width={800}
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
                        <Form.Item name="productName" label="Tên mặt hàng" rules={[{ required: true, message: 'Nhập tên' }]}>
                            <Input placeholder="Nhập tên" />
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
                        <Form.Item name="packageCount" label="Số kiện">
                            <Space.Compact block>
                                <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kiện" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="weight" label="Trọng lượng">
                            <Space.Compact block>
                                <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="volume" label="Khối lượng">
                            <Space.Compact block>
                                <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="weightFee" label="Cước cân">
                            <Space.Compact block>
                                <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="volumeFee" label="Cước khối">
                            <Space.Compact block>
                                <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="domesticFeeTQ" label="Phí nội địa TQ">
                            <Space.Compact block>
                                <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="haulingFeeTQ" label="Phí kéo hàng TQ">
                            <Space.Compact block>
                                <CustomNumberInput min={0} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col2>
                        <Form.Item name="domesticFeeVN" label="Phí nội địa VN">
                            <Space.Compact block>
                                <CustomNumberInput min={0} isInteger={true} style={{ width: 'calc(100% - 60px)' }} />
                                <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="VND" disabled />
                            </Space.Compact>
                        </Form.Item>
                    </Col2>
                    <Col xs={24}>
                        <Form.Item name="notes" label="Ghi chú">
                            <TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default ProductItemModal;
