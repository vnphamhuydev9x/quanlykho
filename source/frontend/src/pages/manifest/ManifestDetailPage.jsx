import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Card, Row, Col, Typography, Modal, message, Tag, Descriptions, Divider, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import * as XLSX from 'xlsx';
import manifestService from '../../services/manifestService';
import productCodeService from '../../services/productCodeService';

const { Title } = Typography;

const ManifestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [manifest, setManifest] = useState(null);
    const [loading, setLoading] = useState(false);

    // For Add Items Modal
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [addLoading, setAddLoading] = useState(false);

    useEffect(() => {
        fetchManifestDetail();
    }, [id]);

    const fetchManifestDetail = async () => {
        setLoading(true);
        try {
            const data = await manifestService.getById(id);
            setManifest(data);
        } catch (error) {
            message.error('Lỗi khi tải chi tiết chuyến xe');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableItems = async () => {
        setAddLoading(true);
        try {
            // Get items with status CHO_XEP_XE and no manifestId
            // TODO: Ensure backend supports filtering by status and manifestId=null
            // Temporary: Get CHO_XEP_XE. Ideally backend should support this specific query.
            const response = await productCodeService.getAll({
                page: 1, limit: 1000,
                status: 'CHO_XEP_XE'
            });
            // Filter out items already in this manifest (though status should prevent this)
            // or items already in another manifest (status check handles this)
            const items = response.data?.items || [];
            // Client side filter if needed:
            const filtered = items.filter(item => !item.manifestId);
            setAvailableItems(filtered);
        } catch (error) {
            message.error('Lỗi khi tải danh sách hàng chờ xếp');
        } finally {
            setAddLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setIsAddModalVisible(true);
        setSelectedRowKeys([]);
        fetchAvailableItems();
    };

    const handleAddItems = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất 1 kiện hàng');
            return;
        }
        try {
            await manifestService.addItems(id, selectedRowKeys);
            message.success('Đã thêm hàng vào chuyến');
            setIsAddModalVisible(false);
            fetchManifestDetail();
        } catch (error) {
            message.error('Lỗi khi thêm hàng');
        }
    };

    const handleRemoveItem = (itemId) => {
        Modal.confirm({
            title: 'Xóa khỏi chuyến',
            content: 'Bạn có chắc muốn xóa kiện hàng này khỏi chuyến xe?',
            onOk: async () => {
                try {
                    await manifestService.removeItems(id, [itemId]);
                    message.success('Đã xóa kiện hàng khỏi chuyến');
                    fetchManifestDetail();
                } catch (error) {
                    message.error('Lỗi khi xóa hàng');
                }
            }
        });
    };

    const handleExportExcel = () => {
        if (!manifest || !manifest.productCodes || manifest.productCodes.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const excelData = manifest.productCodes.map((item, index) => ({
            'STT': index + 1,
            '1. [A] Mã KH': item.customerCodeInput || item.customer?.customerCode || '',
            '2. [B] Tên hàng': item.productName,
            '3. [C] Mã đơn': item.orderCode,
            '4. [D] Số kiện': item.packageCount,
            '5. [E] Đóng gói': item.packing,
            '6. [F] Trọng lượng (Kg)': item.weight,
            '7. [G] Khối lượng (m3)': item.volume,
            '8. [H] Ảnh': item.images && item.images.length > 0 ? 'Có ảnh' : 'Không',
            // Note: Excel cannot easily display implementation images directly without complex lib. 
            // Just indicating presence or URL.
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "XepXe");
        XLSX.writeFile(wb, `XepXe_${manifest.name}.xlsx`);
    };

    // Columns for Main Table (8 Columns Simplified)
    const columns = [
        { title: '#', render: (t, r, i) => i + 1, width: 50 },
        { title: '1. [A] Mã KH', dataIndex: 'customerCodeInput', width: 100, render: (t, r) => t || r.customer?.customerCode },
        { title: '2. [B] Tên hàng', dataIndex: 'productName', width: 150 },
        { title: '3. [C] Mã đơn', dataIndex: 'orderCode', width: 120 },
        { title: '4. [D] Số kiện', dataIndex: 'packageCount', width: 80 },
        { title: '5. [E] Đóng gói', dataIndex: 'packing', width: 100 },
        { title: '6. [F] TL (Kg)', dataIndex: 'weight', width: 80 },
        { title: '7. [G] KL (m3)', dataIndex: 'volume', width: 80 },
        {
            title: '8. [H] Ảnh',
            dataIndex: 'images',
            width: 100,
            render: (imgs) => (imgs && imgs.length > 0) ? <Tag color="blue">Có ảnh</Tag> : null
        },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.id)} />
            )
        }
    ];

    // Columns for Add Modal Table
    const addColumns = [
        { title: 'Mã KH', dataIndex: 'customerCodeInput', width: 100 },
        { title: 'Tên hàng', dataIndex: 'productName', width: 150 },
        { title: 'Mã đơn', dataIndex: 'orderCode', width: 120 },
        { title: 'Số kiện', dataIndex: 'packageCount', width: 80 },
    ];

    return (
        <Card>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/manifests')} style={{ marginBottom: 16 }}>
                Quay lại
            </Button>

            {manifest && (
                <>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                        <Col>
                            <Title level={3}>{manifest.name}</Title>
                            <Descriptions size="small" column={2}>
                                <Descriptions.Item label="Ngày xếp">{moment(manifest.date).format('DD/MM/YYYY')}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    <Tag color={manifest.status === 'OPEN' ? 'green' : 'blue'}>{manifest.status}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Ghi chú">{manifest.note}</Descriptions.Item>
                            </Descriptions>
                        </Col>
                        <Col>
                            <Space>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                                    Thêm hàng
                                </Button>
                                <Button icon={<ExportOutlined />} onClick={handleExportExcel}>
                                    Xuất Excel
                                </Button>
                                <Button icon={<ReloadOutlined />} onClick={fetchManifestDetail} />
                            </Space>
                        </Col>
                    </Row>

                    <Divider />

                    <Table
                        columns={columns}
                        dataSource={manifest.productCodes || []}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        bordered
                        summary={(pageData) => {
                            let totalPackage = 0;
                            let totalWeight = 0;
                            let totalVolume = 0;

                            pageData.forEach(({ packageCount, weight, volume }) => {
                                totalPackage += Number(packageCount) || 0;
                                totalWeight += Number(weight) || 0;
                                totalVolume += Number(volume) || 0;
                            });

                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                        <Table.Summary.Cell index={0} colSpan={4}>Tổng cộng</Table.Summary.Cell>
                                        <Table.Summary.Cell index={1}>{totalPackage}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={2}></Table.Summary.Cell>
                                        <Table.Summary.Cell index={3}>{totalWeight.toFixed(2)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={4}>{totalVolume.toFixed(3)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={5} colSpan={2}></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </>
            )}

            <Modal
                title="Thêm hàng vào chuyến xe"
                open={isAddModalVisible}
                onOk={handleAddItems}
                onCancel={() => setIsAddModalVisible(false)}
                width={800}
                okText="Thêm đã chọn"
                cancelText="Hủy"
            >
                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys),
                    }}
                    columns={addColumns}
                    dataSource={availableItems}
                    rowKey="id"
                    loading={addLoading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Modal>
        </Card>
    );
};

export default ManifestDetailPage;
