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
import merchandiseConditionService from '../../services/merchandiseConditionService';
import MerchandiseConditionModal from './MerchandiseConditionModal';
import moment from 'moment';

const { Option } = Select;

const MerchandiseConditionPage = () => {
    const { t } = useTranslation();
    const [conditions, setStatuses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        search: ''
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCondition, setEditingStatus] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);

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
        fetchStatuses();
    }, []);

    const fetchStatuses = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.search) params.search = currentFilters.search;

            const response = await merchandiseConditionService.getAll(params);
            if (response && response.data) {
                setStatuses(response.data.items);
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
        fetchStatuses(filters);
    };

    const handleClear = () => {
        const newFilters = { search: '' };
        setFilters(newFilters);
        fetchStatuses(newFilters);
    };

    const handleDelete = async (id) => {
        try {
            await merchandiseConditionService.delete(id);
            message.success(t('merchandiseCondition.deleteSuccess'));
            fetchStatuses(filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleCreateUpdate = async (values) => {
        try {
            if (editingCondition) {
                await merchandiseConditionService.update(editingCondition.id, values);
                message.success(t('merchandiseCondition.updateSuccess'));
            } else {
                await merchandiseConditionService.create(values);
                message.success(t('merchandiseCondition.createSuccess'));
            }
            setIsModalVisible(false);
            setEditingStatus(null);
            fetchStatuses(filters);
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
            title: t('merchandiseCondition.nameVi'),
            dataIndex: 'name_vi',
            key: 'name_vi',
            fixed: 'left',
            render: (text) => <b>{text}</b>
        },
        {
            title: t('merchandiseCondition.nameZh'),
            dataIndex: 'name_zh',
            key: 'name_zh',
            render: (text) => <b>{text}</b>
        },
        {
            title: t('merchandiseCondition.canLoadVehicle'),
            dataIndex: 'canLoadVehicle',
            key: 'canLoadVehicle',
            align: 'center',
            render: (canLoad) => canLoad ? <Tag color="blue">✓</Tag> : null
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
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setEditingStatus(record);
                            setIsViewOnly(true);
                            setIsModalVisible(true);
                        }}
                        title={t('common.view') || 'Xem chi tiết'}
                    />
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingStatus(record);
                            setIsViewOnly(false);
                            setIsModalVisible(true);
                        }}
                        disabled={userRole !== 'ADMIN'}
                        title={t('common.edit')}
                    />
                    {userRole === 'ADMIN' && record.name_vi !== 'Nhập kho' && (
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
                        <h2>{t('merchandiseCondition.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setEditingStatus(null);
                                        setIsViewOnly(false);
                                        setIsModalVisible(true);
                                    }}
                                >
                                    {t('merchandiseCondition.add')}
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
                                placeholder={t('merchandiseCondition.searchPlaceholder')}
                                prefix={<EyeOutlined />}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                onPressEnter={handleSearch}
                                allowClear
                                size="large"
                            />
                        </Col>
                        <Col xs={24} sm={24} md={24} lg={24} style={{ textAlign: 'right' }}>
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
                dataSource={conditions}
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

            <MerchandiseConditionModal
                visible={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingStatus(null);
                    setIsViewOnly(false);
                }}
                onSuccess={handleCreateUpdate}
                editingCondition={editingCondition}
                isViewOnly={isViewOnly}
            />
        </div>
    );
};

export default MerchandiseConditionPage;
