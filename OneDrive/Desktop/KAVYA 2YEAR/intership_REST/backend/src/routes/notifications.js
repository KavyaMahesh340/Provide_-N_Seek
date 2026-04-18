const router = require('express').Router();
const { Notification, User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// ── SSE client registry ───────────────────────────────────────
const sseClients = new Map();

const addClient = (userId, res) => {
  if (!sseClients.has(userId)) sseClients.set(userId, []);
  sseClients.get(userId).push(res);
};
const removeClient = (userId, res) => {
  if (!sseClients.has(userId)) return;
  sseClients.set(userId, sseClients.get(userId).filter(r => r !== res));
};

const pushToUser = (userId, event, data) => {
  const clients = sseClients.get(String(userId)) || [];
  clients.forEach(res => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  });
};

const pushToOrg = (organizationId, userIds, event, data) => {
  userIds.forEach(uid => pushToUser(uid, event, data));
};

module.exports.sseClients = sseClients;
module.exports.pushToUser = pushToUser;
module.exports.pushToOrg  = pushToOrg;

// ── GET /api/notifications/stream — SSE (MUST be before verifyToken) ─
// EventSource cannot send Authorization headers, so we accept ?token=
router.get('/stream', async (req, res) => {
  const token = req.query.token || (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).end();

  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).end(); }

  const user = await User.findByPk(decoded.id, { attributes: ['id', 'is_active'] }).catch(() => null);
  if (!user || !user.is_active) return res.status(401).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control',  'no-cache');
  res.setHeader('Connection',     'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = String(user.id);
  addClient(userId, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 25000);

  req.on('close', () => { clearInterval(heartbeat); removeClient(userId, res); });
});

// ── All routes below require JWT via Authorization header ─────
router.use(verifyToken);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { limit = 30, unread_only } = req.query;
    const where = { user_id: req.user.id, organization_id: req.organizationId };
    if (unread_only === 'true') where.is_read = false;

    const notifications = await Notification.findAll({
      where, order: [['createdAt', 'DESC']], limit: parseInt(limit),
    });
    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, organization_id: req.organizationId, is_read: false },
    });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all  (must be before /:id/read to avoid route conflict)
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, organization_id: req.organizationId, is_read: false } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    await notif.update({ is_read: true, read_at: new Date() });
    res.json(notif);
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
});

module.exports.router = router;
