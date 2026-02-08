import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Tag, Typography, Row, Col, Card, Image, Tooltip } from 'antd';
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
            title: t('productCode.headerID'),
            dataIndex: 'id',
            key: 'id',
            width: 70,
            fixed: 'left',
            align: 'center',
            sorter: (a, b) => a.id - b.id,
        },
        {
            title: t('productCode.customer'),
            key: 'customer',
            width: 200,
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
            title: t('productCode.headerPartner'),
            dataIndex: 'partnerName',
            key: 'partnerName',
            width: 150,
            ellipsis: true
        },
        {
            title: t('productCode.headerWarehouse'),
            dataIndex: ['warehouse', 'name'],
            key: 'warehouse',
            width: 120
        },
        {
            title: t('productCode.headerCategory'),
            dataIndex: ['category', 'name'],
            key: 'category',
            width: 120
        },
        // [A] Ngày nhập kho
        {
            title: t('productCode.headerEntryDate'),
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 110,
            render: (date) => date ? new Date(date).toLocaleDateString(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN') : '-'
        },
        // [B] Mã khách hàng
        {
            title: t('productCode.headerCustomerCode'),
            dataIndex: 'customerCodeInput',
            key: 'customerCodeInput',
            width: 120
        },
        // [C] Mã đơn hàng
        {
            title: t('productCode.headerOrderCode'),
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 120
        },
        // [D] Tên mặt hàng
        {
            title: t('productCode.headerProductName'),
            dataIndex: 'productName',
            key: 'productName',
            width: 180,
            ellipsis: true
        },
        // [E] Số Kiện + [F] Đơn vị
        {
            title: t('productCode.headerPackage'),
            key: 'package',
            width: 120,
            align: 'right',
            render: (_, record) => (
                <span>
                    {record.packageCount} <Typography.Text type="secondary" style={{ fontSize: '11px' }}>{record.packageUnit}</Typography.Text>
                </span>
            )
        },
        // [G] Trọng lượng
        {
            title: t('productCode.headerWeight'),
            dataIndex: 'weight',
            key: 'weight',
            width: 120,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [H] Khối lượng
        {
            title: t('productCode.headerVolume'),
            dataIndex: 'volume',
            key: 'volume',
            width: 120,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [I] Phí nội địa TQ
        {
            title: t('productCode.headerDomesticFeeTQ'),
            dataIndex: 'domesticFeeTQ',
            key: 'domesticFeeTQ',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [J] Phí kéo hàng TQ
        {
            title: t('productCode.headerHaulingFeeTQ'),
            dataIndex: 'haulingFeeTQ',
            key: 'haulingFeeTQ',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [K] Tỷ giá
        {
            title: t('productCode.headerExchangeRate'),
            dataIndex: 'exchangeRate',
            key: 'exchangeRate',
            width: 100,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [L] Đơn giá cước
        {
            title: t('productCode.headerTransportRate'),
            dataIndex: 'transportRate',
            key: 'transportRate',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [M] Tổng cước TQ_HN
        {
            title: t('productCode.headerTotalTransportFee'),
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 130,
            align: 'right',
            render: (val) => <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'}</span>
        },
        // [N] Phí nội địa VN
        {
            title: t('productCode.headerDomesticFeeVN'),
            dataIndex: 'domesticFeeVN',
            key: 'domesticFeeVN',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [O] Ghi chú
        {
            title: t('productCode.headerNotes'),
            dataIndex: 'notes',
            key: 'notes',
            width: 150,
            ellipsis: true
        },
        // [P] Trạng thái
        {
            title: t('productCode.headerStatus'),
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status) => {
                const statusConfig = {
                    NHAP_KHO_TQ: { color: 'blue', label: t('productCode.statusNhapKhoTQ') },
                    CHO_XEP_XE: { color: 'orange', label: t('productCode.statusChoXepXe') },
                    DA_XEP_XE: { color: 'cyan', label: t('productCode.statusDaXepXe') },
                    KIEM_HOA: { color: 'purple', label: t('productCode.statusKiemHoa') },
                    CHO_THONG_QUAN_VN: { color: 'magenta', label: t('productCode.statusChoThongQuanVN') },
                    NHAP_KHO_VN: { color: 'geekblue', label: t('productCode.statusNhapKhoVN') },
                    XUAT_THIEU: { color: 'red', label: t('productCode.statusXuatThieu') },
                    XUAT_DU: { color: 'green', label: t('productCode.statusXuatDu') }
                };
                const config = statusConfig[status] || { color: 'default', label: status };
                return <Tag color={config.color}>{config.label}</Tag>;
            }
        },
        // [Q] Ảnh hàng hóa
        {
            title: t('productCode.headerImages'),
            key: 'images',
            width: 100,
            render: (_, record) => {
                if (record.images && record.images.length > 0) {
                    return (
                        <Image.PreviewGroup>
                            <Image width={50} src={`${import.meta.env.VITE_API_URL}${record.images[0]}`} />
                            {record.images.length > 1 && <span style={{ marginLeft: 5 }}>+{record.images.length - 1}</span>}
                            {/* Hidden images for preview group */}
                            <div style={{ display: 'none' }}>
                                {record.images.slice(1).map((img, idx) => (
                                    <Image key={idx} src={`${import.meta.env.VITE_API_URL}${img}`} />
                                ))}
                            </div>
                        </Image.PreviewGroup>
                    );
                }
                return '-';
            }
        },
        // [S] Tem chính
        {
            title: t('productCode.headerMainTag'),
            dataIndex: 'mainTag',
            key: 'mainTag',
            width: 120
        },
        // [T] Tem phụ
        {
            title: t('productCode.headerSubTag'),
            dataIndex: 'subTag',
            key: 'subTag',
            width: 120
        },
        // [U] Ảnh tem
        {
            title: t('productCode.headerTaggedImages'),
            key: 'taggedImages',
            width: 100,
            render: (_, record) => {
                if (record.taggedImages && record.taggedImages.length > 0) {
                    return (
                        <Image.PreviewGroup>
                            <Image width={50} src={`${import.meta.env.VITE_API_URL}${record.taggedImages[0]}`} />
                            {record.taggedImages.length > 1 && <span style={{ marginLeft: 5 }}>+{record.taggedImages.length - 1}</span>}
                            <div style={{ display: 'none' }}>
                                {record.taggedImages.slice(1).map((img, idx) => (
                                    <Image key={idx} src={`${import.meta.env.VITE_API_URL}${img}`} />
                                ))}
                            </div>
                        </Image.PreviewGroup>
                    );
                }
                return '-';
            }
        },
        // [V] Số lượng SP
        {
            title: t('productCode.headerProductQuantity'),
            dataIndex: 'productQuantity',
            key: 'productQuantity',
            width: 100,
            align: 'right'
        },
        // [W] Quy cách
        {
            title: t('productCode.headerSpecification'),
            dataIndex: 'specification',
            key: 'specification',
            width: 120
        },
        // [X] Mô tả SP
        {
            title: t('productCode.headerProductDescription'),
            dataIndex: 'productDescription',
            key: 'productDescription',
            width: 150,
            ellipsis: true
        },
        // [Y] Nhãn hiệu
        {
            title: t('productCode.headerBrand'),
            dataIndex: 'brand',
            key: 'brand',
            width: 120
        },
        // [Z] MST người bán
        {
            title: t('productCode.headerSupplierTaxCode'),
            dataIndex: 'supplierTaxCode',
            key: 'supplierTaxCode',
            width: 120
        },
        // [AA] Tên cty bán
        {
            title: t('productCode.headerSupplierName'),
            dataIndex: 'supplierName',
            key: 'supplierName',
            width: 150
        },
        // [AB] Nhu cầu khai báo
        {
            title: t('productCode.headerDeclarationNeed'),
            dataIndex: 'declarationNeed',
            key: 'declarationNeed',
            width: 120
        },
        // [AC] SL khai báo
        {
            title: t('productCode.headerDeclarationQuantity'),
            dataIndex: 'declarationQuantity',
            key: 'declarationQuantity',
            width: 100,
            align: 'right'
        },
        // [AD] Giá xuất hóa đơn
        {
            title: t('productCode.headerInvoicePrice'),
            dataIndex: 'invoicePriceExport',
            key: 'invoicePriceExport',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [AE] Tổng giá trị
        {
            title: t('productCode.headerTotalValue'),
            dataIndex: 'totalValueExport',
            key: 'totalValueExport',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // [AF] Chính sách NK
        {
            title: t('productCode.headerImportPolicy'),
            dataIndex: 'importPolicy',
            key: 'importPolicy',
            width: 150
        },
        // [AG] Phí phải nộp
        {
            title: t('productCode.headerOtherFee'),
            dataIndex: 'otherFee',
            key: 'otherFee',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [AH] Ghi chú khác
        {
            title: t('productCode.headerOtherNotes'),
            dataIndex: 'otherNotes',
            key: 'otherNotes',
            width: 150,
            ellipsis: true
        },
        // [AI] Thuế VAT NK
        {
            title: t('productCode.headerVatImportTax'),
            dataIndex: 'vatImportTax',
            key: 'vatImportTax',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [AJ] Thuế NK
        {
            title: t('productCode.headerImportTax'),
            dataIndex: 'importTax',
            key: 'importTax',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [AK] Phí ủy thác
        {
            title: t('productCode.headerTrustFee'),
            dataIndex: 'trustFee',
            key: 'trustFee',
            width: 130,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // [AL] Tổng chi phí NK
        {
            title: t('productCode.headerTotalImportCost'),
            dataIndex: 'totalImportCost',
            key: 'totalImportCost',
            width: 130,
            align: 'right',
            render: (val) => <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{val ? new Intl.NumberFormat(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: t('common.id') === 'ID' ? 'VND' : 'CNY' }).format(val) : '-'}</span>
        },
        // [AM] Tình trạng xuất VAT
        {
            title: t('productCode.headerVatExportStatus'),
            dataIndex: 'vatExportStatus',
            key: 'vatExportStatus',
            width: 150
        },
        {
            title: t('productCode.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date) => new Date(date).toLocaleDateString(t('common.id') === 'ID' ? 'vi-VN' : 'zh-CN')
        },
        {
            title: t('productCode.actions'),
            key: 'actions',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title={t('productCode.edit')}>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={t('productCode.confirmDelete')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={t('productCode.yes')}
                        cancelText={t('productCode.no')}
                    >
                        <Tooltip title={t('productCode.delete')}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
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
