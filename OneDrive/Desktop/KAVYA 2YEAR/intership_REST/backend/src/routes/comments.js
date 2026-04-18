const router = require('express').Router({ mergeParams: true });
const { Comment, User, Notification, Task } = require('../models');
const { verifyToken } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const { sendNotification } = require('../utils/notifications');

router.use(verifyToken);

// GET /api/tasks/:taskId/comments
router.get('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findOne({ where: { id: taskId, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comments = await Comment.findAll({
      where: { task_id: taskId, organization_id: req.organizationId },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(comments);
  } catch (err) { next(err); }
});

// POST /api/tasks/:taskId/comments
router.post('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content, mentions = [] } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const task = await Task.findOne({ where: { id: taskId, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comment = await Comment.create({
      task_id: taskId,
      organization_id: req.organizationId,
      user_id: req.user.id,
      content: content.trim(),
      mentions,
    });

    // Notify mentioned users
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== req.user.id) {
        await sendNotification({
          userId: mentionedUserId,
          organizationId: req.organizationId,
          type: 'mentioned',
          title: `${req.user.name} mentioned you`,
          message: `In task "${task.title}": ${content.slice(0, 100)}`,
          entityType: 'task',
          entityId: taskId,
        });
      }
    }

    // Notify task assignee if different
    if (task.assigned_to && task.assigned_to !== req.user.id && !mentions.includes(task.assigned_to)) {
      await sendNotification({
        userId: task.assigned_to,
        organizationId: req.organizationId,
        type: 'task_commented',
        title: `New comment on "${task.title}"`,
        message: `${req.user.name}: ${content.slice(0, 100)}`,
        entityType: 'task',
        entityId: taskId,
      });
    }

    await auditLogger({ organizationId: req.organizationId, userId: req.user.id, action: 'COMMENT_ADDED', entityType: 'comment', entityId: comment.id, metadata: { taskId }, ipAddress: req.ip });

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar'] }],
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:taskId/comments/:commentId
router.delete('/:commentId', async (req, res, next) => {
  try {
    const comment = await Comment.findOne({
      where: { id: req.params.commentId, task_id: req.params.taskId, organization_id: req.organizationId },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete another user\'s comment' });
    }
    await comment.destroy();
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
