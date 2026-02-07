import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Checkbox, Row, Col, message, Spin, Button, Table, Space, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import productCodeService from '../../services/productCodeService';
import customerService from '../../services/customerService';
import warehouseService from '../../services/warehouseService';
import categoryService from '../../services/categoryService';
import declarationService from '../../services/declarationService';

const { Option } = Select;
const { TextArea } = Input;

const ProductCodeModal = ({ visible, onClose, editingRecord }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [declarations, setDeclarations] = useState([]);

    const [separateTax, setSeparateTax] = useState(false);

    // Nested data
    const [warehouseCosts, setWarehouseCosts] = useState([]);
    const [packageDetails, setPackageDetails] = useState([]);

    // Upload
    const [fileList, setFileList] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchDropdownData();
            if (editingRecord) {
                loadEditData();
            } else {
                // Reset for new record
                setWarehouseCosts([]);
                setPackageDetails([]);
                setFileList([]);
                setExistingImages([]);
            }
        }
    }, [visible, editingRecord]);

    const fetchDropdownData = async () => {
        setLoading(true);
        try {
            const [customersRes, warehousesRes, categoriesRes, declarationsRes] = await Promise.all([
                customerService.getAll(1, 1000),
                warehouseService.getAll(1, 1000),
                categoryService.getAll(1, 1000),
                declarationService.getAll(1, 1000)
            ]);

            setCustomers(customersRes.data.items || []);
            setWarehouses(warehousesRes.data.items || []);
            setCategories(categoriesRes.data.items || []);
            setDeclarations(declarationsRes.data.items || []);
        } catch (error) {
            message.error(t('common.loadError') || 'Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const loadEditData = async () => {
        try {
            const response = await productCodeService.getById(editingRecord.id);
            const data = response.data;

            setSeparateTax(data.separateTax);
            setWarehouseCosts(data.warehouseCosts || []);
            setPackageDetails(data.packageDetails || []);
            setExistingImages(data.images || []);

            form.setFieldsValue({
                customerId: data.customerId,
                partnerName: data.partnerName,
                warehouseId: data.warehouseId,
                categoryId: data.categoryId,
                productName: data.productName,
                exchangeRate: data.exchangeRate,
                declarationId: data.declarationId,
                notes: data.notes,
                separateTax: data.separateTax,
                originalWeightPrice: data.originalWeightPrice,
                originalVolumePrice: data.originalVolumePrice,
                serviceFee: data.serviceFee,
                importTax: data.importTax,
                vat: data.vat,
                totalAmount: data.totalAmount,
                incidentalFee: data.incidentalFee,
                incidentalNotes: data.incidentalNotes,
                profit: data.profit,
                totalWeight: data.totalWeight,
                totalVolume: data.totalVolume,
                totalPackages: data.totalPackages,
                costCalculationMethod: data.costCalculationMethod,
                weightPrice: data.weightPrice,
                volumePrice: data.volumePrice,
                status: data.status || 'NHAP_KHO_TQ'
            });
        } catch (error) {
            message.error(t('common.loadError') || 'Lỗi khi tải dữ liệu');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Merge nested data
            const submitData = {
                ...values,
                warehouseCosts: warehouseCosts,
                packageDetails: packageDetails
            };

            let productCodeId;
            if (editingRecord) {
                await productCodeService.update(editingRecord.id, submitData);
                productCodeId = editingRecord.id;
                message.success(t('productCode.updateSuccess') || 'Cập nhật thành công');
            } else {
                const response = await productCodeService.create(submitData);
                productCodeId = response.data.id;
                message.success(t('productCode.createSuccess') || 'Tạo mới thành công');
            }

            // Upload images if any
            if (fileList.length > 0) {
                const filesToUpload = fileList.filter(file => file.originFileObj);
                if (filesToUpload.length > 0) {
                    await productCodeService.uploadImages(
                        productCodeId,
                        filesToUpload.map(f => f.originFileObj)
                    );
                }
            }

            onClose(true);
        } catch (error) {
            if (error.errorFields) {
                message.error(t('common.validationError') || 'Vui lòng kiểm tra lại thông tin');
            } else {
                message.error(t('common.saveError') || 'Lỗi khi lưu dữ liệu');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setSeparateTax(false);
        setWarehouseCosts([]);
        setPackageDetails([]);
        setFileList([]);
        setExistingImages([]);
        onClose(false);
    };

    // Warehouse Costs handlers
    const addWarehouseCost = () => {
        setWarehouseCosts([...warehouseCosts, {
            id: Date.now(), // Temporary ID for UI
            costType: 'SHIP_NOI_DIA',
            currency: 'YUAN',
            originalCost: 0,
            otherFee: 0,
            notes: ''
        }]);
    };

    const removeWarehouseCost = (index) => {
        setWarehouseCosts(warehouseCosts.filter((_, i) => i !== index));
    };

    const updateWarehouseCost = (index, field, value) => {
        const updated = [...warehouseCosts];
        updated[index][field] = value;
        setWarehouseCosts(updated);
    };

    // Package Details handlers
    const addPackageDetail = () => {
        setPackageDetails([...packageDetails, {
            id: Date.now(),
            trackingCode: '',
            length: 0,
            width: 0,
            height: 0,
            totalWeight: 0,
            totalPackages: 0
        }]);
    };

    const removePackageDetail = (index) => {
        setPackageDetails(packageDetails.filter((_, i) => i !== index));
    };

    const updatePackageDetail = (index, field, value) => {
        const updated = [...packageDetails];
        updated[index][field] = value;
        setPackageDetails(updated);
    };

    // Upload handlers
    const uploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Chỉ được upload file ảnh!');
                return Upload.LIST_IGNORE;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('Ảnh phải nhỏ hơn 5MB!');
                return Upload.LIST_IGNORE;
            }
            return false; // Prevent auto upload
        },
        fileList,
        onChange: ({ fileList: newFileList }) => {
            setFileList(newFileList);
        },
        listType: 'picture-card',
        multiple: true
    };

    const costTypeOptions = [
        { value: 'SHIP_NOI_DIA', label: 'Ship nội địa' },
        { value: 'PHI_NANG_HANG', label: 'Phí nâng hàng' },
        { value: 'PHI_HA_HANG', label: 'Phí hạ hàng' },
        { value: 'PHI_KEO_HANG', label: 'Phí kéo hàng' },
        { value: 'PHI_GIA_CO', label: 'Phí gia cố' },
        { value: 'PHI_DONG_GO', label: 'Phí đóng gỗ' },
        { value: 'PHI_KIEM_DEM', label: 'Phí kiểm đếm' },
        { value: 'PHI_LUU_KHO', label: 'Phí lưu kho' },
        { value: 'PHI_CAN', label: 'Phí cân' },
        { value: 'PHI_KIEM_TRA_CHAT_LUONG', label: 'Phí kiểm tra chất lượng' },
        { value: 'PHI_TU_CONG_BO', label: 'Phí tự công bố' },
        { value: 'PHI_XU_LY_HAI_QUAN', label: 'Phí xử lý hải quan' },
        { value: 'PHI_THUONG_KIEM', label: 'Phí thương kiểm' },
        { value: 'PHI_KHAC', label: 'Phí khác' }
    ];

    const warehouseCostColumns = [
        {
            title: 'Tên chi phí',
            dataIndex: 'costType',
            width: 200,
            render: (val, record, index) => (
                <Select
                    value={val}
                    onChange={(v) => updateWarehouseCost(index, 'costType', v)}
                    style={{ width: '100%' }}
                >
                    {costTypeOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Tiền tệ',
            dataIndex: 'currency',
            width: 100,
            render: (val, record, index) => (
                <Select
                    value={val}
                    onChange={(v) => updateWarehouseCost(index, 'currency', v)}
                    style={{ width: '100%' }}
                >
                    <Option value="YUAN">Yuan</Option>
                    <Option value="VND">VND</Option>
                </Select>
            )
        },
        {
            title: 'Chi phí gốc',
            dataIndex: 'originalCost',
            width: 120,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateWarehouseCost(index, 'originalCost', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Tiền thu khác',
            dataIndex: 'otherFee',
            width: 120,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateWarehouseCost(index, 'otherFee', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            width: 150,
            render: (val, record, index) => (
                <Input
                    value={val}
                    onChange={(e) => updateWarehouseCost(index, 'notes', e.target.value)}
                />
            )
        },
        {
            title: 'Thao tác',
            width: 80,
            render: (_, record, index) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeWarehouseCost(index)}
                />
            )
        }
    ];

    const packageDetailColumns = [
        {
            title: 'Mã vận đơn',
            dataIndex: 'trackingCode',
            width: 150,
            render: (val, record, index) => (
                <Input
                    value={val}
                    onChange={(e) => updatePackageDetail(index, 'trackingCode', e.target.value)}
                />
            )
        },
        {
            title: 'Dài (cm)',
            dataIndex: 'length',
            width: 100,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updatePackageDetail(index, 'length', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Rộng (cm)',
            dataIndex: 'width',
            width: 100,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updatePackageDetail(index, 'width', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Cao (cm)',
            dataIndex: 'height',
            width: 100,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updatePackageDetail(index, 'height', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Tổng cân (kg)',
            dataIndex: 'totalWeight',
            width: 120,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updatePackageDetail(index, 'totalWeight', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                />
            )
        },
        {
            title: 'Tổng kiện',
            dataIndex: 'totalPackages',
            width: 100,
            render: (val, record, index) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updatePackageDetail(index, 'totalPackages', v)}
                    style={{ width: '100%' }}
                    min={0}
                    step={1}
                />
            )
        },
        {
            title: 'Thao tác',
            width: 80,
            render: (_, record, index) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removePackageDetail(index)}
                />
            )
        }
    ];

    return (
        <Modal
            title={editingRecord ? (t('productCode.edit') || 'Sửa Mã hàng') : (t('productCode.add') || 'Thêm Mã hàng')}
            open={visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={submitting}
            width={1400}
            okText={t('common.save') || 'Lưu'}
            cancelText={t('common.cancel') || 'Hủy'}
            style={{ top: 20 }}
        >
            <Spin spinning={loading}>
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{
                            separateTax: false,
                            incidentalFee: 0,
                            profit: 0,
                            costCalculationMethod: 'AUTO',
                            status: 'NHAP_KHO_TQ'
                        }}
                    >
                        <h4>{t('productCode.basicInfo') || 'Thông tin cơ bản'}</h4>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="customerId"
                                    label={t('productCode.customer') || 'Khách hàng'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder={t('productCode.selectCustomer') || 'Chọn khách hàng'}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        {customers.map(c => (
                                            <Option key={c.id} value={c.id}>
                                                {c.fullName} ({c.username})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="partnerName"
                                    label={t('productCode.partnerName') || 'Tên đối tác'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Input placeholder={t('productCode.partnerNamePlaceholder') || 'Nhập tên đối tác'} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="warehouseId"
                                    label={t('productCode.warehouse') || 'Kho nhận'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Select placeholder={t('productCode.selectWarehouse') || 'Chọn kho'}>
                                        {warehouses.map(w => (
                                            <Option key={w.id} value={w.id}>{w.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="categoryId"
                                    label={t('productCode.category') || 'Loại hàng'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Select placeholder={t('productCode.selectCategory') || 'Chọn loại hàng'}>
                                        {categories.map(c => (
                                            <Option key={c.id} value={c.id}>{c.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="productName"
                                    label={t('productCode.productName') || 'Tên sản phẩm'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Input placeholder={t('productCode.productNamePlaceholder') || 'Nhập tên sản phẩm'} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="exchangeRate"
                                    label={t('productCode.exchangeRate') || 'Tỷ giá'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        min={0}
                                        step={0.0001}
                                        placeholder="0.0000"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="declarationId"
                                    label={t('productCode.declaration') || 'Khai báo'}
                                >
                                    <Select
                                        allowClear
                                        showSearch
                                        placeholder={t('productCode.selectDeclaration') || 'Chọn khai báo (tùy chọn)'}
                                        optionFilterProp="children"
                                    >
                                        {declarations.map(d => (
                                            <Option key={d.id} value={d.id}>
                                                ID: {d.id} - {d.invoiceRequestName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="notes"
                                    label={t('productCode.notes') || 'Ghi chú'}
                                >
                                    <TextArea rows={1} placeholder={t('productCode.notesPlaceholder') || 'Nhập ghi chú'} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="status"
                                    label={t('productCode.status') || 'Trạng thái'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <Select placeholder={t('productCode.selectStatus') || 'Chọn trạng thái'}>
                                        <Option value="NHAP_KHO_TQ">{t('productCode.statusNhapKhoTQ') || 'Nhập kho TQ'}</Option>
                                        <Option value="CHO_XEP_XE">{t('productCode.statusChoXepXe') || 'Chờ xếp xe'}</Option>
                                        <Option value="DA_XEP_XE">{t('productCode.statusDaXepXe') || 'Đã xếp xe'}</Option>
                                        <Option value="KIEM_HOA">{t('productCode.statusKiemHoa') || 'Kiểm hóa'}</Option>
                                        <Option value="CHO_THONG_QUAN_VN">{t('productCode.statusChoThongQuanVN') || 'Chờ thông quan VN'}</Option>
                                        <Option value="NHAP_KHO_VN">{t('productCode.statusNhapKhoVN') || 'Nhập kho VN'}</Option>
                                        <Option value="XUAT_THIEU">{t('productCode.statusXuatThieu') || 'Hàng không tên'}</Option>
                                        <Option value="XUAT_DU">{t('productCode.statusXuatDu') || 'Đã xuất kho'}</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <h4 style={{ marginTop: 24 }}>{t('productCode.costTaxInfo') || 'Thông tin chi phí & thuế'}</h4>
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="originalWeightPrice"
                                    label={t('productCode.originalWeightPrice') || 'Giá cân gốc'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="originalVolumePrice"
                                    label={t('productCode.originalVolumePrice') || 'Giá khối gốc'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="serviceFee"
                                    label={t('productCode.serviceFee') || 'Phí dịch vụ'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={24}>
                                <Form.Item name="separateTax" valuePropName="checked">
                                    <Checkbox onChange={(e) => setSeparateTax(e.target.checked)}>
                                        {t('productCode.separateTax') || 'Tách thuế'}
                                    </Checkbox>
                                </Form.Item>
                            </Col>
                        </Row>

                        {separateTax && (
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="importTax"
                                        label={t('productCode.importTax') || 'Thuế nhập khẩu (VND)'}
                                    >
                                        <InputNumber style={{ width: '100%' }} min={0} step={1} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="vat"
                                        label={t('productCode.vat') || 'Thuế VAT (VND)'}
                                    >
                                        <InputNumber style={{ width: '100%' }} min={0} step={1} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}

                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="totalAmount"
                                    label={t('productCode.totalAmount') || 'Thành tiền'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="incidentalFee"
                                    label={t('productCode.incidentalFee') || 'Phí phát sinh'}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="profit"
                                    label={t('productCode.profit') || 'Lợi nhuận'}
                                >
                                    <InputNumber style={{ width: '100%' }} step={0.01} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={24}>
                                <Form.Item
                                    name="incidentalNotes"
                                    label={t('productCode.incidentalNotes') || 'Ghi chú phát sinh'}
                                >
                                    <TextArea rows={2} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h4 style={{ marginTop: 24 }}>Thông tin chi kho</h4>
                        <Button
                            type="dashed"
                            onClick={addWarehouseCost}
                            icon={<PlusOutlined />}
                            style={{ marginBottom: 16 }}
                        >
                            Thêm chi phí
                        </Button>
                        <Table
                            dataSource={warehouseCosts}
                            columns={warehouseCostColumns}
                            pagination={false}
                            rowKey="id"
                            scroll={{ x: 800 }}
                            size="small"
                        />

                        <h4 style={{ marginTop: 24 }}>Chi tiết kiện hàng</h4>
                        <Button
                            type="dashed"
                            onClick={addPackageDetail}
                            icon={<PlusOutlined />}
                            style={{ marginBottom: 16 }}
                        >
                            Thêm kiện hàng
                        </Button>
                        <Table
                            dataSource={packageDetails}
                            columns={packageDetailColumns}
                            pagination={false}
                            rowKey="id"
                            scroll={{ x: 700 }}
                            size="small"
                        />

                        <h4 style={{ marginTop: 24 }}>{t('productCode.productSpecs') || 'Thông số sản phẩm'}</h4>
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="totalWeight"
                                    label={t('productCode.totalWeight') || 'Tổng cân (kg)'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="totalVolume"
                                    label={t('productCode.totalVolume') || 'Tổng khối (m³)'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="totalPackages"
                                    label={t('productCode.totalPackages') || 'Tổng kiện'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={1} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h4 style={{ marginTop: 24 }}>{t('productCode.freightInfo') || 'Thông tin giá cước'}</h4>
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="costCalculationMethod"
                                    label={t('productCode.costCalculationMethod') || 'Cách tính chi phí'}
                                >
                                    <Select>
                                        <Option value="AUTO">{t('productCode.auto') || 'Tự động'}</Option>
                                        <Option value="BY_WEIGHT">{t('productCode.byWeight') || 'Theo cân'}</Option>
                                        <Option value="BY_VOLUME">{t('productCode.byVolume') || 'Theo khối'}</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="weightPrice"
                                    label={t('productCode.weightPrice') || 'Giá cân'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="volumePrice"
                                    label={t('productCode.volumePrice') || 'Giá khối'}
                                    rules={[{ required: true, message: t('common.required') || 'Bắt buộc' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <h4 style={{ marginTop: 24 }}>Hình ảnh</h4>
                        {existingImages.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <p>Ảnh hiện có:</p>
                                <Space>
                                    {existingImages.map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${img}`}
                                            alt={`Image ${idx + 1}`}
                                            style={{ width: 100, height: 100, objectFit: 'cover' }}
                                        />
                                    ))}
                                </Space>
                            </div>
                        )}
                        <Upload {...uploadProps}>
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Upload</div>
                            </div>
                        </Upload>
                    </Form>
                </div>
            </Spin>
        </Modal>
    );
};

export default ProductCodeModal;
