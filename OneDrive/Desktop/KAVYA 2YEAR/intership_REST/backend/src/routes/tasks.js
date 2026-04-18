const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { Task, User, TaskAttachment } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const { sendNotification, fireWebhooks } = require('../utils/notifications');
const { Op } = require('sequelize');
const multer = require('multer');

// ── File Upload Setup ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// All task routes require authentication
router.use(verifyToken);

const TASK_INCLUDE = [
  { model: User, as: 'creator',  attributes: ['id', 'name', 'email', 'avatar'] },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] },
];

// ── GET /api/tasks ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, assigned_to, search, page = 1, limit = 20 } = req.query;
    const where = { organization_id: req.organizationId };

    if (status)      where.status   = status;
    if (priority)    where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;
    if (search)      where.title    = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: tasks, count } = await Task.findAndCountAll({
      where, include: TASK_INCLUDE,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset,
    });

    res.json({ tasks, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (err) { next(err); }
});

// ── GET /api/tasks/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, organization_id: req.organizationId },
      include: [
        ...TASK_INCLUDE,
        { model: TaskAttachment, as: 'attachments', include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }] },
      ],
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
});

// ── POST /api/tasks ───────────────────────────────────────────
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, status, priority, due_date, assigned_to, tags, is_recurring, recurrence_pattern } = req.body;
    const task = await Task.create({
      title, description, status, priority, due_date, assigned_to, tags,
      is_recurring: !!is_recurring, recurrence_pattern,
      organization_id: req.organizationId,
      created_by: req.user.id,
    });

    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'TASK_CREATED', entityType: 'task', entityId: task.id, metadata: { title }, ipAddress: req.ip });

    // Notify assignee
    if (assigned_to && assigned_to !== req.user.id) {
      const assignee = await User.findByPk(assigned_to);
      if (assignee) {
        await sendNotification({
          userId: assigned_to,
          organizationId: req.organizationId,
          type: 'task_assigned',
          title: `Task assigned: "${title}"`,
          message: `${req.user.name} assigned you a task`,
          entityType: 'task', entityId: task.id,
          sendEmail: true, email: assignee.email,
          emailSubject: `New task assigned: ${title}`,
        });
      }
    }

    await fireWebhooks(req.organizationId, 'task.created', { taskId: task.id, title, created_by: req.user.id });

    const full = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    res.status(201).json(full);
  } catch (err) { next(err); }
});

// ── PATCH /api/tasks/:id ──────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit tasks you created' });
    }

    const allowed = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to', 'tags', 'is_recurring', 'recurrence_pattern'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Track completion time
    if (updates.status === 'done' && task.status !== 'done') updates.completed_at = new Date();
    if (updates.status && updates.status !== 'done') updates.completed_at = null;

    const prevAssignee = task.assigned_to;
    const before = { status: task.status, priority: task.priority, assigned_to: task.assigned_to };
    await task.update(updates);

    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'TASK_UPDATED', entityType: 'task', entityId: task.id, metadata: { before, after: updates }, ipAddress: req.ip });

    // Notify new assignee
    if (updates.assigned_to && updates.assigned_to !== prevAssignee && updates.assigned_to !== req.user.id) {
      const assignee = await User.findByPk(updates.assigned_to);
      if (assignee) {
        await sendNotification({
          userId: updates.assigned_to,
          organizationId: req.organizationId,
          type: 'task_assigned',
          title: `Task assigned: "${task.title}"`,
          message: `${req.user.name} assigned you this task`,
          entityType: 'task', entityId: task.id,
          sendEmail: true, email: assignee.email,
        });
      }
    }

    await fireWebhooks(req.organizationId, 'task.updated', { taskId: task.id, updates, updated_by: req.user.id });

    const full = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    res.json(full);
  } catch (err) { next(err); }
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete tasks you created' });
    }

    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'TASK_DELETED', entityType: 'task', entityId: task.id, metadata: { title: task.title }, ipAddress: req.ip });
    await fireWebhooks(req.organizationId, 'task.deleted', { taskId: task.id, title: task.title });
    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) { next(err); }
});

// ── POST /api/tasks/:id/attachments ───────────────────────────
router.post('/:id/attachments', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const task = await Task.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const attachment = await TaskAttachment.create({
      task_id: req.params.id,
      organization_id: req.organizationId,
      uploaded_by: req.user.id,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      path: req.file.path,
    });

    res.status(201).json({ ...attachment.toJSON(), download_url: `/api/tasks/${req.params.id}/attachments/${attachment.id}/download` });
  } catch (err) { next(err); }
});

// ── GET /api/tasks/:id/attachments ────────────────────────────
router.get('/:id/attachments', async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const attachments = await TaskAttachment.findAll({
      where: { task_id: req.params.id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(attachments.map(a => ({ ...a.toJSON(), download_url: `/api/tasks/${req.params.id}/attachments/${a.id}/download` })));
  } catch (err) { next(err); }
});

// ── GET /api/tasks/:id/attachments/:attId/download ───────────
router.get('/:id/attachments/:attId/download', async (req, res, next) => {
  try {
    const att = await TaskAttachment.findOne({ where: { id: req.params.attId, task_id: req.params.id } });
    if (!att) return res.status(404).json({ error: 'Attachment not found' });
    res.download(att.path, att.original_name);
  } catch (err) { next(err); }
});

// ── DELETE /api/tasks/:id/attachments/:attId ─────────────────
router.delete('/:id/attachments/:attId', async (req, res, next) => {
  try {
    const att = await TaskAttachment.findOne({ where: { id: req.params.attId, task_id: req.params.id, organization_id: req.organizationId } });
    if (!att) return res.status(404).json({ error: 'Attachment not found' });
    if (att.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete another user\'s attachment' });
    }
    try { fs.unlinkSync(att.path); } catch {}
    await att.destroy();
    res.json({ message: 'Attachment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
