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
import categoryService from '../../services/categoryService';
import CategoryModal from './CategoryModal';
import moment from 'moment';
import { COMMON_STATUS, CATEGORY_STATUS_OPTIONS } from '../../constants/enums';

const { Option } = Select;

const CategoryPage = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        status: undefined
    });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

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
        fetchCategories();
    }, []);

    const fetchCategories = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.search) params.search = currentFilters.search;
            if (currentFilters.status) params.status = currentFilters.status;

            const response = await categoryService.getAll(params);
            if (response && response.data) {
                setCategories(response.data.items);
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
        fetchCategories(filters);
    };

    const handleClear = () => {
        const newFilters = { search: '', status: undefined };
        setFilters(newFilters);
        fetchCategories(newFilters);
    };

    const handleDelete = async (id) => {
        try {
            await categoryService.delete(id);
            message.success(t('category.deleteSuccess'));
            fetchCategories(filters);
        } catch (error) {
            message.error(error.response?.data?.message || t('error.UNKNOWN'));
        }
    };

    const handleCreateUpdate = async (values) => {
        try {
            if (editingCategory) {
                await categoryService.update(editingCategory.id, values);
                message.success(t('category.updateSuccess'));
            } else {
                await categoryService.create(values);
                message.success(t('category.createSuccess'));
            }
            setIsModalVisible(false);
            setEditingCategory(null);
            fetchCategories(filters);
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
            title: t('category.name'),
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            render: (text) => <b>{text}</b>
        },
        {
            title: t('category.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'AVAILABLE' ? 'green' : 'red';
                let text = status === 'AVAILABLE' ? t('category.available') : t('category.unavailable');
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
            fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingCategory(record);
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
                        <h2>{t('category.title')}</h2>
                    </Col>
                    <Col xs={24} md={24} lg={12} style={{ textAlign: 'right' }}>
                        {userRole === 'ADMIN' && (
                            <Space wrap>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setEditingCategory(null);
                                        setIsModalVisible(true);
                                    }}
                                >
                                    {t('category.add')}
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
                                placeholder={t('category.searchPlaceholder')}
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
                                {CATEGORY_STATUS_OPTIONS.map(opt => (
                                    <Option key={opt.value} value={opt.value}>{t(opt.labelKey)}</Option>
                                ))}
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
                dataSource={categories}
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

            <CategoryModal
                visible={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingCategory(null);
                }}
                onSuccess={handleCreateUpdate}
                editingCategory={editingCategory}
            />
        </div>
    );
};

export default CategoryPage;
