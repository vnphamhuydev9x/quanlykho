import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Input, Space, Typography,
    Tag, Tooltip, Row, Col, Select, message
} from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import exportOrderService from '../../services/exportOrderService';
import { EXPORT_ORDER_STATUS_OPTIONS } from '../../constants/enums';
import ExportOrderModal from './ExportOrderModal';

const { Title } = Typography;

const getStatusOpt = (status) =>
    EXPORT_ORDER_STATUS_OPTIONS.find(o => o.value === status) || { label: status, color: 'default' };

const ExportOrderListPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [userRole, setUserRole] = useState('USER');

    // Modal state
    const [modalMode, setModalMode] = useState(null);
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role || 'USER');
            } catch (e) { }
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                limit: pagination.pageSize,
            };
            if (searchText) params.search = searchText;
            if (statusFilter) params.status = statusFilter;

            const res = await exportOrderService.getAll(params);
            const d = res.data || res;
            setData(d.items || []);
            setPagination(prev => ({ ...prev, total: d.total || 0 }));
        } catch {
            message.error('Lỗi khi tải danh sách lệnh xuất kho');
        } finally {
            setLoading(false);
        }
    }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openModal = (mode, id = null) => {
        setModalMode(mode);
        setSelectedOrderId(id);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedOrderId(null);
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
            title: 'Khách hàng',
            key: 'customers',
            width: 200,
            render: (_, r) => {
                const codes = [...new Set((r.productCodes || []).map(pc => pc.customer?.customerCode).filter(Boolean))];
                if (codes.length === 0) return '—';
                if (codes.length === 1) return codes[0];
                return `${codes[0]} (+${codes.length - 1} khác)`;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 170,
            render: status => {
                const opt = getStatusOpt(status);
                return <Tag color={opt.color}>{opt.label}</Tag>;
            },
        },
        {
            title: 'Số mã hàng',
            key: 'productCodeCount',
            width: 110,
            align: 'center',
            render: (_, r) => <strong>{(r.productCodes || []).length}</strong>,
        },
        {
            title: 'Ngày giao dự kiến',
            dataIndex: 'deliveryDateTime',
            key: 'deliveryDateTime',
            width: 150,
            render: d => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—',
        },
        {
            title: 'Chi phí giao hàng',
            dataIndex: 'deliveryCost',
            key: 'deliveryCost',
            width: 150,
            align: 'right',
            render: v => v ? `${new Intl.NumberFormat('de-DE').format(v)} ₫` : '—',
        },
        {
            title: 'Số tiền đã thu',
            dataIndex: 'amountReceived',
            key: 'amountReceived',
            width: 140,
            align: 'right',
            render: v => v != null ? `${new Intl.NumberFormat('de-DE').format(v)} ₫` : '—',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            ellipsis: true,
            render: v => v || '—',
        },
        {
            title: 'Người tạo',
            key: 'createdBy',
            width: 160,
            render: (_, r) => r.createdBy
                ? `${r.createdBy.username} — ${r.createdBy.fullName}`
                : '—',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 130,
            render: d => d ? dayjs(d).format('DD/MM/YYYY') : '—',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 80,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Tooltip title="Xem chi tiết">
                    <Button
                        type="text"
                        icon={<EyeOutlined style={{ color: '#1677ff' }} />}
                        size="small"
                        onClick={() => openModal('view', record.id)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>
                        <ExportOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                        Quản lý Lệnh Xuất Kho
                    </Title>
                </Col>
                <Col>
                    <Space>
                        <Input.Search
                            placeholder="Tìm theo tên khách hàng..."
                            onSearch={val => {
                                setSearchText(val);
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            allowClear
                            style={{ width: 260 }}
                            prefix={<SearchOutlined />}
                        />
                        <Select
                            allowClear
                            placeholder="Lọc trạng thái"
                            style={{ width: 180 }}
                            options={EXPORT_ORDER_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                            onChange={val => {
                                setStatusFilter(val);
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openModal('create')}
                        >
                            Tạo lệnh xuất kho
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
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} lệnh`,
                    pageSizeOptions: ['20', '30', '50'],
                    onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize })),
                }}
            />

            {modalMode && (
                <ExportOrderModal
                    visible={!!modalMode}
                    mode={modalMode}
                    exportOrderId={selectedOrderId}
                    onClose={closeModal}
                    onSuccess={() => {
                        closeModal();
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default ExportOrderListPage;
