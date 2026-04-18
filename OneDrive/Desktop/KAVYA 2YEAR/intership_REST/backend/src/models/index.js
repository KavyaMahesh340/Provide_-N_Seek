const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// ─── Organization ─────────────────────────────────────────────
const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  logo: { type: DataTypes.STRING },
}, { tableName: 'organizations', timestamps: true });

// ─── User ─────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING },
  role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member', allowNull: false },
  avatar: { type: DataTypes.STRING },
  oauth_provider: { type: DataTypes.STRING },
  oauth_id: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  reset_token: { type: DataTypes.STRING },
  reset_token_expires: { type: DataTypes.DATE },
  // 2FA
  totp_secret: { type: DataTypes.STRING },
  totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Notification preferences (JSON stored as text)
  notif_prefs: {
    type: DataTypes.TEXT,
    defaultValue: '{"task_assigned":true,"task_mentioned":true,"task_due_soon":true,"digest":false}',
    get() { try { return JSON.parse(this.getDataValue('notif_prefs') || '{}'); } catch { return {}; } },
    set(val) { this.setDataValue('notif_prefs', JSON.stringify(val || {})); },
  },
}, { tableName: 'users', timestamps: true });

// ─── Task ──────────────────────────────────────────────────────
const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  created_by: { type: DataTypes.UUID, allowNull: false },
  assigned_to: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
    defaultValue: 'todo', allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium', allowNull: false,
  },
  due_date: { type: DataTypes.DATE },
  tags: {
    type: DataTypes.TEXT, defaultValue: '[]',
    get() { try { return JSON.parse(this.getDataValue('tags') || '[]'); } catch { return []; } },
    set(val) { this.setDataValue('tags', JSON.stringify(Array.isArray(val) ? val : [])); },
  },
  // Recurring tasks
  is_recurring: { type: DataTypes.BOOLEAN, defaultValue: false },
  recurrence_pattern: { type: DataTypes.STRING }, // 'daily','weekly','monthly'
  // Completion tracking
  completed_at: { type: DataTypes.DATE },
}, { tableName: 'tasks', timestamps: true });

// ─── Subtask ───────────────────────────────────────────────────
const Subtask = sequelize.define('Subtask', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  task_id: { type: DataTypes.UUID, allowNull: false },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  created_by: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: { type: DataTypes.DATE },
}, { tableName: 'subtasks', timestamps: true });

// ─── Comment ───────────────────────────────────────────────────
const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  task_id: { type: DataTypes.UUID, allowNull: false },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  mentions: {
    type: DataTypes.TEXT, defaultValue: '[]',
    get() { try { return JSON.parse(this.getDataValue('mentions') || '[]'); } catch { return []; } },
    set(val) { this.setDataValue('mentions', JSON.stringify(Array.isArray(val) ? val : [])); },
  },
}, { tableName: 'comments', timestamps: true, updatedAt: false });

// ─── TaskAttachment ────────────────────────────────────────────
const TaskAttachment = sequelize.define('TaskAttachment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  task_id: { type: DataTypes.UUID, allowNull: false },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  uploaded_by: { type: DataTypes.UUID, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING, allowNull: false },
  mime_type: { type: DataTypes.STRING },
  size_bytes: { type: DataTypes.INTEGER },
  path: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'task_attachments', timestamps: true, updatedAt: false });

// ─── Notification ──────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false }, // task_assigned, mentioned, due_soon, task_updated
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT },
  entity_type: { type: DataTypes.STRING }, // task, comment
  entity_id: { type: DataTypes.UUID },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: { type: DataTypes.DATE },
}, { tableName: 'notifications', timestamps: true, updatedAt: false });

// ─── Webhook ───────────────────────────────────────────────────
const Webhook = sequelize.define('Webhook', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  events: {
    type: DataTypes.TEXT, defaultValue: '["task.created","task.updated","task.deleted"]',
    get() { try { return JSON.parse(this.getDataValue('events') || '[]'); } catch { return []; } },
    set(val) { this.setDataValue('events', JSON.stringify(Array.isArray(val) ? val : [])); },
  },
  secret: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_triggered_at: { type: DataTypes.DATE },
  delivery_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'webhooks', timestamps: true });

