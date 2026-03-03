import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Row, Col, Card, Tooltip, Tag, Typography, Divider, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, TruckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import productCodeService from '../../services/productCodeService';
import ProductCodeModal from './ProductCodeModal';
import ManifestModal from '../manifest/ManifestModal';
import { formatCurrency } from '../../utils/format';
import { MANIFEST_STATUS_OPTIONS } from '../../constants/enums';

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
    const [userType, setUserType] = useState('USER');
    const [userRole, setUserRole] = useState('USER');

    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);

    // Manifest modal (Xếp xe từ màn hình Mã hàng)
    const [manifestModalVisible, setManifestModalVisible] = useState(false);
    const [manifestInitialPCIds, setManifestInitialPCIds] = useState([]);

    const UNIT_LABEL = {
        BAO_TAI: 'bao tải',
        THUNG_CARTON: 'thùng carton',
        PALLET: 'pallet',
    };

    // Tính toán summary khi user tick chọn
    const summaryData = useMemo(() => {
        if (selectedRows.length === 0) return null;

        const totalWeight = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalWeight) || 0), 0);
        const totalVolume = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalVolume) || 0), 0);

        // Gộm số kiện theo đơn vị từ items con (bỏ KHONG_DONG_GOI)
        const packageSummary = {};
        selectedRows.forEach(pc => {
            (pc.items || []).forEach(item => {
                if (item.packageUnit && item.packageUnit !== 'KHONG_DONG_GOI') {
                    const count = Number(item.packageCount) || 0;
                    packageSummary[item.packageUnit] = (packageSummary[item.packageUnit] || 0) + count;
                }
            });
        });

        return { totalWeight, totalVolume, packageSummary };
    }, [selectedRows]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (newKeys, newRows) => {
            setSelectedRowKeys(newKeys);
            setSelectedRows(newRows);
        },
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserType(payload.type);
                setUserRole(payload.role);
            } catch (e) {
                console.error("Invalid token");
            }
        }
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchId = queryParams.get('id');
        if (searchId) {
            fetchData(1, pagination.pageSize, searchId);
        } else {
            fetchData();
        }
    }, [pagination.current, pagination.pageSize, searchText, location.search]);

    const fetchData = async (p = pagination.current, l = pagination.pageSize, s = searchText) => {
        setLoading(true);
        try {
            const response = await productCodeService.getAll(
                p,
                l,
                s
            );
            setData(response.data.items);
            setPagination(prev => ({
                ...prev,
                total: response.data.total
            }));
        } catch (error) {
            message.error(t('common.loadError', 'Lỗi khi tải dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchId = queryParams.get('id');
        if (searchId && data.length > 0) {
            const found = data.find(d => d.id === parseInt(searchId));
            if (found) {
                handleView(found);
            }
        }
    }, [data, location.search]);

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
            message.success(t('common.deleteSuccess', 'Xóa thành công'));
            fetchData();
        } catch (error) {
            message.error(t('common.deleteError', 'Lỗi khi xóa'));
        }
    };

    const handleModalClose = (shouldRefresh) => {
        setModalVisible(false);
        setEditingRecord(null);
        setViewOnly(false);
        if (shouldRefresh) {
            fetchData();
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            fixed: 'left',
            align: 'center'
        },
        {
            title: 'Ngày Nhập Kho',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 130,
            render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 180,
            render: (_, r) => r.customer ? `${r.customer.customerCode || r.customer.username} - ${r.customer.fullName}` : '-'
        },
        {
            title: 'Nhân viên (Sale)',
            key: 'employee',
            width: 150,
            render: (_, r) => r.employee ? `${r.employee.username} - ${r.employee.fullName}` : '-'
        },
        {
            title: 'Mã đơn hàng',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150,
            ellipsis: true
        },
        {
            title: 'Tổng trọng lượng',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 150,
            align: 'right',
            render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} kg` : '0 kg'
        },
        {
            title: 'Tổng khối lượng',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 150,
            align: 'right',
            render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} m³` : '0 m³'
        },
        {
            title: 'Tình trạng hàng hóa',
            key: 'merchandiseCondition',
            width: 170,
            render: (_, record) => record.merchandiseCondition?.name_vi || '-'
        },
        {
            title: 'Nguồn cung cấp thông tin (Kg/m³)',
            dataIndex: 'infoSource',
            key: 'infoSource',
            width: 180,
            ellipsis: true
        },
        {
            title: 'Tỷ giá',
            dataIndex: 'exchangeRate',
            key: 'exchangeRate',
            width: 100,
            align: 'right',
            render: val => val ? new Intl.NumberFormat('de-DE').format(val) : '0'
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
            )
        },
        {
            title: 'Tình trạng xếp xe',
            key: 'vehicleStatus',
            width: 150,
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
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 100,
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
            )
        }
    ];


    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <h2 style={{ margin: 0 }}>Quản lý Mã hàng</h2>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            {userType !== 'CUSTOMER' && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    Thêm Mã hàng
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={24}>
                            <Input.Search
                                placeholder="Tìm kiếm theo mã đơn hàng, ID..."
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

            {/* Summary bar — hiển thị khi có ít nhất 1 mã hàng được chọn */}
            {summaryData && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px 20px',
                    backgroundColor: '#e6f4ff',
                    border: '1px solid #91caff',
                    borderRadius: 8,
                    padding: '10px 16px',
                    marginBottom: 12,
                }}>
                    <Typography.Text strong style={{ color: '#1677ff', whiteSpace: 'nowrap' }}>
                        ✓ Đã chọn {selectedRows.length} mã hàng
                    </Typography.Text>

                    <Divider type="vertical" style={{ borderColor: '#91caff', height: 20 }} />

                    {/* Số kiện theo đơn vị*/}
                    <Space size={8} wrap>
                        {Object.entries(summaryData.packageSummary).length === 0 ? (
                            <Typography.Text type="secondary">Không có đơn vị đóng gói</Typography.Text>
                        ) : (
                            Object.entries(summaryData.packageSummary).map(([unit, count]) => (
                                <Tag key={unit} color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
                                    {new Intl.NumberFormat('de-DE').format(count)} {UNIT_LABEL[unit] || unit.toLowerCase()}
                                </Tag>
                            ))
                        )}
                    </Space>

                    <Divider type="vertical" style={{ borderColor: '#91caff', height: 20 }} />

                    {/* Tổng cân */}
                    <Typography.Text>
                        Tổng cân:{' '}
                        <Typography.Text strong style={{ color: '#389e0d' }}>
                            {new Intl.NumberFormat('de-DE').format(summaryData.totalWeight)} kg
                        </Typography.Text>
                    </Typography.Text>

                    {/* Tổng khối */}
                    <Typography.Text>
                        Tổng khối:{' '}
                        <Typography.Text strong style={{ color: '#389e0d' }}>
                            {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summaryData.totalVolume)} m³
                        </Typography.Text>
                    </Typography.Text>

                    {/* Nút Xếp xe */}
                    <Button
                        type="primary"
                        icon={<TruckOutlined />}
                        size="small"
                        onClick={() => {
                            // Kiểm tra mã hàng nào đã có vehicleStatus
                            const conflicts = selectedRows.filter(r => r.vehicleStatus);
                            if (conflicts.length > 0) {
                                Modal.warning({
                                    title: 'Có mã hàng đã được xếp xe',
                                    width: 520,
                                    content: (
                                        <div>
                                            <p>Các mã hàng sau đã được xếp vào xe khác, vui lòng bỏ chọn trước khi tiếp tục:</p>
                                            <ul style={{ paddingLeft: 20 }}>
                                                {conflicts.map(c => (
                                                    <li key={c.id}>
                                                        <strong>#{c.id} — {c.orderCode || '(chưa có mã)'}</strong>
                                                        {c.manifest && ` (Xe ${c.manifest.licensePlate || '#' + c.manifestId})`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                });
                                return;
                            }
                            // Tất cả hợp lệ → mở ManifestModal create
                            setManifestInitialPCIds(selectedRowKeys.map(k => parseInt(k)));
                            setManifestModalVisible(true);
                        }}
                    >
                        Xếp xe ({selectedRows.length})
                    </Button>

                    <Button
                        type="text"
                        size="small"
                        style={{ marginLeft: 'auto', color: '#999' }}
                        onClick={() => { setSelectedRowKeys([]); setSelectedRows([]); }}
                    >
                        Bỏ chọn
                    </Button>
                </div>
            )}

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                rowSelection={rowSelection}
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} dòng`,
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
                    userRole={userRole}
                    onSwitchToEdit={() => {
                        setViewOnly(false);
                    }}
                />
            )}

            {manifestModalVisible && (
                <ManifestModal
                    visible={manifestModalVisible}
                    mode="create"
                    initialProductCodeIds={manifestInitialPCIds}
                    onClose={() => setManifestModalVisible(false)}
                    onSuccess={() => {
                        setManifestModalVisible(false);
                        setSelectedRowKeys([]);
                        setSelectedRows([]);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default ProductCodePage;
