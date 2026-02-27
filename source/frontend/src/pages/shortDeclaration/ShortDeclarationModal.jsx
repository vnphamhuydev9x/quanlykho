import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axios';

const { TextArea } = Input;

const ShortDeclarationModal = ({ visible, onCancel, onSuccess, currentItem }) => {
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (currentItem) {
                // Formatting values for editing
                form.setFieldsValue({
                    ...currentItem,
                    importTaxRate: currentItem.importTaxRate ? Number(currentItem.importTaxRate) : null,
                    vatTaxRate: currentItem.vatTaxRate ? Number(currentItem.vatTaxRate) : null,
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, currentItem, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Payload conversion is handled in backend logic

            if (currentItem) {
                await axiosInstance.put(`/short-declarations/${currentItem.id}`, values);
                message.success(t('shortDeclaration.updateSuccess'));
            } else {
                await axiosInstance.post('/short-declarations', values);
                message.success(t('shortDeclaration.createSuccess'));
            }

            setLoading(false);
            onSuccess();
        } catch (error) {
            setLoading(false);
            // Handling Validation or Request errors
            if (error.response && error.response.data && error.response.data.code === 99015) {
                // Exact duplication error from backend
                const duplicatedId = error.response.data.data?.id || '';
                message.error(t('shortDeclaration.duplicateErrorId', { id: duplicatedId }));
            }
        }
    };

    return (
        <Modal
            title={currentItem ? t('shortDeclaration.edit') : t('shortDeclaration.add')}
            open={visible}
            onOk={handleOk}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            confirmLoading={loading}
            width={800}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item
                            name="productName"
                            label={t('shortDeclaration.productName')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <TextArea rows={3} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="hsCode"
                            label={t('shortDeclaration.hsCode')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="origin"
                            label={t('shortDeclaration.origin')}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="unit1"
                            label={t('shortDeclaration.unit1')}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="unit2"
                            label={t('shortDeclaration.unit2')}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="importTaxCode"
                            label={t('shortDeclaration.importTaxCode')}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="importTaxRate"
                            label={t('shortDeclaration.importTaxRate')}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={100}
                                precision={2}
                                step={0.01}
                                addonAfter="%"
                            />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="vatTaxCode"
                            label={t('shortDeclaration.vatTaxCode')}
                        >
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="vatTaxRate"
                            label={t('shortDeclaration.vatTaxRate')}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={100}
                                precision={2}
                                step={0.01}
                                addonAfter="%"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default ShortDeclarationModal;
