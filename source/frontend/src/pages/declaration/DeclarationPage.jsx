import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Popconfirm, message, Typography, Row, Col, Image, Tooltip } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import declarationService from '../../services/declarationService';
import DeclarationModal from './DeclarationModal';
import ProductCodeModal from '../productCode/ProductCodeModal';
import { formatCurrency } from '../../utils/format';
import moment from 'moment';

const { Text } = Typography;

const DeclarationPage = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [declarations, setDeclarations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });

    const [filters, setFilters] = useState({
        search: ''
    });

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDeclaration, setEditingDeclaration] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [userRole, setUserRole] = useState('USER');
    const [userType, setUserType] = useState('USER');

    const [pcModalVisible, setPcModalVisible] = useState(false);
    const [selectedPc, setSelectedPc] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role);
                setUserType(payload.type);
            } catch (e) {
                console.error("Invalid token");
            }
        }
        const queryParams = new URLSearchParams(location.search);
        const productItemId = queryParams.get('productItemId');

        fetchDeclarations(1, 20, { search: '', productItemId });
    }, [location.search]);

    const fetchDeclarations = async (page = 1, pageSize = 20, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize,
                search: currentFilters.search,
                productItemId: currentFilters.productItemId
            };
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

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const productItemId = queryParams.get('productItemId');
        if (productItemId && declarations.length === 1) {
            handleView(declarations[0]);
        }
    }, [declarations]);

    const handleTableChange = (pagination) => {
        fetchDeclarations(pagination.current, pagination.pageSize, filters);
    };

    const handleSearch = () => {
        fetchDeclarations(1, pagination.pageSize, filters);
    };

    const handleClear = () => {
        const newFilters = { search: '' };
        setFilters(newFilters);
        fetchDeclarations(1, pagination.pageSize, newFilters);
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
        fetchDeclarations(pagination.current, pagination.pageSize, filters);
    };

    const handleViewProductCode = (pcId, piId) => {
        setSelectedPc({ id: pcId, productItemId: piId });
        setPcModalVisible(true);
    };

    const handleExport = async () => {
        try {
            const response = await declarationService.export();
            const data = response.data;

            if (!data || !Array.isArray(data)) {
                message.error(t('error.UNKNOWN'));
                return;
            }

            const excelData = data.map(item => ({
                'ID': item.id,
                'ID Mã hàng': item.productCodeId,
                'ID Mặt hàng': item.productItemId,
                'Tên mặt hàng': item.productItem?.productName,
                'Số lượng SP': item.productQuantity,
                'Quy cách': item.specification,
                'Nhãn hiệu': item.brand,
                'MST Công ty bán': item.sellerTaxCode,
                'Tên công ty bán': item.sellerCompanyName,
                'Nhu cầu khai báo': item.declarationNeed,
                'Số lượng khai báo': item.declarationQuantity,
                'Giá xuất hóa đơn': item.invoicePriceBeforeVat,
                'Tổng giá trị': item.totalLotValueBeforeVat,
                'Thuế NK (%)': item.importTax,
                'Thuế VAT (%)': item.vatTax,
                'Tiền thuế NK': item.importTaxPayable,
                'Tiền thuế VAT': item.vatTaxPayable,
                'Phí phải nộp': item.payableFee,
                'Phí ủy thác': item.entrustmentFee,
                'Ghi chú': item.notes,
                'Tổng chi phí NK hàng hóa': item.importCostToCustomer,
                'Ngày tạo': moment(item.createdAt).format('DD/MM/YYYY HH:mm')
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Declarations");
            XLSX.writeFile(workbook, "Danh_Sach_Khai_Bao.xlsx");
            message.success(t('common.exportSuccess'));
        } catch (error) {
            console.error(error);
            message.error(t('error.UNKNOWN'));
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            fixed: 'left',
        },
        {
            title: t('declaration.productCodeId'),
            key: 'productCodeId',
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    onClick={() => handleViewProductCode(record.productCodeId)}
                    style={{ padding: 0 }}
                >
                    {record.productCodeId}
                </Button>
            )
        },
        {
            title: t('declaration.customerCode'),
            key: 'customer',
            width: 150,
            render: (_, record) => record.productCode?.customer?.customerCode || record.productCode?.customer?.fullName || '-'
        },
        {
            title: t('declaration.orderCode'),
            key: 'orderCode',
            width: 130,
            render: (_, record) => <Text strong>{record.productCode?.orderCode || '-'}</Text>
        },
        {
            title: t('declaration.entryDate'),
            key: 'entryDate',
            width: 120,
            render: (_, record) => record.productCode?.entryDate ? moment(record.productCode.entryDate).format('DD/MM/YYYY') : '-'
        },
        {
            title: t('declaration.productItemId'),
            key: 'productItemId',
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    onClick={() => handleViewProductCode(record.productCodeId, record.productItemId)}
                    style={{ padding: 0 }}
                >
                    {record.productItemId}
                </Button>
            )
        },
        {
            title: t('declaration.productItem'),
            key: 'productItemName',
            width: 180,
            render: (_, record) => (
                <Tooltip title={record.productDescription}>
                    <Text>{record.productItem?.productName || '-'}</Text>
                </Tooltip>
            )
        },
        {
            title: t('declaration.images'),
            dataIndex: 'imageUrls',
            key: 'images',
            width: 100,
            render: (images) => (
                images && images.length > 0 ? (
                    <Image.PreviewGroup>
                        <Image width={40} src={images[0]} />
                    </Image.PreviewGroup>
                ) : '-'
            )
        },
        {
            title: t('declaration.productQuantity'),
            dataIndex: 'productQuantity',
            key: 'productQuantity',
            width: 100,
            align: 'right',
        },
        {
            title: t('declaration.brand'),
            dataIndex: 'brand',
            key: 'brand',
            width: 120,
        },
        {
            title: t('declaration.totalLotValueBeforeVat'),
            dataIndex: 'totalLotValueBeforeVat',
            key: 'totalLotValueBeforeVat',
            width: 150,
            align: 'right',
            render: (val) => <Text strong style={{ color: '#096dd9' }}>{formatCurrency(val, 'VND')}</Text>
        },
        {
            title: t('declaration.importCostToCustomer'),
            dataIndex: 'importCostToCustomer',
            key: 'importCostToCustomer',
            width: 180,
            align: 'right',
            render: (val) => <Text strong style={{ color: '#cf1322', fontSize: 16 }}>{formatCurrency(val, 'VND')}</Text>
        },
        {
            title: t('common.action'),
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    {userRole === 'ADMIN' && (
                        <>
                            <Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} onClick={() => handleEdit(record)} />
                            <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                                <Button type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col>
                        <Typography.Title level={3} style={{ margin: 0 }}>{t('declaration.title')}</Typography.Title>
                    </Col>
                    <Col>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button icon={<DownloadOutlined />} onClick={handleExport} style={{ backgroundColor: '#217346', color: '#fff', borderColor: '#217346' }}>
                                    {t('common.exportExcel')}
                                </Button>
                            </Space>
                        )}
                    </Col>
                </Row>

                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={12} lg={16}>
                            <Input
                                placeholder={t('declaration.searchPlaceholder')}
                                prefix={<SearchOutlined />}
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
                        </Col>
                        <Col xs={24} md={12} lg={8} style={{ textAlign: 'right' }}>
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
                scroll={{ x: 1200 }}
                size="middle"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
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
                }}
                onSuccess={handleModalSuccess}
                onViewProductCode={handleViewProductCode}
            />

            {pcModalVisible && (
                <ProductCodeModal
                    visible={pcModalVisible}
                    onClose={() => {
                        setPcModalVisible(false);
                        setSelectedPc(null);
                    }}
                    editingRecord={selectedPc}
                    viewOnly={true}
                    userType={userType}
                />
            )}
        </div>
    );
};

export default DeclarationPage;
