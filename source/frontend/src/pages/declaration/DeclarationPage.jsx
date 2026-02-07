import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Tag, Popconfirm, message, Typography, Row, Col, Image } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    DownloadOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import DeclarationModal from './DeclarationModal';

import moment from 'moment';

const { Option } = Select;

const DeclarationPage = () => {
    const { t } = useTranslation();
    const [declarations, setDeclarations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });

    // Filter State
    const [filters, setFilters] = useState({
        search: ''
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDeclaration, setEditingDeclaration] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);



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
        fetchDeclarations();
    }, []);

    const fetchDeclarations = async (page = 1, pageSize = 20, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize
            };
            if (currentFilters.search) params.search = currentFilters.search;

            const response = await declarationService.getAll(params);
            if (response && response.data) {
                setDeclarations(response.data.items);
                setPagination({
                    current: response.data.page,
                    pageSize: pageSize,
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
        fetchDeclarations(pagination.current, pagination.pageSize, filters);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        fetchDeclarations(1, pagination.pageSize, filters);
    };

    const handleClear = () => {
        const newFilters = { search: '' };
        setFilters(newFilters);
        fetchDeclarations(1, pagination.pageSize, newFilters);
    };

    const handleAdd = () => {
        setEditingDeclaration(null);
        setIsViewMode(false);
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingDeclaration(record);
        setIsViewMode(false);
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setEditingDeclaration(record);
        setIsViewMode(true);
        setIsModalVisible(true);
    };



    const handleDelete = async (id) => {
        try {
            await declarationService.delete(id);
            message.success(t('declaration.deleteSuccess'));
            fetchDeclarations(pagination.current, pagination.pageSize, filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleModalSuccess = () => {
        setIsModalVisible(false);
        setEditingDeclaration(null);
        fetchDeclarations(1, pagination.pageSize, filters);
        message.success(editingDeclaration ? t('declaration.updateSuccess') : t('declaration.createSuccess'));
    };

    const handleExport = async () => {
        try {
            const response = await declarationService.exportData();
            const data = response.data.data; // Response data structure might be { code, message, data: [...] }

            if (!data || !Array.isArray(data)) {
                console.error("Invalid data format for export", data);
                message.error(t('error.UNKNOWN'));
                return;
            }

            // Format data for Excel
            const excelData = data.map(item => ({
                [t('common.id')]: item.id,
                [t('declaration.entryDate')]: item.entryDate ? moment(item.entryDate).format('DD/MM/YYYY') : '',
                [t('declaration.customer')]: item.customer?.fullName,
                [t('declaration.customerCodeInput')]: item.customerCodeInput,
                [t('declaration.orderCode')]: item.orderCode,
                [t('declaration.productName')]: item.productName,
                [t('declaration.declarationName')]: item.declarationName,
                [t('declaration.packageCount')]: item.packageCount,
                [t('declaration.weight')]: item.weight,
                [t('declaration.volume')]: item.volume,
                [t('declaration.domesticFeeRMB')]: item.domesticFeeRMB,
                [t('declaration.totalTransportFeeEstimate')]: item.totalTransportFeeEstimate,
                [t('declaration.declarationQuantity')]: item.declarationQuantity,
                [t('declaration.declarationPrice')]: item.declarationPrice,
                [t('declaration.note')]: item.note,
                [t('common.createdAt')]: moment(item.createdAt).format('DD/MM/YYYY HH:mm')
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Declarations");
            XLSX.writeFile(workbook, "Danh_Sach_Khai_Bao.xlsx");

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
            width: 60,
            fixed: 'left',
        },
        {
            title: t('declaration.entryDate'),
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 110,
            render: (value) => value ? moment(value).format('DD/MM/YYYY') : '-'
        },
        {
            title: t('declaration.customer'),
            key: 'customer',
            width: 180,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{record.customer?.fullName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.customer?.username}
                    </Typography.Text>
                </Space>
            )
        },
        {
            title: t('declaration.customerCodeInput'),
            dataIndex: 'customerCodeInput',
            key: 'customerCodeInput',
            width: 120,
        },
        {
            title: t('declaration.orderCode'),
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150,
            render: (text) => <Typography.Text strong>{text || '-'}</Typography.Text>
        },
        {
            title: t('declaration.productName'),
            dataIndex: 'productName',
            key: 'productName',
            width: 180,
            ellipsis: true
        },
        // {
        //     title: t('declaration.declarationName'),
        //     dataIndex: 'declarationName',
        //     key: 'declarationName',
        //     width: 180,
        //     ellipsis: true
        // },
        {
            title: t('declaration.productImage'),
            dataIndex: 'productImage',
            key: 'productImage',
            width: 80,
            render: (image) => {
                if (!image) return '-';
                return (
                    <Image
                        width={40}
                        height={40}
                        src={image}
                        style={{ objectFit: 'cover', cursor: 'pointer', border: '1px solid #f0f0f0' }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    />
                );
            }
        },
        {
            title: t('declaration.packageCount'),
            dataIndex: 'packageCount',
            key: 'packageCount',
            width: 80,
            align: 'center',
            render: (value) => value || '-'
        },
        {
            title: t('declaration.weight'),
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
            align: 'right',
            render: (value) => value ? `${value} kg` : '-'
        },
        {
            title: t('declaration.volume'),
            dataIndex: 'volume',
            key: 'volume',
            width: 100,
            align: 'right',
            render: (value) => value ? `${value} m³` : '-'
        },
        {
            title: t('declaration.domesticFeeRMB'),
            dataIndex: 'domesticFeeRMB',
            key: 'domesticFeeRMB',
            width: 120,
            align: 'right',
            render: (value) => value ? `¥${value}` : '-'
        },
        {
            title: t('declaration.totalTransportFeeEstimate'),
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 140,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '-'}
                </span>
            )
        },
        {
            title: t('declaration.declarationQuantity'),
            dataIndex: 'declarationQuantity',
            key: 'declarationQuantity',
            width: 120,
        },
        {
            title: t('declaration.declarationPrice'),
            dataIndex: 'declarationPrice',
            key: 'declarationPrice',
            width: 120,
        },
        {
            title: t('declaration.note'),
            dataIndex: 'note',
            key: 'note',
            width: 200,
            ellipsis: true
        },
        {
            title: t('common.action'),
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                        title={t('common.view')}
                    />
                    {userRole === 'ADMIN' && (
                        <>
                            <Button
                                type="text"
                                icon={<EditOutlined style={{ color: '#faad14' }} />}
                                onClick={() => handleEdit(record)}
                                title={t('common.edit')}
                            />

                            <Popconfirm
                                title={t('common.confirmDelete')}
                                onConfirm={() => handleDelete(record.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="text"
                                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                                    title={t('common.delete')}
                                />
                            </Popconfirm>
                        </>
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
                        <h2>{t('declaration.title')}</h2>
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
                                    onClick={handleAdd}
                                >
                                    {t('declaration.add')}
                                </Button>
                            </Space>
                        )}
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={14}>
                            <Input
                                placeholder={t('declaration.searchPlaceholder') || "Search by Order Code, Product Name..."}
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
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
                dataSource={declarations}
                rowKey="id"
                loading={loading}
                scroll={{ x: 2200 }}
                size="middle"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '30', '40', '50'],
                    locale: { items_per_page: t('common.items_per_page') },
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                }}
                onChange={handleTableChange}
            />

            <DeclarationModal
                visible={isModalVisible}
                declaration={editingDeclaration}
                isViewMode={isViewMode}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingDeclaration(null);
                    setIsViewMode(false);
                }}
                onSuccess={handleModalSuccess}
            />


        </div>
    );
};

export default DeclarationPage;
