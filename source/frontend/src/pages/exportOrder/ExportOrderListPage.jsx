import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table, Button, Input, Space, Typography,
    Tag, Tooltip, Row, Col, Select, message
} from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined, ExportOutlined, SendOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
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

    const location = useLocation();

    // Parse status from URL
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const urlStatus = urlParams.get('status') || '';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                limit: pagination.pageSize,
            };
            if (searchText) params.search = searchText;

            // Priority: Local state filter > URL filter
            const effectiveStatus = statusFilter || urlStatus;
            if (effectiveStatus) params.status = effectiveStatus;

            const res = await exportOrderService.getAll(params);
            const d = res.data || res;
            setData(d.items || []);
            setPagination(prev => ({ ...prev, total: d.total || 0 }));
        } catch {
            message.error('Lỗi khi tải danh sách lệnh xuất kho');
        } finally {
            setLoading(false);
        }
    }, [pagination.current, pagination.pageSize, searchText, statusFilter, urlStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset status filter when URL changes (to handle navigation between "All" and "Sub-menus")
    useEffect(() => {
        setStatusFilter('');
    }, [location.search]);

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
            key: 'customer',
            width: 200,
            render: (_, r) => r.customer
                ? `${r.customer.customerCode || ''} — ${r.customer.fullName}`.trim()
                : '—',
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
            title: 'Phí ship',
            dataIndex: 'deliveryCost',
            key: 'deliveryCost',
            width: 130,
            align: 'right',
            render: v => v ? `${new Intl.NumberFormat('de-DE').format(v)} ₫` : '—',
        },
        {
            title: 'Đã nhận tiền',
            dataIndex: 'paymentReceived',
            key: 'paymentReceived',
            width: 120,
            align: 'center',
            render: (v, r) => r.status === 'DA_XUAT_KHO'
                ? <Tag color={v ? 'green' : 'red'}>{v ? 'Đã nhận' : 'Công nợ'}</Tag>
                : '—',
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
                ? `${r.createdBy.username} — ${r.createdBy.fullName} `
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
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            icon={<EyeOutlined style={{ color: '#1677ff' }} />}
                            size="small"
                            onClick={() => openModal('view', record.id)}
                        />
                    </Tooltip>
                    {record.status === 'DA_TAO_LENH' && (
                        <Tooltip title="Cân thực tế">
                            <Button
                                type="text"
                                icon={<SendOutlined style={{ color: '#faad14' }} />}
                                size="small"
                                onClick={() => openModal('submit-reweigh', record.id)}
                            />
                        </Tooltip>
                    )}
                </Space>
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
                    showTotal: (total, range) => `${range[0]} -${range[1]} / ${total} lệnh`,
                    pageSizeOptions: ['20', '30', '50'],
                    onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize })),
                }}
            />

            {
                modalMode && (
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
                )
            }
        </div >
    );
};

export default ExportOrderListPage;
