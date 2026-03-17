/**
 * @module landing_page
 * @SD_Ref 03_1_landing_page_SD.md
 * @SD_Version SD-v1.0.6
 */
import React, { useState, useEffect } from 'react';
import {
    Modal, Descriptions, Tag, Button, Input, Space, Typography, Divider,
    Popconfirm, message, Tooltip, Image,
} from 'antd';
import {
    CheckOutlined, CloseOutlined, SendOutlined, InfoCircleOutlined, EditOutlined, SaveOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { INQUIRY_STATUS, INQUIRY_STATUS_OPTIONS, ROLES } from '../../constants/enums';
import inquiryService from '../../services/inquiryService';

const { TextArea } = Input;
const { Text } = Typography;

const getStatusOption = (status) =>
    INQUIRY_STATUS_OPTIONS.find(o => o.value === status) || { labelKey: 'inquiry.statusUnknown', color: 'default' };

const InquiryModal = ({ visible, inquiry, userRole, onClose, onSuccess, onRefresh }) => {
    const { t } = useTranslation();
    const [answerText, setAnswerText] = useState('');
    const [noteText, setNoteText] = useState('');
    const [noteEditing, setNoteEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isAdminOrSale = ROLES.ADMIN === userRole || ROLES.SALE === userRole;
    const isAdminOrChungTu = ROLES.ADMIN === userRole || ROLES.CHUNG_TU === userRole;

    useEffect(() => {
        if (inquiry) {
            setAnswerText(inquiry.answer || '');
            setNoteText(inquiry.internalNote || '');
            setNoteEditing(false);
        }
    }, [inquiry]);

    if (!inquiry) return null;

    const status = inquiry.status;
    const statusOpt = getStatusOption(status);

    // Kiểm tra xem role hiện tại có thể làm gì với status này
    const canReviewLan1   = isAdminOrSale && INQUIRY_STATUS.PENDING_REVIEW === status;
    const canSubmitAnswer = isAdminOrChungTu && (
        INQUIRY_STATUS.PENDING_ANSWER === status || INQUIRY_STATUS.ANSWER_REJECTED === status
    );
    const canReviewLan2   = isAdminOrSale && INQUIRY_STATUS.PENDING_SEND === status;

    const handleReviewLan1 = async (approved) => {
        setSubmitting(true);
        try {
            await inquiryService.review(inquiry.id, approved);
            message.success(approved ? t('inquiry.approvedSuccess') : t('inquiry.rejectedSuccess'));
            onSuccess();
        } catch (_) {
            message.error(t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answerText.trim()) {
            message.warning(t('inquiry.answerRequired'));
            return;
        }
        setSubmitting(true);
        try {
            await inquiryService.submitAnswer(inquiry.id, answerText.trim());
            message.success(t('inquiry.answerSubmitted'));
            onSuccess();
        } catch (_) {
            message.error(t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewLan2 = async (approved) => {
        setSubmitting(true);
        try {
            await inquiryService.reviewAndSend(inquiry.id, approved);
            message.success(approved ? t('inquiry.emailSentSuccess') : t('inquiry.answerRejectedSuccess'));
            onSuccess();
        } catch (_) {
            message.error(t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveNote = async () => {
        setSubmitting(true);
        try {
            await inquiryService.updateNote(inquiry.id, noteText);
            message.success(t('inquiry.noteSaved'));
            setNoteEditing(false);
            onRefresh();
        } catch (_) {
            message.error(t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    // Build danh sách thông tin câu hỏi
    const questionFields = [
        { label: t('inquiry.productName'), value: inquiry.productName },
        { label: t('inquiry.material'),    value: inquiry.material },
        { label: t('inquiry.usage'),       value: inquiry.usage },
        { label: t('inquiry.size'),        value: inquiry.size },
        { label: t('inquiry.brand'),       value: inquiry.brand },
        { label: t('inquiry.specialInfo'), value: inquiry.specialInfo },
        { label: t('inquiry.techSpec'),    value: inquiry.techSpec },
        { label: t('inquiry.demand'),      value: inquiry.demand },
    ].filter(f => f.value);

    // Footer actions
    const renderFooterActions = () => {
        const actions = [];

        if (canReviewLan1) {
            actions.push(
                <Popconfirm
                    key="reject1"
                    title={t('inquiry.confirmRejectQuestion')}
                    onConfirm={() => handleReviewLan1(false)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                >
                    <Button danger icon={<CloseOutlined />} loading={submitting}>
                        {t('inquiry.rejectQuestion')}
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="approve1"
                    title={t('inquiry.confirmApproveQuestion')}
                    onConfirm={() => handleReviewLan1(true)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                >
                    <Button type="primary" icon={<CheckOutlined />} loading={submitting}>
                        {t('inquiry.approveQuestion')}
                    </Button>
                </Popconfirm>
            );
        }

        if (canSubmitAnswer) {
            actions.push(
                <Button
                    key="submit-answer"
                    type="primary"
                    icon={<SendOutlined />}
                    loading={submitting}
                    onClick={handleSubmitAnswer}
                >
                    {t('inquiry.submitAnswer')}
                </Button>
            );
        }

        if (canReviewLan2) {
            actions.push(
                <Popconfirm
                    key="reject2"
                    title={t('inquiry.confirmRejectAnswer')}
                    onConfirm={() => handleReviewLan2(false)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                >
                    <Button danger icon={<CloseOutlined />} loading={submitting}>
                        {t('inquiry.rejectAnswer')}
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="approve2"
                    title={t('inquiry.confirmSendEmail')}
                    onConfirm={() => handleReviewLan2(true)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                >
                    <Button type="primary" icon={<SendOutlined />} loading={submitting}>
                        {t('inquiry.approveAndSend')}
                    </Button>
                </Popconfirm>
            );
        }

        actions.push(<Button key="close" onClick={onClose}>{t('common.close')}</Button>);
        return actions;
    };

    return (
        <Modal
            open={visible}
            title={
                <Space>
                    <span>{t('inquiry.detailTitle', { id: inquiry.id })}</span>
                    <Tag color={statusOpt.color}>{t(statusOpt.labelKey)}</Tag>
                </Space>
            }
            onCancel={onClose}
            width={700}
            footer={renderFooterActions()}
            destroyOnClose
        >
            {/* Thông tin câu hỏi */}
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                {/* BE tự mask các trường khách hàng với CHUNG_TU — FE chỉ render nếu có giá trị */}
                {inquiry.email && (
                    <Descriptions.Item label={t('inquiry.email')}>
                        <Text copyable>{inquiry.email}</Text>
                    </Descriptions.Item>
                )}
                {inquiry.customerName && (
                    <Descriptions.Item label={t('inquiry.customerName')}>
                        {inquiry.customerName}
                    </Descriptions.Item>
                )}
                {inquiry.businessType && (
                    <Descriptions.Item label={t('inquiry.businessType')}>
                        {inquiry.businessType}
                    </Descriptions.Item>
                )}
                {inquiry.phoneNumber && (
                    <Descriptions.Item label={t('inquiry.phoneNumber')}>
                        {inquiry.phoneNumber}
                    </Descriptions.Item>
                )}
                <Descriptions.Item label={t('inquiry.createdAt')}>
                    {dayjs(inquiry.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
                {questionFields.map(f => (
                    <Descriptions.Item key={f.label} label={f.label}>
                        {f.value}
                    </Descriptions.Item>
                ))}
                {inquiry.imageUrl && (
                    <Descriptions.Item label={t('inquiry.image')}>
                        <Image
                            src={inquiry.imageUrl}
                            alt="inquiry"
                            style={{ maxHeight: 240, borderRadius: 6 }}
                        />
                    </Descriptions.Item>
                )}
            </Descriptions>

            {/* Câu trả lời */}
            {canSubmitAnswer ? (
                <>
                    <Divider orientation="left">{t('inquiry.answer')}</Divider>
                    <TextArea
                        rows={5}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder={t('inquiry.answerPlaceholder')}
                    />
                    {INQUIRY_STATUS.ANSWER_REJECTED === status && (
                        <Text type="danger" style={{ fontSize: 12 }}>
                            {t('inquiry.answerRejectedHint')}
                        </Text>
                    )}
                </>
            ) : inquiry.answer ? (
                <>
                    <Divider orientation="left">{t('inquiry.answer')}</Divider>
                    <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                        {inquiry.answer}
                    </div>
                </>
            ) : null}

            {/* Ghi chú nội bộ */}
            <Divider orientation="left">
                <Space size={4}>
                    {t('inquiry.internalNote')}
                    <Tooltip title={t('inquiry.internalNoteTooltip')}>
                        <InfoCircleOutlined style={{ color: '#faad14' }} />
                    </Tooltip>
                </Space>
            </Divider>

            {noteEditing ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <TextArea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={t('inquiry.internalNotePlaceholder')}
                    />
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={handleSaveNote}
                            loading={submitting}
                        >
                            {t('common.save')}
                        </Button>
                        <Button size="small" onClick={() => { setNoteText(inquiry.internalNote || ''); setNoteEditing(false); }}>
                            {t('common.cancel')}
                        </Button>
                    </Space>
                </Space>
            ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div
                        style={{
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            padding: '8px 12px',
                            borderRadius: 6,
                            minHeight: 40,
                            whiteSpace: 'pre-wrap',
                            color: noteText ? '#333' : '#bbb',
                        }}
                    >
                        {noteText || t('inquiry.internalNoteEmpty')}
                    </div>
                    <Button size="small" icon={<EditOutlined />} onClick={() => setNoteEditing(true)}>
                        {t('inquiry.editNote')}
                    </Button>
                </Space>
            )}
        </Modal>
    );
};

export default InquiryModal;
