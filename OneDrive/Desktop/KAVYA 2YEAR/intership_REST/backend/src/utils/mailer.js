const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Inter', Arial, sans-serif; background: #0a0b0f; margin: 0; padding: 0; }
      .wrap { max-width: 480px; margin: 40px auto; background: #16181f; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }
      .header { background: linear-gradient(135deg,#6366f1,#7c3aed); padding: 32px; text-align: center; }
      .header h1 { margin: 0; color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
      .body { padding: 32px; }
      .body p { color: #94a3b8; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
      .body strong { color: #f1f5f9; }
      .btn { display: block; text-align: center; background: linear-gradient(135deg,#6366f1,#7c3aed); color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; margin: 24px 0; }
      .note { font-size: 12px !important; color: #475569 !important; }
      .footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 20px 32px; text-align: center; color: #475569; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <h1>⚡ TaskFlow</h1>
        <p>Password Reset Request</p>
      </div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>30 minutes</strong>.</p>
        <a href="${resetUrl}" class="btn">Reset My Password</a>
        <p class="note">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        <p class="note">Or copy this link: ${resetUrl}</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} TaskFlow · Multi-Tenant Task Management</div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔐 Reset your TaskFlow password',
    html,
  });
};

module.exports = { sendPasswordResetEmail };
