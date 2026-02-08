import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import transactionService from '../../services/transactionService';
import customerService from '../../services/customerService';

const { Option } = Select;
const { TextArea } = Input;

const TransactionModal = ({ visible, onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [fetchingCustomers, setFetchingCustomers] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchAllCustomers();
        }
    }, [visible]);

    const fetchAllCustomers = async () => {
        setFetchingCustomers(true);
        try {
            // Fetch all customers for local search (limit=0 means unlimited)
            const res = await customerService.getAll({
                page: 1,
                limit: 0,
                status: 'active'
            });
            setCustomers(res.data?.customers || []);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setFetchingCustomers(false);
        }
    };

    const handleOk = () => {
        form.validateFields().then(async (values) => {
            setLoading(true);
            try {
                const submitData = {
                    customerId: values.customer, // Value is just ID now
                    amount: values.amount,
                    content: values.content
                };
                await transactionService.create(submitData);
                form.resetFields();
                onSuccess();
            } catch (error) {
                console.error(error);
                if (error.response && error.response.data && error.response.data.message) {
                    message.error(error.response.data.message);
                } else {
                    message.error(t('error.UNKNOWN'));
                }
            } finally {
                setLoading(false);
            }
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    return (
        <Modal
            open={visible}
            title={t('transaction.add')}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
        >
            <Form
                form={form}
                layout="vertical"
                name="transactionForm"
            >
                <Form.Item
                    name="customer"
                    label={t('transaction.customer')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <Select
                        showSearch
                        placeholder={t('transaction.selectCustomer')}
                        style={{ width: '100%' }}
                        loading={fetchingCustomers}
                        filterOption={(input, option) => {
                            const label = option?.children ? option.children.toString() : '';
                            return label.toLowerCase().includes(input.toLowerCase());
                        }}
                    >
                        {customers.map(customer => (
                            <Option key={customer.id} value={customer.id}>
                                {`${customer.fullName} (${customer.username} - ${customer.phone || 'N/A'})`}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="amount"
                    label={t('transaction.amount')}
                    rules={[{ required: true, message: t('validation.required') }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        precision={2}
                        step={0.01}
                        formatter={value => {
                            if (value === null || value === undefined || value === '') return '';
                            const parts = value.toString().split('.');
                            const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            const decimalPart = parts[1] || '00';
                            return `${integerPart},${decimalPart}`;
                        }}
                        parser={value => value.replace(/\./g, '').replace(',', '.')}
                        addonAfter="VND"
                        min={0}
                    />
                </Form.Item>

                <Form.Item
                    name="content"
                    label={t('transaction.content')}
                >
                    <TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default TransactionModal;
