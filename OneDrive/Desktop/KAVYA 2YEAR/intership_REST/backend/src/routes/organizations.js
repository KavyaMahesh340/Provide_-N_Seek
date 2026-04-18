const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Organization, User } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');

router.use(verifyToken);

// ── GET /api/organizations/me ─────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.organizationId, {
      include: [{ model: User, as: 'members', attributes: { exclude: ['password_hash'] } }],
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) { next(err); }
});

// ── PATCH /api/organizations/me ── admin updates org details ──
router.patch('/me', requireRole('admin'), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const org = await Organization.findByPk(req.organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const { name, description, logo } = req.body;
    await org.update({ name, description, logo });

    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'ORG_UPDATED', entityType: 'organization', entityId: org.id, metadata: { name }, ipAddress: req.ip });

    res.json(org);
  } catch (err) { next(err); }
});

module.exports = router;
