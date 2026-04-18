import { useEffect, useState, useCallback } from 'react';
import {
  Activity as ActivityIcon, CheckSquare, Trash2, Pencil, Plus,
  UserPlus, Shield, LogIn, RefreshCw, MessageSquare, Paperclip
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const ACTION_ICON = {
  TASK_CREATED:    <Plus size={14} color="#22c55e" />,
  TASK_UPDATED:    <Pencil size={14} color="#3b82f6" />,
  TASK_DELETED:    <Trash2 size={14} color="#ef4444" />,
  COMMENT_ADDED:   <MessageSquare size={14} color="#a78bfa" />,
  USER_INVITED:    <UserPlus size={14} color="#6366f1" />,
  USER_DEACTIVATED:<Trash2 size={14} color="#f59e0b" />,
  USER_ROLE_CHANGED:<Shield size={14} color="#f59e0b" />,
  '2FA_ENABLED':   <Shield size={14} color="#22c55e" />,
  '2FA_DISABLED':  <Shield size={14} color="#ef4444" />,
  DEFAULT:         <ActivityIcon size={14} color="#64748b" />,
};

const ACTION_LABEL = {
  TASK_CREATED:    'created a task',
  TASK_UPDATED:    'updated a task',
  TASK_DELETED:    'deleted a task',
  COMMENT_ADDED:   'commented on a task',
  USER_INVITED:    'invited a user',
  USER_DEACTIVATED:'deactivated a user',
  USER_ROLE_CHANGED:'changed a user\'s role',
  '2FA_ENABLED':   'enabled 2FA',
  '2FA_DISABLED':  'disabled 2FA',
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Activity = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics/activity');
      setLogs(data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action.toLowerCase().includes(filter));

  const FILTERS = [
    { key: 'all',  label: 'All Activity' },
    { key: 'task', label: 'Tasks' },
    { key: 'user', label: 'Team' },
    { key: '2fa',  label: 'Security' },
  ];

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title"><ActivityIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Activity Feed</h1>
          <p className="page-subtitle">Organisation-wide changelog timeline</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogs} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: filter === f.key ? 'var(--accent)' : 'transparent',
              color: filter === f.key ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><ActivityIcon size={24} /></div>
            <div className="empty-title">No activity yet</div>
            <div className="empty-text">Actions taken in your organisation will appear here.</div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 27, top: 8, bottom: 8, width: 2, background: 'var(--border)', zIndex: 0 }} />

          {filtered.map((log, i) => {
            const icon = ACTION_ICON[log.action] || ACTION_ICON.DEFAULT;
            const label = ACTION_LABEL[log.action] || log.action.toLowerCase().replace(/_/g, ' ');
            const initials = log.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
            const meta = log.metadata || {};
            return (
              <div key={log.id} style={{ display: 'flex', gap: 14, marginBottom: 4, position: 'relative', zIndex: 1 }}>
                {/* Avatar bubble */}
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', border: '3px solid var(--bg-primary)', overflow: 'hidden' }}>
                  {log.user?.avatar ? <img src={log.user.avatar} alt={log.user.name} style={{ width: '100%', objectFit: 'cover' }} /> : initials}
                </div>

                {/* Content */}
                <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: meta.title || meta.taskId ? 4 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-secondary)', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{log.user?.name || 'System'}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{timeAgo(log.createdAt)}</span>
                  </div>
                  {(meta.title || meta.email) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 30 }}>
                      {meta.title && <span>"{meta.title}"</span>}
                      {meta.email && <span> {meta.email}</span>}
                      {meta.newRole && <span> → <strong style={{ color: 'var(--accent-light)' }}>{meta.newRole}</strong></span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Activity;
