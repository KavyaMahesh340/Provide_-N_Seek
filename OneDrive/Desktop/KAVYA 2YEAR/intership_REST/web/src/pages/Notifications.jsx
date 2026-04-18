import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, RefreshCw, AlertCircle, CheckSquare, MessageSquare, User } from 'lucide-react';
import api from '../api/axios';

const TYPE_ICONS = {
  task_assigned:  <CheckSquare size={15} color="#6366f1" />,
  mentioned:      <MessageSquare size={15} color="#a78bfa" />,
  task_commented: <MessageSquare size={15} color="#3b82f6" />,
  due_soon:       <AlertCircle size={15} color="#f59e0b" />,
  task_updated:   <CheckSquare size={15} color="#22c55e" />,
  default:        <Bell size={15} color="#64748b" />,
};

const NotifItem = ({ notif, onRead, onDelete }) => {
  const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
  const timeAgo = (() => {
    const diff = (Date.now() - new Date(notif.createdAt)) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  })();

  return (
    <div className={`notif-item${notif.is_read ? ' notif-read' : ''}`}>
      <div className="notif-icon">{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{notif.title}</div>
        {notif.message && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{notif.message}</div>}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!notif.is_read && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onRead(notif.id)} title="Mark as read">
            <Check size={13} />
          </button>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(notif.id)} title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
      {!notif.is_read && <div className="notif-dot" />}
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all'); // all | unread

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications?limit=50${filter === 'unread' ? '&unread_only=true' : ''}`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const handleRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleReadAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    await api.delete(`/notifications/${id}`).catch(() => {});
    const deleted = notifications.find(x => x.id === id);
    setNotifications(n => n.filter(x => x.id !== id));
    if (deleted && !deleted.is_read) setUnreadCount(c => Math.max(0, c - 1));
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={22} /> Notifications
            {unreadCount > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="page-subtitle">Stay on top of task updates, mentions, and team activity</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleReadAll}>
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
          <button className="btn btn-ghost" onClick={fetchNotifs}><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[{ key: 'all', label: 'All' }, { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` }].map(t => (
          <button
            key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filter === t.key ? 'var(--accent)' : 'transparent', color: filter === t.key ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Bell size={24} /></div>
            <div className="empty-title">{filter === 'unread' ? 'You\'re all caught up!' : 'No notifications yet'}</div>
            <div className="empty-text">Activity like task assignments and mentions will appear here.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map(n => (
            <NotifItem key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
