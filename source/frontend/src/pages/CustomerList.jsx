import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Switch, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, EyeOutlined, DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axios';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';

const { Option } = Select;

const CustomerList = () => {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]); // List of Sale employees
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [form] = Form.useForm();
    const [userRole, setUserRole] = useState('');
    const location = useLocation();

    useEffect(() => {
        const userStr = localStorage.getItem('user_info');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
        }
    }, []);


    // Pagination & Search State
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });

    // Advanced Search State
    const [filters, setFilters] = useState({
        search: '',
        status: undefined, // undefined = All
        saleId: undefined  // undefined = All
    });

    const fetchCustomers = async (page = 1, limit = 20, currentFilters = filters) => {
        setLoading(true);
        try {
            const { search, status, saleId } = currentFilters;

            const params = {
                page,
                limit,
                search: search || undefined,
                status: status || undefined,
                saleId: saleId || undefined
            };

            const response = await axiosInstance.get('/customers', { params });
            const { customers, total, page: currentPage } = response.data.data;
            setCustomers(customers);
            setPagination(prev => ({
                ...prev,
                current: currentPage,
                pageSize: limit,
                total: total
            }));
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.code) {
                message.error(t(`error.${error.response.data.code}`));
            } else if (error.response && error.response.status === 403) {
                message.error(t('error.99008'));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch employees for the Sale selection
    const fetchEmployees = async () => {
        try {
            // Fetch all employees for dropdown (limit=0 means unlimited)
            const response = await axiosInstance.get('/employees', { params: { limit: 0 } });
            // Handle paginated response structure
            const employeeData = response.data.data.employees || [];
            setEmployees(employeeData);
        } catch (error) {
            console.error("Failed to fetch employees for selector", error);
            setEmployees([]);
        }
    };

    useEffect(() => {
        fetchCustomers(pagination.current, pagination.pageSize, filters);
        fetchEmployees();
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('action') === 'add') {
            setEditingCustomer(null);
            setIsViewMode(false);
            form.resetFields();
            setIsModalVisible(true);
        }
    }, [location.search]);

    const handleTableChange = (newPagination) => {
        fetchCustomers(newPagination.current, newPagination.pageSize, filters);
    };

    // Filter Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        // Reset to page 1 when searching
        fetchCustomers(1, pagination.pageSize, filters);
    };

    const handleClearFilter = () => {
        const newFilters = {
            search: '',
            status: undefined,
            saleId: undefined
        };
        setFilters(newFilters);
        fetchCustomers(1, pagination.pageSize, newFilters);
    };

    const handleAdd = () => {
        setEditingCustomer(null);
        form.resetFields();
        // Default status active
        form.setFieldsValue({ status: true });
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingCustomer(record);
        setIsViewMode(false);
        form.setFieldsValue(record); // record already has isActive boolean
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setEditingCustomer(record);
        setIsViewMode(true);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/customers/${id}`);
            message.success(t('customer.deleteSuccess'));
            fetchCustomers(pagination.current, pagination.pageSize);
        } catch (error) {
            message.error(t('error.UNKNOWN'));
        }
    };

    const handleResetPassword = async (id) => {
        try {
            const response = await axiosInstance.post(`/customers/${id}/reset-password`, {});
            const newPassword = response.data.data.newPassword;
            message.success(t('customer.resetPasswordSuccess', { password: newPassword }));
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    const handleSave = async (values) => {
        try {
            if (editingCustomer) {
                await axiosInstance.put(`/customers/${editingCustomer.id}`, values);
                message.success(t('customer.updateSuccess'));
            } else {
                await axiosInstance.post('/customers', values);
                message.success(t('customer.createSuccess'));
            }
            setIsModalVisible(false);
            fetchCustomers(pagination.current, pagination.pageSize);
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.code) {
                message.error(t(`error.${error.response.data.code}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    }


    const handleExport = async () => {
        try {
            setExportLoading(true);
            const response = await axiosInstance.get('/customers/export-data');
            const data = response.data.data;

            // Map data to localized headers and values
            const exportData = data.map(item => ({
                [t('common.id')]: item.id,
                [t('profile.customerUsername')]: item.username,
                [t('customer.fullName')]: item.fullName,
                [t('customer.phone')]: item.phone,
                [t('customer.address')]: item.address,
                [t('customer.status')]: item.isActive ? t('customer.active') : t('customer.inactive')
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "KhachHang");

            // Generate filename with date
            const date = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(workbook, `DanhSachKhachHang_${date}.xlsx`);

            message.success(t('customer.exportSuccess'));
        } catch (error) {
            console.error("Export Error", error);
            message.error(t('error.UNKNOWN'));
        } finally {
            setExportLoading(false);
        }
    };

    const columns = [
        {
            title: t('common.id'),
            dataIndex: 'id',
            key: 'id',
            width: 80,
            fixed: 'left',
        },
        {
            title: t('profile.customerUsername'),
            dataIndex: 'username',
            key: 'username',
            fixed: 'left',
            width: 150,
        },
        {
            title: t('customer.fullName'),
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: t('customer.totalPaid'),
            dataIndex: 'totalPaid',
            key: 'totalPaid',
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '0 ₫'}
                </span>
            ),
        },
        {
            title: t('customer.phone'),
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: t('customer.address'),
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: t('customer.sale'),
            dataIndex: 'saleId',
            key: 'saleId',
            render: (saleId) => {
                const emp = employees.find(e => e.id === saleId);
                return emp ? emp.fullName || emp.username : '-';
            }
        },
        {
            title: t('customer.status'),
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? t('customer.active') : t('customer.inactive')}
                </Tag>
            ),
        },
        {
            title: t('common.action'),
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EyeOutlined />} onClick={() => handleView(record)} title={t('common.view')} />
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} title={t('customer.edit')} />
                    <Popconfirm title={t('common.confirmResetPassword')} onConfirm={() => handleResetPassword(record.id)}>
                        <Button icon={<SyncOutlined />} style={{ color: '#fa541c', borderColor: '#fa541c' }} title={t('customer.resetPassword')} />
                    </Popconfirm>
                    <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger title={t('common.delete')} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={24} lg={12}>
                        <h2>{t('customer.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            {userRole === 'ADMIN' && (
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    style={{ backgroundColor: '#217346', color: '#fff', borderColor: '#217346' }}
                                >
                                    {t('common.exportExcel') || "Export Excel"}
                                </Button>
                            )}
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                {t('customer.add')}
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={24}>
                            <Input
                                placeholder={t('customer.title') + " (" + t('customer.fullName') + ", " + t('profile.customerUsername') + ", " + t('customer.phone') + ")"}
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={e => handleFilterChange('search', e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('common.filterByStatus')}
                                value={filters.status}
                                onChange={val => handleFilterChange('status', val)}
                                allowClear
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Option value="active">{t('customer.active')}</Option>
                                <Option value="inactive">{t('customer.inactive')}</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('common.filterBySale')}
                                value={filters.saleId}
                                onChange={val => handleFilterChange('saleId', val)}
                                allowClear
                                showSearch
                                size="large"
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {employees.map(emp => (
                                    <Option key={emp.id} value={emp.id}>
                                        {emp.fullName || emp.username}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={24} md={24} lg={10} style={{ textAlign: 'right' }}>
                            <Space>
                                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} size="large">
                                    {t('common.search')}
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={handleClearFilter} size="large">
                                    {t('common.clear')}
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </div>

            <Table
                columns={columns}
                dataSource={customers}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                size="small"
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '30', '40', '50'],
                    locale: { items_per_page: t('common.items_per_page') }, // Shorten text
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`, // Compact total
                }}
                onChange={handleTableChange}
            />

            <Modal
                title={isViewMode ? t('common.view') : (editingCustomer ? t('customer.edit') : t('customer.add'))}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>


                    <Form.Item
                        name="username"
                        label={t('profile.customerUsername')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input disabled={!!editingCustomer} />
                    </Form.Item>

                    {!editingCustomer && (
                        <Form.Item
                            name="password"
                            label={t('profile.newPassword')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input.Password disabled={isViewMode} />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="fullName"
                        label={t('customer.fullName')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item name="phone" label={t('customer.phone')}>
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item name="address" label={t('customer.address')}>
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item
                        name="saleId"
                        label={t('customer.sale')}
                    >
                        <Select
                            allowClear
                            placeholder={t('customer.sale')}
                            disabled={isViewMode}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {employees.map(emp => (
                                <Option key={emp.id} value={emp.id}>
                                    {emp.fullName || emp.username} ({t(`roles.${emp.role}`)})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isActive"
                        label={t('customer.status')}
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren={t('customer.active')} unCheckedChildren={t('customer.inactive')} disabled={isViewMode} />
                    </Form.Item>

                    {!isViewMode && (
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block>
                                {t('common.save')}
                            </Button>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default CustomerList;
