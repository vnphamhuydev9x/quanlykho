import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Dropdown } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title } = Typography;

const Login = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const languageItems = [
        {
            key: 'vi',
            label: 'Tiếng Việt',
            onClick: () => changeLanguage('vi'),
        },
        {
            key: 'zh',
            label: '中文 (Tiếng Trung)',
            onClick: () => changeLanguage('zh'),
        },
    ];

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Call API
            const response = await axios.post('http://localhost:3000/api/auth/login', {
                username: values.username,
                password: values.password,
            });

            // Handle success
            const { token, user } = response.data;
            message.success(t('login.success'));

            // Save to LocalStorage
            localStorage.setItem('access_token', token);
            localStorage.setItem('user_info', JSON.stringify(user));

            navigate('/'); // Redirect to Dashboard
        } catch (error) {
            console.error('Login error:', error);
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else if (error.response) {
                message.error(error.response.data.message || t('login.failed'));
            } else if (error.request) {
                message.error('Không thể kết nối đến Server. Vui lòng kiểm tra Backend!');
            } else {
                message.error(t('error.UNKNOWN'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#f0f2f5',
            position: 'relative'
        }}>
            {/* Language Switcher */}
            <div style={{ position: 'absolute', top: 24, right: 24 }}>
                <Dropdown menu={{ items: languageItems }} placement="bottomRight">
                    <Button type="text" icon={<GlobalOutlined />}>
                        {i18n.language === 'vi' ? 'Tiếng Việt' : '中文'}
                    </Button>
                </Dropdown>
            </div>

            <Card style={{ maxWidth: 400, width: '90%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3}>{t('login.title')}</Title>
                    <Typography.Text type="secondary">{t('login.subtitle')}</Typography.Text>
                </div>

                <Form
                    name="normal_login"
                    className="login-form"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: t('login.requiredUsername') }]}
                    >
                        <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder={t('login.username')} />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: t('login.requiredPassword') }]}
                    >
                        <Input
                            prefix={<LockOutlined className="site-form-item-icon" />}
                            type="password"
                            placeholder={t('login.password')}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="login-form-button" block loading={loading}>
                            {t('login.submit')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
