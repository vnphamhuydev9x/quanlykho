const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendInquiryReply = async ({ toEmail, question, answer }) => {
    try {
        const htmlAnswer = answer.replace(/\n/g, '<br>');
        const htmlQuestion = question.replace(/\n/g, '<br>');

        await transporter.sendMail({
            from: `"3T Group" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Phản hồi từ 3T Group',
            html: `
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
            `,
        });

        logger.info(`[EmailService] Sent inquiry reply to ${toEmail}`);
    } catch (error) {
        logger.error(`[EmailService] Failed to send email to ${toEmail}: ${error.message}`);
        throw error;
    }
};

module.exports = { sendInquiryReply };