// ─── ApiKey ────────────────────────────────────────────────────
const ApiKey = sequelize.define('ApiKey', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  created_by: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  key_prefix: { type: DataTypes.STRING, allowNull: false }, // e.g. "tf_live_abc123"
  key_hash: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_used_at: { type: DataTypes.DATE },
  expires_at: { type: DataTypes.DATE },
}, { tableName: 'api_keys', timestamps: true });

// ─── OrgSettings ───────────────────────────────────────────────
const OrgSettings = sequelize.define('OrgSettings', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  feature_flags: {
    type: DataTypes.TEXT,
    defaultValue: '{"subtasks":true,"file_attachments":true,"comments":true,"webhooks":false,"api_keys":false,"recurring_tasks":false,"two_factor":false}',
    get() { try { return JSON.parse(this.getDataValue('feature_flags') || '{}'); } catch { return {}; } },
    set(val) { this.setDataValue('feature_flags', JSON.stringify(val || {})); },
  },
  allowed_ips: {
    type: DataTypes.TEXT, defaultValue: '[]',
    get() { try { return JSON.parse(this.getDataValue('allowed_ips') || '[]'); } catch { return []; } },
    set(val) { this.setDataValue('allowed_ips', JSON.stringify(Array.isArray(val) ? val : [])); },
  },
  max_members: { type: DataTypes.INTEGER, defaultValue: 50 },
  plan: { type: DataTypes.STRING, defaultValue: 'free' }, // free, pro, enterprise
}, { tableName: 'org_settings', timestamps: true });

// ─── AuditLog ──────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organization_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID },
  action: { type: DataTypes.STRING, allowNull: false },
  entity_type: { type: DataTypes.STRING, allowNull: false },
  entity_id: { type: DataTypes.UUID },
  metadata: {
    type: DataTypes.TEXT, defaultValue: '{}',
    get() { try { return JSON.parse(this.getDataValue('metadata') || '{}'); } catch { return {}; } },
    set(val) { this.setDataValue('metadata', JSON.stringify(val || {})); },
  },
  ip_address: { type: DataTypes.STRING },
}, { tableName: 'audit_logs', timestamps: true, updatedAt: false });

// ─── RefreshToken ──────────────────────────────────────────────
const RefreshToken = sequelize.define('RefreshToken', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  token_hash: { type: DataTypes.STRING, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'refresh_tokens', timestamps: true, updatedAt: false });

// ─── Associations ──────────────────────────────────────────────
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'members' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(Task, { foreignKey: 'organization_id', as: 'tasks' });
Task.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Subtasks
Task.hasMany(Subtask, { foreignKey: 'task_id', as: 'subtasks' });
Subtask.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(Subtask, { foreignKey: 'created_by', as: 'createdSubtasks' });
Subtask.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Comments
Task.hasMany(Comment, { foreignKey: 'task_id', as: 'comments' });
Comment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Attachments
Task.hasMany(TaskAttachment, { foreignKey: 'task_id', as: 'attachments' });
TaskAttachment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskAttachment, { foreignKey: 'uploaded_by', as: 'uploads' });
TaskAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Webhooks
Organization.hasMany(Webhook, { foreignKey: 'organization_id', as: 'webhooks' });
Webhook.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// ApiKeys
Organization.hasMany(ApiKey, { foreignKey: 'organization_id', as: 'apiKeys' });
ApiKey.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
User.hasMany(ApiKey, { foreignKey: 'created_by', as: 'apiKeys' });
ApiKey.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// OrgSettings
Organization.hasOne(OrgSettings, { foreignKey: 'organization_id', as: 'settings' });
OrgSettings.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// AuditLog
Organization.hasMany(AuditLog, { foreignKey: 'organization_id', as: 'auditLogs' });
AuditLog.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// RefreshTokens
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  Organization, User, Task, Subtask, Comment, TaskAttachment,
  Notification, Webhook, ApiKey, OrgSettings, AuditLog, RefreshToken,
  sequelize,
};
