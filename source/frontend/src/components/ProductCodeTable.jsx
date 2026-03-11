import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Table, Button, Input, Space, message, Popconfirm, Card, Tooltip, Tag } from 'antd';
import { SearchOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import productCodeService from '../services/productCodeService';
import ProductCodeModal from '../pages/productCode/ProductCodeModal';
import { formatCurrency } from '../utils/format';
import { MANIFEST_STATUS_OPTIONS, EXPORT_ORDER_STATUS_OPTIONS } from '../constants/enums';

/**
 * Shared reusable ProductCode table component.
 *
 * Modes:
 *  - Self-fetching (default): manages own pagination/search/data via productCodeService
 *  - Controlled (dataSource provided): renders external data, no internal fetch
 *
 * Props:
 *  @param {number}   customerId        - Filter by customer ID (self-fetching mode)
 *  @param {Array}    dataSource        - External data array (enables controlled mode)
 *  @param {boolean}  externalLoading   - Loading state for controlled mode
 *  @param {number}   autoOpenId        - Auto-find and open view modal for this record ID
 *  @param {number}   refreshTrigger    - Increment to trigger re-fetch (self-fetching mode)
 *  @param {boolean}  showFilters       - Show search bar above table (default: true)
 *  @param {boolean}  showPagination    - Show pagination (default: true)
 *  @param {boolean}  showActions       - Show Thao tác column (default: true)
 *  @param {object}   rowSelection      - AntD rowSelection config for checkbox mode
 *  @param {string}   userRole          - 'ADMIN' to enable delete button
 *  @param {string}   userType          - 'CUSTOMER' to hide some controls
 *  @param {Function} onDeleteSuccess   - Callback after successful delete
 */
const ProductCodeTable = ({
    customerId,
    dataSource,
    externalLoading = false,
    autoOpenId,
    refreshTrigger = 0,
    showFilters = true,
    showPagination = true,
    showActions = true,
    rowSelection,
    userRole = '',
    userType = '',
    onDeleteSuccess,
}) => {
    const isControlled = dataSource !== undefined;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);

    const location = useLocation();

    // Parse filters from URL
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const urlStatus = urlParams.get('status') || '';
    const urlInventory = urlParams.get('inventory') || '';
    const urlExportStatus = urlParams.get('exportStatus') || '';

    const fetchData = async (p = pagination.current, l = pagination.pageSize, s = searchText) => {
        if (isControlled) return;
        setLoading(true);
        try {
            const res = await productCodeService.getAll(p, l, s, urlStatus, customerId, urlInventory, urlExportStatus);
            setData(res.data?.items || []);
            setPagination(prev => ({ ...prev, total: res.data?.total || 0, current: p }));
        } catch {
            message.error('Lỗi khi tải dữ liệu mã hàng');
        } finally {
            setLoading(false);
        }
    };

    // Fetch khi customerId, refreshTrigger hoặc location.search thay đổi
    useEffect(() => {
        if (!isControlled) {
            const initSearch = autoOpenId ? String(autoOpenId) : '';
            setSearchText(initSearch);
            fetchData(1, pagination.pageSize, initSearch);
        }
    }, [customerId, refreshTrigger, location.search]);

    // Auto-open modal khi tìm thấy record theo autoOpenId
    useEffect(() => {
        if (!autoOpenId || data.length === 0) return;
        const found = data.find(d => d.id === autoOpenId);
        if (found) {
            setEditingRecord(found);
            setViewOnly(true);
            setModalVisible(true);
        }
    }, [data, autoOpenId]);

    const handleSearch = (value) => {
        setSearchText(value);
        fetchData(1, pagination.pageSize, value);
    };

    const handleTableChange = (newPagination) => {
        const { current, pageSize } = newPagination;
        setPagination(prev => ({ ...prev, current, pageSize }));
        fetchData(current, pageSize, searchText);
    };

    const handleView = (record) => {
        setEditingRecord(record);
        setViewOnly(true);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await productCodeService.delete(id);
            message.success('Xóa mã hàng thành công');
            fetchData();
            onDeleteSuccess?.();
        } catch {
            message.error('Lỗi khi xóa mã hàng');
        }
    };

    const handleModalClose = (shouldRefresh) => {
        setModalVisible(false);
        setEditingRecord(null);
        setViewOnly(false);
        if (shouldRefresh) fetchData();
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            fixed: 'left',
            align: 'center',
        },
        {
            title: 'Ngày Nhập Kho',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 130,
            render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 180,
            render: (_, r) => r.customer
                ? `${r.customer.customerCode || r.customer.username} - ${r.customer.fullName}`
                : '-',
        },
        {
            title: 'Khối phụ trách',
            dataIndex: 'khoiPhuTrach',
            key: 'khoiPhuTrach',
            width: 130,
            render: val => val || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
            title: 'Nhân viên (Sale)',
            key: 'employee',
            width: 150,
            render: (_, r) => r.employee
                ? `${r.employee.username} - ${r.employee.fullName}`
                : '-',
        },
        {
            title: 'Mã đơn hàng',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Danh sách mặt hàng',
            key: 'itemNames',
            width: 240,
            render: (_, record) => {
                const items = (record.items || []).filter(i => i.productName);
                if (items.length === 0) return <span style={{ color: '#bfbfbf' }}>-</span>;
                return (
                    <div style={{ lineHeight: '1.8' }}>
                        {items.map((item, idx) => (
                            <div key={idx}>{item.productName}</div>
                        ))}
                    </div>
                );
            },
        },
        {
            title: 'Tổng trọng lượng',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 150,
            align: 'right',
            render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} kg` : '0 kg',
        },
        {
            title: 'Tổng khối lượng',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 150,
            align: 'right',
            render: val => val
                ? `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)} m³`
                : '0,00 m³',
        },
        {
            title: 'Tình trạng hàng hóa',
            key: 'merchandiseCondition',
            width: 170,
            render: (_, record) => record.merchandiseCondition?.name_vi || '-',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            width: 180,
            render: val => val
                ? <Tooltip title={val}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{val}</div></Tooltip>
                : <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
            title: 'Nguồn cung cấp thông tin (Kg/m³)',
            dataIndex: 'infoSource',
            key: 'infoSource',
            width: 180,
            ellipsis: true,
        },
        {
            title: 'Tỷ giá',
            dataIndex: 'exchangeRate',
            key: 'exchangeRate',
            width: 100,
            align: 'right',
            render: val => val ? new Intl.NumberFormat('de-DE').format(val) : '0',
        },
        {
            title: 'Tổng cước TQ_HN tạm tính',
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 220,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'VND')}
                </span>
            ),
        },
        {
            title: 'Chi phí khai báo',
            key: 'declarationCost',
            width: 150,
            align: 'right',
            render: (_, record) => {
                const totalTransport = Number(record.totalTransportFeeEstimate) || 0;
                const totalImport = Number(record.totalImportCostToCustomer) || 0;
                const decCost = Math.max(0, totalImport - totalTransport);
                return (
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                        {formatCurrency(decCost, 'VND')}
                    </span>
                );
            },
        },
        {
            title: (
                <Space>
                    Chi phí NK...
                    <Tooltip title="Chi phí NK hàng hóa đến tay KH = Tổng Cước TQ_HN tạm tính + Chi phí khai báo">
                        <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                    </Tooltip>
                </Space>
            ),
            dataIndex: 'totalImportCostToCustomer',
            key: 'totalImportCostToCustomer',
            width: 180,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'VND')}
                </span>
            ),
        },
        {
            title: 'Trạng thái xe',
            dataIndex: 'vehicleStatus',
            key: 'vehicleStatus',
            width: 170,
            render: (_, record) => {
                const opt = MANIFEST_STATUS_OPTIONS.find(o => o.value === record.vehicleStatus);
                if (!opt) return <Tag>Chưa xếp xe</Tag>;
                return (
                    <Space size={4}>
                        <Tag color={opt.color}>{opt.label}</Tag>
                        {record.vehicleStatusOverridden && (
                            <Tooltip title="Đã chỉnh thủ công">
                                <span style={{ color: '#faad14', fontSize: 12 }}>⚠</span>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Lệnh xuất kho',
            key: 'exportStatus',
            width: 160,
            render: (_, record) => {
                const opt = EXPORT_ORDER_STATUS_OPTIONS.find(o => o.value === record.exportStatus);
                if (!record.exportOrderId) return <Tag>Chưa có lệnh</Tag>;
                return (
                    <Space size={4}>
                        <Tag color={opt?.color || 'default'}>{opt?.label || record.exportStatus}</Tag>
                        <Tooltip title={`Lệnh #${record.exportOrderId}`}>
                            <span style={{ color: '#8c8c8c', fontSize: 11 }}>#{record.exportOrderId}</span>
                        </Tooltip>
                    </Space>
                );
            },
        },
        ...(showActions ? [{
            title: 'Thao tác',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Xem">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    </Tooltip>
                    {userRole === 'ADMIN' && (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xoá ?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Có"
                            cancelText="Không"
                        >
                            <Tooltip title="Xoá">
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        }] : []),
    ];

    const tableData = isControlled ? dataSource : data;
    const tableLoading = isControlled ? externalLoading : loading;

    return (
        <>
            {showFilters && !isControlled && (
                <Card size="small" style={{ marginBottom: 8 }}>
                    <Input.Search
                        placeholder="Tìm kiếm theo mã đơn hàng, ID..."
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: '100%' }}
                        prefix={<SearchOutlined />}
                        size="large"
                    />
                </Card>
            )}
            <Table
                columns={columns}
                dataSource={tableData}
                rowKey="id"
                loading={tableLoading}
                rowSelection={rowSelection}
                pagination={showPagination ? {
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} dòng`,
                    pageSizeOptions: ['20', '30', '40', '50'],
                } : false}
                onChange={showPagination && !isControlled ? handleTableChange : undefined}
                scroll={{ x: 'max-content' }}
                size="small"
            />
            {modalVisible && (
                <ProductCodeModal
                    visible={modalVisible}
                    onClose={handleModalClose}
                    editingRecord={editingRecord}
                    viewOnly={viewOnly}
                    userType={userType}
                    userRole={userRole}
                    onSwitchToEdit={() => setViewOnly(false)}
                />
            )}
        </>
    );
};

export default ProductCodeTable;
