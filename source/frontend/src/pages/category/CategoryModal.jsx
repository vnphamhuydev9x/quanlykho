import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const CategoryModal = ({ visible, onCancel, onSuccess, editingCategory }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (editingCategory) {
                form.setFieldsValue({
                    name: editingCategory.name,
                    status: editingCategory.status === 'AVAILABLE' // Convert Enum to Boolean for Switch
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    status: true // Default to true (AVAILABLE)
                });
            }
        }
    }, [visible, editingCategory, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            // Convert Boolean back to Enum for API
            const submitData = {
                ...values,
                status: values.status ? 'AVAILABLE' : 'UNAVAILABLE'
            };
            onSuccess(submitData);
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    return (
        <Modal
            open={visible}
            title={editingCategory ? t('category.edit') : t('category.add')}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
            onCancel={onCancel}
            onOk={handleOk}
        >
            <Form
                form={form}
                layout="vertical"
                name="categoryForm"
            >
                <Form.Item
                    name="name"
                    label={t('category.name')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="status"
                    label={t('category.status')}
                    valuePropName="checked"
                    initialValue={true}
                >
                    <Switch
                        checkedChildren={t('category.available')}
                        unCheckedChildren={t('category.unavailable')}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CategoryModal;
