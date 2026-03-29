/**
 * @module notification
 * @SD_Ref 03_1_notification_SD.md
 * @SD_Version SD-v1.0.1
 */
import React, { useState, useEffect, useCallback } from 'react';
import { List, Card, Typography, Button, Tag, Spin, Empty, Space, Divider } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import notificationService from '../../services/notificationService';
import { NOTIFICATION_TYPE } from '../../constants/enums';

const { Title, Text } = Typography;

const LIMIT = 20;

const parseNotifContent = (content, t) => {
    try {
        const parsed = JSON.parse(content);
        return parsed.key ? t(parsed.key, parsed.params) : content;
    } catch {
        return content;
    }
};

const getDateLabel = (dateStr, t) => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (dateStr === today) return t('common.today');
    if (dateStr === yesterday) return t('common.yesterday');
    return dayjs(dateStr).format('DD/MM/YYYY');
};

// Gộp items theo ngày, trả về [{label, items}]
const groupByDate = (items, t) => {
    const groups = {};
    items.forEach(item => {
        const date = dayjs(item.createdAt).format('YYYY-MM-DD');
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
    });
    return Object.entries(groups)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, groupItems]) => ({ label: getDateLabel(date, t), items: groupItems }));
};

const NotificationPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);

    const fetchMore = useCallback(async (nextPage) => {
        setLoading(true);
        try {
            const res = await notificationService.getList(nextPage, LIMIT);
            if (res.code === 200) {
                setItems(prev => nextPage === 1 ? res.data.items : [...prev, ...res.data.items]);
                setTotal(res.data.total);
                setPage(nextPage);
            }
        } catch (_) {
        } finally {
            setLoading(false);
            setInitialLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchMore(1);
    }, []);

    const handleItemClick = (item) => {
        // Nếu chưa đọc → chỉ đánh dấu đúng notification này là đã đọc (SD §3.6)
        if (!item.isRead) {
            notificationService.markOneAsRead(item.id).catch(() => {});
            setItems(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
        }
        if (NOTIFICATION_TYPE.INQUIRY === item.type && item.refId) {
            navigate(`/admin/customer-inquiry?inquiryId=${item.refId}`);
        }
    };

    const hasMore = items.length < total;
    const groups = groupByDate(items, t);

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>{t('notification.pageTitle')}</Title>
            </div>

            <Card>
                {!initialLoaded ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : items.length === 0 ? (
                    <Empty description={t('notification.empty')} />
                ) : (
                    <>
                        {groups.map((group) => (
                            <div key={group.label}>
                                <Divider orientation="left" plain>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{group.label}</Text>
                                </Divider>
                                <List
                                    itemLayout="horizontal"
                                    dataSource={group.items}
                                    renderItem={(item) => (
                                        <List.Item
                                            onClick={() => handleItemClick(item)}
                                            style={{
                                                background: item.isRead ? 'transparent' : '#e6f4ff',
                                                borderRadius: 8,
                                                padding: '12px 16px',
                                                marginBottom: 4,
                                                cursor: item.refId ? 'pointer' : 'default',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: '50%',
                                                        background: item.isRead ? '#f0f0f0' : '#bae0ff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <CustomerServiceOutlined style={{ color: item.isRead ? '#aaa' : '#1677ff', fontSize: 16 }} />
                                                    </div>
                                                }
                                                title={
                                                    <Space size={6}>
                                                        <Text style={{ fontSize: 14 }}>{parseNotifContent(item.content, t)}</Text>
                                                        {!item.isRead && <Tag color="blue" style={{ fontSize: 11, padding: '0 6px' }}>{t('notification.unread')}</Tag>}
                                                    </Space>
                                                }
                                                description={
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {dayjs(item.createdAt).format('HH:mm:ss')}
                                                    </Text>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </div>
                        ))}

                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Button loading={loading} onClick={() => fetchMore(page + 1)}>
                                    {t('notification.loadMore')}
                                </Button>
                            </div>
                        )}

                        {!hasMore && items.length > 0 && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('notification.noMore')}</Text>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default NotificationPage;
