import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Tag, Popconfirm, message, Typography, Row, Col, Image } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    DownloadOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import declarationService from '../../services/declarationService';
import DeclarationModal from './DeclarationModal';
import { formatCurrency } from '../../utils/format';

import moment from 'moment';

const { Option } = Select;

const DeclarationPage = () => {
    const { t } = useTranslation();
    const [declarations, setDeclarations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });

    // Filter State
    const [filters, setFilters] = useState({
        search: ''
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDeclaration, setEditingDeclaration] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);



    // User Role check
    const [userRole, setUserRole] = useState('USER');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role);
            } catch (e) {
                console.error("Invalid token");
            }
        }
        fetchDeclarations();
    }, []);

    const fetchDeclarations = async (page = 1, pageSize = 20, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize
            };
            if (currentFilters.search) params.search = currentFilters.search;

            const response = await declarationService.getAll(params);
            if (response && response.data) {
                setDeclarations(response.data.items);
                setPagination({
                    current: response.data.page,
                    pageSize: pageSize,
                    total: response.data.total
                });
            }
        } catch (error) {
            console.error(error);
            message.error(t('error.UNKNOWN'));
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (pagination) => {
        fetchDeclarations(pagination.current, pagination.pageSize, filters);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        fetchDeclarations(1, pagination.pageSize, filters);
    };

    const handleClear = () => {
        const newFilters = { search: '' };
        setFilters(newFilters);
        fetchDeclarations(1, pagination.pageSize, newFilters);
    };

    const handleAdd = () => {
        setEditingDeclaration(null);
        setIsViewMode(false);
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingDeclaration(record);
        setIsViewMode(false);
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setEditingDeclaration(record);
        setIsViewMode(true);
        setIsModalVisible(true);
    };



    const handleDelete = async (id) => {
        try {
            await declarationService.delete(id);
            message.success(t('declaration.deleteSuccess'));
            fetchDeclarations(pagination.current, pagination.pageSize, filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleModalSuccess = () => {
        setIsModalVisible(false);
        setEditingDeclaration(null);
        fetchDeclarations(1, pagination.pageSize, filters);
        message.success(editingDeclaration ? t('declaration.updateSuccess') : t('declaration.createSuccess'));
    };

    const handleExport = async () => {
        try {
            const response = await declarationService.exportData();
            const data = response.data.data; // Response data structure might be { code, message, data: [...] }

            if (!data || !Array.isArray(data)) {
                console.error("Invalid data format for export", data);
                message.error(t('error.UNKNOWN'));
                return;
            }

            // Format data for Excel
            const excelData = data.map(item => ({
                'ID': item.id,
                'Ngày nhập': item.entryDate ? moment(item.entryDate).format('DD/MM/YYYY') : '',
                'Mã đơn': item.orderCode,
                '1. [A] Mã khách hàng': item.customer?.fullName,
                '2. [B] Tên mặt hàng': item.productName,
                '3. [C] Số Kiện': item.packageCount,
                '4. [D] Trọng lượng (Kg)': item.weight,
                '5. [E] Khối lượng (m3)': item.volume,
                '6. [F] Nguồn tin': item.infoSource,
                '7. [G] Phí nội địa (RMB)': item.domesticFeeRMB,
                '8. [H] Phí kéo hàng (RMB)': item.haulingFeeRMB,
                '9. [I] Phí dỡ hàng (RMB)': item.unloadingFeeRMB,
                '10. [J] Đơn giá cước (Kg)': item.weightFee,
                '11. [K] Đơn giá cước (m3)': item.volumeFee,
                '12. [L] Tổng cước TQ_HN': item.totalTransportFeeEstimate,
                '13. [M] Ghi chú': item.note,
                '14. [N] Ảnh hàng hóa': item.productImage,
                // [O] Deleted
                '16. [P] Tem phụ': item.subTag,
                '17. [Q] Số lượng SP': item.productQuantity,
                '18. [R] Quy cách': item.specification,
                '19. [S] Mô Tả SP': item.productDescription,
                '20. [T] Nhãn Hiệu': item.brand,
                '21. [U] Nhu cầu khai báo': item.declarationNeed,
                '22. [V] Chính sách khai báo': item.declarationPolicy,
                '23. [W] Số lượng khai báo': item.declarationQuantity,
                '24. [X] Giá xuất hóa đơn': item.invoicePrice,
                '25. [Y] TT bổ sung': item.additionalInfo,
                '26. [Z] Tên khai báo': item.declarationName,
                '27. [AA] SL Khai báo (CT)': item.declarationQuantityDeclared,
                '28. [AB] Đơn vị tính': item.unit,
                '29. [AC] Giá khai báo': item.declarationPrice,
                '30. [AD] Trị giá': item.value,
                '31. [AE] Số kiện (CT)': item.packageCountDeclared,
                '32. [AF] Net weight': item.netWeight,
                '33. [AG] Gross weight': item.grossWeight,
                '34. [AH] CBM': item.cbm,
                '35. [AI] HS Code': item.hsCode,
                '36. [AJ] % Thuế VAT': item.vatPercent,
                '37. [AK] Thuế VAT': item.vatAmount,
                '38. [AL] % Thuế NK': item.importTaxPercent,
                '39. [AM] Thuế NK USD': item.importTaxUSD,
                '40. [AN] Thuế NK VNĐ': item.importTaxVND,
                '41. [AO] Tỷ giá HQ': item.customsExchangeRate,
                '42. [AP] Phí KTCL': item.qualityControlFee,
                '43. [AQ] Xác nhận PKT': item.accountingConfirmation,
                [t('common.createdAt')]: moment(item.createdAt).format('DD/MM/YYYY HH:mm')
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Declarations");
            XLSX.writeFile(workbook, "Danh_Sach_Khai_Bao.xlsx");

            message.success(t('common.exportSuccess') || 'Export Excel successful');
        } catch (error) {
            console.error("Export error", error);
            message.error(t('error.UNKNOWN'));
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
            fixed: 'left',
        },
        {
            title: 'Ngày nhập',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 100,
            render: (value) => value ? moment(value).format('DD/MM/YYYY') : '-'
        },
        {
            title: 'Mã đơn',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 120,
        },
        {
            title: '1. [A] Mã KH',
            key: 'customer',
            width: 180,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{record.customer?.fullName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.customer?.username}
                    </Typography.Text>
                </Space>
            )
        },
        {
            title: '2. [B] Tên hàng',
            dataIndex: 'productName',
            key: 'productName',
            width: 150,
            ellipsis: true
        },
        {
            title: '3. [C] Số kiện',
            dataIndex: 'packageCount',
            key: 'packageCount',
            width: 100,
            align: 'right',
            render: (value) => value ? `${value} kiện` : '-'
        },
        {
            title: '4. [D] Trọng lượng',
            dataIndex: 'weight',
            key: 'weight',
            width: 120,
            align: 'right',
            render: (value) => value ? `${new Intl.NumberFormat('de-DE').format(value)} kg` : '-'
        },
        {
            title: '5. [E] Khối lượng',
            dataIndex: 'volume',
            key: 'volume',
            width: 120,
            align: 'right',
            render: (value) => value ? `${new Intl.NumberFormat('de-DE').format(value)} m³` : '-'
        },
        {
            title: '6. [F] Nguồn tin',
            dataIndex: 'infoSource',
            key: 'infoSource',
            width: 100,
        },
        {
            title: '7. [G] Phí nội địa',
            dataIndex: 'domesticFeeRMB',
            key: 'domesticFeeRMB',
            width: 120,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'RMB')}
                </span>
            )
        },
        {
            title: '8. [H] Phí kéo hàng',
            dataIndex: 'haulingFeeRMB',
            key: 'haulingFeeRMB',
            width: 120,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'RMB')}
                </span>
            )
        },
        {
            title: '9. [I] Phí dỡ hàng',
            dataIndex: 'unloadingFeeRMB',
            key: 'unloadingFeeRMB',
            width: 120,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'RMB')}
                </span>
            )
        },
        {
            title: '10. [J] Cước cân',
            dataIndex: 'weightFee',
            key: 'weightFee',
            width: 120,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'VND')}
                </span>
            )
        },
        {
            title: '11. [K] Cước khối',
            dataIndex: 'volumeFee',
            key: 'volumeFee',
            width: 120,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'VND')}
                </span>
            )
        },
        {
            title: '12. [L] Tổng cước',
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 140,
            align: 'right',
            render: (value) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(value, 'VND')}
                </span>
            )
        },
        {
            title: '13. [M] Ghi chú',
            dataIndex: 'note',
            key: 'note',
            width: 150,
            ellipsis: true
        },
        {
            title: '14. [N] Ảnh hàng',
            dataIndex: 'productImage',
            key: 'productImage',
            width: 80,
            render: (image) => image ? <Image width={40} src={image} /> : '-'
        },
        {
            title: '16. [P] Tem phụ',
            dataIndex: 'subTag',
            key: 'subTag',
            width: 100,
        },
        {
            title: '17. [Q] SL SP',
            dataIndex: 'productQuantity',
            key: 'productQuantity',
            align: 'right',
            width: 100,
        },
        {
            title: '18. [R] Quy cách',
            dataIndex: 'specification',
            key: 'specification',
            width: 120,
        },
        {
            title: '19. [S] Mô tả SP',
            dataIndex: 'productDescription',
            key: 'productDescription',
            width: 120,
            ellipsis: true
        },
        {
            title: '20. [T] Nhãn hiệu',
            dataIndex: 'brand',
            key: 'brand',
            width: 100,
        },
        {
            title: '21. [U] Nhu cầu KB',
            dataIndex: 'declarationNeed',
            key: 'declarationNeed',
            width: 120,
        },
        {
            title: '22. [V] Chính sách KB',
            dataIndex: 'declarationPolicy',
            key: 'declarationPolicy',
            width: 120,
        },
        {
            title: '23. [W] SL KB (Nháp)',
            dataIndex: 'declarationQuantity',
            key: 'declarationQuantity',
            width: 100,
        },
        {
            title: '24. [X] Giá xuất HĐ',
            dataIndex: 'invoicePrice',
            key: 'invoicePrice',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '25. [Y] TT Bổ sung',
            dataIndex: 'additionalInfo',
            key: 'additionalInfo',
            width: 120,
        },
        {
            title: '26. [Z] Tên khai báo',
            dataIndex: 'declarationName',
            key: 'declarationName',
            width: 120,
        },
        {
            title: '27. [AA] SL KB (CT)',
            dataIndex: 'declarationQuantityDeclared',
            key: 'declarationQuantityDeclared',
            width: 100,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '28. [AB] Đơn vị tính',
            dataIndex: 'unit',
            key: 'unit',
            width: 80,
        },
        {
            title: '29. [AC] Giá khai báo',
            dataIndex: 'declarationPrice',
            key: 'declarationPrice',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '30. [AD] Trị giá',
            dataIndex: 'value',
            key: 'value',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '31. [AE] Số kiện (CT)',
            dataIndex: 'packageCountDeclared',
            key: 'packageCountDeclared',
            width: 100,
            align: 'right'
        },
        {
            title: '32. [AF] Net Weight',
            dataIndex: 'netWeight',
            key: 'netWeight',
            width: 100,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '33. [AG] Gross Weight',
            dataIndex: 'grossWeight',
            key: 'grossWeight',
            width: 100,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '34. [AH] CBM',
            dataIndex: 'cbm',
            key: 'cbm',
            width: 100,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '35. [AI] HS Code',
            dataIndex: 'hsCode',
            key: 'hsCode',
            width: 120,
        },
        {
            title: '36. [AJ] % VAT',
            dataIndex: 'vatPercent',
            key: 'vatPercent',
            width: 80,
            align: 'right',
            render: (value) => value ? `${value}%` : '-'
        },
        {
            title: '37. [AK] Thuế VAT',
            dataIndex: 'vatAmount',
            key: 'vatAmount',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '38. [AL] % Thuế NK',
            dataIndex: 'importTaxPercent',
            key: 'importTaxPercent',
            width: 80,
            align: 'right',
            render: (value) => value ? `${value}%` : '-'
        },
        {
            title: '39. [AM] Thuế NK (USD)',
            dataIndex: 'importTaxUSD',
            key: 'importTaxUSD',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '40. [AN] Thuế NK (VNĐ)',
            dataIndex: 'importTaxVND',
            key: 'importTaxVND',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '41. [AO] Tỷ giá HQ',
            dataIndex: 'customsExchangeRate',
            key: 'customsExchangeRate',
            width: 100,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '42. [AP] Phí KTCL',
            dataIndex: 'qualityControlFee',
            key: 'qualityControlFee',
            width: 120,
            align: 'right',
            render: (value) => value ? new Intl.NumberFormat('de-DE').format(value) : '-'
        },
        {
            title: '43. [AQ] Xác nhận PKT',
            dataIndex: 'accountingConfirmation',
            key: 'accountingConfirmation',
            width: 150,
        },
        {
            title: t('common.action'),
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                        title={t('common.view')}
                    />
                    {userRole === 'ADMIN' && (
                        <>
                            <Button
                                type="text"
                                icon={<EditOutlined style={{ color: '#faad14' }} />}
                                onClick={() => handleEdit(record)}
                                title={t('common.edit')}
                            />
                            <Popconfirm
                                title={t('common.confirmDelete')}
                                onConfirm={() => handleDelete(record.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="text"
                                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                                    title={t('common.delete')}
                                />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={24} lg={12}>
                        <h2>{t('declaration.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    style={{ backgroundColor: '#217346', color: '#fff', borderColor: '#217346' }}
                                >
                                    {t('common.exportExcel') || "Export Excel"}
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    {t('declaration.add')}
                                </Button>
                            </Space>
                        )}
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={14}>
                            <Input
                                placeholder={t('declaration.searchPlaceholder') || "Search by Order Code, Product Name..."}
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
                        </Col>

                        <Col xs={24} sm={24} md={24} lg={10} style={{ textAlign: 'right' }}>
                            <Space>
                                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} size="large">
                                    {t('common.search')}
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={handleClear} size="large">
                                    {t('common.clear')}
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </div>

            <Table
                columns={columns}
                dataSource={declarations}
                rowKey="id"
                loading={loading}
                scroll={{ x: 2200 }}
                size="middle"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '30', '40', '50'],
                    locale: { items_per_page: t('common.items_per_page') },
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                }}
                onChange={handleTableChange}
            />

            <DeclarationModal
                visible={isModalVisible}
                declaration={editingDeclaration}
                isViewMode={isViewMode}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingDeclaration(null);
                    setIsViewMode(false);
                }}
                onSuccess={handleModalSuccess}
            />


        </div>
    );
};

export default DeclarationPage;
