import { useState, useEffect } from 'react';
import { ClipboardList, Filter, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const ACTION_ICONS = {
  TASK_CREATED: '✅', TASK_UPDATED: '✏️', TASK_DELETED: '🗑️',
  USER_REGISTERED: '🎉', USER_LOGIN: '🔑', USER_LOGIN_OAUTH: '🔑',
  USER_INVITED: '📧', USER_ROLE_CHANGED: '🛡️', USER_DEACTIVATED: '❌',
  ORG_UPDATED: '🏢',
};

const ACTION_COLORS = {
  TASK_CREATED: 'var(--success)', TASK_UPDATED: 'var(--accent-light)', TASK_DELETED: 'var(--danger)',
  USER_REGISTERED: 'var(--success)', USER_INVITED: 'var(--info)', USER_ROLE_CHANGED: 'var(--warning)',
  USER_DEACTIVATED: 'var(--danger)', ORG_UPDATED: 'var(--info)',
};

const AuditLog = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filterAction) params.set('action', filterAction);
      const { data } = await api.get(`/audit?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { toast('Failed to load audit logs', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Track every action taken within your organization</p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {total} total events
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <select className="form-select" style={{ width: 200 }} value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_ICONS).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        {filterAction && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterAction(''); setPage(1); }}><X size={14} /> Clear</button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList size={24} /></div>
            <div className="empty-title">No audit logs</div>
            <div className="empty-text">Actions will appear here once they happen</div>
          </div>
        ) : (
          <div>
            {logs.map((log, idx) => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 24px',
                borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Avatar */}
                <div className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0, marginTop: 2 }}>
                  {log.user?.avatar ? <img src={log.user.avatar} alt={log.user.name} /> : initials(log.user?.name || 'S')}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{log.user?.name || 'System'}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: `${ACTION_COLORS[log.action] || 'var(--text-muted)'}20`,
                      color: ACTION_COLORS[log.action] || 'var(--text-muted)',
                      border: `1px solid ${ACTION_COLORS[log.action] || 'var(--text-muted)'}30`,
                    }}>
                      {ACTION_ICONS[log.action] || '•'} {log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right', marginTop: 3 }}>
                  {formatTime(log.createdAt)}
                  {log.ip_address && <div style={{ marginTop: 2 }}>{log.ip_address}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 0' }}>
            Page {page} of {Math.ceil(total / LIMIT)}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
