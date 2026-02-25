import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

const MerchandiseConditionModal = ({ visible, onCancel, onSuccess, editingCondition, isViewOnly }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const isSystemStatus = editingCondition?.name_vi === 'Nhập kho';

    useEffect(() => {
        if (visible) {
            if (editingCondition) {
                form.setFieldsValue({
                    name_vi: editingCondition.name_vi,
                    name_zh: editingCondition.name_zh,
                    canLoadVehicle: editingCondition.canLoadVehicle
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    canLoadVehicle: false
                });
            }
        }
    }, [visible, editingCondition, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            const submitData = {
                ...values
            };
            onSuccess(submitData);
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    return (
        <Modal
            open={visible}
            title={isViewOnly ? (t('common.view') || 'Xem chi tiết') : (editingCondition ? t('merchandiseCondition.edit') : t('merchandiseCondition.add'))}
            okText={t('common.save')}
            cancelText={isViewOnly ? (t('common.close') || 'Đóng') : t('common.cancel')}
            onCancel={onCancel}
            onOk={handleOk}
            okButtonProps={{ style: { display: isViewOnly ? 'none' : 'inline-block' } }}
        >
            <Form
                form={form}
                layout="vertical"
                name="merchandiseConditionForm"
            >
                <Form.Item
                    name="name_vi"
                    label={t('merchandiseCondition.nameVi')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input disabled={isViewOnly || isSystemStatus} />
                </Form.Item>

                <Form.Item
                    name="name_zh"
                    label={t('merchandiseCondition.nameZh')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input disabled={isViewOnly || isSystemStatus} />
                </Form.Item>

                <Form.Item
                    name="canLoadVehicle"
                    label={t('merchandiseCondition.canLoadVehicle')}
                    valuePropName="checked"
                    initialValue={false}
                >
                    <Switch disabled={isViewOnly} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default MerchandiseConditionModal;
