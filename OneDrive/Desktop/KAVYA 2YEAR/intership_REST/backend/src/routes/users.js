const router = require('express').Router();
const { User, Task, Comment, AuditLog, Notification } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');

router.use(verifyToken);

// ── GET /api/users ── admin sees all, member sees only self ───
router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const users = await User.findAll({
        where: { organization_id: req.organizationId },
        attributes: { exclude: ['password_hash', 'totp_secret', 'reset_token'] },
        order: [['createdAt', 'DESC']],
      });
      return res.json(users);
    }
    res.json([req.user]);
  } catch (err) { next(err); }
});

// ── GET /api/users/me ─────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'totp_secret', 'reset_token'] },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// ── PATCH /api/users/me ── update profile ─────────────────────
router.patch('/me', async (req, res, next) => {
  try {
    const { name, notif_prefs } = req.body;
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (notif_prefs !== undefined) updates.notif_prefs = notif_prefs;
    await req.user.update(updates);
    res.json({ message: 'Profile updated', user: { ...req.user.toJSON(), password_hash: undefined, totp_secret: undefined } });
  } catch (err) { next(err); }
});

// ── GET /api/users/me/export ── GDPR data export ──────────────
router.get('/me/export', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password_hash', 'totp_secret', 'reset_token'] } });
    const tasks = await Task.findAll({ where: { organization_id: req.organizationId, created_by: req.user.id } });
    const assigned = await Task.findAll({ where: { organization_id: req.organizationId, assigned_to: req.user.id } });
    const comments = await Comment.findAll({ where: { organization_id: req.organizationId, user_id: req.user.id } });
    const auditLogs = await AuditLog.findAll({ where: { organization_id: req.organizationId, user_id: req.user.id }, limit: 200 });
    const notifications = await Notification.findAll({ where: { user_id: req.user.id }, limit: 100 });

    const exportData = {
      export_date: new Date().toISOString(),
      user: user.toJSON(),
      tasks_created: tasks,
      tasks_assigned: assigned,
      comments,
      audit_logs: auditLogs,
      notifications,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-export-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) { next(err); }
});

// ── POST /api/users/me/2fa/setup ─── generate TOTP secret ─────
router.post('/me/2fa/setup', async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `TaskFlow (${req.user.email})`, issuer: 'TaskFlow' });
    // Temporarily store secret (not enabled yet)
    await req.user.update({ totp_secret: secret.base32 });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr: qrDataUrl, otpauth_url: secret.otpauth_url });
  } catch (err) { next(err); }
});

// ── POST /api/users/me/2fa/verify ─── confirm and enable TOTP ─
router.post('/me/2fa/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const user = await User.findByPk(req.user.id);
    if (!user.totp_secret) return res.status(400).json({ error: 'Run /me/2fa/setup first' });

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: String(token),
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid TOTP token' });

    await user.update({ totp_enabled: true });
    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: '2FA_ENABLED', entityType: 'user', entityId: req.user.id, metadata: {}, ipAddress: req.ip });
    res.json({ message: '2FA enabled successfully' });
  } catch (err) { next(err); }
});

// ── POST /api/users/me/2fa/disable ─── disable TOTP ──────────
router.post('/me/2fa/disable', async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findByPk(req.user.id);

    if (user.password_hash && password) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid password' });
    }

    await user.update({ totp_enabled: false, totp_secret: null });
    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: '2FA_DISABLED', entityType: 'user', entityId: req.user.id, metadata: {}, ipAddress: req.ip });
    res.json({ message: '2FA disabled' });
  } catch (err) { next(err); }
});

// ── POST /api/users/invite ── admin invites new member ────────
router.post('/invite', requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('role').optional().isIn(['admin', 'member']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, role = 'member' } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({ name, email, password_hash, organization_id: req.organizationId, role });
    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'USER_INVITED', entityType: 'user', entityId: user.id, metadata: { email, role }, ipAddress: req.ip });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tempPassword,
      message: 'User invited. Share the temp password securely.',
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/:id/role ── admin changes role ──────────
router.patch('/:id/role', requireRole('admin'), [
  body('role').isIn(['admin', 'member']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await User.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

    const oldRole = user.role;
    await user.update({ role: req.body.role });
    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'USER_ROLE_CHANGED', entityType: 'user', entityId: user.id, metadata: { oldRole, newRole: req.body.role }, ipAddress: req.ip });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) { next(err); }
});

// ── DELETE /api/users/:id ── admin removes member ─────────────
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

    await user.update({ is_active: false });
    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'USER_DEACTIVATED', entityType: 'user', entityId: user.id, metadata: { email: user.email }, ipAddress: req.ip });

    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
