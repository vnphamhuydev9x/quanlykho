const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const logger = require('../config/logger');

// 1. Khởi tạo Resend bằng API KEY (Nếu dùng cách SDK của Resend)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 2. Khởi tạo SMTP Transporter (Cách cũ Gmail/SMTP truyền thống)
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
}) : null;

const sendInquiryReply = async ({ toEmail, question, answer }) => {
    try {
        const htmlAnswer = answer.replace(/\n/g, '<br>');
        const htmlQuestion = question.replace(/\n/g, '<br>');
        
        const senderName = "3T Group";
        // Nếu dùng Resend thì format chuẩn của From là "Tên <email@domain.com>"
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'onboarding@resend.dev';
        const fromHeader = `"${senderName}" <${fromEmail}>`;
        
        const subject = 'Phản hồi từ 3T Group';
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h3 style="color: #333;">3T Group</h3>
                <hr>
                <p><strong>Câu hỏi của quý khách:</strong></p>
                <p style="background:#f5f5f5; padding:12px; border-radius:4px;">${htmlQuestion}</p>
                <p><strong>Phản hồi từ chúng tôi:</strong></p>
                <p style="background:#f0f7ff; padding:12px; border-radius:4px;">${htmlAnswer}</p>
                <hr>
                <p style="color:#888; font-size:12px;">Trân trọng,<br>3T Group</p>
            </div>
        `;

        if (resend) {
            // Gửi bằng Resend API SDK (Rất nhanh, ít bị chặn)
            const { data, error } = await resend.emails.send({
                from: fromHeader,
                to: toEmail,
                subject: subject,
                html: htmlBody,
            });

            if (error) {
                throw new Error(error.message);
            }
            logger.info(`[EmailService] Sent reply to ${toEmail} via Resend SDK (ID: ${data?.id})`);
            
        } else if (transporter) {
            // Gửi bằng SMTP (như Gmail hoặc SMTP của Resend)
            await transporter.sendMail({
                from: fromHeader,
                to: toEmail,
                subject: subject,
                html: htmlBody,
            });
            logger.info(`[EmailService] Sent reply to ${toEmail} via SMTP`);
            
        } else {
            logger.warn(`[EmailService] No email provider configured! Simulated sending to ${toEmail}`);
        }

    } catch (error) {
        logger.error(`[EmailService] Failed to send email to ${toEmail}: ${error.message}`);
        throw error;
    }
};

module.exports = { sendInquiryReply };
