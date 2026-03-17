/**
 * @module landing_page
 * @SD_Ref 03_1_landing_page_SD.md
 * @SD_Version SD-v1.0.9
 */
import React, { useState } from 'react';
import { Form, Input, Button, Typography, Space, Divider, Row, Col, Tag, Upload, message, Image } from 'antd';
import {
    SendOutlined, CheckCircleOutlined, MailOutlined, PhoneOutlined,
    GlobalOutlined, SafetyCertificateOutlined, PlusOutlined,
} from '@ant-design/icons';
import inquiryService from '../../services/inquiryService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ─── Logo SVG inline ─────────────────────────────────────────────────────── */
const Logo3T = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(22,119,255,0.4)',
            flexShrink: 0,
        }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: -1 }}>3T</span>
        </div>
        <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: 1 }}>3T GROUP</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 }}>LOGISTICS &amp; TRADE</div>
        </div>
    </div>
);

/* ─── Background: warehouse/industrial gradient + mesh ───────────────────── */
const bgStyle = {
    minHeight: '100vh',
    background: `
        linear-gradient(135deg,
            #0a1628 0%,
            #0d2137 30%,
            #0f2a47 60%,
            #122d52 100%
        )
    `,
    position: 'relative',
    overflow: 'hidden',
};

/* ─── Decorative circles ─────────────────────────────────────────────────── */
const Circles = () => (
    <>
        <div style={{
            position: 'absolute', top: -120, right: -120,
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,119,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
        }} />
        <div style={{
            position: 'absolute', bottom: -80, left: -80,
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(22,119,255,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
        }} />
        <div style={{
            position: 'absolute', top: '40%', left: '5%',
            width: 1, height: '40%',
            background: 'linear-gradient(to bottom, transparent, rgba(22,119,255,0.3), transparent)',
            pointerEvents: 'none',
        }} />
    </>
);

/* ─── Features strip ─────────────────────────────────────────────────────── */
const features = [
    { icon: <SafetyCertificateOutlined />, text: 'Tư vấn chính xác' },
    { icon: <MailOutlined />,              text: 'Phản hồi qua email' },
    { icon: <GlobalOutlined />,            text: 'Hàng nhập khẩu chuyên nghiệp' },
];

/* ─── Success Screen ─────────────────────────────────────────────────────── */
const SuccessScreen = ({ result, onReset }) => (
    <div style={{ ...bgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Circles />
        <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: '40px 36px',
            maxWidth: 560,
            width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            position: 'relative',
            zIndex: 1,
        }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a' }} />
                <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>Gửi thành công!</Title>
                <Text type="secondary">
                    Chúng tôi sẽ phản hồi đến <Text strong>{result.email}</Text> sớm nhất có thể.
                </Text>
                <br />
                <Tag color="blue" style={{ marginTop: 10, fontSize: 13 }}>Mã tham chiếu: #{result.id}</Tag>
            </div>

            {(() => {
                const textFields = [
                    ['Tên khách hàng',     result.customerName],
                    ['Ngành nghề KD',      result.businessType],
                    ['Số điện thoại',      result.phoneNumber],
                    ['Tên sản phẩm',       result.productName],
                    ['Chất liệu',          result.material],
                    ['Công dụng',          result.usage],
                    ['Kích thước',         result.size],
                    ['Nhãn hàng',          result.brand],
                    ['Thông tin đặc thù',  result.specialInfo],
                    ['Thông số kỹ thuật',  result.techSpec],
                    ['Nhu cầu',            result.demand],
                ].filter(([, v]) => v);
                const hasContent = textFields.length > 0 || result.imageUrl;
                if (!hasContent) return null;
                return (
                    <>
                        <Divider style={{ margin: '16px 0' }}>Nội dung đã gửi</Divider>
                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                            {textFields.map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', gap: 6 }}>
                                    <Text type="secondary" style={{ minWidth: 140, flexShrink: 0 }}>{k}:</Text>
                                    <Text>{v}</Text>
                                </div>
                            ))}
                            {result.imageUrl && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <Text type="secondary" style={{ minWidth: 140, flexShrink: 0 }}>Ảnh sản phẩm:</Text>
                                    <Image
                                        src={result.imageUrl}
                                        width={120}
                                        style={{ borderRadius: 6, objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </Space>
                    </>
                );
            })()}

            <Button
                type="primary"
                block
                size="large"
                style={{ marginTop: 24, borderRadius: 10 }}
                onClick={onReset}
            >
                Gửi câu hỏi khác
            </Button>
        </div>
    </div>
);

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const LandingPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [imageFileList, setImageFileList] = useState([]);

    const imageUploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        fileList: imageFileList,
        beforeUpload: (file) => {
            if (!file.type.startsWith('image/')) return Upload.LIST_IGNORE;
            if (file.size > 5 * 1024 * 1024) {
                message.error('Ảnh không được vượt quá 5MB');
                return Upload.LIST_IGNORE;
            }
            return false;
        },
        onChange: ({ fileList: newList }) => setImageFileList(newList),
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const formData = new FormData();
            Object.entries(values).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    formData.append(key, val);
                }
            });
            const imageFile = imageFileList[0]?.originFileObj;
            if (imageFile) {
                formData.append('image', imageFile);
            }
            const res = await inquiryService.submitInquiry(formData);
            setResult(res.data);
            setSubmitted(true);
        } catch (error) {
            const msg = error?.response?.data?.message || 'Gửi câu hỏi thất bại. Vui lòng thử lại.';
            form.setFields([{ name: 'email', errors: [msg] }]);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        setSubmitted(false);
        setResult(null);
        setImageFileList([]);
    };

    if (submitted && result) {
        return <SuccessScreen result={result} onReset={handleReset} />;
    }

    return (
        <div style={bgStyle}>
            <Circles />

            <div style={{
                position: 'relative',
                zIndex: 1,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* ── Navbar ── */}
                <div style={{
                    padding: '20px 40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <Logo3T />
                    <Space>
                        <PhoneOutlined style={{ color: 'rgba(255,255,255,0.6)' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Hotline: 1900 xxxx</Text>
                    </Space>
                </div>

                {/* ── Hero + Form ── */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 24px',
                }}>
                    <div style={{ maxWidth: 1080, width: '100%' }}>
                        <Row gutter={[56, 40]} align="middle">
                            {/* Left: Hero text */}
                            <Col xs={24} lg={10}>
                                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                                    <Tag
                                        color="blue"
                                        style={{ borderRadius: 20, padding: '2px 14px', fontSize: 12, letterSpacing: 1 }}
                                    >
                                        TƯ VẤN MIỄN PHÍ
                                    </Tag>

                                    <Title
                                        level={1}
                                        style={{
                                            color: '#fff',
                                            margin: 0,
                                            fontSize: 'clamp(28px, 4vw, 44px)',
                                            lineHeight: 1.2,
                                            fontWeight: 800,
                                        }}
                                    >
                                        Tư vấn<br />
                                        <span style={{ color: '#4096ff' }}>hàng hóa nhập khẩu</span><br />
                                        chuyên nghiệp
                                    </Title>

                                    <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, margin: 0, lineHeight: 1.7 }}>
                                        Gửi thông tin sản phẩm cần tư vấn, đội ngũ chuyên gia của 3T Group
                                        sẽ phản hồi qua email với đầy đủ thông tin về mã HS, thuế nhập khẩu
                                        và các yêu cầu thủ tục hải quan.
                                    </Paragraph>

                                    {/* Features */}
                                    <Space direction="vertical" size={12}>
                                        {features.map((f, i) => (
                                            <Space key={i} size={10}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: 'rgba(64,150,255,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#4096ff', fontSize: 15, flexShrink: 0,
                                                }}>
                                                    {f.icon}
                                                </div>
                                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{f.text}</Text>
                                            </Space>
                                        ))}
                                    </Space>
                                </Space>
                            </Col>

                            {/* Right: Form card */}
                            <Col xs={24} lg={14}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.97)',
                                    borderRadius: 20,
                                    padding: '36px 32px',
                                    boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                                }}>
                                    {/* Form header */}
                                    <div style={{ marginBottom: 24 }}>
                                        <Title level={4} style={{ margin: 0, color: '#0a1628' }}>
                                            Gửi câu hỏi tư vấn
                                        </Title>
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            Chỉ cần email — các trường khác càng chi tiết càng tốt
                                        </Text>
                                    </div>

                                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                                        {/* Email */}
                                        <Form.Item
                                            label={<Text strong>Email nhận phản hồi <Text type="danger">*</Text></Text>}
                                            name="email"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập địa chỉ email' },
                                                { type: 'email', message: 'Email không hợp lệ' },
                                            ]}
                                            style={{ marginBottom: 16 }}
                                        >
                                            <Input
                                                prefix={<MailOutlined style={{ color: '#bbb' }} />}
                                                placeholder="example@email.com"
                                                size="large"
                                                style={{ borderRadius: 8 }}
                                            />
                                        </Form.Item>

                                        <Divider style={{ margin: '8px 0 16px', borderColor: '#f0f0f0' }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Thông tin liên hệ</Text>
                                        </Divider>

                                        <Row gutter={12}>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Tên khách hàng" name="customerName" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="Họ và tên..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Số điện thoại" name="phoneNumber" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: 0901234567" style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24}>
                                                <Form.Item label="Ngành nghề kinh doanh" name="businessType" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: Thương mại, Sản xuất..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Divider style={{ margin: '8px 0 16px', borderColor: '#f0f0f0' }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Thông tin sản phẩm</Text>
                                        </Divider>

                                        <Row gutter={12}>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Tên sản phẩm" name="productName" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: Máy bơm nước, Van bi..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Chất liệu" name="material" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: Inox 304, Nhựa PP..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Công dụng" name="usage" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: Bơm nước sạch..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Kích thước / kích cỡ" name="size" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: DN50, 10x20x5cm..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Nhãn hàng" name="brand" style={{ marginBottom: 12 }}>
                                                    <Input placeholder='Ghi "không hiệu" nếu không có' style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Form.Item label="Nhu cầu" name="demand" style={{ marginBottom: 12 }}>
                                                    <Input placeholder="VD: CSNK, giá khai..." style={{ borderRadius: 8 }} />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Form.Item label="Thông tin đặc thù" name="specialInfo" style={{ marginBottom: 12 }}>
                                            <Input placeholder="VD: Có pin, điện áp 220V, áp suất 10 bar..." style={{ borderRadius: 8 }} />
                                        </Form.Item>

                                        <Form.Item
                                            label={
                                                <span>
                                                    Thông số kỹ thuật / catalogue
                                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                                                        (khuyến khích nếu là hàng máy móc)
                                                    </Text>
                                                </span>
                                            }
                                            name="techSpec"
                                            style={{ marginBottom: 12 }}
                                        >
                                            <TextArea
                                                rows={3}
                                                placeholder="Mô tả thông số kỹ thuật, hoặc dán link catalogue..."
                                                style={{ borderRadius: 8 }}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            label={
                                                <span>
                                                    Ảnh sản phẩm
                                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                                                        (tùy chọn, tối đa 5MB)
                                                    </Text>
                                                </span>
                                            }
                                            style={{ marginBottom: 20 }}
                                        >
                                            <Upload {...imageUploadProps}>
                                                {imageFileList.length < 1 && (
                                                    <div>
                                                        <PlusOutlined />
                                                        <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                                                    </div>
                                                )}
                                            </Upload>
                                        </Form.Item>

                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<SendOutlined />}
                                            loading={loading}
                                            size="large"
                                            block
                                            style={{
                                                borderRadius: 10,
                                                height: 48,
                                                fontSize: 15,
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                                                border: 'none',
                                                boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
                                            }}
                                        >
                                            Gửi câu hỏi tư vấn
                                        </Button>
                                    </Form>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '16px 40px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                        © {new Date().getFullYear()} 3T Group — All rights reserved
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
