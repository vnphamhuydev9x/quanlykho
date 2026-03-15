import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Tag, Tooltip, message, Button, Input, Select, Row, Col, Space } from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import inquiryService from '../../services/inquiryService';
import InquiryModal from './InquiryModal';
import { INQUIRY_STATUS_OPTIONS, INQUIRY_STATUS, ROLES } from '../../constants/enums';

// CHUNG_TU không được thấy 2 status này (BE cũng block)
const CHUNG_TU_HIDDEN_STATUSES = [INQUIRY_STATUS.PENDING_REVIEW, INQUIRY_STATUS.QUESTION_REJECTED];

const { Title } = Typography;

const LANDING_PAGE_URL = import.meta.env.VITE_LANDING_PAGE_URL || '/consulting';

// Component hiển thị "thời gian chờ" real-time (không cần gọi API)
const WaitingTime = ({ createdAt, emailSentAt }) => {
    const { t } = useTranslation();
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const calcElapsed = () => {
            const start = dayjs(createdAt);
            const end = emailSentAt ? dayjs(emailSentAt) : dayjs();
            const diffMs = end.diff(start);
            const totalHours = Math.floor(diffMs / 3600000);
            if (totalHours >= 24) {
                const days = Math.floor(totalHours / 24);
                return t('inquiry.waitingTimeDays', { count: days });
            }
            const h = totalHours;
            const m = Math.floor((diffMs % 3600000) / 60000);
            const s = Math.floor((diffMs % 60000) / 1000);
            if (h > 0) return `${h}g ${m}p ${s}s`;
            if (m > 0) return `${m}p ${s}s`;
            return `${s}s`;
        };

        setElapsed(calcElapsed());

        if (!emailSentAt) {
            const timer = setInterval(() => setElapsed(calcElapsed()), 1000);
            return () => clearInterval(timer);
        }
    }, [createdAt, emailSentAt]);

    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>;
};

const getStatusOption = (status) =>
    INQUIRY_STATUS_OPTIONS.find(o => o.value === status) || { labelKey: 'inquiry.statusUnknown', color: 'default' };

const InquiryPage = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Lấy role từ JWT
    const token = localStorage.getItem('access_token');
    let userRole = '';
    if (token) {
        try {
            userRole = JSON.parse(atob(token.split('.')[1])).role || '';
        } catch (_) {}
    }
    const isChungTu = ROLES.CHUNG_TU === userRole;

    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({ search: '', status: undefined });

    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchData = useCallback(async (p, l, f) => {
        setLoading(true);
        try {
            const res = await inquiryService.getAll(p, l, {
                search: f.search || undefined,
                status: f.status !== undefined ? f.status : undefined,
            });
            if (res.code === 200) {
                setData(res.data.items);
                setTotal(res.data.total);
            }
        } catch (_) {
            message.error(t('common.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData(page, limit, filters);
    }, [page, limit]);

    // Auto-open modal khi có ?inquiryId= trong URL (từ notification click)
    useEffect(() => {
        const inquiryId = searchParams.get('inquiryId');
        if (!inquiryId) return;
        inquiryService.getById(Number(inquiryId))
            .then(res => {
                if (res.code === 200) {
                    setSelectedInquiry(res.data);
                    setModalVisible(true);
                }
            })
            .catch(() => {});
        setSearchParams({}, { replace: true });
    }, [searchParams]);

    const handleSearch = () => {
        setPage(1);
        fetchData(1, limit, filters);
    };

    const handleClearFilter = () => {
        const cleared = { search: '', status: undefined };
        setFilters(cleared);
        setPage(1);
        fetchData(1, limit, cleared);
    };

    const handleView = (record) => {
        setSelectedInquiry(record);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedInquiry(null);
    };

    const handleModalSuccess = () => {
        fetchData(page, limit, filters);
        handleModalClose();
    };

    const handleModalRefresh = () => {
        fetchData(page, limit, filters);
    };

    const columns = [
        {
            title: t('inquiry.id'),
            dataIndex: 'id',
            key: 'id',
            width: 70,
        },
        ...(!isChungTu ? [{
            title: t('inquiry.email'),
            dataIndex: 'email',
            key: 'email',
            width: 190,
            ellipsis: true,
        }] : []),
        {
            title: t('inquiry.productName'),
            dataIndex: 'productName',
            key: 'productName',
            width: 170,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.material'),
            dataIndex: 'material',
            key: 'material',
            width: 140,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.usage'),
            dataIndex: 'usage',
            key: 'usage',
            width: 160,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.size'),
            dataIndex: 'size',
            key: 'size',
            width: 150,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.brand'),
            dataIndex: 'brand',
            key: 'brand',
            width: 120,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.demand'),
            dataIndex: 'demand',
            key: 'demand',
            width: 130,
            ellipsis: true,
            render: (val) => val || <span style={{ color: '#bbb' }}>—</span>,
        },
        {
            title: t('inquiry.status'),
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status) => {
                const opt = getStatusOption(status);
                return <Tag color={opt.color}>{t(opt.labelKey)}</Tag>;
            },
        },
        {
            title: t('inquiry.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: (
                <Tooltip title={t('inquiry.waitingTimeTooltip')}>
                    {t('inquiry.waitingTime')}
                </Tooltip>
            ),
            key: 'waitingTime',
            width: 110,
            render: (_, record) => (
                <WaitingTime
                    createdAt={record.createdAt}
                    emailSentAt={record.status === 4 ? record.updatedAt : null}
                />
            ),
        },
        {
            title: t('common.action'),
            key: 'action',
            fixed: 'right',
            width: 70,
            render: (_, record) => (
                <Tooltip title={t('common.view')}>
                    <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); handleView(record); }} />
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Title level={4} style={{ margin: 0 }}>{t('inquiry.title')}</Title>
                <Tooltip title={t('menu.inquiryLandingPage')}>
                    <Button
                        type="link"
                        icon={<LinkOutlined />}
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() => window.open(LANDING_PAGE_URL, '_blank')}
                    >
                        {t('menu.inquiryLandingPage')}
                    </Button>
                </Tooltip>
            </div>

            <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={24} md={24} lg={24}>
                        <Input
                            placeholder={t('inquiry.searchPlaceholder')}
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            onPressEnter={handleSearch}
                            allowClear
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={8}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder={t('inquiry.filterAllStatus')}
                            value={filters.status}
                            onChange={val => setFilters(prev => ({ ...prev, status: val }))}
                            allowClear
                            size="large"
                            options={INQUIRY_STATUS_OPTIONS
                                .filter(o => !isChungTu || !CHUNG_TU_HIDDEN_STATUSES.includes(o.value))
                                .map(o => ({ value: o.value, label: t(o.labelKey) }))}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={16} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} size="large">
                                {t('common.search')}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleClearFilter} size="large">
                                {t('common.clear')}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={{
                    current: page,
                    pageSize: limit,
                    total,
                    pageSizeOptions: ['20', '30', '40', '50'],
                    showSizeChanger: true,
                    showTotal: (tot) => t('common.paginationTotal', { total: tot }),
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                    },
                }}
                onRow={(record) => ({ onClick: () => handleView(record), style: { cursor: 'pointer' } })}
            />

            <InquiryModal
                visible={modalVisible}
                inquiry={selectedInquiry}
                userRole={userRole}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                onRefresh={handleModalRefresh}
            />
        </div>
    );
};

export default InquiryPage;
