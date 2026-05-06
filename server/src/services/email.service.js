const nodemailer = require('nodemailer');

/**
 * Email Service — Sends OTP codes via SMTP (Nodemailer).
 * Configure SMTP credentials in .env
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

const emailService = {
  /**
   * Send a 6-digit OTP code to the user's email.
   */
  async sendOtpEmail(to, code) {
    const mail = getTransporter();

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 460px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 1.75rem; font-weight: 800; color: #7c3aed; margin: 0;">QueueX</h1>
        </div>
        <div style="background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; text-align: center;">
          <p style="color: #9a9ab0; font-size: 0.9rem; margin: 0 0 0.5rem 0;">Your verification code</p>
          <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.5rem; color: #f0f0f5; padding: 1rem 0; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #5a5a72; font-size: 0.8rem; margin: 1rem 0 0 0;">
            This code expires in <strong style="color: #a78bfa;">5 minutes</strong>. Do not share it with anyone.
          </p>
        </div>
        <p style="color: #5a5a72; font-size: 0.75rem; text-align: center; margin-top: 1.5rem;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      await mail.sendMail({
        from: `"QueueX" <${process.env.SMTP_USER || 'noreply@queuex.app'}>`,
        to,
        subject: `${code} — Your QueueX verification code`,
        html: htmlBody,
      });
      console.log(`📧 OTP email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      throw { status: 500, message: 'Failed to send verification email. Please try again.' };
    }
  },
};

module.exports = emailService;
