const router = require('express').Router();
const { ApiKey, User } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

router.use(verifyToken);
router.use(requireRole('admin'));

const generateKey = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const prefix = 'tf_' + raw.slice(0, 8);
  const full = prefix + '_' + raw.slice(8);
  return { full, prefix };
};

// GET /api/keys
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKey.findAll({
      where: { organization_id: req.organizationId },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    // Never return key_hash, show only prefix
    res.json(keys.map(k => ({ ...k.toJSON(), key_hash: undefined })));
  } catch (err) { next(err); }
});

// POST /api/keys
router.post('/', async (req, res, next) => {
  try {
    const { name, expires_in_days } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Key name is required' });

    const { full, prefix } = generateKey();
    const key_hash = await bcrypt.hash(full, 10);
    const expires_at = expires_in_days ? new Date(Date.now() + expires_in_days * 86400000) : null;

    const apiKey = await ApiKey.create({
      organization_id: req.organizationId,
      created_by: req.user.id,
      name, key_prefix: prefix, key_hash, expires_at,
    });

    // Only return the full key once — cannot be retrieved again
    res.status(201).json({ ...apiKey.toJSON(), key_hash: undefined, full_key: full, prefix });
  } catch (err) { next(err); }
});

// DELETE /api/keys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!key) return res.status(404).json({ error: 'API key not found' });
    await key.destroy();
    res.json({ message: 'API key revoked' });
  } catch (err) { next(err); }
});

module.exports = router;
