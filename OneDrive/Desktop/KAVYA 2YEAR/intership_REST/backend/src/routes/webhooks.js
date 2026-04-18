const router = require('express').Router();
const { Webhook } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/webhooks
router.get('/', async (req, res, next) => {
  try {
    const webhooks = await Webhook.findAll({ where: { organization_id: req.organizationId }, order: [['createdAt', 'DESC']] });
    res.json(webhooks);
  } catch (err) { next(err); }
});

// POST /api/webhooks
router.post('/', async (req, res, next) => {
  try {
    const { name, url, events } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const secret = crypto.randomBytes(24).toString('hex');
    const webhook = await Webhook.create({
      organization_id: req.organizationId,
      name, url,
      events: events || ['task.created', 'task.updated', 'task.deleted'],
      secret,
    });
    res.status(201).json({ ...webhook.toJSON(), secret }); // Only expose secret on creation
  } catch (err) { next(err); }
});

// PATCH /api/webhooks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    const { name, url, events, is_active } = req.body;
    await webhook.update({ name, url, events, is_active });
    res.json(webhook);
  } catch (err) { next(err); }
});

// DELETE /api/webhooks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    await webhook.destroy();
    res.json({ message: 'Webhook deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
