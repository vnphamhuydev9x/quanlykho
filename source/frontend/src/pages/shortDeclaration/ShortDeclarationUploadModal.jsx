import React, { useState } from 'react';
import { Modal, Upload, Button, message, Typography } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import axiosInstance from '../../utils/axios';

const { Dragger } = Upload;
const { Text } = Typography;

const ShortDeclarationUploadModal = ({ visible, onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);

    const handleDownloadTemplate = () => {
        // Create headers based on expected Excel format
        const headers = [
            'Tên hàng (mô tả chi tiết)',
            'Mã HS',
            'Xuất xứ',
            'Đơn vị tính',
            'Đơn vị tính 2',
            'Mã biểu thuế NK',
            'TS NK(%)',
            'Mã biểu thuế VAT',
            'Thuế suất VAT(%)'
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "To_Khai_Rut_Gon_Template.xlsx");
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning('Vui lòng chọn file để tải lên!');
            return;
        }

        const formData = new FormData();
        const uploadFile = fileList[0]?.originFileObj || fileList[0];
        formData.append('file', uploadFile);

        setUploading(true);
        try {
            const response = await axiosInstance.post('/short-declarations/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const { processed, skipped } = response.data.data;
            message.success(`Upload thành công! Đã tạo: ${processed}, Bỏ qua (trùng lặp): ${skipped}`);
            setFileList([]);
            onSuccess();
        } catch (error) {
            console.error(error);
            // Default error handler will catch 500s, but we can also display a specific message
            // message.error('Upload thất bại!');
        } finally {
            setUploading(false);
        }
    };

    const uploadProps = {
        onRemove: (file) => {
            setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
        },
        beforeUpload: (file) => {
            const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
            if (!isExcel) {
                message.error('Chỉ hỗ trợ file Excel (.xls, .xlsx)!');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false; // Prevent automatic upload
        },
        fileList,
        maxCount: 1,
        accept: ".xlsx, .xls"
    };

    return (
        <Modal
            title={t('shortDeclaration.uploadExcel')}
            open={visible}
            onCancel={() => {
                setFileList([]);
                onCancel();
            }}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>,
                <Button
                    key="upload"
                    type="primary"
                    loading={uploading}
                    onClick={handleUpload}
                    disabled={fileList.length === 0}
                >
                    {t('common.upload')}
                </Button>,
            ]}
        >
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadTemplate}
                >
                    Tải file mẫu (Template)
                </Button>
            </div>

            <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click hoặc Kéo thả file Excel vào khu vực này để tải lên</p>
                <p className="ant-upload-hint">
                    Hỗ trợ file định dạng .xls và .xlsx. Khi tải lên các bản ghi bị trùng lặp sẽ tự động được bỏ qua.
                </p>
            </Dragger>

            {fileList.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <Text strong>File đã chọn:</Text> {fileList[0].name}
                </div>
            )}
        </Modal>
    );
};

export default ShortDeclarationUploadModal;
