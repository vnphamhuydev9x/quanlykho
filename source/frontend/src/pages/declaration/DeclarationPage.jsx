import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Tag, Popconfirm, message, Typography, Row, Col, Image } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    DownloadOutlined
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
        search: '',
        isDeclared: undefined
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
            if (currentFilters.isDeclared !== undefined) params.isDeclared = currentFilters.isDeclared;

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
        const newFilters = { search: '', isDeclared: undefined };
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
            const data = response.data;

            if (!data || !Array.isArray(data)) {
                console.error("Invalid data format for export", data);
                message.error(t('error.UNKNOWN'));
                return;
            }

            // Format data for Excel
            const excelData = data.map(item => ({
                [t('common.id')]: item.id,
                [t('declaration.invoiceRequestName')]: item.invoiceRequestName,
                [t('declaration.customer')]: item.customer?.fullName,
                [t('transaction.phone')]: item.customer?.phone,
                [t('declaration.productNameVi')]: item.productNameVi,
                [t('declaration.hsCode')]: item.hsCode,
                [t('declaration.quantity')]: item.quantity,
                [t('declaration.totalPackages')]: item.totalPackages,
                [t('declaration.totalWeight')]: item.totalWeight,
                [t('declaration.totalVolume')]: item.totalVolume,
                [t('declaration.contractPrice')]: item.contractPrice,
                [t('declaration.productUnit')]: item.productUnit,
                [t('declaration.declarationPriceVND')]: item.declarationPriceVND,
                [t('declaration.importTaxPercent')]: item.importTaxPercent,
                [t('declaration.vatPercent')]: item.vatPercent,
                [t('declaration.serviceFeePercent')]: item.serviceFeePercent,
                [t('declaration.isDeclared')]: item.isDeclared ? t('declaration.isDeclared') : t('declaration.notDeclared'),
                [t('declaration.supplierName')]: item.supplierName,
                [t('declaration.labelCode')]: item.labelCode,
                [t('declaration.labelDate')]: item.labelDate ? moment(item.labelDate).format('DD/MM/YYYY') : '',
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
            width: 80,
            fixed: 'left',
        },
        {
            title: t('declaration.customer'),
            key: 'customer',
            fixed: 'left',
            width: 200,
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
            title: t('declaration.invoiceRequestName'),
            dataIndex: 'invoiceRequestName',
            key: 'invoiceRequestName',
            width: 200
        },
        {
            title: t('declaration.hsCode'),
            dataIndex: 'hsCode',
            key: 'hsCode',
            width: 120
        },
        {
            title: t('declaration.productNameVi'),
            dataIndex: 'productNameVi',
            key: 'productNameVi',
            width: 200
        },
        {
            title: t('declaration.productDescription'),
            dataIndex: 'productDescription',
            key: 'productDescription',
            width: 250,
            ellipsis: true
        },
        {
            title: t('declaration.images'),
            dataIndex: 'images',
            key: 'images',
            width: 200,
            render: (images) => {
                if (!images || images.length === 0) return '-';
                // Slice to get max 3 images, or show all if that's what user implies by "fit 3". 
                // User said "widened to fit 3 if exist".
                // Let's display up to 3 images directly.
                const displayImages = images.slice(0, 3);
                return (
                    <Image.PreviewGroup>
                        <Space size={4} wrap>
                            {displayImages.map((img, index) => (
                                <Image
                                    key={index}
                                    width={50}
                                    height={50}
                                    src={img}
                                    style={{ objectFit: 'cover', cursor: 'pointer', border: '1px solid #f0f0f0' }}
                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                />
                            ))}
                            {images.length > 3 && (
                                <Tag color="blue">+{images.length - 3}</Tag>
                            )}
                        </Space>
                    </Image.PreviewGroup>
                );
            }
        },
        {
            title: t('declaration.contractPrice'),
            dataIndex: 'contractPrice',
            key: 'contractPrice',
            width: 150,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '0 ₫'}
                </span>
            )
        },
        {
            title: t('declaration.declarationPriceVND'),
            dataIndex: 'declarationPriceVND',
            key: 'declarationPriceVND',
            width: 150,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '0 ₫'}
                </span>
            )
        },
        {
            title: t('declaration.importTaxPercent'),
            dataIndex: 'importTaxPercent',
            key: 'importTaxPercent',
            width: 120,
            render: (value) => `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`
        },
        {
            title: t('declaration.vatPercent'),
            dataIndex: 'vatPercent',
            key: 'vatPercent',
            width: 120,
            render: (value) => `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`
        },
        {
            title: t('declaration.serviceFeePercent'),
            dataIndex: 'serviceFeePercent',
            key: 'serviceFeePercent',
            width: 120,
            render: (value) => `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`
        },
        {
            title: t('declaration.totalPackages'),
            dataIndex: 'totalPackages',
            key: 'totalPackages',
            width: 120,
            render: (packages) => new Intl.NumberFormat('de-DE').format(packages)
        },
        {
            title: t('declaration.quantity'),
            dataIndex: 'quantity',
            key: 'quantity',
            width: 120,
            render: (quantity) => new Intl.NumberFormat('de-DE').format(quantity)
        },
        {
            title: t('declaration.productUnit'),
            dataIndex: 'productUnit',
            key: 'productUnit',
            width: 120
        },
        {
            title: t('common.action'),
            key: 'action',
            width: 200,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                        title={t('common.view')}
                    />
                    {userRole === 'ADMIN' && (
                        <>
                            <Button
                                icon={<EditOutlined />}
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
                                    icon={<DeleteOutlined />}
                                    danger
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
                        <Col xs={24} sm={24} md={24} lg={24}>
                            <Input
                                placeholder={t('declaration.searchPlaceholder')}
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
                                placeholder={t('declaration.filterByDeclared')}
                                value={filters.isDeclared}
                                onChange={(value) => handleFilterChange('isDeclared', value)}
                                allowClear
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Option value="true">{t('declaration.isDeclared')}</Option>
                                <Option value="false">{t('declaration.notDeclared')}</Option>
                            </Select>
                        </Col>

                        <Col xs={24} sm={24} md={24} lg={17} style={{ textAlign: 'right' }}>
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
                scroll={{ x: 'max-content' }}
                size="small"
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
