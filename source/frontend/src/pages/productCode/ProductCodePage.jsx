import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Tag, Typography, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import productCodeService from '../../services/productCodeService';
import ProductCodeModal from './ProductCodeModal';
import * as XLSX from 'xlsx';

const ProductCodePage = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');


    // Get status from URL
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const statusFromUrl = searchParams.get('status') || '';
        const inventoryFromUrl = searchParams.get('inventory') || '';

        // Convert inventory to status filter
        if (inventoryFromUrl === 'TQ') {
            // Tồn kho TQ: All statuses except XUAT_DU
            setStatusFilter('NOT_XUAT_DU');
        } else if (inventoryFromUrl === 'VN') {
            // Tồn kho VN: XUAT_THIEU and NHAP_KHO_VN
            setStatusFilter('XUAT_THIEU,NHAP_KHO_VN');
        } else {
            setStatusFilter(statusFromUrl);
        }
    }, [location.search]);

    useEffect(() => {
        fetchData();
    }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await productCodeService.getAll(
                pagination.current,
                pagination.pageSize,
                searchText,
                statusFilter
            );
            setData(response.data.items);
            setPagination(prev => ({
                ...prev,
                total: response.data.total
            }));
        } catch (error) {
            message.error(t('productCode.fetchError') || 'Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(prev => ({
            ...prev,
            current: newPagination.current,
            pageSize: newPagination.pageSize
        }));
    };

    const handleSearch = (value) => {
        setSearchText(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleAdd = () => {
        setEditingRecord(null);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await productCodeService.delete(id);
            message.success(t('productCode.deleteSuccess') || 'Xóa thành công');
            fetchData();
        } catch (error) {
            message.error(t('productCode.deleteError') || 'Lỗi khi xóa');
        }
    };

    const handleModalClose = (shouldRefresh) => {
        setModalVisible(false);
        setEditingRecord(null);
        if (shouldRefresh) {
            fetchData();
        }
    };

    const handleExport = async () => {
        try {
            const response = await productCodeService.exportData();
            const exportData = response.data.map(item => ({
                'ID': item.id,
                'Khách hàng': item.customer?.fullName || '',
                'Tên đối tác': item.partnerName,
                'Kho nhận': item.warehouse?.name || '',
                'Loại hàng': item.category?.name || '',
                'Tên sản phẩm': item.productName,
                'Tỷ giá': item.exchangeRate,
                'Tổng cân (kg)': item.totalWeight,
                'Tổng khối (m³)': item.totalVolume,
                'Tổng kiện': item.totalPackages,
                'Thành tiền': item.totalAmount,
                'Lợi nhuận': item.profit,
                'Ngày tạo': new Date(item.createdAt).toLocaleDateString('vi-VN')
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Product Codes');
            XLSX.writeFile(wb, `product_codes_${new Date().getTime()}.xlsx`);
            message.success(t('productCode.exportSuccess') || 'Xuất Excel thành công');
        } catch (error) {
            message.error(t('productCode.exportError') || 'Lỗi khi xuất Excel');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            fixed: 'left'
        },
        {
            title: t('productCode.customer') || 'Khách hàng',
            key: 'customer',
            width: 250,
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
            title: t('productCode.partnerName') || 'Tên đối tác',
            dataIndex: 'partnerName',
            key: 'partnerName',
            width: 150
        },
        {
            title: t('productCode.warehouse') || 'Kho nhận',
            dataIndex: ['warehouse', 'name'],
            key: 'warehouse',
            width: 120
        },
        {
            title: t('productCode.category') || 'Loại hàng',
            dataIndex: ['category', 'name'],
            key: 'category',
            width: 120
        },
        {
            title: t('productCode.productName') || 'Tên sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            width: 180
        },
        {
            title: t('productCode.totalWeight') || 'Tổng cân (kg)',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 120,
            render: (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
        },
        {
            title: t('productCode.totalVolume') || 'Tổng khối (m³)',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 120,
            render: (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val)
        },
        {
            title: t('productCode.totalPackages') || 'Tổng kiện',
            dataIndex: 'totalPackages',
            key: 'totalPackages',
            width: 100
        },
        {
            title: t('productCode.totalAmount') || 'Thành tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 130,
            render: (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
        },
        {
            title: t('productCode.profit') || 'Lợi nhuận',
            dataIndex: 'profit',
            key: 'profit',
            width: 130,
            render: (val) => (
                <Tag color={parseFloat(val) >= 0 ? 'green' : 'red'}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}
                </Tag>
            )
        },
        {
            title: t('productCode.status') || 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status) => {
                const statusConfig = {
                    NHAP_KHO_TQ: { color: 'blue', label: t('productCode.statusNhapKhoTQ') || 'Nhập kho TQ' },
                    CHO_XEP_XE: { color: 'orange', label: t('productCode.statusChoXepXe') || 'Chờ xếp xe' },
                    DA_XEP_XE: { color: 'cyan', label: t('productCode.statusDaXepXe') || 'Đã xếp xe' },
                    KIEM_HOA: { color: 'purple', label: t('productCode.statusKiemHoa') || 'Kiểm hóa' },
                    CHO_THONG_QUAN_VN: { color: 'magenta', label: t('productCode.statusChoThongQuanVN') || 'Chờ thông quan VN' },
                    NHAP_KHO_VN: { color: 'geekblue', label: t('productCode.statusNhapKhoVN') || 'Nhập kho VN' },
                    XUAT_THIEU: { color: 'red', label: t('productCode.statusXuatThieu') || 'Hàng không tên' },
                    XUAT_DU: { color: 'green', label: t('productCode.statusXuatDu') || 'Đã xuất kho' }
                };
                const config = statusConfig[status] || { color: 'default', label: status };
                return <Tag color={config.color}>{config.label}</Tag>;
            }
        },
        {
            title: t('productCode.createdAt') || 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: t('productCode.actions') || 'Thao tác',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        title={t('productCode.edit') || 'Sửa Mã hàng'}
                    />
                    <Popconfirm
                        title={t('productCode.confirmDelete') || 'Bạn có chắc muốn xóa?'}
                        onConfirm={() => handleDelete(record.id)}
                        okText={t('productCode.yes') || 'Có'}
                        cancelText={t('productCode.no') || 'Không'}
                    >
                        <Button type="link" danger icon={<DeleteOutlined />} title={t('productCode.delete') || 'Xóa'} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const getPageTitle = () => {
        const searchParams = new URLSearchParams(location.search);
        const inventory = searchParams.get('inventory');
        if (inventory === 'TQ') return t('inventory.titleTQ') || 'Quản lý Tồn kho TQ';
        if (inventory === 'VN') return t('inventory.titleVN') || 'Quản lý Tồn kho VN';
        return t('productCode.title') || 'Quản lý Mã hàng';
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <h2 style={{ margin: 0 }}>{getPageTitle()}</h2>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Button
                                type="default"
                                icon={<ExportOutlined />}
                                onClick={handleExport}
                            >
                                {t('productCode.export') || 'Xuất Excel'}
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAdd}
                            >
                                {t('productCode.add') || 'Thêm Mã hàng'}
                            </Button>
                        </Space>
                    </Col>
                </Row>
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={24}>
                            <Input.Search
                                placeholder={t('productCode.searchPlaceholder') || 'Tìm theo ID, Khách Hàng, Đối Tác, Sản Phẩm...'}
                                allowClear
                                onSearch={handleSearch}
                                style={{ width: '100%' }}
                                prefix={<SearchOutlined />}
                                size="large"
                            />
                        </Col>
                    </Row>
                </Card>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => t('common.pagination_range', { range0: range[0], range1: range[1], total }),
                    pageSizeOptions: ['20', '30', '40', '50']
                }}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
            />

            {modalVisible && (
                <ProductCodeModal
                    visible={modalVisible}
                    onClose={handleModalClose}
                    editingRecord={editingRecord}
                />
            )}
        </div>
    );
};

export default ProductCodePage;
