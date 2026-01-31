import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Option } = Select;

const EmployeeList = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [form] = Form.useForm();

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get('http://localhost:3000/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(response.data.data);
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleAdd = () => {
        setEditingEmployee(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingEmployee(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`http://localhost:3000/api/employees/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(t('employee.deleteSuccess'));
            fetchEmployees();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
            } else {
                message.error(t('error.UNKNOWN'));
            }
        }
    };

    const handleSave = async (values) => {
        try {
            const token = localStorage.getItem('access_token');
            if (editingEmployee) {
                await axios.put(`http://localhost:3000/api/employees/${editingEmployee.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success(t('employee.updateSuccess'));
            } else {
                await axios.post('http://localhost:3000/api/employees', values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success(t('employee.createSuccess'));
            }
            setIsModalVisible(false);
            fetchEmployees();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.code) {
                const errorCode = error.response.data.code;
                message.error(t(`error.${errorCode}`));
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
            title: t('profile.fullName'),
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: t('profile.role'),
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color="blue">{t(`roles.${role}`)}</Tag>,
        },
        {
            title: t('profile.email'),
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: t('employee.status'),
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? t('employee.active') : t('employee.inactive')}
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
                <h2>{t('menu.employees')}</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    {t('employee.add')}
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={employees}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={editingEmployee ? t('employee.edit') : t('employee.add')}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="username"
                        label={t('profile.username')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input disabled={!!editingEmployee} />
                    </Form.Item>

                    {!editingEmployee && (
                        <Form.Item
                            name="password"
                            label={t('profile.newPassword')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}

                    <Form.Item name="fullName" label={t('profile.fullName')}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="email" label={t('profile.email')}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="phone" label={t('profile.phone')}>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label={t('profile.role')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Select>
                            <Option value="ADMIN">ADMIN</Option>
                            <Option value="SALE">SALE</Option>
                            <Option value="KHO_TQ">KHO_TQ</Option>
                            <Option value="KE_TOAN">KE_TOAN</Option>
                            <Option value="DIEU_VAN">DIEU_VAN</Option>
                            <Option value="KHO_VN">KHO_VN</Option>
                            <Option value="CHUNG_TU">CHUNG_TU</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isActive"
                        label={t('employee.status')}
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren={t('employee.active')} unCheckedChildren={t('employee.inactive')} />
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

export default EmployeeList;
