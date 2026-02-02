import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ChangePasswordModal = ({ visible, onCancel, onSuccess, forceChange = false }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const handleChangePassword = async (values) => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.post('http://localhost:3000/api/profile/change-password', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(t('profile.changePasswordSuccess'));
            form.resetFields();
            if (onSuccess) onSuccess();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    return (
        <Modal
            title={forceChange ? t('profile.forceChangeTitle') : t('profile.changePassword')}
            open={visible}
            onCancel={forceChange ? null : onCancel} // Cannot close if forced
            footer={null}
            maskClosable={!forceChange}
            closable={!forceChange}
            keyboard={!forceChange}
        >
            {forceChange && (
                <div style={{ marginBottom: 16, color: 'red' }}>
                    {t('profile.forceChangeMessage')}
                </div>
            )}
            <Form
                form={form}
                layout="vertical"
                onFinish={handleChangePassword}
            >
                <Form.Item
                    name="currentPassword"
                    label={t('profile.currentPassword')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="newPassword"
                    label={t('profile.newPassword')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="confirmPassword"
                    label={t('profile.confirmPassword')}
                    dependencies={['newPassword']}
                    hasFeedback
                    rules={[
                        { required: true, message: t('validation.required') },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('validation.passwordMismatch')));
                            },
                        }),
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} block>
                        {t('common.save')}
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ChangePasswordModal;
