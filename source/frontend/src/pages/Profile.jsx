import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, message, Spin, Typography, Space } from 'antd';
import { UserOutlined, EditOutlined, KeyOutlined, SaveOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axios';
import ChangePasswordModal from '../components/ChangePasswordModal';

const { Title } = Typography;

const Profile = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchProfile = async () => {
        try {
            const response = await axiosInstance.get('/profile');
            setUser(response.data.data);
        } catch (error) {
            console.error(error);
            message.error(t('error.99500'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleUpdateProfile = async (values) => {
        try {
            const response = await axiosInstance.put('/profile', values);
            setUser(response.data.data);
            setIsEditModalVisible(false);
            message.success(t('profile.updateSuccess'));
        } catch (error) {
            // Error handling logic...
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            <UserOutlined /> {t('profile.title')}
                        </span>
                        <Space>
                            {user?.type !== 'CUSTOMER' && (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        form.setFieldsValue(user);
                                        setIsEditModalVisible(true);
                                    }}
                                >
                                    {t('profile.edit')}
                                </Button>
                            )}
                            <Button
                                icon={<KeyOutlined />}
                                onClick={() => setIsPasswordModalVisible(true)}
                            >
                                {t('profile.changePassword')}
                            </Button>
                        </Space>
                    </div>
                }
                extra={null}
            >
                <Descriptions bordered column={1}>
                    <Descriptions.Item label={user?.type === 'CUSTOMER' ? t('profile.customerUsername') : t('profile.username')}>{user?.username}</Descriptions.Item>
                    <Descriptions.Item label={t('profile.fullName')}>{user?.fullName || '-'}</Descriptions.Item>

                    {/* Email is not collected for Customers */}
                    {user?.type !== 'CUSTOMER' && (
                        <Descriptions.Item label={t('profile.email')}>{user?.email || '-'}</Descriptions.Item>
                    )}

                    <Descriptions.Item label={t('profile.phone')}>{user?.phone || '-'}</Descriptions.Item>

                    {/* Address is hidden as requested */}

                    <Descriptions.Item label={t('profile.role')}>
                        {t(`roles.${user?.role}`, user?.role)}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Edit Profile Modal */}
            <Modal
                title={t('profile.edit')}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdateProfile}
                >
                    <Form.Item name="fullName" label={t('profile.fullName')}>
                        <Input />
                    </Form.Item>

                    {user?.type !== 'CUSTOMER' && (
                        <Form.Item name="email" label={t('profile.email')} rules={[{ type: 'email' }]}>
                            <Input />
                        </Form.Item>
                    )}

                    <Form.Item name="phone" label={t('profile.phone')}>
                        <Input />
                    </Form.Item>

                    {user?.type === 'CUSTOMER' && (
                        <Form.Item name="address" label={t('profile.address')}>
                            <Input />
                        </Form.Item>
                    )}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} block>
                            {t('common.save')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <ChangePasswordModal
                visible={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                onSuccess={() => setIsPasswordModalVisible(false)}
            />
        </div>
    );
};

export default Profile;
