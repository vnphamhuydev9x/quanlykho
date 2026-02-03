import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const WarehouseModal = ({ visible, onCancel, onSuccess, editingWarehouse }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (editingWarehouse) {
                form.setFieldsValue({
                    name: editingWarehouse.name,
                    status: editingWarehouse.status === 'AVAILABLE',
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    status: true, // Default AVAILABLE
                });
            }
        }
    }, [visible, editingWarehouse, form]);

    const handleOk = () => {
        form
            .validateFields()
            .then((values) => {
                const submitData = {
                    ...values,
                    status: values.status ? 'AVAILABLE' : 'UNAVAILABLE'
                };
                onSuccess(submitData);
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            open={visible}
            title={editingWarehouse ? t('common.edit') + " " + t('menu.warehouse') : t('warehouse.add') + " " + t('menu.warehouse')}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
            onCancel={onCancel}
            onOk={handleOk}
        >
            <Form
                form={form}
                layout="vertical"
                name="warehouse_form"
            >
                <Form.Item
                    name="name"
                    label={t('warehouse.name')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input placeholder={t('warehouse.name')} />
                </Form.Item>

                <Form.Item
                    name="status"
                    label={t('warehouse.status')}
                    valuePropName="checked"
                    initialValue={true}
                >
                    <Switch
                        checkedChildren={t('warehouse.available')}
                        unCheckedChildren={t('warehouse.unavailable')}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default WarehouseModal;
