/**
 * @module notification
 * @SD_Ref 03_1_notification_SD.md
 * @SD_Version SD-v1.0.1
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Space, message, Drawer, Grid, Badge, Tooltip, List } from 'antd';
const { useBreakpoint } = Grid;
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    DashboardOutlined,
    GlobalOutlined,
    SettingOutlined,
    LogoutOutlined,
    TeamOutlined,
    HomeOutlined,
    FileTextOutlined,
    InboxOutlined,
    ShoppingOutlined,
    BarChartOutlined,
    CarOutlined,
    CreditCardOutlined,
    ExportOutlined,
    BellOutlined,
    CustomerServiceOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const LANDING_PAGE_URL = import.meta.env.VITE_LANDING_PAGE_URL || '/consulting';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axios';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { ROLES, NOTIFICATION_TYPE } from '../constants/enums';

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
    let fullName = '';

    if (token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const payload = JSON.parse(new TextDecoder().decode(bytes));
            userRole = payload.role;
            userType = payload.type;
            mustChangePassword = payload.mustChangePassword;
            username = payload.username || 'User';
            fullName = payload.fullName || '';
        } catch (e) {
            console.error("Invalid token");
        }
    }

    const getInitials = (name) => {
        if (!name) return 'U';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0][0].toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    const [isForcePassModalVisible, setIsForcePassModalVisible] = useState(mustChangePassword);

    useEffect(() => {
        if (mustChangePassword) {
            setIsForcePassModalVisible(true);
        }
    }, [mustChangePassword]);

    const [notifications, setNotifications] = useState([]);
    const [staffBellOpen, setStaffBellOpen] = useState(false);
    const [dropdownItems, setDropdownItems] = useState([]);
    // -1 = chưa khởi tạo lần đầu (tránh false-positive dispatch khi load trang)
    const prevNotifCountRef = useRef(-1);

    // Cập nhật browser tab title theo số notification chưa đọc
    useEffect(() => {
        const count = notifications.length;
        document.title = count > 0
            ? `(${count}) 3T Group Management`
            : '3T Group Management';
    }, [notifications]);

    // Staff roles nhận inquiry notifications
    const isStaffWithNotif = ROLES.ADMIN === userRole || ROLES.SALE === userRole || ROLES.CHUNG_TU === userRole;

    const fetchNotifications = async () => {
        try {
            const response = await axiosInstance.get('/notifications');
            if (response.data && response.data.data) {
                const data = response.data.data;
                // SD §3.4: Khi phát hiện có noti mới loại INQUIRY → dispatch event để InquiryPage re-fetch
                const isInitialized = prevNotifCountRef.current !== -1;
                if (isInitialized && data.length > prevNotifCountRef.current &&
                    data.some(n => NOTIFICATION_TYPE.INQUIRY === n.type)) {
                    window.dispatchEvent(new CustomEvent('inquiry:refresh'));
                }
                prevNotifCountRef.current = data.length;
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Fetch tất cả noti (đọc + chưa đọc) để hiển thị trong dropdown
    const fetchDropdownItems = async () => {
        try {
            const response = await axiosInstance.get('/notifications/list', { params: { page: 1, limit: 10 } });
            if (response.data?.data?.items) {
                setDropdownItems(response.data.data.items);
            }
        } catch (_) {}
    };

    // Khi mở dropdown, fetch danh sách mới nhất
    useEffect(() => {
        if (staffBellOpen && isStaffWithNotif) {
            fetchDropdownItems();
        }
    }, [staffBellOpen]);

    const markAllAsRead = async () => {
        try {
            await axiosInstance.put('/notifications/read');
            setNotifications([]);
            // Refresh dropdown items để cập nhật màu đã đọc
            fetchDropdownItems();
        } catch (error) {
            console.error("Failed to mark notifications as read", error);
        }
    };

    // Giữ lại alias cũ để không break code CUSTOMER bên dưới
    const markNotificationsAsRead = markAllAsRead;

    useEffect(() => {
        if (userType === 'CUSTOMER' || isStaffWithNotif) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 5000);
            return () => clearInterval(interval);
        }
    }, [userType, userRole]);

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
            key: '/customer-inquiry',
            icon: <CustomerServiceOutlined />,
            label: t('menu.inquiry'),
            onClick: () => navigate('/customer-inquiry'),
        },
        /* 
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: t('menu.dashboard'),
            onClick: () => navigate('/'),
        },
        */
        import.meta.env.VITE_FEATURE_CUSTOMERS !== 'false' && {
            key: '/customers',
            icon: <TeamOutlined />,
            label: t('menu.customers'),
            onClick: () => navigate('/customers'),
        },
        import.meta.env.VITE_FEATURE_TRANSACTIONS !== 'false' && {
            key: '/transactions',
            icon: <CreditCardOutlined />,
            label: t('menu.transactions'),
            onClick: () => navigate('/transactions'),
        },
        import.meta.env.VITE_FEATURE_DECLARATIONS !== 'false' && {
            key: '/short-declarations',
            icon: <FileTextOutlined />,
            label: t('menu.shortDeclarations'),
            onClick: () => navigate('/short-declarations'),
        },
        import.meta.env.VITE_FEATURE_DECLARATIONS !== 'false' && {
            key: '/declarations',
            icon: <FileTextOutlined />,
            label: t('menu.declarations'),
            onClick: () => navigate('/declarations'),
        },
        import.meta.env.VITE_FEATURE_INVENTORY !== 'false' && {
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
                    key: '/product-codes?status=NHAP_KHO',
                    label: t('productCode.statusNhapKho') || 'Nhập kho',
                    onClick: () => navigate('/product-codes?status=NHAP_KHO'),
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
                    key: '/product-codes?status=DANG_KIEM_HOA',
                    label: t('productCode.statusDangKiemHoa') || 'Đang kiểm hóa',
                    onClick: () => navigate('/product-codes?status=DANG_KIEM_HOA'),
                },
                {
                    key: '/product-codes?status=CHO_THONG_QUAN',
                    label: t('productCode.statusChoThongQuan') || 'Chờ thông quan',
                    onClick: () => navigate('/product-codes?status=CHO_THONG_QUAN'),
                },
                {
                    key: '/product-codes?status=DA_THONG_QUAN',
                    label: t('productCode.statusDaThongQuan') || 'Đã thông quan',
                    onClick: () => navigate('/product-codes?status=DA_THONG_QUAN'),
                },
                {
                    key: '/product-codes?status=DA_NHAP_KHO_VN',
                    label: t('productCode.statusDaNhapKhoVN') || 'Đã nhập kho VN',
                    onClick: () => navigate('/product-codes?status=DA_NHAP_KHO_VN'),
                }
            ],
        },
        import.meta.env.VITE_FEATURE_INVENTORY !== 'false' && {
            key: '/manifests',
            icon: <CarOutlined />,
            label: t('menu.manifests'),
            onClick: () => navigate('/manifests'),
        },
        import.meta.env.VITE_FEATURE_INVENTORY !== 'false' && {
            key: 'export-orders-parent',
            icon: <ExportOutlined />,
            label: t('menu.export') || 'Xuất kho',
            children: [
                {
                    key: '/export-orders',
                    label: t('exportOrder.statusAll') || 'Tất cả',
                    onClick: () => navigate('/export-orders'),
                },
                {
                    key: '/export-orders?status=DA_TAO_LENH',
                    label: t('exportOrder.statusDaTaoLenh') || 'Đã tạo lệnh',
                    onClick: () => navigate('/export-orders?status=DA_TAO_LENH'),
                },
                {
                    key: '/export-orders?status=DANG_XAC_NHAN_CAN',
                    label: t('exportOrder.statusDangXacNhanCan') || 'Đang xác nhận cân',
                    onClick: () => navigate('/export-orders?status=DANG_XAC_NHAN_CAN'),
                },
                {
                    key: '/export-orders?status=DA_XAC_NHAN_CAN',
                    label: t('exportOrder.statusDaXacNhanCan') || 'Đã xác nhận cân',
                    onClick: () => navigate('/export-orders?status=DA_XAC_NHAN_CAN'),
                },
                {
                    key: '/export-orders?status=DA_XUAT_KHO',
                    label: t('exportOrder.statusDaXuatKho') || 'Đã xuất kho',
                    onClick: () => navigate('/export-orders?status=DA_XUAT_KHO'),
                },
            ]
        },
        import.meta.env.VITE_FEATURE_INVENTORY !== 'false' && {
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
        import.meta.env.VITE_FEATURE_TRANSACTIONS !== 'false' && {
            key: 'reports-parent',
            icon: <BarChartOutlined />,
            label: t('menu.reports'),
            children: [
                {
                    key: '/bao-cao/cong-no',
                    label: t('menu.debt'),
                    onClick: () => navigate('/bao-cao/cong-no'),
                },
            ],
        },
        import.meta.env.VITE_FEATURE_INVENTORY !== 'false' && {
            key: '/merchandise',
            icon: <ShoppingOutlined />,
            label: t('menu.merchandise') || 'Hàng hóa',
            onClick: () => navigate('/merchandise'),
        },
        ROLES.ADMIN === userRole && {
            key: 'settings',
            icon: <SettingOutlined />,
            label: t('menu.settings'),
            children: [
                import.meta.env.VITE_FEATURE_SETTINGS !== 'false' && {
                    key: '/settings/warehouses',
                    label: t('menu.warehouseVN'),
                    onClick: () => navigate('/settings/warehouses'),
                },
                {
                    key: '/settings/employees',
                    label: t('menu.employees'),
                    onClick: () => navigate('/settings/employees'),
                },
                import.meta.env.VITE_FEATURE_SETTINGS !== 'false' && {
                    key: '/settings/merchandise-conditions',
                    label: t('menu.merchandiseConditions'),
                    onClick: () => navigate('/settings/merchandise-conditions'),
                },
                import.meta.env.VITE_FEATURE_SETTINGS !== 'false' && {
                    key: '/settings/categories',
                    label: t('menu.categories'),
                    onClick: () => navigate('/settings/categories'),
                }
            ].filter(Boolean),
        },
    ].filter(Boolean);

    let menuItems = items;
    if (userType === 'CUSTOMER') {
        menuItems = items.filter(item => item.key === '/' || item.key === 'product-codes');
    } else if (ROLES.CHUNG_TU === userRole) {
        menuItems = items.filter(item => item.key === '/customer-inquiry');
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

                        {/* Notification bell — chỉ cho ADMIN/SALE/CHUNG_TU */}
                        {isStaffWithNotif && (
                            <Dropdown
                                open={staffBellOpen}
                                onOpenChange={setStaffBellOpen}
                                placement="bottomRight"
                                trigger={['click']}
                                dropdownRender={() => (
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: 8,
                                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                                        width: 380,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        maxHeight: 520,
                                    }}>
                                        {/* Header — cố định */}
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                            <Text strong>{t('notification.title')}</Text>
                                            {notifications.length > 0 && (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={() => { markAllAsRead(); setStaffBellOpen(false); }}
                                                >
                                                    {t('notification.markAllRead')}
                                                </Button>
                                            )}
                                        </div>
                                        {/* Body — scrollable */}
                                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                        {dropdownItems.length === 0 ? (
                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#bbb' }}>
                                                {t('notification.empty')}
                                            </div>
                                        ) : (() => {
                                            const today = dayjs().format('YYYY-MM-DD');
                                            const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
                                            const groups = {};
                                            dropdownItems.forEach(item => {
                                                const d = dayjs(item.createdAt).format('YYYY-MM-DD');
                                                if (!groups[d]) groups[d] = [];
                                                groups[d].push(item);
                                            });
                                            return Object.entries(groups)
                                                .sort(([a], [b]) => b.localeCompare(a))
                                                .map(([date, gItems]) => {
                                                    const label = date === today ? t('common.today') : date === yesterday ? t('common.yesterday') : dayjs(date).format('DD/MM/YYYY');
                                                    return (
                                                        <div key={date}>
                                                            <div style={{ padding: '6px 16px 2px', fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
                                                            {gItems.map(item => (
                                                                <div
                                                                    key={item.id}
                                                                    style={{
                                                                        padding: '10px 16px',
                                                                        cursor: 'pointer',
                                                                        borderBottom: '1px solid #f5f5f5',
                                                                        background: item.isRead ? 'transparent' : '#e6f4ff',
                                                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                                                    }}
                                                                    onClick={() => {
                                                                        if (!item.isRead) {
                                                                            // Chỉ mark notification này là đã đọc
                                                                            axiosInstance.put(`/notifications/${item.id}/read`).catch(() => {});
                                                                            setDropdownItems(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
                                                                            setNotifications(prev => prev.filter(n => n.id !== item.id));
                                                                        }
                                                                        setStaffBellOpen(false);
                                                                        if (item.refId) {
                                                                            navigate(`/customer-inquiry?inquiryId=${item.refId}`);
                                                                        } else {
                                                                            navigate('/customer-inquiry');
                                                                        }
                                                                    }}
                                                                >
                                                                    <CustomerServiceOutlined style={{ color: item.isRead ? '#aaa' : '#1890ff', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                                                                    <div>
                                                                        <Text style={{ fontSize: 13, fontWeight: item.isRead ? 'normal' : 500, display: 'block' }}>
                                                                            {(() => { try { const p = JSON.parse(item.content); return p.key ? t(p.key, p.params) : item.content; } catch { return item.content; } })()}
                                                                        </Text>
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.createdAt).format('HH:mm')}</Text>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                });
                                        })()}
                                        </div>
                                        {/* Footer — pin cố định ở dưới */}
                                        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', flexShrink: 0 }}>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => { setStaffBellOpen(false); navigate('/notification-history'); }}
                                            >
                                                {t('notification.viewAll')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            >
                                <Badge count={notifications.length} size="small">
                                    <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
                                </Badge>
                            </Dropdown>
                        )}

                        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ backgroundColor: '#1677ff', color: '#fff', fontWeight: 600 }}>
                                    {getInitials(fullName || username)}
                                </Avatar>
                                <Text strong>{fullName || username}</Text>
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
