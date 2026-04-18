const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');

// ── Verify JWT ──────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'slug'] }],
    });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.organizationId = user.organization_id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Require Role ────────────────────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

// ── Ensure Same Org ─────────────────────────────────────────────
const requireSameOrg = (req, res, next) => {
  const targetOrgId = req.params.orgId || req.body.organization_id;
  if (targetOrgId && targetOrgId !== req.organizationId) {
    return res.status(403).json({ error: 'Cross-organization access denied' });
  }
  next();
};

module.exports = { verifyToken, requireRole, requireSameOrg };
