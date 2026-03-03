import { useState, useEffect, useCallback } from 'react';
import ProductCodeTable from '../../components/ProductCodeTable';
import {
    Table, Button, Space, Tag, message, Spin, Descriptions,
    Modal, Typography, Row, Col, Card, Popconfirm, Divider
} from 'antd';
import {
    ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
    TruckOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import manifestService from '../../services/manifestService';
import productCodeService from '../../services/productCodeService';
import { MANIFEST_STATUS_OPTIONS } from '../../constants/enums';
import { formatCurrency } from '../../utils/format';

const { Title, Text } = Typography;

const getStatusOption = (status) =>
    MANIFEST_STATUS_OPTIONS.find(o => o.value === status) || { label: status, color: 'default' };

const ManifestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [manifest, setManifest] = useState(null);
    const [loading, setLoading] = useState(false);

    // Modal thêm mã hàng
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [availablePCs, setAvailablePCs] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [selectedPCKeys, setSelectedPCKeys] = useState([]);
    const [addingItems, setAddingItems] = useState(false);

    const fetchManifest = useCallback(async () => {
        setLoading(true);
        try {
            const res = await manifestService.getById(id);
            setManifest(res.data || res);
        } catch {
            message.error('Lỗi khi tải thông tin chuyến xe');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchManifest(); }, [fetchManifest]);

    // Fetch danh sách mã hàng chưa có xe để thêm vào
    const fetchAvailablePCs = async () => {
        setLoadingAvailable(true);
        try {
            // Lấy tất cả ProductCode không có manifestId
            const res = await productCodeService.getAll(1, 200, '');
            const all = res.data?.items || res.items || res.data || [];
            // Lọc những cái chưa có xe
            setAvailablePCs(all.filter(pc => !pc.manifestId));
        } catch {
            message.error('Lỗi khi tải danh sách mã hàng');
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleOpenAddModal = () => {
        setSelectedPCKeys([]);
        fetchAvailablePCs();
        setAddModalVisible(true);
    };

    const handleAddItems = async () => {
        if (selectedPCKeys.length === 0) {
            message.warning('Chưa chọn mã hàng nào');
            return;
        }
        setAddingItems(true);
        try {
            await manifestService.addItems(id, selectedPCKeys);
            message.success(`Đã thêm ${selectedPCKeys.length} mã hàng vào xe`);
            setAddModalVisible(false);
            fetchManifest();
        } catch (err) {
            message.error(err.response?.data?.message || 'Lỗi khi thêm mã hàng');
        } finally {
            setAddingItems(false);
        }
    };

    const handleRemoveItem = async (pcId) => {
        try {
            await manifestService.removeItems(id, [pcId]);
            message.success('Đã xóa mã hàng khỏi xe');
            fetchManifest();
        } catch {
            message.error('Lỗi khi xóa mã hàng khỏi xe');
        }
    };

    // Columns cho danh sách mã hàng trong xe
    const pcColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
        { title: 'Mã đơn hàng', dataIndex: 'orderCode', key: 'orderCode', width: 150 },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 180,
            render: (_, r) => r.customer
                ? `${r.customer.customerCode || ''} ${r.customer.fullName}`.trim()
                : '—'
        },
        {
            title: 'Tổng cân (kg)',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 130,
            align: 'right',
            render: (v) => v ? new Intl.NumberFormat('de-DE').format(v) + ' kg' : '0 kg'
        },
        {
            title: 'Tổng khối (m³)',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 130,
            align: 'right',
            render: (v) => v
                ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' m³'
                : '0,00 m³'
        },
        {
            title: 'Ngày nhập kho',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 130,
            render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="Xóa mã hàng khỏi xe?"
                    description="Mã hàng sẽ không bị xóa, chỉ được tách khỏi chuyến xe này."
                    onConfirm={() => handleRemoveItem(record.id)}
                    okText="Xóa"
                    okButtonProps={{ danger: true }}
                    cancelText="Hủy"
                >
                    <Button danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            )
        }
    ];


    if (loading && !manifest) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large" />
            </div>
        );
    }

    const statusOpt = manifest ? getStatusOption(manifest.status) : null;

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
                <Col>
                    <Space size="middle">
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/manifests')}>
                            Quay lại
                        </Button>
                        <Space>
                            <TruckOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                            <Title level={4} style={{ margin: 0 }}>
                                {manifest?.licensePlate || 'Đang tải...'}
                            </Title>
                            {statusOpt && <Tag color={statusOpt.color} style={{ fontSize: 13 }}>{statusOpt.label}</Tag>}
                        </Space>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchManifest}>Làm mới</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                            Thêm mã hàng
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Thông tin xe */}
            {manifest && (
                <Card style={{ marginBottom: 16 }}>
                    <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                        <Descriptions.Item label="Biển số xe">
                            <strong>{manifest.licensePlate}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Người gọi xe">
                            {manifest.caller
                                ? `${manifest.caller.username} — ${manifest.caller.fullName}`
                                : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày xếp xe">
                            {manifest.date ? dayjs(manifest.date).format('DD/MM/YYYY') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {statusOpt && <Tag color={statusOpt.color}>{statusOpt.label}</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú">
                            {manifest.note || '—'}
                        </Descriptions.Item>
                    </Descriptions>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Tổng hợp */}
                    <Row gutter={32}>
                        <Col>
                            <Text type="secondary">Số mã hàng</Text>
                            <div><Text strong style={{ fontSize: 18, color: '#1677ff' }}>{manifest.totalProductCodes ?? 0}</Text></div>
                        </Col>
                        <Col>
                            <Text type="secondary">Tổng cân</Text>
                            <div>
                                <Text strong style={{ fontSize: 18, color: '#389e0d' }}>
                                    {new Intl.NumberFormat('de-DE').format(manifest.totalWeight ?? 0)} kg
                                </Text>
                            </div>
                        </Col>
                        <Col>
                            <Text type="secondary">Tổng khối</Text>
                            <div>
                                <Text strong style={{ fontSize: 18, color: '#389e0d' }}>
                                    {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(manifest.totalVolume ?? 0)} m³
                                </Text>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Danh sách mã hàng trong xe */}
            <Card title={<><TruckOutlined style={{ marginRight: 6 }} />Danh sách mã hàng trong xe</>}>
                <Table
                    columns={pcColumns}
                    dataSource={manifest?.productCodes || []}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                />
            </Card>

            {/* Modal thêm mã hàng */}
            <Modal
                title="Thêm mã hàng vào xe"
                open={addModalVisible}
                onCancel={() => setAddModalVisible(false)}
                onOk={handleAddItems}
                okText={`Thêm ${selectedPCKeys.length > 0 ? `(${selectedPCKeys.length})` : ''}`}
                cancelText="Hủy"
                confirmLoading={addingItems}
                width={800}
                maskClosable={false}
            >
                {selectedPCKeys.length > 0 && (
                    <div style={{
                        background: '#e6f4ff',
                        border: '1px solid #91caff',
                        borderRadius: 6,
                        padding: '8px 14px',
                        marginBottom: 12,
                        color: '#1677ff',
                        fontWeight: 500
                    }}>
                        ✓ Đã chọn {selectedPCKeys.length} mã hàng
                    </div>
                )}
                <ProductCodeTable
                    dataSource={availablePCs}
                    externalLoading={loadingAvailable}
                    rowSelection={{
                        selectedRowKeys: selectedPCKeys,
                        onChange: (keys) => setSelectedPCKeys(keys),
                    }}
                    showFilters={false}
                    showPagination={false}
                    showActions={false}
                />
            </Modal>
        </div>
    );
};

export default ManifestDetailPage;
