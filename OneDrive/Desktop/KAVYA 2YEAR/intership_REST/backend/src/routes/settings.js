const router = require('express').Router();
const { OrgSettings } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/settings  (all users can read)
router.get('/', async (req, res, next) => {
  try {
    let settings = await OrgSettings.findOne({ where: { organization_id: req.organizationId } });
    if (!settings) {
      settings = await OrgSettings.create({ organization_id: req.organizationId });
    }
    res.json(settings);
  } catch (err) { next(err); }
});

// PATCH /api/settings  (admin only)
router.patch('/', requireRole('admin'), async (req, res, next) => {
  try {
    let settings = await OrgSettings.findOne({ where: { organization_id: req.organizationId } });
    if (!settings) settings = await OrgSettings.create({ organization_id: req.organizationId });

    const { feature_flags, allowed_ips, max_members, plan } = req.body;
    const updates = {};
    if (feature_flags !== undefined) updates.feature_flags = feature_flags;
    if (allowed_ips !== undefined) updates.allowed_ips = allowed_ips;
    if (max_members !== undefined) updates.max_members = max_members;
    if (plan !== undefined) updates.plan = plan;

    await settings.update(updates);
    res.json(settings);
  } catch (err) { next(err); }
});

module.exports = router;
