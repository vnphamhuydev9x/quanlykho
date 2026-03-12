import { useState, useEffect, useMemo } from 'react';
import { Button, Space, Modal, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, TruckOutlined, ExportOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import ProductCodeModal from './ProductCodeModal';
import ManifestModal from '../manifest/ManifestModal';
import ExportOrderModal from '../exportOrder/ExportOrderModal';
import ProductCodeTable from '../../components/ProductCodeTable';
import { formatCurrency } from '../../utils/format';

const UNIT_LABEL = {
    BAO_TAI: 'bao tải',
    THUNG_CARTON: 'thùng carton',
    PALLET: 'pallet',
};

const ProductCodePage = () => {
    const location = useLocation();

    const [userType, setUserType] = useState('USER');
    const [userRole, setUserRole] = useState('USER');

    // Selection state (dùng cho Xếp xe)
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);

    // Manifest modal
    const [manifestModalVisible, setManifestModalVisible] = useState(false);
    const [manifestInitialPCIds, setManifestInitialPCIds] = useState([]);

    // Export order modal
    const [exportOrderModalVisible, setExportOrderModalVisible] = useState(false);

    // Thêm mới
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Trigger re-fetch trong ProductCodeTable sau khi mutation
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Auto-open theo URL ?id=xxx
    const autoOpenId = useMemo(() => {
        const searchId = new URLSearchParams(location.search).get('id');
        return searchId ? parseInt(searchId) : undefined;
    }, [location.search]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserType(payload.type);
                setUserRole(payload.role);
            } catch {
                // ignore invalid token
            }
        }
    }, []);

    const summaryData = useMemo(() => {
        if (selectedRows.length === 0) return null;

        const totalWeight = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalWeight) || 0), 0);
        const totalVolume = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalVolume) || 0), 0);
        const totalTransportFee = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalTransportFeeEstimate) || 0), 0);
        const totalImportCost = selectedRows.reduce((sum, pc) => sum + (Number(pc.totalImportCostToCustomer) || 0), 0);

        const packageSummary = {};
        selectedRows.forEach(pc => {
            (pc.items || []).forEach(item => {
                if (item.packageUnit && item.packageUnit !== 'KHONG_DONG_GOI') {
                    const count = Number(item.packageCount) || 0;
                    packageSummary[item.packageUnit] = (packageSummary[item.packageUnit] || 0) + count;
                }
            });
        });

        return { totalWeight, totalVolume, packageSummary, totalTransportFee, totalImportCost };
    }, [selectedRows]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (newKeys, newRows) => {
            setSelectedRowKeys(newKeys);
            setSelectedRows(newRows);
        },
    };

    const handleXepXe = () => {
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
        setManifestInitialPCIds(selectedRowKeys.map(k => parseInt(k)));
        setManifestModalVisible(true);
    };

    const handleTaoLenhXuatKho = () => {
        // Kiểm tra mã hàng có exportOrderId chưa
        const hasExportOrder = selectedRows.filter(r => r.exportOrderId);
        if (hasExportOrder.length > 0) {
            Modal.warning({
                title: 'Có mã hàng đã có lệnh xuất kho',
                width: 520,
                content: (
                    <div>
                        <p>Các mã hàng sau đã thuộc một lệnh xuất kho, vui lòng bỏ chọn:</p>
                        <ul style={{ paddingLeft: 20 }}>
                            {hasExportOrder.map(c => (
                                <li key={c.id}>
                                    <strong>#{c.id} — {c.orderCode || '(chưa có mã)'}</strong>
                                    {` (Lệnh #${c.exportOrderId})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            });
            return;
        }
        // Kiểm tra vehicleStatus phải là DA_NHAP_KHO_VN
        const notReady = selectedRows.filter(r => r.vehicleStatus !== 'DA_NHAP_KHO_VN');
        if (notReady.length > 0) {
            Modal.warning({
                title: 'Có mã hàng chưa đủ điều kiện xuất kho',
                width: 520,
                content: (
                    <div>
                        <p>Chỉ các mã hàng có trạng thái <strong>Đã nhập kho VN</strong> mới có thể tạo lệnh xuất kho. Các mã hàng sau chưa đủ điều kiện:</p>
                        <ul style={{ paddingLeft: 20 }}>
                            {notReady.map(c => (
                                <li key={c.id}>
                                    <strong>#{c.id} — {c.orderCode || '(chưa có mã)'}</strong>
                                    {` (${c.vehicleStatus || 'chưa xếp xe'})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            });
            return;
        }
        // Kiểm tra tất cả mã hàng phải cùng 1 khách hàng
        const uniqueCustomerIds = [...new Set(selectedRows.map(r => r.customerId).filter(Boolean))];
        if (uniqueCustomerIds.length > 1) {
            Modal.warning({
                title: 'Mã hàng thuộc nhiều khách hàng khác nhau',
                width: 520,
                content: (
                    <div>
                        <p>Lệnh xuất kho chỉ được tạo cho <strong>1 khách hàng</strong>. Các mã hàng đã chọn thuộc nhiều khách hàng khác nhau, vui lòng chọn lại chỉ mã hàng của 1 khách.</p>
                        <ul style={{ paddingLeft: 20 }}>
                            {selectedRows.map(c => (
                                <li key={c.id}>
                                    <strong>#{c.id} — {c.orderCode || '(chưa có mã)'}</strong>
                                    {c.customer ? ` — KH: ${c.customer.customerCode || c.customer.fullName}` : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            });
            return;
        }
        setExportInitialPCIds(selectedRowKeys.map(k => parseInt(k)));
        setExportOrderModalVisible(true);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Quản lý Mã hàng</h2>
                    {userType !== 'CUSTOMER' && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setAddModalVisible(true)}
                        >
                            Thêm Mã hàng
                        </Button>
                    )}
                </div>
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

                    <Typography.Text>
                        Tổng cân:{' '}
                        <Typography.Text strong style={{ color: '#389e0d' }}>
                            {new Intl.NumberFormat('de-DE').format(summaryData.totalWeight)} kg
                        </Typography.Text>
                    </Typography.Text>

                    <Typography.Text>
                        Tổng khối:{' '}
                        <Typography.Text strong style={{ color: '#389e0d' }}>
                            {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summaryData.totalVolume)} m³
                        </Typography.Text>
                    </Typography.Text>

                    <Typography.Text>
                        CP tạm tính:{' '}
                        <Typography.Text strong style={{ color: '#389e0d' }}>
                            {formatCurrency(summaryData.totalTransportFee, 'VND')}
                        </Typography.Text>
                    </Typography.Text>

                    <Typography.Text>
                        Chi phí NK:{' '}
                        <Typography.Text strong style={{ color: '#cf1322' }}>
                            {formatCurrency(summaryData.totalImportCost, 'VND')}
                        </Typography.Text>
                    </Typography.Text>

                    <Button
                        type="primary"
                        icon={<TruckOutlined />}
                        size="small"
                        onClick={handleXepXe}
                    >
                        Xếp xe ({selectedRows.length})
                    </Button>

                    <Button
                        type="primary"
                        icon={<ExportOutlined />}
                        size="small"
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        onClick={handleTaoLenhXuatKho}
                    >
                        Tạo lệnh xuất kho ({selectedRows.length})
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

            <ProductCodeTable
                autoOpenId={autoOpenId}
                refreshTrigger={refreshTrigger}
                rowSelection={rowSelection}
                userRole={userRole}
                userType={userType}
                showFilters
                showPagination
                showActions
                onDeleteSuccess={() => setRefreshTrigger(c => c + 1)}
            />

            {/* Modal thêm mới mã hàng */}
            {addModalVisible && (
                <ProductCodeModal
                    visible={addModalVisible}
                    onClose={(shouldRefresh) => {
                        setAddModalVisible(false);
                        if (shouldRefresh) setRefreshTrigger(c => c + 1);
                    }}
                    editingRecord={null}
                    viewOnly={false}
                    userType={userType}
                    userRole={userRole}
                    onSwitchToEdit={() => { }}
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
                        setRefreshTrigger(c => c + 1);
                    }}
                />
            )}

            {exportOrderModalVisible && (
                <ExportOrderModal
                    visible={exportOrderModalVisible}
                    mode="create"
                    exportOrderId={null}
                    initialProductCodeIds={exportInitialPCIds}
                    onClose={() => setExportOrderModalVisible(false)}
                    onSuccess={() => {
                        setExportOrderModalVisible(false);
                        setSelectedRowKeys([]);
                        setSelectedRows([]);
                        setRefreshTrigger(c => c + 1);
                    }}
                />
            )}
        </div>
    );
};

export default ProductCodePage;
