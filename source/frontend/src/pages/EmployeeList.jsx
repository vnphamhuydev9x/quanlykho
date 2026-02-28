import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Switch, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axios';
import { STATUS_FILTER, ROLES, STATUS_FILTER_OPTIONS, ROLES_OPTIONS } from '../constants/enums';

const { Option } = Select;

const EmployeeList = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [form] = Form.useForm();

    // Pagination & Search State
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });


    // Advanced Search State
    const [filters, setFilters] = useState({
        search: '',
        status: undefined,
        role: undefined
    });

    const fetchEmployees = async (page = 1, limit = 20, currentFilters = filters) => {
        setLoading(true);
        try {
            const { search, status, role } = currentFilters;

            const params = {
                page,
                limit,
                search: search || undefined,
                status: status || undefined,
                role: role || undefined
            };

            const response = await axiosInstance.get('/employees', { params });

            const { employees, total, page: currentPage } = response.data.data;
            setEmployees(employees);
            setPagination(prev => ({
                ...prev,
                current: currentPage,
                pageSize: limit,
                total: total
            }));

        } catch (error) {
            console.error('Fetch Employees Error:', error);
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else if (error.response && error.response.status === 403) {
                message.error(t('error.99008'));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees(pagination.current, pagination.pageSize, filters);
    }, []);

    const handleTableChange = (newPagination) => {
        fetchEmployees(newPagination.current, newPagination.pageSize, filters);
    };

    const handleAdd = () => {
        setEditingEmployee(null);
        setIsViewMode(false);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingEmployee(record);
        setIsViewMode(false);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setEditingEmployee(record);
        setIsViewMode(true);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/employees/${id}`);
            message.success(t('employee.deleteSuccess'));
            fetchEmployees(pagination.current, pagination.pageSize);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    const handleResetPassword = async (id) => {
        try {
            const response = await axiosInstance.post(`/employees/${id}/reset-password`, {});
            const newPassword = response.data.data.newPassword;
            message.success(t('employee.resetPasswordSuccess', { password: newPassword }));
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
            if (editingEmployee) {
                await axiosInstance.put(`/employees/${editingEmployee.id}`, values);
                message.success(t('employee.updateSuccess'));
            } else {
                await axiosInstance.post('/employees', values);
                message.success(t('employee.createSuccess'));
            }
            setIsModalVisible(false);
            fetchEmployees(pagination.current, pagination.pageSize);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
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
            title: t('profile.username'),
            dataIndex: 'username',
            key: 'username',
            fixed: 'left',
            width: 150,
        },
        {
            title: t('profile.fullName'),
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: t('profile.email'),
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: t('profile.phone'),
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: t('profile.role'),
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color="blue">{t(`roles.${role}`)}</Tag>,
        },
        {
            title: t('employee.status'),
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? t('employee.active') : t('employee.inactive')}
                </Tag>
            ),
        },
        {
            title: t('common.action'),
            key: 'action',
            fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EyeOutlined />} onClick={() => handleView(record)} title={t('common.view')} />
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} title={t('employee.edit')} />
                    <Popconfirm title={t('common.confirmResetPassword')} onConfirm={() => handleResetPassword(record.id)}>
                        <Button icon={<SyncOutlined />} style={{ color: '#fa541c', borderColor: '#fa541c' }} title={t('employee.resetPassword')} />
                    </Popconfirm>
                    <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger title={t('common.delete')} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Filter Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        // Reset to page 1
        fetchEmployees(1, pagination.pageSize, filters);
    };

    const handleClearFilter = () => {
        const newFilters = {
            search: '',
            status: undefined,
            role: undefined
        };
        setFilters(newFilters);
        fetchEmployees(1, pagination.pageSize, newFilters);
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={24} lg={12}>
                        <h2>{t('employee.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                {t('employee.add')}
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={24}>
                            <Input
                                placeholder={t('employee.searchPlaceholder')}
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
                                {STATUS_FILTER_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('common.filterByRole')}
                                value={filters.role}
                                onChange={val => handleFilterChange('role', val)}
                                allowClear
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {ROLES_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
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
                dataSource={employees}
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
                title={isViewMode ? t('common.view') : (editingEmployee ? t('employee.edit') : t('employee.add'))}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="username"
                        label={t('profile.username')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input disabled={!!editingEmployee} />
                    </Form.Item>

                    {!editingEmployee && (
                        <Form.Item
                            name="password"
                            label={t('profile.newPassword')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input.Password disabled={isViewMode} />
                        </Form.Item>
                    )}

                    <Form.Item name="fullName" label={t('profile.fullName')}>
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item name="email" label={t('profile.email')}>
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item name="phone" label={t('profile.phone')}>
                        <Input disabled={isViewMode} />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label={t('profile.role')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Select
                            disabled={isViewMode}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {ROLES_OPTIONS.map(opt => (
                                <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isActive"
                        label={t('employee.status')}
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren={t('employee.active')} unCheckedChildren={t('employee.inactive')} disabled={isViewMode} />
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

export default EmployeeList;
