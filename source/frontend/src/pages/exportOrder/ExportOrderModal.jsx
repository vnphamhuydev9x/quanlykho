import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Modal, Form, Input, InputNumber, DatePicker, Select,
    Button, Space, Tag, Table, Checkbox, Descriptions,
    message, Spin, Divider, Typography, Popconfirm, Alert,
    Row, Col
} from 'antd';
import {
    ExportOutlined, CheckOutlined, SendOutlined, DeleteOutlined,
    PlusOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import exportOrderService from '../../services/exportOrderService';
import productCodeService from '../../services/productCodeService';
import ProductCodeTable from '../../components/ProductCodeTable';
import axiosInstance from '../../utils/axios';
import { EXPORT_ORDER_STATUS_OPTIONS } from '../../constants/enums';

const { Text } = Typography;

const getStatusOpt = (status) =>
    EXPORT_ORDER_STATUS_OPTIONS.find(o => o.value === status) || { label: status, color: 'default' };

const formatNum = (v, decimals = 0) => {
    if (v == null || v === '') return '—';
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(v);
};

const formatVND = (v) => v != null ? `${new Intl.NumberFormat('de-DE').format(v)} ₫` : '—';

/**
 * ExportOrderModal - Quản lý Lệnh Xuất Kho
 *
 * Modes:
 *  - 'create'         : Tạo lệnh mới
 *  - 'view'           : Xem chi tiết + action buttons theo status
 *  - 'submit-reweigh' : Nhập số cân thực tế
 *  - 'confirm-reweigh': Xác nhận số cân thực tế
 *  - 'delivery'       : Hoàn thành xuất kho (nhập tiền thu + phí vận chuyển)
 */
const ExportOrderModal = ({ visible, mode: initialMode, exportOrderId, initialProductCodeIds = [], onClose, onSuccess }) => {
    const [mode, setMode] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState(null);
    const [form] = Form.useForm();

    // Create mode state
    const [selectedPCIds, setSelectedPCIds] = useState([]);
    const [selectedPCs, setSelectedPCs] = useState([]);

    // Modal chọn mã hàng
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [availablePCs, setAvailablePCs] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [selectedAddKeys, setSelectedAddKeys] = useState([]);

    // Submit-reweigh & Confirm-reweigh data states
    const [reweighData, setReweighData] = useState({});
    const [confirmData, setConfirmData] = useState({});

    // Delivery form
    const [deliveryForm] = Form.useForm();

    // 1. Initial Load Effect - Only runs when visible or mode/id changes
    useEffect(() => {
        if (!visible) {
            // Reset when modal closes
            setOrder(null);
            setSelectedPCIds([]);
            setSelectedPCs([]);
            form.resetFields();
            return;
        }

        setMode(initialMode);

        if (initialMode === 'create') {
            form.resetFields();
            form.setFieldsValue({ deliveryDateTime: dayjs().add(1, 'hour') });

            // Khởi tạo danh sách PC từ props (nếu có)
            if (initialProductCodeIds && initialProductCodeIds.length > 0) {
                const ids = initialProductCodeIds.map(id => Number(id));
                setSelectedPCIds(ids);

                // Load chi tiết PC
                setLoading(true);
                productCodeService.getAll(1, 1000, '').then(res => {
                    const all = res.data?.items || res.items || [];
                    setSelectedPCs(all.filter(pc => ids.includes(pc.id)));
                }).catch(() => {
                    message.error('Lỗi khi tải thông tin mã hàng');
                }).finally(() => setLoading(false));
            }
        } else {
            // View / Reweigh / Confirm / Delivery modes
            if (exportOrderId) {
                setLoading(true);
                exportOrderService.getById(exportOrderId).then(res => {
                    const data = res.data || res;
                    setOrder(data);
                }).catch(() => {
                    message.error('Lỗi khi tải chi tiết lệnh xuất kho');
                }).finally(() => setLoading(false));
            }
        }
    }, [visible, initialMode, exportOrderId]);

    // 2. Initialize reweigh/confirm data when mode changes locally
    useEffect(() => {
        if (!order) return;
        const allItems = (order.productCodes || []).flatMap(pc => pc.items || []);

        if (mode === 'submit-reweigh') {
            const init = {};
            allItems.forEach(item => {
                init[item.id] = {
                    actualWeight: item.actualWeight ?? item.weight,
                    actualVolume: item.actualVolume != null ? Number(item.actualVolume) : (item.volume != null ? Number(item.volume) : null),
                };
            });
            setReweighData(init);
        }
        if (mode === 'confirm-reweigh') {
            const init = {};
            allItems.forEach(item => {
                init[item.id] = item.useActualData ?? false;
            });
            setConfirmData(init);
        }
    }, [order, mode]);

    // 3. Fetch danh sách PC có thể xuất (NHAP_KHO_VN + chưa có lệnh)
    const fetchAvailablePCs = async () => {
        setLoadingAvailable(true);
        try {
            const res = await productCodeService.getAll(1, 1000, '');
            const all = res.data?.items || res.items || [];
            // Filter: Đã nhập kho VN VÀ Chưa có lệnh xuất kho VÀ chưa có trong danh sách chọn
            const eligible = all.filter(pc =>
                pc.vehicleStatus === 'DA_NHAP_KHO_VN' &&
                !pc.exportOrderId &&
                !selectedPCIds.includes(pc.id)
            );
            setAvailablePCs(eligible);
        } catch {
            message.error('Lỗi khi tải danh sách mã hàng');
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleOpenAddModal = () => {
        setAddModalVisible(true);
        setSelectedAddKeys([]);
        fetchAvailablePCs();
    };

    const handleAddItems = () => {
        if (selectedAddKeys.length === 0) {
            message.warning('Vui lòng chọn mã hàng');
            return;
        }
        setAddModalVisible(false);
        const newlySelected = availablePCs.filter(pc => selectedAddKeys.includes(pc.id));
        setSelectedPCIds(prev => [...prev, ...selectedAddKeys]);
        setSelectedPCs(prev => [...prev, ...newlySelected]);
    };

    const handleRemoveSelectedItem = (id) => {
        setSelectedPCIds(prev => prev.filter(x => x !== id));
        setSelectedPCs(prev => prev.filter(x => x.id !== id));
    };

    // ===================== HANDLERS =====================

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            if (selectedPCIds.length === 0) {
                message.warning('Vui lòng chọn ít nhất 1 mã hàng');
                return;
            }
            setSubmitting(true);
            await exportOrderService.create({
                productCodeIds: selectedPCIds,
                deliveryDateTime: values.deliveryDateTime ? values.deliveryDateTime.toISOString() : undefined,
                deliveryCost: values.deliveryCost || undefined,
                notes: values.notes || undefined,
            });
            message.success('Tạo lệnh xuất kho thành công');
            onSuccess();
        } catch (err) {
            if (err?.errorFields) return; // validation error
            const msg = err?.response?.data?.message || 'Lỗi khi tạo lệnh xuất kho';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReweigh = async () => {
        const allItems = (order.productCodes || []).flatMap(pc => pc.items || []);
        // Validate tất cả items phải có actualWeight và actualVolume
        for (const item of allItems) {
            const d = reweighData[item.id] || {};
            if (d.actualWeight == null || d.actualVolume == null) {
                message.warning(`Mặt hàng ID ${item.id} chưa có cân/khối thực tế`);
                return;
            }
        }
        setSubmitting(true);
        try {
            const items = allItems.map(item => ({
                productItemId: item.id,
                actualWeight: reweighData[item.id]?.actualWeight,
                actualVolume: reweighData[item.id]?.actualVolume,
            }));
            await exportOrderService.submitReweigh(exportOrderId, items);
            message.success('Đã gửi số cân thực tế');
            onSuccess();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Lỗi khi gửi số cân';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmReweigh = async () => {
        const allItems = (order.productCodes || []).flatMap(pc => pc.items || []);
        setSubmitting(true);
        try {
            const items = allItems.map(item => ({
                productItemId: item.id,
                useActualData: confirmData[item.id] ?? false,
            }));
            await exportOrderService.confirmReweigh(exportOrderId, items);
            message.success('Đã xác nhận số cân');
            onSuccess();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Lỗi khi xác nhận số cân';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelivery = async () => {
        try {
            const values = await deliveryForm.validateFields();
            setSubmitting(true);
            await exportOrderService.updateStatus(exportOrderId, {
                status: 'DA_XUAT_KHO',
                amountReceived: values.amountReceived,
                actualShippingCost: values.actualShippingCost || undefined,
            });
            message.success('Đã xác nhận xuất kho');
            onSuccess();
        } catch (err) {
            if (err?.errorFields) return;
            const msg = err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        setSubmitting(true);
        try {
            await exportOrderService.cancel(exportOrderId);
            message.success('Đã hủy lệnh xuất kho');
            onSuccess();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Lỗi khi hủy lệnh';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ===================== RENDER HELPERS =====================

    const getTitle = () => {
        if (mode === 'create') return 'Tạo Lệnh Xuất Kho';
        const id = exportOrderId ? ` #${exportOrderId}` : '';
        if (mode === 'submit-reweigh') return `Gửi Số Cân Thực Tế${id}`;
        if (mode === 'confirm-reweigh') return `Xác Nhận Số Cân${id}`;
        if (mode === 'delivery') return `Hoàn Thành Xuất Kho${id}`;
        return `Chi Tiết Lệnh Xuất Kho${id}`;
    };

    const getWidth = () => {
        if (mode === 'confirm-reweigh') return 1300;
        if (mode === 'submit-reweigh') return 1100;
        return 1100;
    };

    const getFooter = () => {
        if (mode === 'create') {
            return [
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" icon={<ExportOutlined />} loading={submitting} onClick={handleCreate}>
                    Tạo lệnh
                </Button>,
            ];
        }
        if (mode === 'submit-reweigh') {
            return [
                <Button key="back" onClick={() => { setMode('view'); loadOrder(); }}>Quay lại</Button>,
                <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmitReweigh}>
                    Gửi số cân thực tế
                </Button>,
            ];
        }
        if (mode === 'confirm-reweigh') {
            return [
                <Button key="back" onClick={() => { setMode('view'); loadOrder(); }}>Quay lại</Button>,
                <Button key="submit" type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleConfirmReweigh}>
                    Xác nhận & Hoàn tất số cân
                </Button>,
            ];
        }
        if (mode === 'delivery') {
            return [
                <Button key="back" onClick={() => { setMode('view'); loadOrder(); }}>Quay lại</Button>,
                <Button key="submit" type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleDelivery}>
                    Xác nhận xuất kho
                </Button>,
            ];
        }
        // view mode — buttons based on order status
        if (!order) return [<Button key="close" onClick={onClose}>Đóng</Button>];
        const buttons = [<Button key="close" onClick={onClose}>Đóng</Button>];
        if (order.status === 'DA_TAO_LENH') {
            buttons.push(
                <Popconfirm
                    key="cancel"
                    title="Xác nhận hủy lệnh?"
                    description="Các mã hàng sẽ được giải phóng khỏi lệnh xuất kho."
                    okText="Hủy lệnh"
                    okButtonProps={{ danger: true }}
                    cancelText="Không"
                    onConfirm={handleCancel}
                >
                    <Button danger icon={<DeleteOutlined />} loading={submitting}>Hủy lệnh</Button>
                </Popconfirm>
            );
            buttons.push(
                <Button
                    key="reweigh"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setMode('submit-reweigh')}
                >
                    Nhập số cân thực tế
                </Button>
            );
        }
        if (order.status === 'DANG_XAC_NHAN_CAN') {
            buttons.push(
                <Button
                    key="confirm"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => setMode('confirm-reweigh')}
                >
                    Tiến hành xác nhận số liệu
                </Button>
            );
        }
        if (order.status === 'DA_XAC_NHAN_CAN') {
            buttons.push(
                <Button
                    key="delivery"
                    type="primary"
                    icon={<ExportOutlined />}
                    onClick={() => setMode('delivery')}
                >
                    Hoàn thành xuất kho
                </Button>
            );
        }
        return buttons;
    };

    // ===================== RENDER MODES =====================

    const renderCreate = () => {
        const pcColumns = [
            { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center' },
            {
                title: 'Mã đơn hàng',
                dataIndex: 'orderCode',
                key: 'orderCode',
                width: 150,
                render: v => v || '—',
            },
            {
                title: 'Khách hàng',
                key: 'customer',
                width: 180,
                render: (_, r) => r.customer
                    ? `${r.customer.customerCode || ''} ${r.customer.fullName}`.trim()
                    : '—'
            },
            {
                title: 'Mặt hàng',
                key: 'items',
                render: (_, r) => {
                    const names = (r.items || []).map(i => i.productName).filter(Boolean);
                    return names.length ? names.join(', ') : '—';
                },
            },
            {
                title: 'Tổng cân (kg)',
                dataIndex: 'totalWeight',
                key: 'totalWeight',
                width: 120,
                align: 'right',
                render: v => v ? `${formatNum(v)} kg` : '0 kg',
            },
            {
                title: 'Tổng khối (m³)',
                dataIndex: 'totalVolume',
                key: 'totalVolume',
                width: 130,
                align: 'right',
                render: v => v ? `${formatNum(v, 3)} m³` : '0,000 m³',
            },
            {
                title: 'Thao tác',
                key: 'action',
                width: 70,
                align: 'center',
                render: (_, r) => (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveSelectedItem(r.id)}
                    />
                )
            }
        ];

        return (
            <>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Ngày giao dự kiến" name="deliveryDateTime">
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Chi phí giao hàng (₫)" name="deliveryCost">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    formatter={v => v ? new Intl.NumberFormat('de-DE').format(v) : ''}
                                    parser={v => v.replace(/\./g, '')}
                                    placeholder="Nhập chi phí giao hàng"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="Ghi chú" name="notes">
                        <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                    </Form.Item>
                </Form>

                <Divider style={{ margin: '8px 0 12px' }} />

                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Col>
                        <Text strong>Chọn mã hàng ({selectedPCIds.length})</Text>
                    </Col>
                    <Col>
                        <Button type="primary" ghost icon={<PlusOutlined />} size="small" onClick={handleOpenAddModal}>
                            Thêm mã hàng
                        </Button>
                    </Col>
                </Row>

                <Table
                    size="small"
                    columns={pcColumns}
                    dataSource={selectedPCs}
                    rowKey="id"
                    pagination={false}
                    scroll={{ y: 260 }}
                    locale={{ emptyText: 'Chưa có mã hàng nào được chọn' }}
                />

                <Modal
                    title="Thêm mã hàng vào lệnh xuất kho"
                    open={addModalVisible}
                    onCancel={() => setAddModalVisible(false)}
                    onOk={handleAddItems}
                    okText={`Thêm${selectedAddKeys.length > 0 ? ` (${selectedAddKeys.length})` : ''}`}
                    cancelText="Hủy"
                    width={900}
                    destroyOnClose
                >
                    {selectedAddKeys.length > 0 && (
                        <Alert
                            type="success"
                            showIcon
                            message={`Đã chọn ${selectedAddKeys.length} mã hàng`}
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <ProductCodeTable
                        dataSource={availablePCs}
                        externalLoading={loadingAvailable}
                        rowSelection={useMemo(() => ({
                            selectedRowKeys: selectedAddKeys,
                            onChange: keys => setSelectedAddKeys(keys),
                        }), [selectedAddKeys])}
                        showFilters={false}
                        showPagination={false}
                        showActions={false}
                    />
                </Modal>
            </>
        );
    };

    const renderView = () => {
        if (!order) return null;
        const statusOpt = getStatusOpt(order.status);

        // Bảng mặt hàng con (expandable) - hiển thị trong từng mã hàng
        const itemColumns = [
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true },
            { title: 'Cân gốc (kg)', dataIndex: 'weight', key: 'weight', width: 120, align: 'right', render: v => v != null ? `${formatNum(v)} kg` : '—' },
            { title: 'Khối gốc (m³)', dataIndex: 'volume', key: 'volume', width: 130, align: 'right', render: v => v != null ? `${formatNum(Number(v), 3)} m³` : '—' },
            {
                title: 'Cân TT (kg)',
                dataIndex: 'actualWeight',
                key: 'actualWeight',
                width: 120,
                align: 'right',
                render: v => v != null ? <Text strong style={{ color: '#1677ff' }}>{formatNum(v)} kg</Text> : <Text type="secondary">—</Text>,
            },
            {
                title: 'Khối TT (m³)',
                dataIndex: 'actualVolume',
                key: 'actualVolume',
                width: 130,
                align: 'right',
                render: v => v != null ? <Text strong style={{ color: '#1677ff' }}>{formatNum(Number(v), 3)} m³</Text> : <Text type="secondary">—</Text>,
            },
            {
                title: 'Dùng số TT?',
                dataIndex: 'useActualData',
                key: 'useActualData',
                width: 100,
                align: 'center',
                render: v => v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
            },
        ];

        // Bảng mã hàng chính với expand để xem mặt hàng bên trong
        const pcColumns = [
            { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center', fixed: 'left' },
            { title: 'Mã đơn hàng', dataIndex: 'orderCode', key: 'orderCode', width: 150, render: v => v || '—' },
            {
                title: 'Khách hàng',
                key: 'customer',
                width: 200,
                render: (_, r) => r.customer ? (
                    <Space direction="vertical" size={0}>
                        <Text strong>{r.customer.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.customer.username}</Text>
                    </Space>
                ) : '—'
            },
            {
                title: 'Mặt hàng',
                key: 'items',
                render: (_, r) => {
                    const names = (r.items || []).map(i => i.productName).filter(Boolean);
                    return <Text type="secondary" style={{ fontSize: 12 }}>{names.join(', ') || '—'}</Text>;
                },
            },
            {
                title: 'Cân (kg)',
                dataIndex: 'totalWeight',
                key: 'totalWeight',
                width: 110,
                align: 'right',
                render: v => v ? `${formatNum(v)} kg` : '—',
            },
            {
                title: 'Khối (m³)',
                dataIndex: 'totalVolume',
                key: 'totalVolume',
                width: 120,
                align: 'right',
                render: v => v ? `${formatNum(v, 3)} m³` : '—',
            },
            {
                title: 'Cước tạm tính',
                dataIndex: 'totalTransportFeeEstimate',
                key: 'fee',
                width: 140,
                align: 'right',
                render: v => <Text style={{ color: '#389e0d' }}>{formatVND(v)}</Text>,
            },
            {
                title: 'Chi phí NK',
                dataIndex: 'totalImportCostToCustomer',
                key: 'importCost',
                width: 140,
                align: 'right',
                render: v => <Text style={{ color: '#cf1322' }}>{formatVND(v)}</Text>,
            },
        ];

        const expandedRowRender = (pc) => (
            <Table
                size="small"
                columns={itemColumns}
                dataSource={pc.items || []}
                rowKey="id"
                pagination={false}
                style={{ margin: '4px 0' }}
            />
        );

        return (
            <>
                {order.status === 'DANG_XAC_NHAN_CAN' && (
                    <Alert
                        message="Lệnh đang chờ bạn xác nhận số liệu cân thực tế. Vui lòng nhấn nút 'Tiến hành xác nhận số liệu' ở bên dưới để bắt đầu tích chọn."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                {/* Thông tin lệnh - dạng Form read-only */}
                <Form layout="vertical" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                        <Col span={4}>
                            <Form.Item label="Mã lệnh">
                                <Input value={`#${order.id}`} disabled className="bg-gray-100" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="Trạng thái">
                                <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                                    <Tag color={statusOpt.color} style={{ fontSize: 13 }}>{statusOpt.label}</Tag>
                                </div>
                            </Form.Item>
                        </Col>
                        <Col span={7}>
                            <Form.Item label="Ngày giao dự kiến">
                                <Input
                                    value={order.deliveryDateTime ? dayjs(order.deliveryDateTime).format('DD/MM/YYYY HH:mm') : '—'}
                                    disabled className="bg-gray-100"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={7}>
                            <Form.Item label="Chi phí giao hàng">
                                <Input value={formatVND(order.deliveryCost)} disabled className="bg-gray-100" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        {order.amountReceived != null && (
                            <Col span={8}>
                                <Form.Item label="Số tiền đã thu">
                                    <Input
                                        value={formatVND(order.amountReceived)}
                                        disabled className="bg-gray-100"
                                        style={{ color: '#389e0d', fontWeight: 'bold' }}
                                    />
                                </Form.Item>
                            </Col>
                        )}
                        {order.actualShippingCost != null && (
                            <Col span={8}>
                                <Form.Item label="Phí vận chuyển thực tế">
                                    <Input value={formatVND(order.actualShippingCost)} disabled className="bg-gray-100" />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={order.amountReceived != null || order.actualShippingCost != null ? 8 : 12}>
                            <Form.Item label="Người tạo">
                                <Input
                                    value={order.createdBy ? `${order.createdBy.username} — ${order.createdBy.fullName}` : '—'}
                                    disabled className="bg-gray-100"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={order.amountReceived != null || order.actualShippingCost != null ? 24 : 12}>
                            <Form.Item label="Ghi chú">
                                <Input.TextArea
                                    value={order.notes || '—'}
                                    disabled className="bg-gray-100"
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                <Divider style={{ margin: '8px 0 12px' }}>
                    Mã hàng ({(order.productCodes || []).length} mã — click mũi tên để xem mặt hàng)
                </Divider>
                <Table
                    size="small"
                    columns={pcColumns}
                    dataSource={order.productCodes || []}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    expandable={{
                        expandedRowRender,
                        defaultExpandAllRows: true,
                    }}
                />
            </>
        );
    };

    const renderSubmitReweigh = () => {
        if (!order) return null;

        const itemColumns = [
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true },
            { title: 'Cân gốc (kg)', dataIndex: 'weight', key: 'weight', width: 120, align: 'right', render: v => v != null ? `${formatNum(v)} kg` : '—' },
            { title: 'Khối gốc (m³)', dataIndex: 'volume', key: 'volume', width: 130, align: 'right', render: v => v != null ? `${formatNum(Number(v), 3)} m³` : '—' },
            {
                title: 'Cân thực tế* (kg)',
                key: 'actualWeight',
                width: 180,
                render: (_, item) => (
                    <InputNumber
                        size="small"
                        min={0}
                        style={{ width: '100%' }}
                        value={reweighData[item.id]?.actualWeight}
                        onChange={val => setReweighData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], actualWeight: val }
                        }))}
                    />
                ),
            },
            {
                title: 'Khối thực tế* (m³)',
                key: 'actualVolume',
                width: 190,
                render: (_, item) => (
                    <InputNumber
                        size="small"
                        min={0}
                        step={0.001}
                        style={{ width: '100%' }}
                        value={reweighData[item.id]?.actualVolume}
                        onChange={val => setReweighData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], actualVolume: val }
                        }))}
                    />
                ),
            },
        ];

        const pcColumns = [
            { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center', fixed: 'left' },
            { title: 'Mã đơn hàng', dataIndex: 'orderCode', key: 'orderCode', width: 150, render: v => v || '—' },
            {
                title: 'Khách hàng',
                key: 'customer',
                width: 200,
                render: (_, r) => r.customer ? (
                    <Space direction="vertical" size={0}>
                        <Text strong>{r.customer.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.customer.username}</Text>
                    </Space>
                ) : '—'
            },
            { title: 'Số mặt hàng', key: 'itemCount', width: 110, align: 'center', render: (_, r) => `${(r.items || []).length} mặt hàng` },
        ];

        const expandedRowRender = (pc) => (
            <Table
                size="small"
                columns={itemColumns}
                dataSource={pc.items || []}
                rowKey="id"
                pagination={false}
                style={{ margin: '4px 0' }}
            />
        );

        return (
            <Table
                size="small"
                columns={pcColumns}
                dataSource={order.productCodes || []}
                rowKey="id"
                pagination={false}
                scroll={{ x: 'max-content' }}
                expandable={{
                    expandedRowRender,
                    defaultExpandAllRows: true,
                }}
            />
        );
    };

    const renderConfirmReweigh = () => {
        if (!order) return null;
        const allItems = (order.productCodes || []).flatMap(pc => pc.items || []);
        const checkedCount = Object.values(confirmData).filter(Boolean).length;

        // Tính tổng Cước tạm tính và Chi phí NK theo 2 kịch bản (gốc vs thực tế)
        const totalOriginalTransport = allItems.reduce((s, i) => s + (Number(i.itemTransportFeeEstimate) || 0), 0);
        const totalActualTransport = allItems.reduce((s, i) => s + (Number(i.actualItemTransportFeeEstimate) || 0), 0);
        const totalOriginalNK = (order.productCodes || []).reduce((s, pc) => s + (Number(pc.totalImportCostToCustomer) || 0), 0);
        const totalActualNK = allItems.reduce((s, i) => s + (Number(i.actualImportCostToCustomer) || 0), 0);
        const transportDiff = totalActualTransport - totalOriginalTransport;
        const nkDiff = totalActualNK - totalOriginalNK;

        // Helper render chênh lệch phí trong cột bảng
        const renderFeeDiff = (origFee, actualFee) => {
            const diff = (Number(actualFee) || 0) - (Number(origFee) || 0);
            if (diff === 0) return <Tag color="default" style={{ marginInlineEnd: 0 }}>Không đổi</Tag>;
            const sign = diff > 0 ? '+' : '';
            const color = diff > 0 ? '#cf1322' : '#389e0d';
            return <Text strong style={{ color }}>{sign}{formatVND(diff)}</Text>;
        };

        // Bảng mặt hàng con — so sánh phí gốc vs phí thực tế
        const itemColumns = [
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true, width: 180 },
            {
                title: 'Cân',
                key: 'weightCompare',
                width: 160,
                align: 'center',
                render: (_, item) => (
                    <Space size={4}>
                        <Text type="secondary">{item.weight != null ? `${formatNum(item.weight)} kg` : '—'}</Text>
                        <Text type="secondary">→</Text>
                        <Text strong style={{ color: '#1677ff' }}>{item.actualWeight != null ? `${formatNum(item.actualWeight)} kg` : '—'}</Text>
                    </Space>
                ),
            },
            {
                title: 'Khối',
                key: 'volumeCompare',
                width: 200,
                align: 'center',
                render: (_, item) => (
                    <Space size={4}>
                        <Text type="secondary">{item.volume != null ? `${formatNum(Number(item.volume), 3)} m³` : '—'}</Text>
                        <Text type="secondary">→</Text>
                        <Text strong style={{ color: '#1677ff' }}>{item.actualVolume != null ? `${formatNum(Number(item.actualVolume), 3)} m³` : '—'}</Text>
                    </Space>
                ),
            },
            {
                title: 'Cước gốc',
                dataIndex: 'itemTransportFeeEstimate',
                key: 'origFee',
                width: 120,
                align: 'right',
                render: v => <Text style={{ color: '#389e0d' }}>{formatVND(v)}</Text>,
            },
            {
                title: 'Cước TT',
                dataIndex: 'actualItemTransportFeeEstimate',
                key: 'actualFee',
                width: 120,
                align: 'right',
                render: v => <Text strong style={{ color: '#1677ff' }}>{formatVND(v)}</Text>,
            },
            {
                title: 'Δ Cước',
                key: 'feeDiff',
                width: 120,
                align: 'right',
                render: (_, item) => renderFeeDiff(item.itemTransportFeeEstimate, item.actualItemTransportFeeEstimate),
            },
            {
                title: 'Chi phí NK TT',
                dataIndex: 'actualImportCostToCustomer',
                key: 'actualNK',
                width: 130,
                align: 'right',
                render: v => <Text strong style={{ color: '#1677ff' }}>{formatVND(v)}</Text>,
            },
            {
                title: 'Dùng số TT?',
                key: 'useActualData',
                width: 110,
                align: 'center',
                render: (_, item) => (
                    <Checkbox
                        checked={confirmData[item.id] ?? false}
                        onChange={e => setConfirmData(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    />
                ),
            },
        ];

        // PC cha — tóm tắt phí gốc vs phí TT để reviewer thấy impact ngay không cần expand
        const pcColumns = [
            { title: 'ID', dataIndex: 'id', key: 'id', width: 55, align: 'center', fixed: 'left' },
            { title: 'Mã đơn hàng', dataIndex: 'orderCode', key: 'orderCode', width: 150, render: v => v || '—' },
            {
                title: 'Khách hàng',
                key: 'customer',
                width: 200,
                render: (_, r) => r.customer ? (
                    <Space direction="vertical" size={0}>
                        <Text strong>{r.customer.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.customer.username}</Text>
                    </Space>
                ) : '—'
            },
            {
                title: 'Cước gốc',
                key: 'origTransportSum',
                width: 130,
                align: 'right',
                render: (_, r) => {
                    const sum = (r.items || []).reduce((s, i) => s + (Number(i.itemTransportFeeEstimate) || 0), 0);
                    return <Text type="secondary" style={{ color: '#389e0d' }}>{formatVND(sum)}</Text>;
                },
            },
            {
                title: 'Cước TT',
                key: 'actualTransportSum',
                width: 130,
                align: 'right',
                render: (_, r) => {
                    const sum = (r.items || []).reduce((s, i) => s + (Number(i.actualItemTransportFeeEstimate) || 0), 0);
                    return <Text strong style={{ color: '#1677ff' }}>{formatVND(sum)}</Text>;
                },
            },
            {
                title: 'Chênh lệch cước',
                key: 'transportDiff',
                width: 140,
                align: 'right',
                render: (_, r) => {
                    const orig = (r.items || []).reduce((s, i) => s + (Number(i.itemTransportFeeEstimate) || 0), 0);
                    const actual = (r.items || []).reduce((s, i) => s + (Number(i.actualItemTransportFeeEstimate) || 0), 0);
                    return renderFeeDiff(orig, actual);
                },
            },
        ];

        const expandedRowRender = (pc) => (
            <Table
                size="small"
                columns={itemColumns}
                dataSource={pc.items || []}
                rowKey="id"
                pagination={false}
                rowClassName={(item) => confirmData[item.id] ? 'confirm-reweigh-checked-row' : ''}
                style={{ margin: '4px 0' }}
            />
        );

        const renderDiffValue = (diff) => {
            if (diff === 0) return <Text type="secondary" style={{ fontSize: 13 }}>Không đổi</Text>;
            const sign = diff > 0 ? '+' : '';
            const color = diff > 0 ? '#cf1322' : '#389e0d';
            return <Text strong style={{ fontSize: 14, color }}>{sign}{formatVND(diff)}</Text>;
        };

        return (
            <>
                {/* Banner so sánh Cước tạm tính + Chi phí NK: gốc vs thực tế */}
                <Row gutter={12} style={{ marginBottom: 12 }}>
                    {/* Cột 1: Theo số cân gốc */}
                    <Col span={8}>
                        <div style={{ background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 6, padding: '10px 16px' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Theo số cân gốc
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Cước tạm tính</Text>
                                <Text strong style={{ color: '#389e0d' }}>{formatVND(totalOriginalTransport)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Chi phí NK</Text>
                                <Text strong style={{ color: '#cf1322' }}>{formatVND(totalOriginalNK)}</Text>
                            </div>
                        </div>
                    </Col>
                    {/* Cột 2: Theo số cân thực tế */}
                    <Col span={8}>
                        <div style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 6, padding: '10px 16px' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Theo số cân thực tế
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Cước tạm tính</Text>
                                <Text strong style={{ color: '#1677ff' }}>{formatVND(totalActualTransport)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Chi phí NK</Text>
                                <Text strong style={{ color: '#1677ff' }}>{formatVND(totalActualNK)}</Text>
                            </div>
                        </div>
                    </Col>
                    {/* Cột 3: Chênh lệch */}
                    <Col span={8}>
                        <div style={{
                            background: (transportDiff + nkDiff) > 0 ? '#fff1f0' : (transportDiff + nkDiff) < 0 ? '#f6ffed' : '#fafafa',
                            border: `1px solid ${(transportDiff + nkDiff) > 0 ? '#ffa39e' : (transportDiff + nkDiff) < 0 ? '#b7eb8f' : '#d9d9d9'}`,
                            borderRadius: 6, padding: '10px 16px'
                        }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Chênh lệch
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Cước tạm tính</Text>
                                {renderDiffValue(transportDiff)}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Chi phí NK</Text>
                                {renderDiffValue(nkDiff)}
                            </div>
                        </div>
                    </Col>
                </Row>

                <Alert
                    type="info"
                    showIcon
                    message={`Đã tích ${checkedCount}/${allItems.length} mặt hàng dùng số cân thực tế. Mặt hàng không tick sẽ dùng số cân gốc để tính phí.`}
                    style={{ marginBottom: 12 }}
                />

                <style>{`.confirm-reweigh-checked-row { background-color: #f0f9ff; }`}</style>

                <Table
                    size="small"
                    columns={pcColumns}
                    dataSource={order.productCodes || []}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    expandable={{
                        expandedRowRender,
                        defaultExpandAllRows: true,
                    }}
                />
            </>
        );
    };

    const renderDelivery = () => (
        <Form form={form} layout="vertical">
            <Alert
                type="warning"
                showIcon
                message="Sau khi xác nhận, lệnh xuất kho sẽ chuyển sang trạng thái ĐÃ XUẤT KHO và không thể thay đổi."
                style={{ marginBottom: 16 }}
            />
            <Form.Item
                label="Số tiền đã thu từ khách hàng (₫)"
                name="amountReceived"
                rules={[{ required: true, message: 'Vui lòng nhập số tiền đã thu' }]}
            >
                <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={v => v ? new Intl.NumberFormat('de-DE').format(v) : ''}
                    parser={v => v.replace(/\./g, '')}
                    placeholder="Nhập số tiền đã thu"
                />
            </Form.Item>
            <Form.Item
                label="Chi phí vận chuyển thực tế (₫)"
                name="actualShippingCost"
            >
                <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={v => v ? new Intl.NumberFormat('de-DE').format(v) : ''}
                    parser={v => v.replace(/\./g, '')}
                    placeholder="Nhập chi phí vận chuyển thực tế"
                />
            </Form.Item>
        </Form>
    );

    const renderContent = () => {
        if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>;
        if (mode === 'create') return renderCreate();
        if (mode === 'view') return renderView();
        if (mode === 'submit-reweigh') return renderSubmitReweigh();
        if (mode === 'confirm-reweigh') return renderConfirmReweigh();
        if (mode === 'delivery') return renderDelivery();
        return null;
    };

    return (
        <Modal
            open={visible}
            title={
                <Space>
                    <ExportOutlined style={{ color: '#1677ff' }} />
                    {getTitle()}
                </Space>
            }
            width={getWidth()}
            onCancel={onClose}
            footer={getFooter()}
            destroyOnClose
        >
            {renderContent()}
        </Modal>
    );
};

export default ExportOrderModal;
