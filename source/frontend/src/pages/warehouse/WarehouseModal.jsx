import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
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
                    status: editingWarehouse.status,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    status: 'AVAILABLE',
                });
            }
        }
    }, [visible, editingWarehouse, form]);

    const handleOk = () => {
        form
            .validateFields()
            .then((values) => {
                onSuccess(values);
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            open={visible}
            title={editingWarehouse ? "Cập nhật Kho" : "Thêm mới Kho"}
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
                    label="Tên kho"
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input placeholder="Nhập tên kho" />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Trạng thái"
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Select>
                        <Option value="AVAILABLE">Khả dụng</Option>
                        <Option value="UNAVAILABLE">Không khả dụng</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default WarehouseModal;
