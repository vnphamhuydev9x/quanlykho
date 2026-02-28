import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Row, Col, Card, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import productCodeService from '../../services/productCodeService';
import ProductCodeModal from './ProductCodeModal';

const ProductCodePage = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [userType, setUserType] = useState('USER');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserType(payload.type);
            } catch (e) {
                console.error("Invalid token");
            }
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.current, pagination.pageSize, searchText]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await productCodeService.getAll(
                pagination.current,
                pagination.pageSize,
                searchText
            );
            setData(response.data.items);
            setPagination(prev => ({
                ...prev,
                total: response.data.total
            }));
        } catch (error) {
            message.error(t('common.loadError', 'Lỗi khi tải dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(prev => ({
            ...prev,
            current: newPagination.current,
            pageSize: newPagination.pageSize
        }));
    };

    const handleSearch = (value) => {
        setSearchText(value);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleView = (record) => {
        setEditingRecord(record);
        setViewOnly(true);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setViewOnly(false);
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingRecord(null);
        setViewOnly(false);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await productCodeService.delete(id);
            message.success(t('common.deleteSuccess', 'Xóa thành công'));
            fetchData();
        } catch (error) {
            message.error(t('common.deleteError', 'Lỗi khi xóa'));
        }
    };

    const handleModalClose = (shouldRefresh) => {
        setModalVisible(false);
        setEditingRecord(null);
        if (shouldRefresh) {
            fetchData();
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
            fixed: 'left',
            align: 'center',
            sorter: (a, b) => a.id - b.id,
        },
        {
            title: 'Ngày nhập kho',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 120,
            render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 150,
            render: (_, r) => r.customer ? `${r.customer.customerCode || r.customer.username} - ${r.customer.fullName}` : '-'
        },
        {
            title: 'Mã đơn hàng',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150,
            ellipsis: true
        },
        {
            title: 'Tổng Trọng lượng (kg)',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 150,
            align: 'right',
            render: val => val ? new Intl.NumberFormat('de-DE').format(val) : '0'
        },
        {
            title: 'Tổng Khối lượng (m³)',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 150,
            align: 'right',
            render: val => val ? new Intl.NumberFormat('de-DE').format(val) : '0'
        },
        {
            title: 'Phí nội địa (RMB)',
            dataIndex: 'domesticFeeRMB',
            key: 'domesticFeeRMB',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val) : '0'
        },
        {
            title: 'Phí dỡ hàng (RMB)',
            dataIndex: 'unloadingFeeRMB',
            key: 'unloadingFeeRMB',
            width: 150,
            align: 'right',
            render: (val) => val ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val) : '0'
        },
        {
            title: 'Nguồn cung cấp thông tin',
            dataIndex: 'infoSource',
            key: 'infoSource',
            width: 180,
            ellipsis: true
        },
        {
            title: 'Tỷ giá',
            dataIndex: 'exchangeRate',
            key: 'exchangeRate',
            width: 100,
            align: 'right',
            render: val => val ? new Intl.NumberFormat('de-DE').format(val) : '0'
        },
        {
            title: 'Tổng TQ_HN tạm tính',
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 180,
            align: 'right',
            render: (val) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{val ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) : '0 ₫'}</span>
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Xem">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    </Tooltip>
                    {!viewOnly && (
                        <Tooltip title="Sửa">
                            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        </Tooltip>
                    )}
                    {userType !== 'CUSTOMER' && (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xoá ?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Có"
                            cancelText="Không"
                        >
                            <Tooltip title="Xoá">
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];


    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <h2 style={{ margin: 0 }}>Quản lý Mã hàng (Lô)</h2>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            {userType !== 'CUSTOMER' && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    Thêm Mã hàng
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
                <Card size="small" style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={24}>
                            <Input.Search
                                placeholder="Tìm kiếm theo mã đơn hàng, ID..."
                                allowClear
                                onSearch={handleSearch}
                                style={{ width: '100%' }}
                                prefix={<SearchOutlined />}
                                size="large"
                            />
                        </Col>
                    </Row>
                </Card>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} dòng`,
                    pageSizeOptions: ['20', '30', '40', '50']
                }}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
            />

            {modalVisible && (
                <ProductCodeModal
                    visible={modalVisible}
                    onClose={handleModalClose}
                    editingRecord={editingRecord}
                    viewOnly={viewOnly}
                    userType={userType}
                />
            )}
        </div>
    );
};

export default ProductCodePage;
