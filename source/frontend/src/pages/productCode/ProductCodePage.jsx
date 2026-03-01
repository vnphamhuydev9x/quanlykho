import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, message, Popconfirm, Row, Col, Card, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import productCodeService from '../../services/productCodeService';
import ProductCodeModal from './ProductCodeModal';
import { formatCurrency } from '../../utils/format';

const ProductCodePage = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
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
        const queryParams = new URLSearchParams(location.search);
        const searchId = queryParams.get('id');
        if (searchId) {
            fetchData(1, pagination.pageSize, searchId);
        } else {
            fetchData();
        }
    }, [pagination.current, pagination.pageSize, searchText, location.search]);

    const fetchData = async (p = pagination.current, l = pagination.pageSize, s = searchText) => {
        setLoading(true);
        try {
            const response = await productCodeService.getAll(
                p,
                l,
                s
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

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchId = queryParams.get('id');
        if (searchId && data.length > 0) {
            const found = data.find(d => d.id === parseInt(searchId));
            if (found) {
                handleView(found);
            }
        }
    }, [data, location.search]);

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
        setViewOnly(false);
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
            align: 'center'
        },
        {
            title: 'Ngày Nhập Kho',
            dataIndex: 'entryDate',
            key: 'entryDate',
            width: 130,
            render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 180,
            render: (_, r) => r.customer ? `${r.customer.customerCode || r.customer.username} - ${r.customer.fullName}` : '-'
        },
        {
            title: 'Nhân viên (Sale)',
            key: 'employee',
            width: 150,
            render: (_, r) => r.employee ? `${r.employee.username} - ${r.employee.fullName}` : '-'
        },
        {
            title: 'Mã đơn hàng',
            dataIndex: 'orderCode',
            key: 'orderCode',
            width: 150,
            ellipsis: true
        },
        {
            title: 'Tổng trọng lượng',
            dataIndex: 'totalWeight',
            key: 'totalWeight',
            width: 150,
            align: 'right',
            render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} kg` : '0 kg'
        },
        {
            title: 'Tổng khối lượng',
            dataIndex: 'totalVolume',
            key: 'totalVolume',
            width: 150,
            align: 'right',
            render: val => val ? `${new Intl.NumberFormat('de-DE').format(val)} m³` : '0 m³'
        },
        {
            title: 'Tình trạng hàng hóa',
            key: 'merchandiseCondition',
            width: 170,
            render: (_, record) => record.merchandiseCondition?.name_vi || '-'
        },
        {
            title: 'Nguồn cung cấp thông tin (Kg/m³)',
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
            title: 'Tổng cước TQ_HN tạm tính',
            dataIndex: 'totalTransportFeeEstimate',
            key: 'totalTransportFeeEstimate',
            width: 220,
            align: 'right',
            render: (val) => (
                <span style={{ color: '#389e0d', fontWeight: 'bold' }}>
                    {formatCurrency(val, 'VND')}
                </span>
            )
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

                    <Tooltip title="Sửa">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>

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
                        <h2 style={{ margin: 0 }}>Quản lý Mã hàng</h2>
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
