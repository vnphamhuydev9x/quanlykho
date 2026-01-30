import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Space } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    DashboardOutlined,
    GlobalOutlined,
    SettingOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/login');
    };

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

    const userMenu = [
        {
            key: 'profile',
            label: t('menu.profile'),
            icon: <UserOutlined />,
        },
        {
            key: 'logout',
            label: t('menu.logout'),
            icon: <LogoutOutlined />,
            danger: true,
            onClick: handleLogout,
        },
    ];

    const menuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: t('menu.dashboard'),
            onClick: () => navigate('/'),
        },
        {
            key: '/settings',
            icon: <SettingOutlined />,
            label: t('menu.settings'),
        },
        {
            key: '/warehouse',
            icon: <UserOutlined />,
            label: t('menu.warehouse'),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={250}>
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? 0 : '0 24px',
                    borderBottom: '1px solid #f0f0f0',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: 18, color: '#1890ff' }}>
                        {collapsed ? t('app.shortName') : t('app.name')}
                    </div>
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64, marginLeft: -24 }}
                    />

                    <Space size={24}>
                        <Dropdown menu={{ items: languageItems }} placement="bottomRight">
                            <Button type="text" icon={<GlobalOutlined />}>
                                {t('header.language')}
                            </Button>
                        </Dropdown>

                        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} />
                                <Text strong>Admin</Text>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: '#fff',
                        borderRadius: 8,
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
