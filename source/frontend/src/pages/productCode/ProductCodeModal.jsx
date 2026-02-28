import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, Spin, DatePicker, Button, Tooltip, Space, Divider, Typography, Table, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import productCodeService from '../../services/productCodeService';
import customerService from '../../services/customerService';
import employeeService from '../../services/employeeService';
import merchandiseConditionService from '../../services/merchandiseConditionService';
import CustomNumberInput from '../../components/CustomNumberInput';
import { PACKAGE_UNIT_OPTIONS } from '../../constants/enums';
import ProductItemModal from './ProductItemModal';
import { EditOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const Col3 = ({ children }) => <Col xs={24} md={8}>{children}</Col>;

const ProductCodeModal = ({ visible, onClose, editingRecord, viewOnly, userType }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [totalFeeEstimate, setTotalFeeEstimate] = useState(0);

    const [itemsData, setItemsData] = useState([]);
    const [itemModalVisible, setItemModalVisible] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState(-1);

    const disabledGeneral = viewOnly || (userType === 'CUSTOMER');

    const fetchDropdownData = React.useCallback(async () => {
        try {
            const timestamp = new Date().getTime();
            const [custRes, empRes, condRes] = await Promise.all([
                customerService.getAll({ limit: 0, _t: timestamp }),
                employeeService.getAll({ limit: 0, _t: timestamp }),
                merchandiseConditionService.getAll({ limit: 0, _t: timestamp })
            ]);
            console.log()

            console.log("Fetched customers:", custRes.data.customers?.length);

            const rawCustomers = custRes.data?.customers || custRes.data?.items || custRes.data || custRes.customers || custRes.items || [];
            const rawEmployees = empRes.data?.employees || empRes.data?.items || empRes.data || empRes.employees || empRes.items || [];
            const rawConditions = condRes.data?.items || condRes.data?.conditions || condRes.data || condRes.items || condRes.conditions || [];

            console.log('rawCustomers', rawCustomers);
            // Force pure new arrays to guarantee React re-rendering
            setCustomers([...rawCustomers]);
            setEmployees([...rawEmployees]);
            setConditions([...rawConditions]);
        } catch (error) {
            console.error("Failed to fetch dropdown data", error);
        }
    }, [userType]);

    useEffect(() => {
        if (visible && userType !== 'CUSTOMER') {
            fetchDropdownData();
        }
    }, [visible, userType, fetchDropdownData]);

    useEffect(() => {
        if (visible) {
            if (editingRecord) {
                loadEditData();
            } else {
                form.resetFields();
                form.setFieldsValue({
                    entryDate: dayjs()
                });
                setItemsData([]);
                setTotalFeeEstimate(0);
            }
        }
    }, [visible, editingRecord]);

    const loadEditData = async () => {
        setLoading(true);
        try {
            const response = await productCodeService.getById(editingRecord.id);
            const data = response.data;
            form.setFieldsValue({
                ...data,
                entryDate: data.entryDate ? dayjs(data.entryDate) : null,
            });
            setItemsData(data.items && data.items.length > 0 ? data.items : []);
            setTotalFeeEstimate(data.totalTransportFeeEstimate || 0);
        } catch (error) {
            message.error(t('common.loadError', 'Lỗi tải dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    const triggerCalculations = (itemsArray) => {
        let newTotalFee = 0;
        itemsArray.forEach((item) => {
            const weightFee = Number(item?.weightFee) || 0;
            const weight = Number(item?.weight) || 0;
            const volumeFee = Number(item?.volumeFee) || 0;
            const volume = parseFloat(item?.volume) || 0;

            const feeByVolume = volumeFee * volume;
            const feeByWeight = weightFee * weight;

            newTotalFee += Math.max(feeByVolume, feeByWeight);
        });
        setTotalFeeEstimate(newTotalFee);
        form.setFieldsValue({ totalTransportFeeEstimate: newTotalFee });
    };

    const handleValuesChange = () => {
        // Items are now managed in local state, no need to watch for their changes here
    };

    const handleAddItem = () => {
        setEditingItemIndex(-1);
        setItemModalVisible(true);
    };

    const handleEditItem = (index) => {
        setEditingItemIndex(index);
        setItemModalVisible(true);
    };

    const handleDeleteItem = (index) => {
        const newItems = [...itemsData];
        newItems.splice(index, 1);
        setItemsData(newItems);
        triggerCalculations(newItems);
    };

    const handleSaveItem = (item) => {
        const newItems = [...itemsData];
        if (editingItemIndex > -1) {
            newItems[editingItemIndex] = { ...newItems[editingItemIndex], ...item };
        } else {
            newItems.push(item);
        }
        setItemsData(newItems);
        triggerCalculations(newItems);
        setItemModalVisible(false);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Chuyển kiểu dữ liệu
            const submitData = {
                ...values,
                entryDate: values.entryDate ? values.entryDate.toISOString() : null,
                totalWeight: Number(values.totalWeight) || 0,
                totalVolume: parseFloat(values.totalVolume) || 0,
                domesticFeeRMB: parseFloat(values.domesticFeeRMB) || 0,
                unloadingFeeRMB: parseFloat(values.unloadingFeeRMB) || 0,
                exchangeRate: parseFloat(values.exchangeRate) || 0,
                totalTransportFeeEstimate: Number(totalFeeEstimate) || 0,
                items: itemsData.map(item => ({
                    ...item,
                    packageCount: Number(item.packageCount) || 0,
                    weight: Number(item.weight) || 0,
                    volume: parseFloat(item.volume) || 0,
                    volumeFee: Number(item.volumeFee) || 0,
                    weightFee: Number(item.weightFee) || 0,
                    domesticFeeTQ: parseFloat(item.domesticFeeTQ) || 0,
                    haulingFeeTQ: parseFloat(item.haulingFeeTQ) || 0,
                    domesticFeeVN: Number(item.domesticFeeVN) || 0
                }))
            };

            if (editingRecord) {
                await productCodeService.update(editingRecord.id, submitData);
                message.success(t('productCode.updateSuccess', 'Cập nhật thành công'));
            } else {
                await productCodeService.create(submitData);
                message.success(t('productCode.createSuccess', 'Tạo mới thành công'));
            }
            onClose(true);
        } catch (error) {
            console.error(error);
            if (error.errorFields) {
                message.error(t('common.validationError', 'Vui lòng điền đủ thông tin'));
            } else if (error.response?.data?.message) {
                message.error(error.response.data.message);
            } else {
                message.error(t('common.saveError', 'Lỗi khi lưu dữ liệu'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={editingRecord ? t('productCode.edit', 'Sửa Mã Hàng') : t('productCode.add', 'Thêm Mã Hàng Mới')}
            open={visible}
            onOk={handleSubmit}
            onCancel={() => onClose()}
            confirmLoading={submitting}
            width={1200}
            style={{ top: 20 }}
            maskClosable={false}
            footer={
                <Space>
                    <Button onClick={() => onClose()}>{t('common.cancel', 'Huỷ')}</Button>
                    {!viewOnly && (
                        <Button type="primary" loading={submitting} onClick={handleSubmit}>
                            {t('common.save', 'Lưu lại')}
                        </Button>
                    )}
                </Space>
            }
        >
            <Spin spinning={loading}>
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={handleValuesChange}
                    disabled={viewOnly}
                >
                    <Divider orientation="left">Thông tin chung</Divider>
                    <Row gutter={16}>
                        {/* Nhân viên */}
                        <Col3>
                            <Form.Item name="employeeId" label="Nhân viên (Sale)" rules={[{ required: true, message: 'Bắt buộc chọn' }]}>
                                <Select
                                    showSearch
                                    placeholder="Chọn nhân viên"
                                    optionFilterProp="children"
                                    disabled={disabledGeneral}
                                >
                                    {employees.map(e => (
                                        <Option key={e.id} value={e.id}>{e.username} - {e.fullName}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col3>

                        {/* Khách hàng */}
                        <Col3>
                            <Form.Item
                                name="customerId"
                                label={
                                    <Space>
                                        Mã Khách Hàng
                                        {userType !== 'CUSTOMER' && (
                                            <Tooltip title={t('common.reload', 'Tải lại danh sách')}>
                                                <ReloadOutlined
                                                    style={{ cursor: 'pointer', color: '#1890ff' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchDropdownData();
                                                        message.success(t('common.reloaded', 'Đã cập nhật danh sách mới nhất'));
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </Space>
                                }
                                rules={[{ required: true, message: 'Bắt buộc chọn' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Chọn khách hàng"
                                    optionFilterProp="labelProp"
                                    filterOption={(input, option) =>
                                        (option?.labelProp ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    disabled={disabledGeneral}
                                    onSelect={(value) => {
                                        if (value === 'ADD_NEW_CUSTOMER') {
                                            window.open('/customers?action=add', '_blank');
                                            setTimeout(() => {
                                                form.setFieldsValue({ customerId: undefined });
                                            }, 0);
                                            return;
                                        }
                                    }}
                                    options={[
                                        ...(userType !== 'CUSTOMER' ? [{
                                            value: 'ADD_NEW_CUSTOMER',
                                            label: (
                                                <div style={{ color: '#1890ff', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px' }}>
                                                    <PlusOutlined /> Thêm mới khách hàng
                                                </div>
                                            ),
                                            labelProp: 'Thêm mới khách hàng'
                                        }] : []),
                                        ...customers.map(c => ({
                                            value: c.id,
                                            label: `${c.customerCode || c.username} - ${c.fullName}`,
                                            labelProp: `${c.customerCode || c.username} ${c.fullName}`
                                        }))
                                    ]}
                                />
                            </Form.Item>
                        </Col3>

                        {/* Ngày nhập kho */}
                        <Col3>
                            <Form.Item name="entryDate" label="Ngày Nhập Kho">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabled={disabledGeneral} />
                            </Form.Item>
                        </Col3>

                        {/* Mã đơn hàng */}
                        <Col3>
                            <Form.Item name="orderCode" label="Mã đơn hàng" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
                                <Input disabled={disabledGeneral} placeholder="Nhập mã đơn" />
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="totalWeight" label="Tổng trọng lượng">
                                <Space.Compact block>
                                    <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} isInteger={true} disabled={disabledGeneral} />
                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="kg" disabled />
                                </Space.Compact>
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="totalVolume" label="Tổng khối lượng">
                                <Space.Compact block>
                                    <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={disabledGeneral} />
                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="m³" disabled />
                                </Space.Compact>
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="domesticFeeRMB" label="Phí nội địa">
                                <Space.Compact block>
                                    <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={disabledGeneral} />
                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                </Space.Compact>
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="unloadingFeeRMB" label="Phí dỡ hàng">
                                <Space.Compact block>
                                    <CustomNumberInput style={{ width: 'calc(100% - 60px)' }} min={0} disabled={disabledGeneral} />
                                    <Input style={{ width: '60px', textAlign: 'center', pointerEvents: 'none' }} className="bg-gray-100" placeholder="RMB" disabled />
                                </Space.Compact>
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="infoSource" label="Nguồn cung cấp thông tin (Kg/m³)">
                                <Input disabled={disabledGeneral} placeholder="Ví dụ: Kho TQ báo" />
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="exchangeRate" label="Tỷ giá">
                                <CustomNumberInput style={{ width: '100%' }} min={0} disabled={disabledGeneral} />
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item name="merchandiseConditionId" label="Trạng thái hàng">
                                <Select placeholder="Chọn trạng thái" disabled={disabledGeneral}>
                                    {conditions.map(c => (
                                        <Option key={c.id} value={c.id}>{c.name_vi}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col3>

                        <Col3>
                            <Form.Item
                                label={
                                    <Space>
                                        Tổng TQ_HN tạm tính
                                        <Tooltip title="Tự động tính: Σ Max(Khối lượng × Cước khối, Trọng lượng × Cước cân) của các mặt hàng">
                                            <span style={{ cursor: 'pointer', color: '#1890ff' }}>(?)</span>
                                        </Tooltip>
                                    </Space>
                                }
                            >
                                <Form.Item name="totalTransportFeeEstimate" noStyle>
                                    <Input
                                        style={{ width: '100%', fontWeight: 'bold', color: '#cf1322' }}
                                        disabled
                                        value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFeeEstimate)}
                                    />
                                </Form.Item>
                            </Form.Item>
                        </Col3>
                    </Row>

                    <Divider orientation="left">Danh sách mặt hàng</Divider>

                    <div style={{ marginBottom: 16 }}>
                        {!viewOnly && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
                                Thêm mặt hàng
                            </Button>
                        )}
                    </div>

                    <Table
                        dataSource={itemsData}
                        pagination={false}
                        size="small"
                        rowKey={(item, idx) => item.id || idx}
                        columns={[
                            { title: 'Tên mặt hàng', dataIndex: 'productName', key: 'productName', fixed: 'left' },
                            { title: 'Số kiện', dataIndex: 'packageCount', key: 'packageCount', render: val => val ? `${val} kiện` : '-' },
                            {
                                title: 'ĐVT',
                                dataIndex: 'packageUnit',
                                key: 'packageUnit',
                                render: val => {
                                    const opt = PACKAGE_UNIT_OPTIONS.find(o => o.value === val);
                                    return opt ? t(opt.labelKey) : val || '-';
                                }
                            },
                            { title: 'Trọng lượng', dataIndex: 'weight', key: 'weight', render: val => val ? `${val} kg` : '-' },
                            { title: 'Khối lượng', dataIndex: 'volume', key: 'volume', render: val => val ? `${val} m³` : '-' },
                            { title: 'Cước cân', dataIndex: 'weightFee', key: 'weightFee', render: val => val ? `${new Intl.NumberFormat('vi-VN').format(val)} ₫` : '-' },
                            { title: 'Cước khối', dataIndex: 'volumeFee', key: 'volumeFee', render: val => val ? `${new Intl.NumberFormat('vi-VN').format(val)} ₫` : '-' },
                            { title: 'Nội địa TQ', dataIndex: 'domesticFeeTQ', key: 'domesticFeeTQ', render: val => val ? `${new Intl.NumberFormat('zh-CN').format(val)} ¥` : '-' },
                            { title: 'Kéo hàng TQ', dataIndex: 'haulingFeeTQ', key: 'haulingFeeTQ', render: val => val ? `${new Intl.NumberFormat('zh-CN').format(val)} ¥` : '-' },
                            { title: 'Nội địa VN', dataIndex: 'domesticFeeVN', key: 'domesticFeeVN', render: val => val ? `${new Intl.NumberFormat('vi-VN').format(val)} ₫` : '-' },
                            { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', ellipsis: true },
                            {
                                title: 'Thao tác',
                                key: 'action',
                                align: 'center',
                                fixed: 'right',
                                render: (_, record, idx) => (
                                    <Space size="middle">
                                        <Tooltip title="Sửa">
                                            <Button type="text" icon={<EditOutlined />} onClick={() => handleEditItem(idx)} />
                                        </Tooltip>
                                        {!viewOnly && (
                                            <Popconfirm title="Xoá mặt hàng này?" onConfirm={() => handleDeleteItem(idx)}>
                                                <Tooltip title="Xoá">
                                                    <Button type="text" danger icon={<DeleteOutlined />} />
                                                </Tooltip>
                                            </Popconfirm>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        scroll={{ x: 'max-content' }}
                    />
                </Form>
            </Spin>

            {itemModalVisible && (
                <ProductItemModal
                    visible={itemModalVisible}
                    onClose={() => setItemModalVisible(false)}
                    onSave={handleSaveItem}
                    initialValues={editingItemIndex > -1 ? itemsData[editingItemIndex] : null}
                    viewOnly={viewOnly}
                />
            )}
        </Modal>
    );
};

export default ProductCodeModal;
