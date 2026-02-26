import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Popconfirm, message, Typography, Row, Col, Tooltip, Upload } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    UploadOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axios';
import ShortDeclarationModal from './ShortDeclarationModal';
import ShortDeclarationUploadModal from './ShortDeclarationUploadModal';
import DeclarationModal from '../declaration/DeclarationModal';

const { Title } = Typography;

const ShortDeclarationList = () => {
    const { t } = useTranslation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['20', '30', '40', '50']
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [declarationModalVisible, setDeclarationModalVisible] = useState(false);
    const [declarationInitialData, setDeclarationInitialData] = useState(null);
    const [currentItem, setCurrentItem] = useState(null);

    // Context for role checking
    const token = localStorage.getItem('access_token');
    let userRole = 'USER';
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
        } catch (e) { }
    }
    const isAdminOrSale = userRole === 'ADMIN' || userRole === 'SALE';

    const fetchData = async (page = pagination.current, pageSize = pagination.pageSize, search = searchText) => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/short-declarations', {
                params: { page, limit: pageSize, search }
            });
            setData(response.data.data.items);
            setPagination({
                ...pagination,
                current: page,
                pageSize: pageSize,
                total: response.data.data.total
            });
        } catch (error) {
            console.error("Fetch data error:", error);
            // Default interceptor will handle error messages
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTableChange = (newPagination) => {
        fetchData(newPagination.current, newPagination.pageSize);
    };

    const handleSearch = (value) => {
        setSearchText(value);
        fetchData(1, pagination.pageSize, value);
    };

    const handleClearSearch = () => {
        setSearchText('');
        fetchData(1, pagination.pageSize, '');
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/short-declarations/${id}`);
            message.success(t('shortDeclaration.deleteSuccess'));
            fetchData();
        } catch (error) {
            // Error managed by interceptor
        }
    };

    // Upload logic di chuyển sang ShortDeclarationUploadModal

    const columns = [
        {
            title: t('common.id'),
            dataIndex: 'id',
            key: 'id',
            width: 80,
            fixed: 'left',
        },
        {
            title: t('shortDeclaration.productName'),
            dataIndex: 'productName',
            key: 'productName',
            width: 250,
            fixed: 'left',
            render: text => <div style={{ whiteSpace: 'pre-line' }}>{text}</div>
        },
        {
            title: t('shortDeclaration.hsCode'),
            dataIndex: 'hsCode',
            key: 'hsCode',
            width: 150,
        },
        {
            title: t('shortDeclaration.origin'),
            dataIndex: 'origin',
            key: 'origin',
            width: 150,
        },
        {
            title: t('shortDeclaration.unit1'),
            dataIndex: 'unit1',
            key: 'unit1',
            width: 120,
        },
        {
            title: t('shortDeclaration.unit2'),
            dataIndex: 'unit2',
            key: 'unit2',
            width: 150,
        },
        {
            title: t('shortDeclaration.importTaxCode'),
            dataIndex: 'importTaxCode',
            key: 'importTaxCode',
            width: 150,
        },
        {
            title: t('shortDeclaration.importTaxRate'),
            dataIndex: 'importTaxRate',
            key: 'importTaxRate',
            width: 120,
            align: 'right',
            render: val => val !== null && val !== undefined ? `${val}%` : ''
        },
        {
            title: t('shortDeclaration.vatTaxCode'),
            dataIndex: 'vatTaxCode',
            key: 'vatTaxCode',
            width: 150,
        },
        {
            title: t('shortDeclaration.vatTaxRate'),
            dataIndex: 'vatTaxRate',
            key: 'vatTaxRate',
            width: 150,
            align: 'right',
            render: val => val !== null && val !== undefined ? `${val}%` : ''
        },
        {
            title: t('common.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (text) => new Date(text).toLocaleDateString()
        }
    ];

    if (isAdminOrSale) {
        columns.push({
            title: t('common.action'),
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Tạo khai báo">
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setDeclarationInitialData({
                                    declarationName: record.productName || undefined,
                                    hsCode: record.hsCode || undefined,
                                    unit: record.unit1 || undefined,
                                    importTaxPercent: record.importTaxRate !== null ? Number(record.importTaxRate) : undefined,
                                    vatPercent: record.vatTaxRate !== null ? Number(record.vatTaxRate) : undefined,
                                });
                                setDeclarationModalVisible(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={t('common.edit')}>
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => {
                                setCurrentItem(record);
                                setModalVisible(true);
                            }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={t('common.confirmDelete')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={t('common.yes')}
                        cancelText={t('common.no')}
                    >
                        <Tooltip title={t('common.delete')}>
                            <Button danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        });
    }

    return (
        <Card bordered={false}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={4} style={{ margin: 0 }}>{t('shortDeclaration.title')}</Title>
                </Col>
                {isAdminOrSale && (
                    <Col>
                        <Space>
                            <Button
                                type="default"
                                icon={<UploadOutlined />}
                                onClick={() => setUploadModalVisible(true)}
                                style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}
                            >
                                {t('shortDeclaration.uploadExcel')}
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setCurrentItem(null);
                                    setModalVisible(true);
                                }}
                            >
                                {t('shortDeclaration.add')}
                            </Button>
                        </Space>
                    </Col>
                )}
            </Row>

            <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={24} md={24} lg={14}>
                        <Input
                            placeholder={t('shortDeclaration.searchPlaceholder') || "Tìm kiếm mã hàng hóa..."}
                            prefix={<SearchOutlined />}
                            allowClear
                            onPressEnter={(e) => handleSearch(e.target.value)}
                            onChange={(e) => setSearchText(e.target.value)}
                            value={searchText}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={24} md={24} lg={10} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => handleSearch(searchText)} size="large">
                                {t('common.search')}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleClearSearch} size="large">
                                {t('common.clear')}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                pagination={{
                    ...pagination,
                    showTotal: (total, range) => t('common.pagination_range', { range0: range[0], range1: range[1], total })
                }}
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                size="middle"
            />

            <ShortDeclarationModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onSuccess={() => {
                    setModalVisible(false);
                    fetchData(1);
                }}
                currentItem={currentItem}
            />
            <ShortDeclarationUploadModal
                visible={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                onSuccess={() => {
                    setUploadModalVisible(false);
                    fetchData(1);
                }}
            />
            <DeclarationModal
                visible={declarationModalVisible}
                initialData={declarationInitialData}
                onCancel={() => setDeclarationModalVisible(false)}
                onSuccess={() => {
                    setDeclarationModalVisible(false);
                }}
            />
        </Card>
    );
};

export default ShortDeclarationList;
