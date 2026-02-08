import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Tag, Typography, Row, Col, Card, Image, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import productCodeService from '../../services/productCodeService';
import ProductCodeModal from './ProductCodeModal';
import * as XLSX from 'xlsx';

const ProductCodePage = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [userType, setUserType] = useState('USER');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserType(payload.type);
            } catch (e) {
                console.error("Invalid token");
            }
        }
    }, []);
    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
        ],
    };


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
        setSelectedRowKeys([]);
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

    const handleView = (record) => {
        setEditingRecord(record);
        setViewOnly(true);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setViewOnly(false);
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingRecord(null);
        setViewOnly(false);
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
                [t('common.id')]: item.id,
                [t('productCode.customer')]: item.customer?.fullName || '',
                [t('productCode.partnerName')]: item.partnerName,
                [t('productCode.warehouse')]: item.warehouse?.name || '',
                [t('productCode.category')]: item.category?.name || '',
                [t('productCode.productNameLabel')]: item.productName,
                [t('productCode.exchangeRateLabel')]: item.exchangeRate,
                [t('productCode.weight')]: item.totalWeight,
                [t('productCode.volume')]: item.totalVolume,
                [t('productCode.packageCount')]: item.totalPackages,
                [t('productCode.totalAmount')]: item.totalAmount,
                [t('productCode.profit')]: item.profit,
                [t('productCode.createdAt')]: new Date(item.createdAt).toLocaleDateString(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN')
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
        // 1. [A] Ngày nhập kho
        {
            title: t('productCode.entryDate'),
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 150,
            key: 'entryDate',
            width: 150,
            render: (date) => date ? new Date(date).toLocaleDateString(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN') : '-'
        },
        // 2. [B] Mã khách hàng
        {
            title: t('productCode.customerCode'),
            dataIndex: 'customerCodeInput',
            key: 'customerCodeInput',
            width: 150
        },
        // 3. [C] Mã đơn hàng
        {
            title: t('productCode.orderCode'),
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150
        },
        // 4. [D] Tên mặt hàng
        {
            title: t('productCode.productNameLabel'),
            dataIndex: 'productName',
            key: 'productName',
            width: 200,
            ellipsis: true
        },
        // 5. [E] Số Kiện
        {
            title: t('productCode.packageCount'),
            dataIndex: 'packageCount',
            key: 'packageCount',
            width: 120,
            align: 'right'
        },
        // 6. [F] Đơn vị kiện
        {
            title: t('productCode.packageUnit'),
            dataIndex: 'packing',
            key: 'packing',
            width: 120
        },
        // 7. [G] Trọng lượng
        {
            title: t('productCode.weight'),
            dataIndex: 'weight',
            key: 'weight',
            width: 120,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 8. [H] Khối lượng
        {
            title: t('productCode.volume'),
            dataIndex: 'volume',
            key: 'volume',
            width: 120,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 9. [I] Phí nội địa TQ
        {
            title: t('productCode.domesticFeeTQ'),
            dataIndex: 'domesticFeeRMB',
            key: 'domesticFeeRMB',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 10. [J] Phí kéo hàng TQ
        {
            title: t('productCode.haulingFeeTQ'),
            dataIndex: 'haulingFeeRMB',
            key: 'haulingFeeRMB',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 11. [K] Tỷ giá
        {
            title: t('productCode.exchangeRateLabel'),
            dataIndex: 'exchangeRate',
            key: 'exchangeRate',
            width: 120,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 12. [L] Đơn giá cước TQ_HN
        {
            title: t('productCode.transportRate'),
            dataIndex: 'transportRate',
            key: 'transportRate',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 13. [M] Tổng cước TQ_HN
        {
            title: t('productCode.totalTransportFeeEstimate'),
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 180,
            align: 'right',
            render: (val) => <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'}</span>
        },
        // 14. [N] Phí nội địa VN
        {
            title: t('productCode.domesticFeeVN'),
            dataIndex: 'domesticFeeVN',
            key: 'domesticFeeVN',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 15. [O] Ghi chú
        {
            title: t('productCode.notesLabel'),
            dataIndex: 'notes',
            key: 'notes',
            width: 150,
            ellipsis: true
        },
        // 16. [P] Tình trạng hàng hoá
        {
            title: t('productCode.statusLabel'),
            dataIndex: 'status',
            key: 'status',
            width: 180,
            render: (status) => {
                const statusConfig = {
                    'Kho TQ': { color: 'blue', label: t('productCode.statusNhapKhoTQ') },
                    'Đã xếp xe': { color: 'cyan', label: t('productCode.statusDaXepXe') },
                    'Kho VN': { color: 'geekblue', label: t('productCode.statusNhapKhoVN') },
                    'Kiểm hoá': { color: 'purple', label: t('productCode.statusKiemHoa') },
                    'Đã giao, chưa thanh toán': { color: 'orange', label: t('productCode.statusGiaoChuaThanhToan') },
                    'đã giao, đã thanh toán': { color: 'green', label: t('productCode.statusGiaoDaThanhToan') },
                };
                // Fallback for old codes if any
                const legacyConfig = {
                    NHAP_KHO_TQ: { color: 'blue', label: t('productCode.statusNhapKhoTQ') },
                    CHO_XEP_XE: { color: 'orange', label: t('productCode.statusChoXepXe') },
                    DA_XEP_XE: { color: 'cyan', label: t('productCode.statusDaXepXe') },
                    KIEM_HOA: { color: 'purple', label: t('productCode.statusKiemHoa') },
                    CHO_THONG_QUAN_VN: { color: 'magenta', label: t('productCode.statusChoThongQuanVN') },
                    NHAP_KHO_VN: { color: 'geekblue', label: t('productCode.statusNhapKhoVN') },
                    XUAT_THIEU: { color: 'red', label: t('productCode.statusXuatThieu') },
                    XUAT_DU: { color: 'green', label: t('productCode.statusXuatDu') }
                };

                const config = statusConfig[status] || legacyConfig[status] || { color: 'default', label: status };
                return <Tag color={config.color}>{config.label}</Tag>;
            }
        },
        // 17. [Q] Ảnh hàng hóa
        {
            title: t('productCode.productImage'),
            key: 'images',
            width: 120,
            render: (_, record) => {
                if (record.images && record.images.length > 0) {
                    return (
                        <Image.PreviewGroup>
                            <Image width={50} src={record.images[0]} />
                            {record.images.length > 1 && <span style={{ marginLeft: 5 }}>+{record.images.length - 1}</span>}
                            {/* Hidden images for preview group */}
                            <div style={{ display: 'none' }}>
                                {record.images.slice(1).map((img, idx) => (
                                    <Image key={idx} src={img} />
                                ))}
                            </div>
                        </Image.PreviewGroup>
                    );
                }
                return '-';
            }
        },
        // 18. [S] Tem chính
        {
            title: t('productCode.mainTag'),
            dataIndex: 'mainTag',
            key: 'mainTag',
            width: 150
        },
        // 19. [T] Tem phụ
        {
            title: t('productCode.subTag'),
            dataIndex: 'subTag',
            key: 'subTag',
            width: 150
        },
        // 20. [U] Ảnh hàng dán tem
        {
            title: t('productCode.taggedImage'),
            key: 'taggedImages',
            width: 120,
            render: (_, record) => {
                if (record.taggedImages && record.taggedImages.length > 0) {
                    return (
                        <Image.PreviewGroup>
                            <Image width={50} src={record.taggedImages[0]} />
                            {record.taggedImages.length > 1 && <span style={{ marginLeft: 5 }}>+{record.taggedImages.length - 1}</span>}
                            <div style={{ display: 'none' }}>
                                {record.taggedImages.slice(1).map((img, idx) => (
                                    <Image key={idx} src={img} />
                                ))}
                            </div>
                        </Image.PreviewGroup>
                    );
                }
                return '-';
            }
        },
        // 21. [V] Số Lượng sản phẩm
        {
            title: t('productCode.productQuantity'),
            dataIndex: 'productQuantity',
            key: 'productQuantity',
            width: 120,
            align: 'right'
        },
        // 22. [W] Quy cách
        {
            title: t('productCode.specification'),
            dataIndex: 'specification',
            key: 'specification',
            width: 150
        },
        // 23. [X] Mô Tả sản phẩm
        {
            title: t('productCode.productDescription'),
            dataIndex: 'productDescription',
            key: 'productDescription',
            width: 200,
            ellipsis: true
        },
        // 24. [Y] Nhãn Hiệu
        {
            title: t('productCode.brand'),
            dataIndex: 'brand',
            key: 'brand',
            width: 150
        },
        // 25. [Z] Mã Số Thuế
        {
            title: t('productCode.supplierTaxCode'),
            dataIndex: 'supplierTaxCode',
            key: 'supplierTaxCode',
            width: 150
        },
        // 26. [AA] Tên Công Ty bán hàng
        {
            title: t('productCode.supplierName'),
            dataIndex: 'supplierName',
            key: 'supplierName',
            width: 200
        },
        // 27. [AB] Nhu cầu khai báo
        {
            title: t('productCode.declarationNeed'),
            dataIndex: 'declarationNeed',
            key: 'declarationNeed',
            width: 150
        },
        // 28. [AC] Số lượng khai báo
        {
            title: t('productCode.declarationQuantity'),
            dataIndex: 'declarationQuantity',
            key: 'declarationQuantity',
            width: 120,
            align: 'right'
        },
        // 29. [AD] Giá xuất hoá đơn
        {
            title: t('productCode.invoicePriceExport'),
            dataIndex: 'invoicePriceExport',
            key: 'invoicePriceExport',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 30. [AE] Tổng giá trị lô hàng
        {
            title: t('productCode.totalValueExport'),
            dataIndex: 'totalValueExport',
            key: 'totalValueExport',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'de-DE' : 'zh-CN').format(val) : '-'
        },
        // 31. [AF] Chính sách NK
        {
            title: t('productCode.importPolicy'),
            dataIndex: 'declarationPolicy',
            key: 'declarationPolicy',
            width: 150
        },
        // 32. [AG] Phí phải nộp
        {
            title: t('productCode.otherFeeLabel'),
            dataIndex: 'feeAmount',
            key: 'feeAmount',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 33. [AH] Ghi chú
        {
            title: t('productCode.otherNotes'),
            dataIndex: 'otherNotes',
            key: 'otherNotes',
            width: 150,
            ellipsis: true
        },
        // 34. [AI] Thuế VAT nhập khẩu
        {
            title: t('productCode.vatImportTax'),
            dataIndex: 'vatImportTax',
            key: 'vatImportTax',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 35. [AJ] Thuế NK phải nộp
        {
            title: t('productCode.importTaxLabel'),
            dataIndex: 'importTax',
            key: 'importTax',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 36. [AK] Phí uỷ thác
        {
            title: t('productCode.trustFee'),
            dataIndex: 'trustFee',
            key: 'trustFee',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'
        },
        // 37. [AL] Tổng chi phí nhập khẩu
        {
            title: t('productCode.totalImportCost'),
            dataIndex: 'totalImportCost',
            key: 'totalImportCost',
            width: 180,
            align: 'right',
            render: (val) => <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{val ? new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN', { style: 'currency', currency: i18n.language.startsWith('vi') ? 'VND' : 'CNY' }).format(val) : '-'}</span>
        },
        // 38. [AM] Tình trạng xuất VAT
        {
            title: t('productCode.vatExportStatus'),
            dataIndex: 'vatExportStatus',
            key: 'vatExportStatus',
            width: 180
        },
        {
            title: t('productCode.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date) => new Date(date).toLocaleDateString(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN')
        },
        {
            title: t('productCode.actions'),
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={t('common.view') || "Xem"}>
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record)}
                        />
                    </Tooltip>
                    <Tooltip title={t('productCode.edit')}>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    {userType !== 'CUSTOMER' && (
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
                    )}
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
                            {userType !== 'CUSTOMER' && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    {t('productCode.add') || 'Thêm Mã hàng'}
                                </Button>
                            )}
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

            {selectedRowKeys.length > 0 && (
                <div style={{
                    marginBottom: 16,
                    padding: '12px 24px',
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <Space size="middle">
                        <span style={{ fontSize: '16px', fontWeight: 500, color: '#096dd9' }}>
                            {t('productCode.selectedCount', { count: selectedRowKeys.length }) || `Đã chọn ${selectedRowKeys.length} dòng`}
                        </span>
                        <span style={{ color: '#8c8c8c' }}>|</span>
                        <Space>
                            <span style={{ color: '#595959' }}>
                                {t('productCode.summaryTotalPackages')}: <strong>{data.filter(item => selectedRowKeys.includes(item.id)).reduce((sum, item) => sum + (item.packageCount || 0), 0)}</strong>
                            </span>
                            <span style={{ color: '#595959' }}>
                                {t('productCode.summaryTotalWeight')}: <strong>{new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN').format(data.filter(item => selectedRowKeys.includes(item.id)).reduce((sum, item) => sum + (item.weight || 0), 0))}</strong> kg
                            </span>
                            <span style={{ color: '#595959' }}>
                                {t('productCode.summaryTotalVolume')}: <strong>{new Intl.NumberFormat(i18n.language.startsWith('vi') ? 'vi-VN' : 'zh-CN').format(data.filter(item => selectedRowKeys.includes(item.id)).reduce((sum, item) => sum + (item.volume || 0), 0))}</strong> m³
                            </span>
                        </Space>
                    </Space>
                    <Space>
                        <Button onClick={() => setSelectedRowKeys([])}>
                            {t('common.clearSelection') || 'Bỏ chọn'}
                        </Button>
                    </Space>
                </div>
            )}

            <Table
                rowSelection={rowSelection}
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
                    viewOnly={viewOnly}
                    userType={userType}
                />
            )}
        </div>
    );
};

export default ProductCodePage;
