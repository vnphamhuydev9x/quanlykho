import React from 'react';
import { Form, Row, Col, Checkbox, Alert, Typography } from 'antd';
import CustomNumberInput from '../../components/CustomNumberInput';

const { Text } = Typography;

const formatVND = (v) => v != null ? `${new Intl.NumberFormat('de-DE').format(v)} ₫` : '—';

/**
 * DeliveryForm — bước cuối xác nhận xuất kho.
 * Có form instance riêng, tránh vấn đề disconnect khi dùng chung form ở parent.
 *
 * Props:
 *  - order        : đối tượng lệnh xuất kho
 *  - formRef      : callback nhận form instance (để parent gọi validateFields)
 */
const DeliveryForm = ({ order, formRef }) => {
    const [form] = Form.useForm();
    const deliveryCostWatch = Number(Form.useWatch('deliveryCost', form)) || 0;

    // Truyền form instance ra ngoài để parent dùng khi submit
    React.useEffect(() => {
        if (formRef) formRef(form);
        return () => { if (formRef) formRef(null); };
    }, [form, formRef]);

    if (!order) return null;

    const totalNK = (order.productCodes || []).reduce(
        (s, pc) => s + (Number(pc.totalImportCostToCustomer) || 0), 0
    );
    const total = totalNK + deliveryCostWatch;

    return (
        <Form form={form} layout="vertical">
            <Alert
                type="warning"
                showIcon
                message="Sau khi xác nhận, lệnh xuất kho sẽ chuyển sang trạng thái ĐÃ XUẤT KHO và không thể thay đổi."
                style={{ marginBottom: 16 }}
            />

            {/* Tóm tắt số tiền */}
            <div style={{ background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text type="secondary">Chi phí NK hàng hóa</Text>
                    <Text strong style={{ color: '#cf1322' }}>{formatVND(totalNK)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e8e8e8', paddingTop: 6, marginBottom: 6 }}>
                    <Text type="secondary">Phí ship</Text>
                    <Text strong style={{ color: '#1677ff' }}>{deliveryCostWatch > 0 ? formatVND(deliveryCostWatch) : '—'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff7e6', borderRadius: 6, padding: '8px 10px' }}>
                    <Text strong style={{ fontSize: 14 }}>Tổng tiền khách phải trả</Text>
                    <Text strong style={{ fontSize: 15, color: '#fa8c16' }}>{formatVND(total)}</Text>
                </div>
            </div>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="Phí ship (₫)" name="deliveryCost">
                        <CustomNumberInput
                            style={{ width: '100%' }}
                            min={0}
                            isInteger={true}
                            placeholder="Nhập phí ship (để trống nếu không có)"
                        />
                    </Form.Item>
                </Col>
                <Col span={12} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
                    <Form.Item name="paymentReceived" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Checkbox style={{ fontSize: 14, fontWeight: 600 }}>
                            Đã nhận tiền từ khách hàng
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            <Text type="secondary" style={{ fontSize: 12 }}>
                * Không tick = khách chưa thanh toán, sẽ được ghi nhận vào công nợ.
            </Text>
        </Form>
    );
};

export default DeliveryForm;
