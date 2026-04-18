const router = require('express').Router();
const { AuditLog, User } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('admin'));

// ── GET /api/audit ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entity_type } = req.query;
    const where = { organization_id: req.organizationId };
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: logs, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ logs, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (err) { next(err); }
});

module.exports = router;
