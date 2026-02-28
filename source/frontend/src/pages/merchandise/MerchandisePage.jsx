import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Card, Row, Col, Typography, Modal, message, Tooltip, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import * as XLSX from 'xlsx';
import productCodeService from '../../services/productCodeService';
import MerchandiseModal from './MerchandiseModal';
import { formatCurrency } from '../../utils/format';

const { Title } = Typography;
const { Option } = Select;

const MerchandisePage = () => {
    const { t } = useTranslation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    useEffect(() => {
        fetchData();
    }, [pagination.current, pagination.pageSize, searchText]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                limit: pagination.pageSize,
                search: searchText
            };
            const response = await productCodeService.getAll(params);
            if (response && response.data) {
                setData(response.data.items || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
            }
        } catch (error) {
            message.error(t('common.loadError') || 'Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    const handleAdd = () => {
        setEditingRecord(null);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setModalVisible(true);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: t('common.confirmDelete'),
            content: t('common.deleteMessage'),
            onOk: async () => {
                try {
                    await productCodeService.delete(id);
                    message.success(t('common.deleteSuccess'));
                    fetchData();
                } catch (error) {
                    message.error(t('common.deleteError'));
                }
            }
        });
    };

    const handleExport = () => {
        if (!data || data.length === 0) {
            message.warning("Không có dữ liệu để xuất");
            return;
        }

        const excelData = data.map((item, index) => ({
            'STT': index + 1,
            '1. [A] Ngày nhập': item.entryDate ? moment(item.entryDate).format('DD/MM/YYYY') : '',
            '2. [B] NVKD': item.customer?.sale?.fullName || '',
            '3. [C] Mã KH': item.customerCodeInput,
            '4. [D] Tên hàng': item.productName,
            '5. [E] Mã đơn': item.orderCode,
            '6. [F] Số kiện': item.packageCount,
            '7. [G] Đóng gói': item.packing,
            '8. [H] Trọng lượng': item.weight,
            '9. [I] Khối lượng': item.volume,
            '10. [J] Nguồn tin': item.infoSource,
            '11. [K] Phí nội địa RMB': item.domesticFeeRMB,
            '12. [L] Phí kéo RMB': item.haulingFeeRMB,
            '13. [M] Phí dỡ RMB': item.unloadingFeeRMB,
            '14. [N] Cước Kg': item.weightFee,
            '15. [O] Cước m3': item.volumeFee,
            '16. [P] Tổng cước': item.totalTransportFeeEstimate,
            '17. [Q] Ghi chú': item.notes,
            '16.1 Trạng thái xếp xe': item.loadingStatus,
            '20. [T] Tem chính': item.mainTag,
            '21. [U] Tem phụ': item.subTag,
            '22. [V] Xác nhận PCT': item.pctConfirmation,
            '23. [W] SL SP': item.productQuantity,
            '24. [X] Quy cách': item.specification,
            '25. [Y] Mô tả': item.productDescription,
            '26. [Z] Nhãn hiệu': item.brand,
            '27. [AA] MST': item.supplierTaxCode,
            '28. [AB] Tên Cty': item.supplierName,
            '29. [AC] Nhu cầu KB': item.declarationNeed,
            '30. [AD] Chính sách KB': item.declarationPolicy,
            '31. [AE] SL KB': item.declarationQuantity,
            '32. [AF] Giá HĐ': item.invoicePriceExport,
            '33. [AG] Giá KB': item.declarationPrice,
            '34. [AH] Phí ủy thác': item.trustFee,
            '35. [AI] Tên KB': item.declarationName,
            '36. [AJ] Phí phải nộp': item.feeAmount,
            '37. [AK] Thuế NK': item.importTax,
            '38. [AL] Thuế VAT': item.vatImportTax,
            '39. [AM] Phí mua': item.purchaseFee,
            '40. [AN] Xác nhận PKT': item.accountingConfirmation,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HangHoa");
        XLSX.writeFile(wb, "HangHoa_Export.xlsx");
    };


    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60, fixed: 'left' },
        {
            title: '1. [A] Ngày nhập',
            dataIndex: 'entryDate',
            width: 120,
            render: (d) => d ? moment(d).format('DD/MM/YYYY') : ''
        },
        { title: '3. [C] Mã KH', dataIndex: 'customerCodeInput', width: 100 },
        { title: '4. [D] Tên hàng', dataIndex: 'productName', width: 150 },
        { title: '5. [E] Mã đơn', dataIndex: 'orderCode', width: 100 },
        { title: '6. [F] Số kiện', dataIndex: 'packageCount', width: 100, render: val => val ? `${val} kiện` : '-' },
        { title: '8. [H] Trọng lượng', dataIndex: 'weight', width: 120, align: 'right', render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} kg` : '-' },
        { title: '9. [I] Khối lượng', dataIndex: 'volume', width: 120, align: 'right', render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} m³` : '-' },
        {
            title: '16. [P] Tổng cước',
            dataIndex: 'totalTransportFeeEstimate',
            width: 120,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'VND')}
                </span>
            )
        },
        // ... (We can show all or a subset, showing a subset for brevity in default view. 
        // User asked for "full information" ref excel. 
        // A table with 40 columns is wide. I will let user scroll.
        // Adding more keys...)
        {
            title: '11. [K] Phí nội địa',
            dataIndex: 'domesticFeeRMB',
            width: 100,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'RMB')}
                </span>
            )
        },
        {
            title: '12. [L] Phí kéo hàng',
            dataIndex: 'haulingFeeRMB',
            width: 100,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'RMB')}
                </span>
            )
        },
        { title: '16.1 Trạng thái xếp xe', dataIndex: 'loadingStatus', width: 120 },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={3}>Quản lý Hàng hóa</Title>
                </Col>
                <Col>
                    <Space>
                        <Input.Search
                            placeholder="Tìm kiếm..."
                            onSearch={handleSearch}
                            style={{ width: 250 }}
                            allowClear
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            {t('common.add') || 'Thêm mới'}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} />
                        <Button icon={<ExportOutlined />} onClick={handleExport}>Excel</Button>
                    </Space>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 2000 }} // Wide scroll
                size="small"
                bordered
            />

            <MerchandiseModal
                visible={modalVisible}
                onClose={() => { setModalVisible(false); fetchData(); }}
                editingRecord={editingRecord}
            />
        </Card>
    );
};

export default MerchandisePage;
