import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Button, Typography, Space, Tag, Spin, Select, Statistic, Row, Col, Tooltip } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import debtService from '../../services/debtService';
import DebtPeriodModal from './DebtPeriodModal';
import { formatCurrency } from '../../utils/format';
import moment from 'moment';

const { Title, Text } = Typography;

const DebtDetailPage = () => {
    const { t } = useTranslation();
    const { customerId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(parseInt(searchParams.get('year')) || new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchYears = useCallback(async () => {
        try {
            const res = await debtService.getYears();
            const list = res.data || [];
            if (!list.includes(new Date().getFullYear())) list.unshift(new Date().getFullYear());
            setYears(list);
        } catch (_) {}
    }, []);

    const fetchDetail = useCallback(async (year) => {
        setLoading(true);
        try {
            const res = await debtService.getCustomerDetail(customerId, year);
            setData(res.data);
        } catch (_) {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => { fetchYears(); }, [fetchYears]);
    useEffect(() => { fetchDetail(selectedYear); }, [fetchDetail, selectedYear]);

    const handleYearChange = (year) => {
        setSelectedYear(year);
        setSearchParams({ year });
    };

    const productCodeColumns = [
        { title: t('debt.orderCode'), dataIndex: 'orderCode', key: 'orderCode', width: 180 },
        {
            title: t('debt.productName'), key: 'productNames',
            render: (_, row) => (row.items || []).map(i => i.productName).filter(Boolean).join(', ') || '—',
        },
        {
            title: t('debt.importCost'), dataIndex: 'totalImportCostToCustomer', key: 'totalImportCostToCustomer',
            render: v => <Text strong>{formatCurrency(v || 0)}</Text>, width: 160, align: 'right',
        },
    ];

    const debtOrderColumns = [
        { title: t('debt.exportOrderId'), dataIndex: 'id', key: 'id', render: id => `#${id}`, width: 100 },
        {
            title: t('common.createdAt'), dataIndex: 'createdAt', key: 'createdAt',
            render: v => moment(v).format('DD/MM/YYYY HH:mm'), width: 160,
        },
        {
            title: t('debt.importCost'), key: 'importCost', width: 160, align: 'right',
            render: (_, row) => {
                const cost = row.productCodes?.reduce((s, pc) => s + Number(pc.totalImportCostToCustomer || 0), 0) || 0;
                return formatCurrency(cost);
            },
        },
        {
            title: t('debt.shippingCost'), dataIndex: 'deliveryCost', key: 'deliveryCost',
            render: v => formatCurrency(v || 0), width: 140, align: 'right',
        },
        {
            title: t('debt.totalOwed'), dataIndex: 'totalOwed', key: 'totalOwed',
            render: v => <Text strong style={{ color: '#cf1322' }}>{formatCurrency(v || 0)}</Text>,
            width: 160, align: 'right',
        },
    ];

    const expandedRowRender = (row) => (
        <Table
            dataSource={row.productCodes || []}
            columns={productCodeColumns}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ margin: '4px 0' }}
            locale={{ emptyText: t('debt.noProductCodes') }}
        />
    );

    const paymentColumns = [
        {
            title: t('debt.paymentDate'), dataIndex: 'createdAt', key: 'createdAt',
            render: v => moment(v).format('DD/MM/YYYY HH:mm'), width: 160,
        },
        {
            title: t('debt.amount'), dataIndex: 'amount', key: 'amount',
            render: v => <Text strong style={{ color: '#389e0d' }}>{formatCurrency(v)}</Text>,
            width: 160,
        },
        { title: t('debt.content'), dataIndex: 'content', key: 'content', ellipsis: true },
        {
            title: t('debt.createdBy'), dataIndex: 'creator', key: 'creator',
            render: c => c?.fullName || '—', width: 140,
        },
    ];

    const totalRemaining = data?.totalRunningBalance ?? 0;

    return (
        <div style={{ padding: '16px 24px' }}>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bao-cao/cong-no')}>
                    {t('common.prev')}
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                    {t('debt.title')} — {data?.customer?.fullName || `#${customerId}`}
                    {data?.customer?.customerCode && <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>({data.customer.customerCode})</Text>}
                </Title>
            </Space>

            <Card
                style={{ marginBottom: 16 }}
                extra={
                    <Space>
                        <Select
                            value={selectedYear}
                            onChange={handleYearChange}
                            options={years.map(y => ({ value: y, label: y }))}
                            style={{ width: 100 }}
                        />
                        <Button icon={<EditOutlined />} onClick={() => setModalVisible(true)}>
                            {t('debt.editOpeningBalance')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<CreditCardOutlined />}
                            onClick={() => navigate(`/transactions?customerId=${customerId}`)}
                        >
                            {t('debt.addPayment')}
                        </Button>
                    </Space>
                }
            >
                <Row gutter={24}>
                    <Col>
                        <Statistic
                            title={t('debt.openingBalance')}
                            value={data?.openingBalance || 0}
                            formatter={v => formatCurrency(v)}
                        />
                    </Col>
                    <Col>
                        <Statistic
                            title={t('debt.totalRemaining')}
                            value={totalRemaining}
                            formatter={v => formatCurrency(v)}
                            valueStyle={{ color: totalRemaining > 0 ? '#cf1322' : '#389e0d' }}
                        />
                    </Col>
                </Row>
            </Card>

            <Spin spinning={loading}>
                <Card title={t('debt.debtOrders')} style={{ marginBottom: 16 }}>
                    <Table
                        dataSource={data?.debtOrders || []}
                        columns={debtOrderColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: t('debt.noDebt') }}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: row => (row.productCodes?.length || 0) > 0,
                        }}
                    />
                </Card>

                <Card title={t('debt.paymentHistory')}>
                    <Table
                        dataSource={data?.payments || []}
                        columns={paymentColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </Card>
            </Spin>

            <DebtPeriodModal
                visible={modalVisible}
                customerId={parseInt(customerId)}
                customerName={data?.customer?.fullName || ''}
                years={years}
                currentYear={selectedYear}
                openingBalance={data?.openingBalance}
                onClose={() => setModalVisible(false)}
                onSuccess={() => fetchDetail(selectedYear)}
            />
        </div>
    );
};

export default DebtDetailPage;
