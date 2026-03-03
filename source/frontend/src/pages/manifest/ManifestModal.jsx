import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Modal, Form, Input, Select, DatePicker, Row, Col, Table,
    Tag, Space, Button, Tooltip, Popconfirm, message, Spin,
    Typography, Divider, Alert
} from 'antd';
import {
    TruckOutlined, PlusOutlined, DeleteOutlined, EyeOutlined,
    UndoOutlined, WarningOutlined, CheckCircleOutlined, EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import manifestService from '../../services/manifestService';
import productCodeService from '../../services/productCodeService';
import employeeService from '../../services/employeeService';
import { MANIFEST_STATUS_OPTIONS } from '../../constants/enums';

const { Text } = Typography;

const getStatusOption = (status) =>
    MANIFEST_STATUS_OPTIONS.find(o => o.value === status) || { label: status || '—', color: 'default' };

/**
 * ManifestModal — dùng cho 3 mode:
 *   'create'  : Tạo chuyến xe mới (có thể kèm productCodeIds sẵn từ ProductCodePage)
 *   'view'    : Xem chi tiết (read-only)
 *   'edit'    : Chỉnh sửa thông tin + quản lý mã hàng + override vehicleStatus
 */
const ManifestModal = ({
    visible,
    mode: initialMode = 'create',  // 'create' | 'view' | 'edit'
    manifestId = null,
    initialProductCodeIds = [],
    onClose,
    onSuccess,
}) => {
    // mode là internal state — cho phép switch view→edit inline (Quick Peek pattern)
    const [mode, setMode] = useState(initialMode);
    const isCreate = mode === 'create';
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const readOnly = isView;

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [manifest, setManifest] = useState(null);

    // Danh sách mã hàng trong xe (cho edit/view)
    const [productCodes, setProductCodes] = useState([]);

    // Khi create: danh sách PC tạm (chưa gán vào DB)
    const [pendingPCIds, setPendingPCIds] = useState(initialProductCodeIds || []);
    const [pendingPCs, setPendingPCs] = useState([]);

    // Employees dropdown
    const [employees, setEmployees] = useState([]);

    // Modal thêm mã hàng
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [availablePCs, setAvailablePCs] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [selectedAddKeys, setSelectedAddKeys] = useState([]);

    // Bulk override vehicleStatus (chỉ edit mode)
    const [selectedPCKeys, setSelectedPCKeys] = useState([]);
    const [bulkStatus, setBulkStatus] = useState(null);
    const [applyingBulk, setApplyingBulk] = useState(false);

    // ─── Load data ────────────────────────────────────────────────────
    const fetchEmployees = useCallback(async () => {
        try {
            const res = await employeeService.getAll({ limit: 0 });
            setEmployees(res.data?.employees || []);
        } catch { /* silent */ }
    }, []);

    const fetchManifest = useCallback(async () => {
        if (!manifestId) return;
        setLoading(true);
        try {
            const res = await manifestService.getById(manifestId);
            const data = res.data || res;
            setManifest(data);
            setProductCodes(data.productCodes || []);
            form.setFieldsValue({
                licensePlate: data.licensePlate,
                callerId: data.callerId,
                date: data.date ? dayjs(data.date) : dayjs(),
                status: data.status,
                note: data.note,
            });
        } catch {
            message.error('Lỗi khi tải thông tin chuyến xe');
        } finally {
            setLoading(false);
        }
    }, [manifestId, form]);

    const fetchPendingPCDetails = useCallback(async () => {
        if (!isCreate || pendingPCIds.length === 0) {
            setPendingPCs([]);
            return;
        }
        try {
            // Lấy tất cả để filter theo id
            const res = await productCodeService.getAll(1, 200, '');
            const all = res.data?.items || res.items || [];
            setPendingPCs(all.filter(pc => pendingPCIds.includes(pc.id)));
        } catch { /* silent */ }
    }, [isCreate, pendingPCIds]);

    useEffect(() => {
        if (!visible) return;
        // Reset mode về initialMode mỗi khi modal mở lại
        setMode(initialMode);
        fetchEmployees();
        if (initialMode === 'create') {
            form.resetFields();
            form.setFieldsValue({ date: dayjs(), status: 'CHO_XEP_XE' });
            fetchPendingPCDetails();
        } else {
            fetchManifest();
        }
    }, [visible, initialMode]);

    // Khi switch từ view → edit, reload lại manifest để form có data
    useEffect(() => {
        if (visible && (mode === 'edit' || mode === 'view') && manifestId) {
            fetchManifest();
        }
    }, [mode]);

    useEffect(() => {
        if (isCreate) fetchPendingPCDetails();
    }, [pendingPCIds]);

    // ─── Fetch danh sách PC có thể thêm vào xe ────────────────────────
    const fetchAvailablePCs = async () => {
        setLoadingAvailable(true);
        try {
            const res = await productCodeService.getAll(1, 200, '');
            const all = res.data?.items || res.items || [];
            // Chỉ show PC có vehicleStatus = null và chưa có trong danh sách hiện tại
            const existingIds = isCreate
                ? pendingPCIds
                : productCodes.map(pc => pc.id);
            setAvailablePCs(all.filter(pc => !pc.vehicleStatus && !existingIds.includes(pc.id)));
        } catch {
            message.error('Lỗi khi tải danh sách mã hàng');
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleOpenAddModal = () => {
        setSelectedAddKeys([]);
        fetchAvailablePCs();
        setAddModalVisible(true);
    };

    // ─── Submit tạo / sửa ─────────────────────────────────────────────
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const payload = {
                ...values,
                date: values.date ? values.date.toISOString() : new Date().toISOString(),
                productCodeIds: isCreate ? pendingPCIds : undefined,
            };

            if (isCreate) {
                const res = await manifestService.create(payload);
                if (res.conflicts) {
                    // Không nên xảy ra vì đã validate trước; hiển thị nếu có
                    message.error('Một số mã hàng đã được xếp xe, vui lòng kiểm tra lại');
                    return;
                }
                message.success('Tạo chuyến xe thành công');
            } else {
                await manifestService.update(manifestId, payload);
                message.success('Cập nhật thành công');
            }
            onSuccess?.();
            onClose?.();
        } catch (err) {
            if (!err.errorFields) {
                const msg = err.response?.data?.message || 'Lỗi khi lưu';
                message.error(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Thêm mã hàng (create: vào pending; edit: gọi API) ───────────
    const handleAddItems = async () => {
        if (selectedAddKeys.length === 0) {
            message.warning('Chưa chọn mã hàng nào');
            return;
        }
        if (isCreate) {
            setPendingPCIds(prev => [...new Set([...prev, ...selectedAddKeys])]);
            setAddModalVisible(false);
            return;
        }
        // Edit mode: gọi API
        setSubmitting(true);
        try {
            await manifestService.addItems(manifestId, selectedAddKeys);
            message.success(`Đã thêm ${selectedAddKeys.length} mã hàng`);
            setAddModalVisible(false);
            fetchManifest();
        } catch (err) {
            const conflicts = err.response?.data?.conflicts;
            if (conflicts?.length) {
                const list = conflicts.map(c => `#${c.productCodeId} (xe ${c.licensePlate})`).join(', ');
                message.error(`Mã hàng đã trong xe khác: ${list}`);
            } else {
                message.error(err.response?.data?.message || 'Lỗi khi thêm');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Xóa mã hàng (create: chỉ bỏ khỏi pending; edit: gọi API) ───
    const handleRemoveItem = async (pcId) => {
        if (isCreate) {
            setPendingPCIds(prev => prev.filter(id => id !== pcId));
            return;
        }
        try {
            await manifestService.removeItems(manifestId, [pcId]);
            message.success('Đã xóa mã hàng khỏi xe');
            setProductCodes(prev => prev.filter(pc => pc.id !== pcId));
        } catch {
            message.error('Lỗi khi xóa');
        }
    };

    // ─── Bulk override vehicleStatus ──────────────────────────────────
    const handleBulkApply = async () => {
        if (!bulkStatus || selectedPCKeys.length === 0) {
            message.warning('Chọn trạng thái và ít nhất 1 mã hàng');
            return;
        }
        setApplyingBulk(true);
        try {
            await manifestService.bulkUpdateVehicleStatus(manifestId, selectedPCKeys, bulkStatus);
            message.success(`Đã chỉnh trạng thái ${selectedPCKeys.length} mã hàng`);
            setSelectedPCKeys([]);
            fetchManifest();
        } catch {
            message.error('Lỗi khi cập nhật trạng thái');
        } finally {
            setApplyingBulk(false);
        }
    };

    // ─── Reset vehicleStatus của 1 PC ────────────────────────────────
    const handleResetVehicleStatus = async (pcId) => {
        try {
            await manifestService.resetVehicleStatus(manifestId, pcId);
            message.success('Đã khôi phục trạng thái về trạng thái xe');
            fetchManifest();
        } catch {
            message.error('Lỗi khi khôi phục');
        }
    };

    // ─── Columns danh sách mã hàng ────────────────────────────────────
    const displayedPCs = isCreate ? pendingPCs : productCodes;

    const pcColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
        { title: 'Mã đơn', dataIndex: 'orderCode', key: 'orderCode', width: 140 },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 160,
            render: (_, r) => r.customer
                ? `${r.customer.customerCode || ''} ${r.customer.fullName}`.trim()
                : '—'
        },
        {
            title: 'Tổng cân',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 110,
            align: 'right',
            render: v => v ? `${new Intl.NumberFormat('de-DE').format(v)} kg` : '0 kg'
        },
        {
            title: 'Tổng khối',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 110,
            align: 'right',
            render: v => v
                ? `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v)} m³`
                : '0 m³'
        },
        ...(!isCreate ? [{
            title: 'Trạng thái xếp xe',
            key: 'vehicleStatus',
            width: 160,
            render: (_, r) => {
                const opt = getStatusOption(r.vehicleStatus);
                return (
                    <Space size={4}>
                        {r.vehicleStatus
                            ? <Tag color={opt.color}>{opt.label}</Tag>
                            : <Tag color="default">Chưa xếp xe</Tag>}
                        {r.vehicleStatusOverridden && (
                            <Tooltip title="Đã chỉnh thủ công — không đồng bộ theo trạng thái xe">
                                <WarningOutlined style={{ color: '#faad14' }} />
                            </Tooltip>
                        )}
                    </Space>
                );
            }
        }] : []),
        {
            title: 'Thao tác',
            key: 'action',
            width: 110,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space>
                    {!isCreate && record.vehicleStatusOverridden && isEdit && (
                        <Tooltip title="Khôi phục về trạng thái xe">
                            <Button
                                type="text"
                                icon={<UndoOutlined style={{ color: '#1677ff' }} />}
                                size="small"
                                onClick={() => handleResetVehicleStatus(record.id)}
                            />
                        </Tooltip>
                    )}
                    {!readOnly && (
                        <Popconfirm
                            title="Xóa mã hàng khỏi xe?"
                            onConfirm={() => handleRemoveItem(record.id)}
                            okText="Xóa"
                            okButtonProps={{ danger: true }}
                            cancelText="Hủy"
                        >
                            <Button danger icon={<DeleteOutlined />} size="small" type="text" />
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    // ─── Columns modal chọn PC ────────────────────────────────────────
    const availableColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
        { title: 'Mã đơn', dataIndex: 'orderCode', key: 'orderCode', width: 140 },
        {
            title: 'Khách hàng',
            key: 'customer',
            render: (_, r) => r.customer?.fullName || '—'
        },
        {
            title: 'Tổng cân',
            dataIndex: 'totalWeight',
            width: 110,
            render: v => v ? `${new Intl.NumberFormat('de-DE').format(v)} kg` : '0 kg'
        },
        {
            title: 'Tổng khối',
            dataIndex: 'totalVolume',
            width: 110,
            render: v => v ? `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v)} m³` : '0 m³'
        }
    ];

    // ─── Modal title ──────────────────────────────────────────────────
    const modalTitle = isCreate
        ? 'Tạo chuyến xe mới'
        : isView
            ? `Xem chuyến xe — ${manifest?.licensePlate || ''}`
            : `Sửa chuyến xe — ${manifest?.licensePlate || ''}`;

    const hasOverrides = productCodes.some(pc => pc.vehicleStatusOverridden);

    // ─── Footer custom (Quick Peek Pattern) ──────────────────────────
    const modalFooter = isView
        ? [
            <Button key="edit" type="primary" icon={<EditOutlined />}
                onClick={() => setMode('edit')}
            >
                Chỉnh sửa xe
            </Button>,
            <Button key="close" onClick={onClose}>Đóng</Button>
        ]
        : isCreate
            ? [
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="ok" type="primary" loading={submitting} onClick={handleSubmit}>
                    Tạo chuyến xe
                </Button>
            ]
            : [
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="ok" type="primary" loading={submitting} onClick={handleSubmit}>
                    Lưu lại
                </Button>
            ];

    return (
        <>
            <Modal
                title={<Space><TruckOutlined />{modalTitle}</Space>}
                open={visible}
                onCancel={onClose}
                footer={modalFooter}
                width={900}
                maskClosable={false}
                destroyOnClose={false}
            >
                <Spin spinning={loading}>
                    {/* Form thông tin xe */}
                    <Form form={form} layout="vertical" disabled={readOnly}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="licensePlate"
                                    label="Biển số xe"
                                    rules={[{ required: true, message: 'Vui lòng nhập biển số xe' }]}
                                >
                                    <Input placeholder="VD: 51C-123.45" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="callerId" label="Người gọi xe">
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Chọn nhân viên"
                                        optionFilterProp="label"
                                        options={employees.map(e => ({
                                            value: e.id,
                                            label: `${e.username} — ${e.fullName}`
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="date" label="Ngày xếp xe" rules={[{ required: true }]}>
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="status" label="Trạng thái xe">
                                    <Select options={MANIFEST_STATUS_OPTIONS} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="note" label="Ghi chú">
                            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                        </Form.Item>
                    </Form>

                    <Divider style={{ margin: '8px 0' }} />

                    {/* Header danh sách mã hàng */}
                    <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                        <Col>
                            <Text strong>
                                Danh sách mã hàng ({displayedPCs.length})
                            </Text>
                        </Col>
                        {!readOnly && (
                            <Col>
                                <Button
                                    type="primary"
                                    ghost
                                    icon={<PlusOutlined />}
                                    size="small"
                                    onClick={handleOpenAddModal}
                                >
                                    Thêm mã hàng
                                </Button>
                            </Col>
                        )}
                    </Row>

                    {/* Bulk override toolbar (edit mode) */}
                    {isEdit && selectedPCKeys.length > 0 && (
                        <div style={{
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: 6,
                            padding: '8px 12px',
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap'
                        }}>
                            <Text type="warning"><WarningOutlined /> Đã chọn {selectedPCKeys.length} mã hàng</Text>
                            <Select
                                placeholder="Chọn trạng thái mới"
                                style={{ width: 200 }}
                                options={MANIFEST_STATUS_OPTIONS}
                                value={bulkStatus}
                                onChange={setBulkStatus}
                                size="small"
                            />
                            <Button
                                type="primary"
                                size="small"
                                loading={applyingBulk}
                                onClick={handleBulkApply}
                            >
                                Áp dụng thủ công
                            </Button>
                            <Button size="small" onClick={() => { setSelectedPCKeys([]); setBulkStatus(null); }}>
                                Bỏ chọn
                            </Button>
                        </div>
                    )}

                    {/* Cảnh báo có PC bị override */}
                    {hasOverrides && !isCreate && (
                        <Alert
                            type="warning"
                            showIcon
                            message={"Một số mã hàng đã được chỉnh trạng thái thủ công và sẽ không đồng bộ khi đổi trạng thái xe."}
                            style={{ marginBottom: 8 }}
                        />
                    )}

                    <Table
                        columns={pcColumns}
                        dataSource={displayedPCs}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5, size: 'small' }}
                        scroll={{ x: 'max-content' }}
                        rowSelection={isEdit ? {
                            selectedRowKeys: selectedPCKeys,
                            onChange: keys => setSelectedPCKeys(keys),
                        } : undefined}
                    />
                </Spin>
            </Modal>

            {/* Modal chọn mã hàng để thêm */}
            <Modal
                title="Thêm mã hàng vào xe"
                open={addModalVisible}
                onCancel={() => setAddModalVisible(false)}
                onOk={handleAddItems}
                okText={`Thêm${selectedAddKeys.length > 0 ? ` (${selectedAddKeys.length})` : ''}`}
                cancelText="Hủy"
                confirmLoading={submitting}
                width={750}
                maskClosable={false}
                destroyOnClose
            >
                {selectedAddKeys.length > 0 && (
                    <div style={{
                        background: '#e6f4ff', border: '1px solid #91caff',
                        borderRadius: 6, padding: '6px 12px', marginBottom: 10,
                        color: '#1677ff', fontWeight: 500
                    }}>
                        <CheckCircleOutlined /> Đã chọn {selectedAddKeys.length} mã hàng
                    </div>
                )}
                <Table
                    columns={availableColumns}
                    dataSource={availablePCs}
                    rowKey="id"
                    loading={loadingAvailable}
                    size="small"
                    pagination={{ pageSize: 8 }}
                    rowSelection={{
                        selectedRowKeys: selectedAddKeys,
                        onChange: keys => setSelectedAddKeys(keys),
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Modal>
        </>
    );
};

export default ManifestModal;
