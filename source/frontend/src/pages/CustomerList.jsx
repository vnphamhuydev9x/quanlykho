import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Option } = Select;

const CustomerList = () => {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]); // List of Sale employees
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [form] = Form.useForm();

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get('http://localhost:3000/api/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(response.data.data.customers);
        } catch (error) {
            console.error(error);
            message.error(t('error.UNKNOWN'));
        } finally {
            setLoading(false);
        }
    };

    // Fetch employees for the Sale selection
    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get('http://localhost:3000/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter only active employees if needed, or all.
            // Requirement said "selection box gọi danh sách các employeess"
            setEmployees(response.data.data);
        } catch (error) {
            console.error("Failed to fetch employees for selector", error);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchEmployees();
    }, []);

    const handleAdd = () => {
        setEditingCustomer(null);
        form.resetFields();
        // Default status active
        form.setFieldsValue({ status: true });
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingCustomer(record);
        form.setFieldsValue(record); // record already has isActive boolean
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`http://localhost:3000/api/customers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(t('customer.deleteSuccess'));
            fetchCustomers();
        } catch (error) {
            message.error(t('error.UNKNOWN'));
        }
    };

    const handleSave = async (values) => {
        try {
            const token = localStorage.getItem('access_token');
            if (editingCustomer) {
                await axios.put(`http://localhost:3000/api/customers/${editingCustomer.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success(t('customer.updateSuccess'));
            } else {
                await axios.post('http://localhost:3000/api/customers', values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success(t('customer.createSuccess'));
            }
            setIsModalVisible(false);
            fetchCustomers();
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.code) {
                message.error(t(`error.${error.response.data.code}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    const columns = [
        {
            title: t('profile.username'),
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: t('customer.fullName'),
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: t('customer.phone'),
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: t('customer.address'),
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: t('customer.sale'),
            dataIndex: 'saleId',
            key: 'saleId',
            render: (saleId) => {
                const emp = employees.find(e => e.id === saleId);
                return emp ? emp.fullName || emp.username : '-';
            }
        },
        {
            title: t('customer.status'),
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? t('customer.active') : t('customer.inactive')}
                </Tag>
            ),
        },
        {
            title: t('common.action'),
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{t('customer.title')}</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    {t('customer.add')}
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={customers}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={editingCustomer ? t('customer.edit') : t('customer.add')}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    {/* Customer Code is removed/hidden as we use Username now */}

                    <Form.Item
                        name="username"
                        label={t('profile.username')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input disabled={!!editingCustomer} />
                    </Form.Item>

                    {!editingCustomer && (
                        <Form.Item
                            name="password"
                            label={t('profile.newPassword')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="fullName"
                        label={t('customer.fullName')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item name="phone" label={t('customer.phone')}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="address" label={t('customer.address')}>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="saleId"
                        label={t('customer.sale')}
                    // rules={[{ required: true, message: t('validation.required') }]} 
                    // Is sale required? Schema says Int? (optional). 
                    >
                        <Select allowClear placeholder={t('customer.sale')}>
                            {employees.map(emp => (
                                <Option key={emp.id} value={emp.id}>
                                    {emp.fullName || emp.username} ({t(`roles.${emp.role}`)})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isActive"
                        label={t('customer.status')}
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren={t('customer.active')} unCheckedChildren={t('customer.inactive')} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            {t('common.save')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CustomerList;
