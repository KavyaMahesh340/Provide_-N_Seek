const router = require('express').Router();
const { Task, User, AuditLog } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/analytics/summary
router.get('/summary', async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const tasks = await Task.findAll({ where: { organization_id: orgId } });
    const members = await User.findAll({ where: { organization_id: orgId, is_active: true } });

    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const in_progress = tasks.filter(t => t.status === 'in_progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const urgent = tasks.filter(t => t.priority === 'urgent').length;
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    const unassigned = tasks.filter(t => !t.assigned_to).length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Avg cycle time (days) for completed tasks with completed_at
    const completedWithTime = tasks.filter(t => t.status === 'done' && t.completed_at && t.createdAt);
    const avgCycleTime = completedWithTime.length > 0
      ? Math.round(completedWithTime.reduce((sum, t) => sum + (new Date(t.completed_at) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24), 0) / completedWithTime.length * 10) / 10
      : null;

    // Per-member stats
    const memberStats = members.map(m => ({
      id: m.id, name: m.name, email: m.email, avatar: m.avatar, role: m.role,
      assigned: tasks.filter(t => t.assigned_to === m.id).length,
      completed: tasks.filter(t => t.assigned_to === m.id && t.status === 'done').length,
      in_progress: tasks.filter(t => t.assigned_to === m.id && t.status === 'in_progress').length,
    })).sort((a, b) => b.assigned - a.assigned);

    // Weekly task creation (last 8 weeks)
    const now = new Date();
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now); start.setDate(start.getDate() - (7 * (7 - i)));
      const end = new Date(start); end.setDate(end.getDate() + 7);
      return { label: `Wk ${i + 1}`, start, end };
    });
    const weeklyCreated = weeks.map(w => ({
      label: w.label,
      created: tasks.filter(t => new Date(t.createdAt) >= w.start && new Date(t.createdAt) < w.end).length,
      completed: tasks.filter(t => t.status === 'done' && new Date(t.updatedAt) >= w.start && new Date(t.updatedAt) < w.end).length,
    }));

    res.json({
      totals: { total, done, in_progress, todo, review, urgent, high, medium, low, unassigned, overdue },
      completionRate, avgCycleTime,
      memberStats, weeklyCreated,
      memberCount: members.length,
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/activity  — recent audit events
router.get('/activity', async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      where: { organization_id: req.organizationId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// GET /api/analytics/export  — CSV download
router.get('/export', async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { organization_id: req.organizationId },
      include: [
        { model: User, as: 'creator', attributes: ['name', 'email'] },
        { model: User, as: 'assignee', attributes: ['name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const rows = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      tags: (t.tags || []).join('; '),
      created_by: t.creator?.name || '',
      assigned_to: t.assignee?.name || '',
      due_date: t.due_date ? new Date(t.due_date).toLocaleDateString() : '',
      created_at: new Date(t.createdAt).toLocaleDateString(),
      is_recurring: t.is_recurring ? 'Yes' : 'No',
      recurrence_pattern: t.recurrence_pattern || '',
    }));

    const fields = ['id', 'title', 'description', 'status', 'priority', 'tags', 'created_by', 'assigned_to', 'due_date', 'created_at', 'is_recurring', 'recurrence_pattern'];
    const csv = rows.length > 0
      ? [fields.join(','), ...rows.map(r => fields.map(f => `"${String(r[f] || '').replace(/"/g, '""')}"`).join(','))].join('\n')
      : fields.join(',');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

module.exports = router;
