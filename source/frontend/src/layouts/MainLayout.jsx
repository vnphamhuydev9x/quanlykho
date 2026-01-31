import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Space, message } from 'antd';
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
import ChangePasswordModal from '../components/ChangePasswordModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // Get user info and check mustChangePassword
    const token = localStorage.getItem('access_token');
    let userRole = 'USER';
    let mustChangePassword = false;
    let username = 'User';

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
            mustChangePassword = payload.mustChangePassword;
            username = payload.username || 'User';
        } catch (e) {
            console.error("Invalid token");
        }
    }

    const [isForcePassModalVisible, setIsForcePassModalVisible] = useState(mustChangePassword);

    useEffect(() => {
        if (mustChangePassword) {
            setIsForcePassModalVisible(true);
        }
    }, [mustChangePassword]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/login');
    };

    const handleForceChangeSuccess = () => {
        setIsForcePassModalVisible(false);
        handleLogout();
        message.success(t('profile.changePasswordSuccess') + ' ' + t('common.pleaseLoginAgain'));
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
            onClick: () => navigate('/profile'),
        },
        {
            key: 'logout',
            label: t('menu.logout'),
            icon: <LogoutOutlined />,
            danger: true,
            onClick: handleLogout,
        },
    ];

    const items = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: t('menu.dashboard'),
            onClick: () => navigate('/'),
        },
        // Only Show Settings for ADMIN
        userRole === 'ADMIN' && {
            key: 'settings',
            icon: <SettingOutlined />,
            label: t('menu.settings'),
            children: [
                {
                    key: '/settings/employees',
                    label: t('menu.employees'),
                    onClick: () => navigate('/settings/employees'),
                }
            ],
        },
        // Warehouse Menu - Hidden for now or RBAC later
        /*
        {
            key: '/warehouse',
            icon: <DashboardOutlined />, // Changed icon
            label: t('menu.warehouse'),
        },
        */
    ].filter(Boolean);

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
                    items={items}
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
                                <Text strong>{username}</Text>
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
                <ChangePasswordModal
                    visible={isForcePassModalVisible}
                    forceChange={true}
                    onSuccess={handleForceChangeSuccess}
                />
            </Layout>
        </Layout>
    );
};

export default MainLayout;
