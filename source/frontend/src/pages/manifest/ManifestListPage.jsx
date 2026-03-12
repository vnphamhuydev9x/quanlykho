import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Input, Space, Typography,
    Modal, message, Tag, Tooltip, Popconfirm, Row, Col
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, EyeOutlined, TruckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import manifestService from '../../services/manifestService';
import { MANIFEST_STATUS_OPTIONS } from '../../constants/enums';
import ManifestModal from './ManifestModal';

const { Title } = Typography;

const getStatusOption = (status) =>
    MANIFEST_STATUS_OPTIONS.find(o => o.value === status) || { label: status, color: 'default' };

const ManifestListPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [userRole, setUserRole] = useState('USER');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role || 'USER');
            } catch (e) { }
        }
    }, []);

    // Modal state
    const [modalMode, setModalMode] = useState(null);  // 'create' | 'view' | 'edit'
    const [selectedManifestId, setSelectedManifestId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await manifestService.getAll({
                page: pagination.current,
                limit: pagination.pageSize,
                search: searchText
            });
            const d = res.data || res;
            setData(d.items || []);
            setPagination(prev => ({ ...prev, total: d.total || 0 }));
        } catch {
            message.error('Lỗi khi tải danh sách chuyến xe');
        } finally {
            setLoading(false);
        }
    }, [pagination.current, pagination.pageSize, searchText]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openModal = (mode, id = null) => {
        setModalMode(mode);
        setSelectedManifestId(id);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedManifestId(null);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Xác nhận xóa chuyến xe',
            content: 'Các mã hàng trong chuyến sẽ được giải phóng (trạng thái xếp xe về null). Tiếp tục?',
            okText: 'Xóa',
            okButtonProps: { danger: true },
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await manifestService.delete(id);
                    message.success('Xóa thành công');
                    fetchData();
                } catch {
                    message.error('Lỗi khi xóa');
                }
            }
        });
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70, fixed: 'left', align: 'center' },
        {
            title: 'Biển số xe',
            dataIndex: 'licensePlate',
            key: 'licensePlate',
            width: 140,
            render: val => (
                <Space>
                    <TruckOutlined style={{ color: '#1677ff' }} />
                    <strong>{val}</strong>
                </Space>
            )
        },
        {
            title: 'Người gọi xe',
            key: 'caller',
            width: 160,
            render: (_, r) => r.caller ? `${r.caller.username} — ${r.caller.fullName}` : '—'
        },
        {
            title: 'Ngày xếp xe',
            dataIndex: 'date',
            key: 'date',
            width: 130,
            render: d => d ? dayjs(d).format('DD/MM/YYYY') : '—'
        },
        {
            title: 'Số mã hàng',
            dataIndex: 'totalProductCodes',
            key: 'totalProductCodes',
            width: 110,
            align: 'center',
            render: v => <strong>{v ?? 0}</strong>
        },
        {
            title: 'Tổng cân (kg)',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 130,
            align: 'right',
            render: v => v ? `${new Intl.NumberFormat('de-DE').format(v)} kg` : '0 kg'
        },
        {
            title: 'Tổng khối (m³)',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 130,
            align: 'right',
            render: v => v
                ? `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} m³`
                : '0,00 m³'
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: status => {
                const opt = getStatusOption(status);
                return <Tag color={opt.color}>{opt.label}</Tag>;
            }
        },
        { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
        {
            title: 'Lợi nhuận tạm tính',
            dataIndex: 'estimatedProfit',
            key: 'estimatedProfit',
            width: 170,
            align: 'right',
            fixed: 'right',
            render: v => {
                const val = Number(v || 0);
                const formatted = new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
                return <strong style={{ color: val >= 0 ? '#389e0d' : '#cf1322' }}>{formatted}</strong>;
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 100,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            icon={<EyeOutlined style={{ color: '#1677ff' }} />}
                            size="small"
                            onClick={() => openModal('view', record.id)}
                        />
                    </Tooltip>
                    {userRole === 'ADMIN' && (
                        <Tooltip title="Xóa">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={() => handleDelete(record.id)}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>
                        <TruckOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                        Quản lý Xếp Xe
                    </Title>
                </Col>
                <Col>
                    <Space>
                        <Input.Search
                            placeholder="Tìm theo biển số xe..."
                            onSearch={val => {
                                setSearchText(val);
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            allowClear
                            style={{ width: 260 }}
                            prefix={<SearchOutlined />}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openModal('create')}
                        >
                            Tạo chuyến mới
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} chuyến`,
                    pageSizeOptions: ['20', '30', '50'],
                    onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize }))
                }}
            />

            {modalMode && (
                <ManifestModal
                    visible={!!modalMode}
                    mode={modalMode}
                    manifestId={selectedManifestId}
                    onClose={closeModal}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};

export default ManifestListPage;
