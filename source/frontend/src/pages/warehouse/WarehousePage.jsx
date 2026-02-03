import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Tag, Popconfirm, message, Typography, Row, Col } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import warehouseService from '../../services/warehouseService';
import WarehouseModal from './WarehouseModal';
import moment from 'moment';

const { Option } = Select;
const { Title } = Typography;

const WarehousePage = () => {
    const { t } = useTranslation();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        status: undefined
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);

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
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.search) params.search = currentFilters.search;
            if (currentFilters.status) params.status = currentFilters.status;

            const response = await warehouseService.getAll(params);
            if (response && response.data) {
                setWarehouses(response.data);
            }
        } catch (error) {
            console.error(error);
            message.error(t('error.UNKNOWN'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        fetchWarehouses(filters);
    };

    const handleClear = () => {
        const newFilters = { search: '', status: undefined };
        setFilters(newFilters);
        fetchWarehouses(newFilters);
    };

    const handleDelete = async (id) => {
        try {
            await warehouseService.delete(id);
            message.success(t('warehouse.deleteSuccess'));
            fetchWarehouses(filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleCreateUpdate = async (values) => {
        try {
            if (editingWarehouse) {
                await warehouseService.update(editingWarehouse.id, values);
                message.success(t('warehouse.updateSuccess'));
            } else {
                await warehouseService.create(values);
                message.success(t('warehouse.createSuccess'));
            }
            setIsModalVisible(false);
            setEditingWarehouse(null);
            fetchWarehouses(filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const columns = [
        {
            title: t('common.id'),
            dataIndex: 'id',
            key: 'id',
            width: 80,
            fixed: 'left',
        },
        {
            title: t('warehouse.name'),
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            render: (text) => <b>{text}</b>
        },
        {
            title: t('warehouse.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'AVAILABLE' ? 'green' : 'red';
                let text = status === 'AVAILABLE' ? t('warehouse.available') : t('warehouse.unavailable');
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: t('common.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => moment(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: t('common.action'),
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingWarehouse(record);
                            setIsModalVisible(true);
                        }}
                        disabled={userRole !== 'ADMIN'}
                        title={t('common.edit')}
                    />
                    {userRole === 'ADMIN' && (
                        <Popconfirm
                            title={t('common.confirmDelete')}
                            onConfirm={() => handleDelete(record.id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button danger icon={<DeleteOutlined />} title={t('common.delete')} />
                        </Popconfirm>
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
                        <h2>{t('warehouse.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setEditingWarehouse(null);
                                        setIsModalVisible(true);
                                    }}
                                >
                                    {t('warehouse.add')}
                                </Button>
                            </Space>
                        )}
                    </Col>
                </Row>

                {/* Advanced Filter Bar */}
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={24} lg={24}>
                            <Input
                                placeholder={t('warehouse.searchPlaceholder')}
                                prefix={<EyeOutlined />}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('common.filterByStatus')}
                                value={filters.status}
                                onChange={(value) => handleFilterChange('status', value)}
                                allowClear
                                size="large"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Option value="AVAILABLE">{t('warehouse.available')}</Option>
                                <Option value="UNAVAILABLE">{t('warehouse.unavailable')}</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={24} md={24} lg={16} style={{ textAlign: 'right' }}>
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
                dataSource={warehouses}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                size="small"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '30'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                }}
            />

            <WarehouseModal
                visible={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingWarehouse(null);
                }}
                onSuccess={handleCreateUpdate}
                editingWarehouse={editingWarehouse}
            />
        </div>
    );
};

export default WarehousePage;
