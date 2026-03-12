import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import debtService from '../../services/debtService';
import { formatCurrency } from '../../utils/format';

const DebtPeriodModal = ({ visible, customerId, customerName, years, currentYear, openingBalance, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                year: currentYear,
                openingBalance: openingBalance || 0,
            });
        }
    }, [visible, currentYear, openingBalance, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await debtService.upsertOpeningBalance(customerId, {
                year: values.year,
                openingBalance: values.openingBalance,
            });
            message.success(t('debt.saveSuccess'));
            onSuccess();
            onClose();
        } catch (err) {
            if (err?.errorFields) return; // validation error
            message.error(t('debt.saveError'));
        }
    };

    return (
        <Modal
            title={`${t('debt.editOpeningBalance')} — ${customerName}`}
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            okText={t('debt.saveOpeningBalance')}
            cancelText={t('common.cancel')}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="year" label={t('debt.year')} rules={[{ required: true }]}>
                    <Select options={(years || []).map(y => ({ value: y, label: y }))} />
                </Form.Item>
                <Form.Item name="openingBalance" label={t('debt.openingBalance')} rules={[{ required: true }]}>
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        parser={v => v.replace(/\./g, '')}
                        addonAfter="VND"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DebtPeriodModal;
