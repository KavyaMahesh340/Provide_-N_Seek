const router = require('express').Router({ mergeParams: true });
const { Subtask, Task } = require('../models');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/tasks/:taskId/subtasks
router.get('/', async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.taskId, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const subtasks = await Subtask.findAll({
      where: { task_id: req.params.taskId, organization_id: req.organizationId },
      order: [['createdAt', 'ASC']],
    });
    res.json(subtasks);
  } catch (err) { next(err); }
});

// POST /api/tasks/:taskId/subtasks
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const task = await Task.findOne({ where: { id: req.params.taskId, organization_id: req.organizationId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const subtask = await Subtask.create({
      task_id: req.params.taskId,
      organization_id: req.organizationId,
      created_by: req.user.id,
      title: title.trim(),
    });
    res.status(201).json(subtask);
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:taskId/subtasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const subtask = await Subtask.findOne({
      where: { id: req.params.id, task_id: req.params.taskId, organization_id: req.organizationId },
    });
    if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.is_completed !== undefined) {
      updates.is_completed = req.body.is_completed;
      updates.completed_at = req.body.is_completed ? new Date() : null;
    }
    await subtask.update(updates);
    res.json(subtask);
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:taskId/subtasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const subtask = await Subtask.findOne({
      where: { id: req.params.id, task_id: req.params.taskId, organization_id: req.organizationId },
    });
    if (!subtask) return res.status(404).json({ error: 'Subtask not found' });
    await subtask.destroy();
    res.json({ message: 'Subtask deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
