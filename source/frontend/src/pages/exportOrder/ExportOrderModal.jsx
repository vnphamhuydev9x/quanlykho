import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal, Form, Input, InputNumber, DatePicker, Select,
    Button, Space, Tag, Table, Checkbox, Descriptions,
    message, Spin, Divider, Typography, Popconfirm, Alert
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
const ExportOrderModal = ({ visible, mode: initialMode, exportOrderId, onClose, onSuccess }) => {
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

    // Submit-reweigh: actualWeight/actualVolume per item
    // { [itemId]: { actualWeight, actualVolume } }
    const [reweighData, setReweighData] = useState({});

    // Confirm-reweigh: useActualData per item
    // { [itemId]: boolean }
    const [confirmData, setConfirmData] = useState({});

    // Delivery form
    const [deliveryForm] = Form.useForm();

    // Load order detail khi mode !== 'create'
    const loadOrder = useCallback(async () => {
        if (!exportOrderId) return;
        setLoading(true);
        try {
            const res = await exportOrderService.getById(exportOrderId);
            setOrder(res.data || res);
        } catch {
            message.error('Lỗi khi tải chi tiết lệnh xuất kho');
        } finally {
            setLoading(false);
        }
    }, [exportOrderId]);

    useEffect(() => {
        setMode(initialMode);
        if (initialMode !== 'create') {
            loadOrder();
        }
    }, [initialMode, exportOrderId]);

    // Init reweigh/confirm data khi order load xong
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

    // Fetch danh sách PC có thể xuất (NHAP_KHO_VN + chưa có lệnh)
    const fetchAvailablePCs = async () => {
        setLoadingAvailable(true);
        try {
            const res = await productCodeService.getAll(1, 500, '');
            const all = res.data?.items || res.items || [];
            // Filter: Đã nhập kho VN VÀ Chưa có lệnh xuất kho
            const eligible = all.filter(pc =>
                pc.vehicleStatus === 'DA_NHAP_KHO_VN' && !pc.exportOrderId
                && !selectedPCIds.includes(pc.id)
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
            const productItems = allItems.map(item => ({
                id: item.id,
                actualWeight: reweighData[item.id]?.actualWeight,
                actualVolume: reweighData[item.id]?.actualVolume,
            }));
            await exportOrderService.submitReweigh(exportOrderId, productItems);
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
            const productItems = allItems.map(item => ({
                id: item.id,
                useActualData: confirmData[item.id] ?? false,
            }));
            await exportOrderService.confirmReweigh(exportOrderId, productItems);
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
        if (mode === 'submit-reweigh' || mode === 'confirm-reweigh') return 1000;
        if (mode === 'create') return 860;
        return 900;
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
                    Xác nhận số cân
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
                    onClick={() => {
                        loadOrder().then(() => setMode('submit-reweigh'));
                        setMode('submit-reweigh');
                    }}
                >
                    Gửi số cân thực tế
                </Button>
            );
        }
        if (order.status === 'DANG_XAC_NHAN_CAN') {
            buttons.push(
                <Button
                    key="confirm"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => setMode('confirm-reweigh')}
                >
                    Xác nhận số cân
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
                    width={800}
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
                        rowSelection={{
                            selectedRowKeys: selectedAddKeys,
                            onChange: keys => setSelectedAddKeys(keys),
                        }}
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
        const allItems = (order.productCodes || []).flatMap(pc =>
            (pc.items || []).map(item => ({ ...item, pcOrderCode: pc.orderCode, pcId: pc.id }))
        );

        const pcColumns = [
            { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center' },
            { title: 'Mã đơn hàng', dataIndex: 'orderCode', key: 'orderCode', width: 150, render: v => v || '—' },
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

        const itemColumns = [
            { title: 'Item ID', dataIndex: 'id', key: 'id', width: 80, align: 'center' },
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true },
            { title: 'Cân gốc (kg)', dataIndex: 'weight', key: 'weight', width: 110, align: 'right', render: v => v != null ? `${formatNum(v)} kg` : '—' },
            { title: 'Khối gốc (m³)', dataIndex: 'volume', key: 'volume', width: 120, align: 'right', render: v => v != null ? `${formatNum(Number(v), 3)} m³` : '—' },
            {
                title: 'Cân TT (kg)',
                dataIndex: 'actualWeight',
                key: 'actualWeight',
                width: 110,
                align: 'right',
                render: v => v != null ? <Text strong style={{ color: '#1677ff' }}>{formatNum(v)} kg</Text> : <Text type="secondary">—</Text>,
            },
            {
                title: 'Khối TT (m³)',
                dataIndex: 'actualVolume',
                key: 'actualVolume',
                width: 120,
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

        return (
            <>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="ID">{order.id}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        <Tag color={statusOpt.color}>{statusOpt.label}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày giao dự kiến">
                        {order.deliveryDateTime ? dayjs(order.deliveryDateTime).format('DD/MM/YYYY HH:mm') : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi phí giao hàng">
                        {formatVND(order.deliveryCost)}
                    </Descriptions.Item>
                    {order.amountReceived != null && (
                        <Descriptions.Item label="Số tiền đã thu">
                            <Text strong style={{ color: '#389e0d' }}>{formatVND(order.amountReceived)}</Text>
                        </Descriptions.Item>
                    )}
                    {order.actualShippingCost != null && (
                        <Descriptions.Item label="Phí vận chuyển thực tế">
                            {formatVND(order.actualShippingCost)}
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Ghi chú" span={2}>
                        {order.notes || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Người tạo">
                        {order.createdBy
                            ? `${order.createdBy.username} — ${order.createdBy.fullName}`
                            : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                        {order.createdAt ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                    </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '8px 0 12px' }}>
                    Mã hàng ({(order.productCodes || []).length} mã hàng)
                </Divider>
                <Table
                    size="small"
                    columns={pcColumns}
                    dataSource={order.productCodes || []}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content', y: 200 }}
                />

                {allItems.length > 0 && (
                    <>
                        <Divider style={{ margin: '12px 0' }}>
                            Chi tiết mặt hàng ({allItems.length} mặt hàng)
                        </Divider>
                        <Table
                            size="small"
                            columns={itemColumns}
                            dataSource={allItems}
                            rowKey="id"
                            pagination={false}
                            scroll={{ x: 'max-content', y: 220 }}
                        />
                    </>
                )}
            </>
        );
    };

    const renderSubmitReweigh = () => {
        if (!order) return null;
        const allItems = (order.productCodes || []).flatMap(pc =>
            (pc.items || []).map(item => ({ ...item, pcOrderCode: pc.orderCode }))
        );

        const columns = [
            { title: 'Item ID', dataIndex: 'id', key: 'id', width: 80, align: 'center' },
            { title: 'PC', dataIndex: 'pcOrderCode', key: 'pc', width: 120, render: v => v || '—' },
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true },
            {
                title: 'Cân gốc (kg)',
                dataIndex: 'weight',
                key: 'weight',
                width: 110,
                align: 'right',
                render: v => v != null ? `${formatNum(v)} kg` : '—',
            },
            {
                title: 'Khối gốc (m³)',
                dataIndex: 'volume',
                key: 'volume',
                width: 120,
                align: 'right',
                render: v => v != null ? `${formatNum(Number(v), 3)} m³` : '—',
            },
            {
                title: 'Cân thực tế* (kg)',
                key: 'actualWeight',
                width: 160,
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
                width: 170,
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

        return (
            <Table
                size="small"
                columns={columns}
                dataSource={allItems}
                rowKey="id"
                pagination={false}
                scroll={{ x: 'max-content', y: 400 }}
            />
        );
    };

    const renderConfirmReweigh = () => {
        if (!order) return null;
        const allItems = (order.productCodes || []).flatMap(pc =>
            (pc.items || []).map(item => ({ ...item, pcOrderCode: pc.orderCode }))
        );

        const columns = [
            { title: 'Item ID', dataIndex: 'id', key: 'id', width: 80, align: 'center' },
            { title: 'PC', dataIndex: 'pcOrderCode', key: 'pc', width: 120, render: v => v || '—' },
            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', ellipsis: true },
            {
                title: 'Cân gốc (kg)',
                dataIndex: 'weight',
                key: 'weight',
                width: 110,
                align: 'right',
                render: v => v != null ? `${formatNum(v)} kg` : '—',
            },
            {
                title: 'Cân TT (kg)',
                dataIndex: 'actualWeight',
                key: 'actualWeight',
                width: 110,
                align: 'right',
                render: v => v != null ? <Text strong style={{ color: '#1677ff' }}>{formatNum(v)} kg</Text> : <Text type="secondary">—</Text>,
            },
            {
                title: 'Khối gốc (m³)',
                dataIndex: 'volume',
                key: 'volume',
                width: 120,
                align: 'right',
                render: v => v != null ? `${formatNum(Number(v), 3)} m³` : '—',
            },
            {
                title: 'Khối TT (m³)',
                dataIndex: 'actualVolume',
                key: 'actualVolume',
                width: 120,
                align: 'right',
                render: v => v != null ? <Text strong style={{ color: '#1677ff' }}>{formatNum(Number(v), 3)} m³</Text> : <Text type="secondary">—</Text>,
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

        const checkedCount = Object.values(confirmData).filter(Boolean).length;

        return (
            <>
                <Alert
                    type="info"
                    showIcon
                    message={`Chọn ${checkedCount}/${allItems.length} mặt hàng dùng số cân thực tế. Mặt hàng không tick sẽ dùng số cân gốc để tính phí.`}
                    style={{ marginBottom: 12 }}
                />
                <Table
                    size="small"
                    columns={columns}
                    dataSource={allItems}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content', y: 380 }}
                />
            </>
        );
    };

    const renderDelivery = () => (
        <Form form={deliveryForm} layout="vertical">
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
