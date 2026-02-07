import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Tag, Popconfirm, message, Typography, Row, Col, Tooltip } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx'; // Import XLSX


import { useTranslation } from 'react-i18next';
import employeeService from '../../services/employeeService'; // Import Service
import transactionService from '../../services/transactionService';
import TransactionModal from './TransactionModal';
import moment from 'moment';

const { Option } = Select;

const TransactionPage = () => {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [employees, setEmployees] = useState([]); // Employee State
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        status: undefined,
        createdById: undefined // Future improvement: Select User
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);

    // User Role check
    const [userRole, setUserRole] = useState('USER');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role);
            } catch (e) {
                console.error("Invalid token");
            }
        }
        fetchTransactions();
        fetchEmployees(); // Fetch employees
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await employeeService.getAll({ limit: 0 }); // Fetch all (limit=0 means unlimited)
            setEmployees(res.data?.employees || []);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const fetchTransactions = async (page = 1, pageSize = 10, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize
            };
            if (currentFilters.search) params.search = currentFilters.search;
            if (currentFilters.status) params.status = currentFilters.status;
            if (currentFilters.createdById) params.createdById = currentFilters.createdById;

            const response = await transactionService.getAll(params);
            if (response && response.data) {
                setTransactions(response.data.items);
                setPagination({
                    current: response.data.page,
                    pageSize: 10, // Assuming API returns 10 or limit
                    total: response.data.total
                });
            }
        } catch (error) {
            console.error(error);
            message.error(t('error.UNKNOWN'));
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (pagination) => {
        fetchTransactions(pagination.current, pagination.pageSize, filters);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        fetchTransactions(1, pagination.pageSize, filters);
    };

    const handleClear = () => {
        const newFilters = { search: '', status: undefined, createdById: undefined };
        setFilters(newFilters);
        fetchTransactions(1, pagination.pageSize, newFilters);
    };

    const handleCancelTransaction = async (id) => {
        try {
            await transactionService.cancel(id);
            message.success(t('transaction.cancelSuccess'));
            fetchTransactions(pagination.current, pagination.pageSize, filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleCreateSuccess = () => {
        setIsModalVisible(false);
        fetchTransactions(1, pagination.pageSize, filters); // Refresh to first page
        message.success(t('transaction.createSuccess'));
    };

    const handleExport = async () => {
        try {
            const response = await transactionService.exportData();
            const data = response.data; // Corrected: API returns { data: [...] } directly inside response body

            if (!data || !Array.isArray(data)) {
                console.error("Invalid data format for export", data);
                message.error(t('error.UNKNOWN'));
                return;
            }

            // Format data for Excel
            const excelData = data.map(item => ({
                [t('common.id')]: item.id,
                [t('transaction.customer')]: item.customer?.fullName,
                [t('transaction.phone')]: item.customer?.phone,
                [t('transaction.amount')]: item.amount,
                [t('transaction.content')]: item.content,
                [t('transaction.status')]: item.status,
                [t('transaction.createdBy')]: item.creator?.fullName,
                [t('common.createdAt')]: moment(item.createdAt).format('DD/MM/YYYY HH:mm')
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
            XLSX.writeFile(workbook, "Danh_Sach_Giao_Dich.xlsx");

            message.success(t('common.exportSuccess') || 'Export Excel successful');
        } catch (error) {
            console.error("Export error", error);
            message.error(t('error.UNKNOWN'));
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
            title: t('transaction.customer'),
            key: 'customer',
            fixed: 'left',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{record.customer?.fullName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.customer?.username} - {record.customer?.phone}
                    </Typography.Text>
                </Space>
            )
        },
        {
            title: t('transaction.amount'),
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amount) => (
                <Typography.Text strong style={{ color: '#52c41a' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                </Typography.Text>
            )
        },
        {
            title: t('transaction.content'),
            dataIndex: 'content',
            key: 'content',
            width: 300
        },
        {
            title: t('transaction.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'SUCCESS' ? 'green' : 'red';
                let text = status === 'SUCCESS' ? t('transaction.success') : t('transaction.cancelled');
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: t('transaction.createdBy'),
            key: 'createdBy',
            render: (_, record) => record.creator?.fullName || 'N/A'
        },
        {
            title: t('common.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => moment(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: t('common.action'),
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    {userRole === 'ADMIN' && record.status === 'SUCCESS' && (
                        <Popconfirm
                            title={t('common.confirmDelete')} // Actually "Cancel" confirmation
                            description="Bạn có chắc muốn HỦY giao dịch này không?"
                            onConfirm={() => handleCancelTransaction(record.id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Tooltip title={t('transaction.cancelAction')}>
                                <Button danger icon={<CloseCircleOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={24} lg={12}>
                        <h2>{t('transaction.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    style={{ backgroundColor: '#217346', color: '#fff', borderColor: '#217346' }}
                                >
                                    {t('common.exportExcel') || "Export Excel"}
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setIsModalVisible(true)}
                                >
                                    {t('transaction.add')}
                                </Button>
                            </Space>
                        )}
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={24}>
                            <Input
                                placeholder={t('transaction.searchPlaceholder')}
                                prefix={<EyeOutlined />}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
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
                                onChange={(value) => handleFilterChange('status', value)}
                                allowClear
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Option value="SUCCESS">{t('transaction.success')}</Option>
                                <Option value="CANCELLED">{t('transaction.cancelled')}</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('transaction.filterByCreator')}
                                value={filters.createdById}
                                onChange={(value) => handleFilterChange('createdById', value)}
                                allowClear
                                showSearch
                                size="large"
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {employees.map(emp => (
                                    <Option key={emp.id} value={emp.id}>
                                        {emp.fullName}
                                    </Option>
                                ))}
                            </Select>
                        </Col>

                        <Col xs={24} sm={24} md={24} lg={10} style={{ textAlign: 'right' }}>
                            <Space>
                                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} size="large">
                                    {t('common.search')}
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={handleClear} size="large">
                                    {t('common.clear')}
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </div>

            <Table
                columns={columns}
                dataSource={transactions}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                size="small"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                }}
                onChange={handleTableChange}
            />

            <TransactionModal
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
};

export default TransactionPage;
