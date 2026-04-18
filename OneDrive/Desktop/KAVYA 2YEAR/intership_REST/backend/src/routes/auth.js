const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const { User, Organization, RefreshToken } = require('../models');
const { verifyToken } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, orgId: user.organization_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const saveRefreshToken = async (userId, refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
};

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('orgName').trim().notEmpty().withMessage('Organization name is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, orgName } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const slug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().slice(0, 6)}`;
    const org = await Organization.create({ name: orgName, slug });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password_hash, organization_id: org.id, role: 'admin' });

    const { accessToken, refreshToken } = generateTokens(user);
    await saveRefreshToken(user.id, refreshToken);

    await auditLogger({ organizationId: org.id, userId: user.id, action: 'USER_REGISTERED', entityType: 'user', entityId: user.id, metadata: { email }, ipAddress: req.ip });

    res.status(201).json({
      accessToken, refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, organization_id: org.id, avatar: user.avatar,
        organization: { id: org.id, name: org.name, slug: org.slug },
      },
      organization: { id: org.id, name: org.name, slug: org.slug },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'slug'] }],
    });
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    const { accessToken, refreshToken } = generateTokens(user);
    await saveRefreshToken(user.id, refreshToken);

    await auditLogger({ organizationId: user.organization_id, userId: user.id, action: 'USER_LOGIN', entityType: 'user', entityId: user.id, ipAddress: req.ip });

    res.json({
      accessToken, refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, organization_id: user.organization_id, avatar: user.avatar,
        organization: user.organization,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const stored = await RefreshToken.findOne({
      where: { user_id: decoded.id, token_hash: tokenHash, is_revoked: false },
    });
    if (!stored || stored.expires_at < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'User not found' });

    stored.is_revoked = true;
    await stored.save();

    const tokens = generateTokens(user);
    await saveRefreshToken(user.id, tokens.refreshToken);

    res.json(tokens);
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', verifyToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await RefreshToken.update({ is_revoked: true }, { where: { user_id: req.user.id, token_hash: tokenHash } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

// ── Google OAuth ──────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  async (req, res) => {
    try {
      const { accessToken, refreshToken } = generateTokens(req.user);
      await saveRefreshToken(req.user.id, refreshToken);
      await auditLogger({ organizationId: req.user.organization_id, userId: req.user.id, action: 'USER_LOGIN_OAUTH', entityType: 'user', entityId: req.user.id, metadata: { provider: 'google' }, ipAddress: req.ip });
      const params = new URLSearchParams({ accessToken, refreshToken });
      res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?${params}`);
    } catch (err) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    // Always respond OK so we don't leak user existence
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    // Generate a secure random token
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await user.update({ reset_token: token, reset_token_expires: expires });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Try to send email — non-fatal if email is not configured
    try {
      const { sendPasswordResetEmail } = require('../utils/mailer');
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
      console.log(`📧 Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      // Email not configured — print the reset link to the console for dev use
      console.warn(`⚠️  Email not configured. Use this reset link directly:`);
      console.warn(`🔗  ${resetUrl}`);
    }

    await auditLogger({ organizationId: user.organization_id, userId: user.id, action: 'PASSWORD_RESET_REQUESTED', entityType: 'user', entityId: user.id, ipAddress: req.ip });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await User.findOne({ where: { reset_token: token } });
    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await user.update({ password_hash, reset_token: null, reset_token_expires: null });

    // Revoke all refresh tokens for security
    await RefreshToken.update({ is_revoked: true }, { where: { user_id: user.id } });

    await auditLogger({ organizationId: user.organization_id, userId: user.id, action: 'PASSWORD_RESET_COMPLETED', entityType: 'user', entityId: user.id, ipAddress: req.ip });

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) { next(err); }
});

module.exports = router;
