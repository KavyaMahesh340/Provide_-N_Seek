import { useState, useEffect } from 'react';
import {
  Video, Plus, X, Copy, ExternalLink, Calendar,
  Clock, Users, Link2, CheckCircle2, Trash2, Edit3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

/* ─── Storage key ────────────────────────────────────────────── */
const STORAGE_KEY = 'taskflow_gmeet_sessions';

const loadMeetings = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveMeetings = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const isMeetLink = (url) =>
  /^https?:\/\/(meet\.google\.com|meet\.google\.co\.in)\//.test(url.trim());

const statusOf = (isoDatetime) => {
  const t = new Date(isoDatetime).getTime();
  const now = Date.now();
  if (t < now - 60 * 60 * 1000) return 'ended';
  if (t <= now + 15 * 60 * 1000) return 'live';
  return 'upcoming';
};

const StatusBadge = ({ status }) => {
  const map = {
    live:     { text: '🔴 Live',     bg: 'rgba(239,68,68,0.15)',    color: '#f87171',   border: 'rgba(239,68,68,0.35)' },
    upcoming: { text: '🟢 Upcoming', bg: 'rgba(16,185,129,0.12)',   color: '#34d399',   border: 'rgba(16,185,129,0.3)' },
    ended:    { text: '⚫ Ended',    bg: 'rgba(100,116,139,0.15)',  color: '#94a3b8',   border: 'rgba(100,116,139,0.3)' },
  };
  const s = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.text}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const GoogleMeet = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [meetings, setMeetings] = useState(loadMeetings);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | upcoming | live | ended

  const emptyForm = {
    title: '',
    description: '',
    scheduled_at: '',
    meet_link: '',
    agenda: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  /* Persist on change */
  useEffect(() => { saveMeetings(meetings); }, [meetings]);

  /* Refresh statuses every 30s */
  useEffect(() => {
    const id = setInterval(() => setMeetings(m => [...m]), 30000);
    return () => clearInterval(id);
  }, []);

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.title.trim())       e.title       = 'Title is required';
    if (!form.scheduled_at)       e.scheduled_at = 'Date & time is required';
    if (!form.meet_link.trim())   e.meet_link   = 'Google Meet link is required';
    else if (!isMeetLink(form.meet_link))
      e.meet_link = 'Must be a valid meet.google.com link';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Save (create / edit) ── */
  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (editId) {
      setMeetings(m => m.map(x => x.id === editId ? { ...x, ...form, updated_at: new Date().toISOString() } : x));
      toast('Meeting updated!', 'success');
    } else {
      const newMeeting = {
        id: Date.now().toString(),
        ...form,
        meet_link: form.meet_link.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMeetings(m => [newMeeting, ...m]);
      toast('Meeting scheduled! 🎉', 'success');
    }
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
  };

  /* ── Open edit ── */
  const openEdit = (meeting) => {
    setEditId(meeting.id);
    setForm({
      title:        meeting.title,
      description:  meeting.description,
      scheduled_at: meeting.scheduled_at,
      meet_link:    meeting.meet_link,
      agenda:       meeting.agenda,
    });
    setErrors({});
    setShowModal(true);
  };

  /* ── Delete ── */
  const handleDelete = (id) => {
    setMeetings(m => m.filter(x => x.id !== id));
    toast('Meeting removed', 'info');
  };

  /* ── Copy link ── */
  const copyLink = (id, link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      toast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  /* ── Filtered list ── */
  const filtered = meetings.filter(m => {
    if (filter === 'all') return true;
    return statusOf(m.scheduled_at) === filter;
  });

  /* ─── UI ─────────────────────────────────────────── */
  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Video size={26} style={{ color: 'var(--accent-light)' }} />
            Google Meet Scheduler
          </h1>
          <p className="page-subtitle">Schedule and share Google Meet sessions with your team</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(emptyForm); setErrors({}); setShowModal(true); }}>
            <Plus size={16} /> Schedule Meet
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24,
        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
        padding: 6, border: '1px solid var(--border)', width: 'fit-content',
      }}>
        {['all', 'live', 'upcoming', 'ended'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'var(--transition)',
              background: filter === f ? 'var(--nav-active-bg)' : 'transparent',
              color: filter === f ? 'var(--accent-light)' : 'var(--text-muted)',
              boxShadow: filter === f ? '0 0 10px var(--accent-glow)' : 'none',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Meetings',  value: meetings.length,                              color: 'indigo', icon: <Calendar size={20}/> },
          { label: 'Live Now',        value: meetings.filter(m => statusOf(m.scheduled_at) === 'live').length,     color: 'red',    icon: <Video size={20}/> },
          { label: 'Upcoming',        value: meetings.filter(m => statusOf(m.scheduled_at) === 'upcoming').length, color: 'green',  icon: <Clock size={20}/> },
          { label: 'Ended',           value: meetings.filter(m => statusOf(m.scheduled_at) === 'ended').length,    color: 'amber',  icon: <CheckCircle2 size={20}/> },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-icon" style={{ width: 64, height: 64 }}>
              <Video size={28} />
            </div>
            <div className="empty-title">No meetings {filter !== 'all' ? `(${filter})` : ''}</div>
            <div className="empty-text" style={{ marginBottom: 20 }}>
              {isAdmin
                ? 'Schedule a Google Meet to get started. Share the link with your team instantly.'
                : 'No meeting sessions have been scheduled yet. Check back soon!'}
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(emptyForm); setErrors({}); setShowModal(true); }}>
                <Plus size={15} /> Schedule a Meeting
              </button>
            )}
          </div>
        </div>
      )}

      {/* Meetings grid */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map(meeting => {
            const st = statusOf(meeting.scheduled_at);
            return (
              <div
                key={meeting.id}
                className="card"
                style={{
                  padding: 0, overflow: 'hidden', transition: 'var(--transition)',
                  borderColor: st === 'live' ? 'rgba(239,68,68,0.4)' : undefined,
                  boxShadow: st === 'live' ? '0 0 20px rgba(239,68,68,0.15)' : undefined,
                }}
              >
                {/* Top accent bar */}
                <div style={{
                  height: 4,
                  background: st === 'live'
                    ? 'linear-gradient(90deg,#ef4444,#f87171)'
                    : st === 'upcoming'
                    ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : 'linear-gradient(90deg,#475569,#64748b)',
                }} />

                <div style={{ padding: 24 }}>
                  {/* Header row */}
                  <div className="flex-between" style={{ marginBottom: 14 }}>
                    <StatusBadge status={st} />
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {st !== 'ended' && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => openEdit(meeting)}
                            title="Edit meeting"
                            style={{ padding: '5px 8px' }}
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleDelete(meeting.id)}
                          title="Delete meeting"
                          style={{ padding: '5px 8px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                    {meeting.title}
                  </h3>

                  {/* Description */}
                  {meeting.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {meeting.description}
                    </p>
                  )}

                  {/* Date / Time */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <Calendar size={13} style={{ color: 'var(--accent)' }} />
                      {fmtDate(meeting.scheduled_at)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <Clock size={13} style={{ color: 'var(--accent)' }} />
                      {fmtTime(meeting.scheduled_at)}
                    </div>
                  </div>

                  {/* Agenda pill */}
                  {meeting.agenda && (
                    <div style={{
                      fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16,
                      background: 'var(--bg-secondary)', borderRadius: 8,
                      padding: '8px 12px', border: '1px solid var(--border)',
                      lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-light)' }}>Agenda: </span>
                      {meeting.agenda}
                    </div>
                  )}

                  {/* Meet link box */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <Link2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, color: 'var(--text-secondary)',
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {meeting.meet_link}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ padding: '4px 7px', fontSize: 11 }}
                        onClick={() => copyLink(meeting.id, meeting.meet_link)}
                        title="Copy link"
                      >
                        {copiedId === meeting.id
                          ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                          : <Copy size={14} />}
                      </button>
                      <a
                        href={meeting.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-icon"
                        style={{ padding: '4px 7px' }}
                        title="Open in new tab"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Join button */}
                  {st !== 'ended' && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        marginTop: 14,
                        padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
                        background: st === 'live'
                          ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                          : 'var(--btn-primary-bg)',
                        color: 'white', textDecoration: 'none',
                        boxShadow: st === 'live'
                          ? '0 4px 18px rgba(239,68,68,0.4)'
                          : '0 4px 18px var(--btn-primary-shadow)',
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                      <Video size={15} />
                      {st === 'live' ? 'Join Now' : 'Join Meeting'}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────── */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={e => e.target === e.currentTarget && (setShowModal(false), setEditId(null))}
        >
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Video size={20} style={{ color: 'var(--accent-light)' }} />
                {editId ? 'Edit Meeting' : 'Schedule Google Meet'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); setEditId(null); }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Meeting Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Sprint Planning Q2"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
                {errors.title && <div className="form-error">{errors.title}</div>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="What is this meeting about?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ minHeight: 72 }}
                />
              </div>

              {/* Date & time */}
              <div className="form-group">
                <label className="form-label">Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
                {errors.scheduled_at && <div className="form-error">{errors.scheduled_at}</div>}
              </div>

              {/* Google Meet link */}
              <div className="form-group">
                <label className="form-label">Google Meet Link *</label>
                <div className="input-icon-wrap">
                  <Link2 className="form-icon" size={16} />
                  <input
                    className="form-input"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={form.meet_link}
                    onChange={e => setForm(f => ({ ...f, meet_link: e.target.value }))}
                  />
                </div>
                {errors.meet_link && <div className="form-error">{errors.meet_link}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  💡 Go to{' '}
                  <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
                    meet.google.com/new
                  </a>{' '}
                  to generate a new link, then paste it here.
                </div>
              </div>

              {/* Agenda */}
              <div className="form-group">
                <label className="form-label">Agenda / Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Key topics, goals, or anything the team should know before joining…"
                  value={form.agenda}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  style={{ minHeight: 72 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Video size={15} />
                  {editId ? 'Save Changes' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMeet;
