import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Space, message, Drawer, Grid, Badge, Tooltip } from 'antd';
const { useBreakpoint } = Grid;
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    DashboardOutlined,
    GlobalOutlined,
    SettingOutlined,
    LogoutOutlined,
    TeamOutlined, // Added TeamOutlined
    HomeOutlined, // Added HomeOutlined
    FileTextOutlined, // Added FileTextOutlined

    InboxOutlined,
    ShoppingOutlined,
    BarChartOutlined,
    PieChartOutlined,
    CarOutlined,
    CreditCardOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axios';
import ChangePasswordModal from '../components/ChangePasswordModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint();
    const [drawerVisible, setDrawerVisible] = useState(false);

    useEffect(() => {
        if (screens.md) {
            setDrawerVisible(false);
        }
    }, [screens.md]);

    const showDrawer = () => {
        setDrawerVisible(true);
    };

    const onClose = () => {
        setDrawerVisible(false);
    };

    // Get user info and check mustChangePassword
    const token = localStorage.getItem('access_token');
    let userRole = 'USER';
    let userType = 'USER';
    let mustChangePassword = false;
    let username = 'User';

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
            userType = payload.type;
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

    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async () => {
        if (userType === 'CUSTOMER') {
            try {
                const response = await axiosInstance.get('/notifications');
                if (response.data && response.data.data) {
                    setNotifications(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        }
    };

    const markNotificationsAsRead = async () => {
        if (notifications.length > 0) {
            try {
                await axiosInstance.put('/notifications/read');
                setNotifications([]);
            } catch (error) {
                console.error("Failed to mark notifications as read", error);
            }
        }
    };

    useEffect(() => {
        if (userType === 'CUSTOMER') {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [userType]);

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
        {
            key: '/customers',
            icon: <TeamOutlined />,
            label: t('menu.customers'),
            onClick: () => navigate('/customers'),
        },
        {
            key: '/transactions',
            icon: <CreditCardOutlined />,
            label: t('menu.transactions'),
            onClick: () => navigate('/transactions'),
        },
        {
            key: '/declarations',
            icon: <FileTextOutlined />,
            label: t('menu.declarations'),
            onClick: () => navigate('/declarations'),
        },
        {
            key: 'product-codes',
            icon: <InboxOutlined />,
            label: t('menu.productCodes'),
            children: [
                {
                    key: '/product-codes',
                    label: (
                        <div
                            style={{ display: 'flex', alignItems: 'center', width: '100%' }}
                            onMouseEnter={() => {
                                if (userType === 'CUSTOMER' && notifications.length > 0) {
                                    // Start a timer when hovering
                                    window.notiTimer = setTimeout(() => {
                                        window.shouldMarkRead = true;
                                    }, 1000); // Must hover for at least 1s
                                }
                            }}
                            onMouseLeave={() => {
                                // Clear timer and mark as read if it was hovered long enough
                                clearTimeout(window.notiTimer);
                                if (window.shouldMarkRead) {
                                    markNotificationsAsRead();
                                    window.shouldMarkRead = false;
                                }
                            }}
                        >
                            <span>{t('productCode.statusAll') || 'Tất cả'}</span>
                            {userType === 'CUSTOMER' && notifications.length > 0 && (
                                <Tooltip
                                    title={
                                        <div style={{ whiteSpace: 'pre-line', padding: '4px' }}>
                                            {notifications.map(n => n.content).join('\n')}
                                        </div>
                                    }
                                    placement="right"
                                    mouseLeaveDelay={1.5} // Keep tooltip visible for 1.5s after leaving
                                >
                                    <Badge count={notifications.length} size="small" style={{ marginLeft: '8px' }} title="" />
                                </Tooltip>
                            )}
                        </div>
                    ),
                    onClick: () => {
                        if (userType === 'CUSTOMER') markNotificationsAsRead();
                        navigate('/product-codes');
                    },
                },
                {
                    key: '/product-codes?status=NHAP_KHO_TQ',
                    label: t('productCode.statusNhapKho') || 'Nhập kho TQ',
                    onClick: () => navigate('/product-codes?status=NHAP_KHO_TQ'),
                },
                {
                    key: '/product-codes?status=CHO_XEP_XE',
                    label: t('productCode.statusChoXepXe') || 'Chờ xếp xe',
                    onClick: () => navigate('/product-codes?status=CHO_XEP_XE'),
                },
                {
                    key: '/product-codes?status=DA_XEP_XE',
                    label: t('productCode.statusDaXepXe') || 'Đã xếp xe',
                    onClick: () => navigate('/product-codes?status=DA_XEP_XE'),
                },
                {
                    key: '/product-codes?status=KIEM_HOA',
                    label: t('productCode.statusKiemHoa') || 'Kiểm hóa',
                    onClick: () => navigate('/product-codes?status=KIEM_HOA'),
                },
                {
                    key: '/product-codes?status=CHO_THONG_QUAN_VN',
                    label: t('productCode.statusChoThongQuanVN') || 'Chờ thông quan VN',
                    onClick: () => navigate('/product-codes?status=CHO_THONG_QUAN_VN'),
                },
                {
                    key: '/product-codes?status=NHAP_KHO_VN',
                    label: t('productCode.statusNhapKhoVN') || 'Nhập kho VN',
                    onClick: () => navigate('/product-codes?status=NHAP_KHO_VN'),
                },
                {
                    key: '/product-codes?status=XUAT_DU',
                    label: t('productCode.statusXuatDu') || 'Đã xuất kho',
                    onClick: () => navigate('/product-codes?status=XUAT_DU'),
                },
                {
                    key: '/product-codes?status=XUAT_THIEU',
                    label: t('productCode.statusXuatThieu') || 'Hàng không tên',
                    onClick: () => navigate('/product-codes?status=XUAT_THIEU'),
                }
            ],
        },
        {
            key: '/manifests',
            icon: <CarOutlined />,
            label: t('menu.manifests'),
            onClick: () => navigate('/manifests'),
        },
        {
            key: 'inventory',
            icon: <HomeOutlined />,
            label: t('menu.inventory'),
            children: [
                {
                    key: '/product-codes?inventory=TQ',
                    label: t('menu.inventoryTQ') || 'Tồn kho TQ',
                    onClick: () => navigate('/product-codes?inventory=TQ'),
                },
                {
                    key: '/product-codes?inventory=VN',
                    label: t('menu.inventoryVN') || 'Tồn kho VN',
                    onClick: () => navigate('/product-codes?inventory=VN'),
                }
            ],
        },
        {
            key: '/product-codes?status=XUAT_DU',
            icon: <ExportOutlined />,
            label: t('menu.export'),
            onClick: () => navigate('/product-codes?status=XUAT_DU'),
        },
        {
            key: '/reports',
            icon: <BarChartOutlined />,
            label: t('menu.reports'),
            onClick: () => navigate('/reports'),
        },
        {
            key: '/merchandise',
            icon: <ShoppingOutlined />,
            label: t('menu.merchandise') || 'Hàng hóa',
            onClick: () => navigate('/merchandise'),
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: t('menu.settings'),
            children: [
                {
                    key: '/settings/warehouses',
                    label: t('menu.warehouseVN'),
                    onClick: () => navigate('/settings/warehouses'),
                },
                {
                    key: '/settings/categories',
                    label: t('menu.categories'),
                    onClick: () => navigate('/settings/categories'),
                },
                {
                    key: '/settings/employees',
                    label: t('menu.employees'),
                    onClick: () => navigate('/settings/employees'),
                }
            ],
        },
    ].filter(Boolean);

    let menuItems = items;
    if (userType === 'CUSTOMER') {
        menuItems = items.filter(item => item.key === '/' || item.key === 'product-codes');
    }

    const currentKey = location.pathname + location.search;
    const defaultOpenKeys = userType === 'CUSTOMER' ? ['product-codes'] : [];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Desktop Sider */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                width={250}
                breakpoint="md"
                collapsedWidth="0"
                onBreakpoint={(broken) => {
                    // console.log(broken);
                }}
                style={{
                    display: screens.md ? 'block' : 'none'
                }}
            >
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
                    selectedKeys={[currentKey]}
                    defaultOpenKeys={defaultOpenKeys}
                    items={menuItems}
                />
            </Sider>
            {/* Mobile Drawer */}
            <Drawer
                placement="left"
                onClose={onClose}
                open={drawerVisible}
                styles={{ body: { padding: 0 }, content: { width: 250 } }}
            >
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: 18, color: '#1890ff' }}>
                        {t('app.name')}
                    </div>
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[currentKey]}
                    defaultOpenKeys={defaultOpenKeys}
                    items={menuItems}
                    onClick={onClose}
                />
            </Drawer>
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
                        icon={!screens.md ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => !screens.md ? showDrawer() : setCollapsed(!collapsed)}
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
