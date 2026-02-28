import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Card, Row, Col, Typography, Modal, message, Tag, DatePicker, Form } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import manifestService from '../../services/manifestService';

const { Title } = Typography;

const ManifestListPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

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
            const response = await manifestService.getAll(params);
            if (response) {
                setData(response.items || []);
                setPagination(prev => ({ ...prev, total: response.total || 0 }));
            }
        } catch (error) {
            message.error('Lỗi khi tải danh sách chuyến xe');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    const handleAdd = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ date: moment() });
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            name: record.name,
            date: moment(record.date),
            note: record.note,
            status: record.status
        });
        setIsModalVisible(true);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa chuyến xe này? Các kiện hàng trong chuyến sẽ được trả về trạng thái Chờ xếp xe.',
            onOk: async () => {
                try {
                    await manifestService.delete(id);
                    message.success('Xóa thành công');
                    fetchData();
                } catch (error) {
                    message.error('Lỗi khi xóa');
                }
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const submitData = {
                ...values,
                date: values.date.toISOString()
            };

            if (editingId) {
                await manifestService.update(editingId, submitData);
                message.success('Cập nhật thành công');
            } else {
                await manifestService.create(submitData);
                message.success('Tạo mới thành công');
            }
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60, fixed: 'left' },
        { title: 'Tên chuyến', dataIndex: 'name', width: 200 },
        {
            title: 'Ngày xếp',
            dataIndex: 'date',
            width: 120,
            render: (d) => d ? moment(d).format('DD/MM/YYYY') : ''
        },
        {
            title: 'Số kiện hàng',
            dataIndex: '_count',
            width: 120,
            render: (count) => count?.productCodes || 0
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (status) => {
                let color = 'default';
                if (status === 'OPEN') color = 'green';
                if (status === 'CLOSED') color = 'blue';
                if (status === 'SHIPPED') color = 'orange';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        { title: 'Ghi chú', dataIndex: 'note' },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button type="primary" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/manifests/${record.id}`)}>
                        Chi tiết
                    </Button>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={3}>Quản lý Xếp xe</Title>
                </Col>
                <Col>
                    <Space>
                        <Input.Search
                            placeholder="Tìm kiếm chuyến xe..."
                            onSearch={(val) => { setSearchText(val); setPagination(prev => ({ ...prev, current: 1 })); }}
                            style={{ width: 250 }}
                            allowClear
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            Tạo chuyến mới
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} />
                    </Space>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={pagination}
                onChange={handleTableChange}
                bordered
            />

            <Modal
                title={editingId ? "Sửa thông tin chuyến xe" : "Tạo chuyến xe mới"}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên chuyến (VD: Chuyến HN 02/02)" rules={[{ required: true, message: 'Vui lòng nhập tên chuyến' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="date" label="Ngày xếp xe" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ManifestListPage;
