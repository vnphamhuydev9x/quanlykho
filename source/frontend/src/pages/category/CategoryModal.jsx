import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const CategoryModal = ({ visible, onCancel, onSuccess, editingCategory, viewOnly = false, userRole = 'USER', onSwitchToEdit }) => {
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
            title={viewOnly ? 'Xem loại hàng' : (editingCategory ? t('category.edit') : t('category.add'))}
            onCancel={onCancel}
            footer={[
                viewOnly && userRole === 'ADMIN' && (
                    <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => onSwitchToEdit?.()}>
                        Chỉnh sửa
                    </Button>
                ),
                <Button key="close" onClick={onCancel}>{t('common.cancel')}</Button>,
                !viewOnly && (
                    <Button key="ok" type="primary" onClick={handleOk}>{t('common.save')}</Button>
                )
            ].filter(Boolean)}
        >
            <Form form={form} layout="vertical" name="categoryForm" disabled={viewOnly}>
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
