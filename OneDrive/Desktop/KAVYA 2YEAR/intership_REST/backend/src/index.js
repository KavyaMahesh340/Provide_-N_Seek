require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');

const authRoutes    = require('./routes/auth');
const taskRoutes    = require('./routes/tasks');
const userRoutes    = require('./routes/users');
const orgRoutes     = require('./routes/organizations');
const auditRoutes   = require('./routes/audit');
const commentRoutes = require('./routes/comments');
const subtaskRoutes = require('./routes/subtasks');
const { router: notifRouter } = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes   = require('./routes/webhooks');
const apikeyRoutes    = require('./routes/apikeys');
const settingsRoutes  = require('./routes/settings');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & Logging ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// ── Rate Limiting ──────────────────────────────────────────────
const limiter     = rateLimit({ windowMs: 15 * 60 * 1000, max: 300,  message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,   message: { error: 'Too many auth attempts' } });
app.use('/api/', limiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ── Static file serving for attachments ───────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health Check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/tasks',                        taskRoutes);
app.use('/api/tasks/:taskId/comments',       commentRoutes);
app.use('/api/tasks/:taskId/subtasks',       subtaskRoutes);
app.use('/api/users',                        userRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/notifications', notifRouter);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/webhooks',      webhookRoutes);
app.use('/api/keys',          apikeyRoutes);
app.use('/api/settings',      settingsRoutes);

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error Handler ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    const isPostgres = process.env.NODE_ENV === 'production' && process.env.DB_HOST;
    // Force sync to drop & recreate tables in dev when schema changes
    await sequelize.sync({ force: process.env.NODE_ENV !== 'production' });
    console.log('✅ Models synchronized');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
};

start();
