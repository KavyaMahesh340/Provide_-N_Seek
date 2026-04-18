const { Notification } = require('../models');
const { pushToUser } = require('../routes/notifications');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Create an in-app notification and optionally send email.
 */
const sendNotification = async ({ userId, organizationId, type, title, message, entityType, entityId, sendEmail = false, email, emailSubject }) => {
  try {
    const notif = await Notification.create({
      user_id: userId,
      organization_id: organizationId,
      type, title, message,
      entity_type: entityType,
      entity_id: entityId,
    });

    // Push SSE to connected clients
    pushToUser(String(userId), 'notification', {
      id: notif.id, type, title, message, entityType, entityId,
      createdAt: notif.createdAt,
    });

    // Optional email
    if (sendEmail && email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail({
        from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: emailSubject || title,
        html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
          <h2 style="color:#6366f1">TaskFlow</h2>
          <p><strong>${title}</strong></p>
          <p>${message || ''}</p>
          <hr/>
          <small style="color:#888">You can manage notification preferences in your Settings.</small>
        </div>`,
      }).catch(() => {}); // Silent fail if email not configured
    }

    return notif;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

/**
 * Fire outgoing webhooks for the org.
 */
const fireWebhooks = async (organizationId, event, payload) => {
  try {
    const { Webhook } = require('../models');
    const webhooks = await Webhook.findAll({
      where: { organization_id: organizationId, is_active: true },
    });

    for (const wh of webhooks) {
      const events = wh.events || [];
      if (!events.includes(event)) continue;

      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
      const sig = wh.secret
        ? require('crypto').createHmac('sha256', wh.secret).update(body).digest('hex')
        : null;

      fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sig ? { 'X-TaskFlow-Signature': `sha256=${sig}` } : {}),
          'User-Agent': 'TaskFlow-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(8000),
      }).then(() => {
        wh.update({ last_triggered_at: new Date(), delivery_count: (wh.delivery_count || 0) + 1 });
      }).catch(() => {});
    }
  } catch {}
};

module.exports = { sendNotification, fireWebhooks };
