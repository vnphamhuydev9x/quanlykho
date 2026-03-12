import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Select, Typography, Space, Spin, Tooltip, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import debtService from '../../services/debtService';
import { formatCurrency } from '../../utils/format';

const { Title, Text } = Typography;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Ô tháng:
 * - Không có hoạt động → trống (—)
 * - Có phát sinh nợ → Tag đỏ
 * - Có nạp tiền → Tag xanh
 * Không hiển thị running balance tại đây — chỉ thể hiện ở cột "Tổng nợ còn lại"
 */
const MonthCell = ({ month }) => {
    if (!month) return <Text type="secondary">—</Text>;
    const { incurred, paid } = month;
    if (incurred === 0 && paid === 0) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {incurred > 0 && (
                <Tag color="red" style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>
                    Nợ: {formatCurrency(incurred)}
                </Tag>
            )}
            {paid > 0 && (
                <Tag color="green" style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>
                    Nạp: {formatCurrency(paid)}
                </Tag>
            )}
        </div>
    );
};

const DebtPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchYears = useCallback(async () => {
        try {
            const res = await debtService.getYears();
            const list = res.data || [];
            const currentYear = new Date().getFullYear();
            if (!list.includes(currentYear)) list.unshift(currentYear);
            setYears(list);
        } catch (_) {}
    }, []);

    const fetchSummary = useCallback(async (year) => {
        setLoading(true);
        try {
            const res = await debtService.getSummary(year);
            setRows(res.data || []);
        } catch (_) {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchYears(); }, [fetchYears]);
    useEffect(() => { fetchSummary(selectedYear); }, [fetchSummary, selectedYear]);

    const columns = [
        {
            title: t('debt.customer'),
            key: 'customer',
            fixed: 'left',
            width: 180,
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{row.customer?.fullName}</Text>
                    {row.customer?.customerCode && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{row.customer.customerCode}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: t('debt.openingBalance'),
            key: 'openingBalance',
            width: 150,
            align: 'right',
            render: (_, row) => (
                <Text>{formatCurrency(row.openingBalance || 0)}</Text>
            ),
        },
        ...MONTHS.map(m => ({
            title: `T${m}`,
            key: `month_${m}`,
            width: 120,
            align: 'center',
            render: (_, row) => <MonthCell month={row.months?.[m - 1]} />,
        })),
        {
            title: t('debt.totalRemaining'),
            key: 'totalRunningBalance',
            fixed: 'right',
            width: 160,
            align: 'right',
            render: (_, row) => (
                <Text strong style={{ color: row.totalRunningBalance > 0 ? '#cf1322' : '#389e0d' }}>
                    {formatCurrency(row.totalRunningBalance || 0)}
                </Text>
            ),
        },
        {
            title: '',
            key: 'action',
            fixed: 'right',
            width: 50,
            render: (_, row) => (
                <Tooltip title={t('common.viewDetail')}>
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/bao-cao/cong-no/${row.customer?.id}?year=${selectedYear}`)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div style={{ padding: '16px 24px' }}>
            <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Title level={4} style={{ margin: 0 }}>{t('debt.title')}</Title>
                <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={years.map(y => ({ value: y, label: y }))}
                    style={{ width: 100 }}
                />
            </Space>

            <Spin spinning={loading}>
                <Card>
                    <Table
                        dataSource={rows}
                        columns={columns}
                        rowKey={r => r.customer?.id}
                        pagination={false}
                        scroll={{ x: 2000 }}
                        size="small"
                        locale={{ emptyText: t('debt.noDebt') }}
                    />
                </Card>
            </Spin>
        </div>
    );
};

export default DebtPage;
