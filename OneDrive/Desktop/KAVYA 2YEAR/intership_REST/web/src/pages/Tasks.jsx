import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, X, Pencil, Trash2, Calendar,
  CheckSquare, User, UserCheck, Paperclip, MessageSquare,
  ChevronDown, ChevronUp, Check, RefreshCw, RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const STATUS_OPTIONS   = ['todo', 'in_progress', 'review', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const statusColors   = { todo: 'badge-todo', in_progress: 'badge-in_progress', review: 'badge-review', done: 'badge-done' };
const priorityColors = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
const PRIORITY_COLORS_HEX = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const RECURRENCE_OPTIONS = ['daily', 'weekly', 'monthly'];

const EMPTY_FORM = {
  title: '', description: '', status: 'todo', priority: 'medium',
  due_date: '', assigned_to: '', tags: '',
  is_recurring: false, recurrence_pattern: 'weekly',
};

/* ─── Assignee Avatar ────────────────────────────────────────── */
const AssigneeAvatar = ({ user, size = 24 }) => {
  if (!user) return null;
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div title={user.name} style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,var(--accent),#a78bfa)',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'white',
      overflow: 'hidden', flexShrink: 0,
      border: '2px solid var(--bg-card)',
    }}>
      {user.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
};

/* ─── Subtask Checklist ──────────────────────────────────────── */
const SubtaskChecklist = ({ taskId }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get(`/tasks/${taskId}/subtasks`).then(r => setSubtasks(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [taskId]);

  const add = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await api.post(`/tasks/${taskId}/subtasks`, { title: newTitle.trim() });
    setSubtasks(s => [...s, data]);
    setNewTitle('');
  };

  const toggle = async (sub) => {
    const { data } = await api.patch(`/tasks/${taskId}/subtasks/${sub.id}`, { is_completed: !sub.is_completed });
    setSubtasks(s => s.map(x => x.id === data.id ? data : x));
  };

  const remove = async (id) => {
    await api.delete(`/tasks/${taskId}/subtasks/${id}`);
    setSubtasks(s => s.filter(x => x.id !== id));
  };

  const done  = subtasks.filter(s => s.is_completed).length;
  const total = subtasks.length;

  return (
    <div style={{ marginTop: 0 }}>
      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Subtasks</span>
            <span>{done}/{total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${total > 0 ? (done / total) * 100 : 0}%`, background: '#22c55e', borderRadius: 99, transition: 'width .4s' }} />
          </div>
        </div>
      )}
      {subtasks.map(sub => (
        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div onClick={() => toggle(sub)} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sub.is_completed ? '#22c55e' : 'var(--border)'}`, background: sub.is_completed ? '#22c55e' : 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            {sub.is_completed && <Check size={10} color="white" />}
          </div>
          <span style={{ flex: 1, fontSize: 12, color: sub.is_completed ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: sub.is_completed ? 'line-through' : 'none' }}>
            {sub.title}
          </span>
          <button onClick={() => remove(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 2, display: 'flex', alignItems: 'center' }}>
            <X size={11} color="var(--text-muted)" />
          </button>
        </div>
      ))}
      <form onSubmit={add} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)' }}
          placeholder="Add subtask…" value={newTitle} onChange={e => setNewTitle(e.target.value)}
        />
        <button type="submit" style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'white' }}>
          <Plus size={12} />
        </button>
      </form>
    </div>
  );
};

/* ─── Comment Thread ─────────────────────────────────────────── */
const CommentThread = ({ taskId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    api.get(`/tasks/${taskId}/comments`).then(r => setComments(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content: text.trim() });
      setComments(c => [...c, data]);
      setText('');
    } catch {}
    setPosting(false);
  };

  const del = async (id) => {
    await api.delete(`/tasks/${taskId}/comments/${id}`);
    setComments(c => c.filter(x => x.id !== id));
  };

  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No comments yet. Be the first!</div>
      ) : comments.map(c => {
        const initials = c.author?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const isOwn = c.user_id === currentUser?.id;
        return (
          <div key={c.id} style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#a78bfa)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
              {c.author?.avatar ? <img src={c.author.avatar} alt="" style={{ width: '100%' }} /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{c.author?.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                  {isOwn && (
                    <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 2, display: 'flex' }}>
                      <X size={10} color="var(--text-muted)" />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{c.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
      <form onSubmit={post} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: 'var(--text-primary)' }}
          placeholder="Write a comment…" value={text} onChange={e => setText(e.target.value)}
          disabled={posting}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !text.trim()} style={{ whiteSpace: 'nowrap' }}>
          {posting ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Post'}
        </button>
      </form>
    </div>
  );
};

/* ─── Attachment Panel ───────────────────────────────────────── */
const AttachmentPanel = ({ taskId }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const fileRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    api.get(`/tasks/${taskId}/attachments`).then(r => setAttachments(r.data)).catch(() => {});
  }, [taskId]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post(`/tasks/${taskId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAttachments(a => [data, ...a]);
      toast('File uploaded!', 'success');
    } catch { toast('Upload failed', 'error'); }
    setUploading(false);
    e.target.value = '';
  };

  const del = async (id) => {
    await api.delete(`/tasks/${taskId}/attachments/${id}`);
    setAttachments(a => a.filter(x => x.id !== id));
    toast('Attachment removed', 'success');
  };

  const fmt = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes/1024).toFixed(1)}KB` : `${(bytes/1048576).toFixed(1)}MB`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>FILES ({attachments.length})</span>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Plus size={12} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={upload} />
      </div>
      {attachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          No files attached. Click Upload to add one.
        </div>
      ) : attachments.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Paperclip size={13} color="var(--accent)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.original_name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt(a.size_bytes || 0)}</div>
          </div>
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${a.download_url}`} download={a.original_name}
            style={{ color: 'var(--accent)', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Download</a>
          <button onClick={() => del(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5 }}>
            <X size={11} color="var(--text-muted)" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ─── Task Detail Drawer ─────────────────────────────────────── */
const TaskDrawer = ({ task, onClose, onEdit, canEdit, currentUser }) => {
  const [tab, setTab] = useState('subtasks'); // subtasks | comments | files

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Overlay */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      {/* Drawer */}
      <div style={{ width: 420, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className={`badge ${statusColors[task.status]}`}>{task.status.replace('_', ' ')}</span>
                <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                {task.is_recurring && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}><RotateCcw size={10} /> {task.recurrence_pattern}</span>}
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{task.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {canEdit && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { onEdit(task); onClose(); }}><Pencil size={14} /></button>}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
            </div>
          </div>
          {task.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>{task.description}</p>}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {task.assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AssigneeAvatar user={task.assignee} size={20} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee.name}</span>
              </div>
            )}
            {task.due_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <Calendar size={11} />{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
          {/* Tags */}
          {task.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {task.tags.map(tag => (
                <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20 }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          {[
            { key: 'subtasks', icon: <CheckSquare size={13} />, label: 'Subtasks' },
            { key: 'comments', icon: <MessageSquare size={13} />, label: 'Comments' },
            { key: 'files',    icon: <Paperclip size={13} />,    label: 'Files' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              color: tab === t.key ? 'var(--accent-light)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'var(--transition)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {tab === 'subtasks' && <SubtaskChecklist taskId={task.id} />}
          {tab === 'comments' && <CommentThread taskId={task.id} currentUser={currentUser} />}
          {tab === 'files' && <AttachmentPanel taskId={task.id} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Task Card ──────────────────────────────────────────────── */
const TaskCard = ({ task, onEdit, onDelete, canEdit, isAdmin, members, onAssign, onOpenDrawer }) => {
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div className="task-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onOpenDrawer(task)}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: PRIORITY_COLORS_HEX[task.priority], borderRadius: '12px 0 0 12px' }} />
      <div style={{ paddingLeft: 8 }}>

        {/* Header */}
        <div className="task-card-header">
          <h3 className="task-title">{task.title}</h3>
          <div className="task-actions" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)} title="Edit"><Pencil size={13}/></button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(task.id)} title="Delete"><Trash2 size={13}/></button>
              </>
            )}
          </div>
        </div>

        {task.description && <p className="task-desc">{task.description}</p>}

        {/* Badges */}
        <div className="task-meta" style={{ marginBottom: 10 }}>
          <span className={`badge ${statusColors[task.status]}`}>{task.status.replace('_', ' ')}</span>
          <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
          {task.is_recurring && (
            <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-light)', padding: '1px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <RotateCcw size={9}/> {task.recurrence_pattern}
            </span>
          )}
          {task.due_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
              <Calendar size={11}/>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Tags */}
        {task.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {task.tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-light)', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
          {task.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <AssigneeAvatar user={task.assignee} size={22} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{task.assignee.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
          )}

          {/* Assign button — admin only */}
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '4px 10px', gap: 5 }}
                onClick={() => setShowAssign(s => !s)}
              >
                <UserCheck size={12}/> {task.assignee ? 'Reassign' : 'Assign'}
              </button>
              {showAssign && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  zIndex: 50, minWidth: 190, overflow: 'hidden',
                }} onMouseLeave={() => setShowAssign(false)}>
                  <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid var(--border)' }}>Assign to</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { onAssign(task.id, null); setShowAssign(false); }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'grid', placeItems: 'center' }}><X size={12} style={{ color: 'var(--text-muted)' }}/></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Unassign</span>
                  </div>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { onAssign(task.id, m.id); setShowAssign(false); }}>
                      <AssigneeAvatar user={m} size={24}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: m.id === task.assigned_to ? 'var(--accent-light)' : 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.role}</div>
                      </div>
                      {m.id === task.assigned_to && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isAdmin && task.creator && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={11}/> {task.creator.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN TASKS PAGE
══════════════════════════════════════════════════════════════ */
const Tasks = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks,          setTasks         ] = useState([]);
  const [members,        setMembers        ] = useState([]);
  const [loading,        setLoading        ] = useState(true);
  const [search,         setSearch         ] = useState('');
  const [filterStatus,   setFilterStatus   ] = useState('');
  const [filterPriority, setFilterPriority ] = useState('');
  const [filterAssignee, setFilterAssignee ] = useState('');
  const [activeTab,      setActiveTab      ] = useState('all');
  const [showModal,      setShowModal      ] = useState(!!searchParams.get('new'));
  const [editTask,       setEditTask       ] = useState(null);
  const [form,           setForm           ] = useState(EMPTY_FORM);
  const [saving,         setSaving         ] = useState(false);
  const [deleteId,       setDeleteId       ] = useState(null);
  const [drawerTask,     setDrawerTask     ] = useState(null);

  /* ── SSE real-time task refresh ── */
  useEffect(() => {
    let es;
    try {
      const token = localStorage.getItem('accessToken');
      es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/stream?token=${token}`);
      es.addEventListener('notification', () => {
        // On any notification, silently refresh tasks
        api.get('/tasks?limit=100').then(({ data }) => setTasks(data.tasks || [])).catch(() => {});
      });
    } catch {}
    return () => { if (es) es.close(); };
  }, []);

  /* ── Fetch tasks ── */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 100 });
      if (search)         p.set('search', search);
      if (filterStatus)   p.set('status', filterStatus);
      if (filterPriority) p.set('priority', filterPriority);
      const { data } = await api.get(`/tasks?${p}`);
      setTasks(data.tasks || []);
    } catch { toast('Failed to load tasks', 'error'); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterPriority]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    api.get('/users').then(({ data }) => setMembers(data)).catch(() => {});
  }, []);

  /* ── Filtered view ── */
  const visibleTasks = tasks.filter(t => {
    if (isAdmin && filterAssignee) {
      if (filterAssignee === '__unassigned__') return !t.assigned_to;
      return t.assigned_to === filterAssignee;
    }
    if (!isAdmin) {
      if (activeTab === 'mine')     return t.created_by  === user?.id;
      if (activeTab === 'assigned') return t.assigned_to === user?.id;
    }
    return true;
  });

  /* ── Modal helpers ── */
  const openCreate = () => { setEditTask(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit   = (task) => {
    setEditTask(task);
    setForm({
      title: task.title, description: task.description || '',
      status: task.status, priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assigned_to: task.assigned_to || '',
      tags: (task.tags || []).join(', '),
      is_recurring: task.is_recurring || false,
      recurrence_pattern: task.recurrence_pattern || 'weekly',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditTask(null); setForm(EMPTY_FORM); setSearchParams({}); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (!payload.assigned_to)     delete payload.assigned_to;
      if (!payload.due_date)         delete payload.due_date;
      if (!payload.is_recurring)     delete payload.recurrence_pattern;

      if (editTask) {
        const { data } = await api.patch(`/tasks/${editTask.id}`, payload);
        setTasks(t => t.map(x => x.id === data.id ? data : x));
        toast('Task updated!', 'success');
      } else {
        const { data } = await api.post('/tasks', payload);
        setTasks(t => [data, ...t]);
        toast('Task created!', 'success');
      }
      closeModal();
    } catch (err) { toast(err.response?.data?.error || 'Failed to save task', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(t => t.filter(x => x.id !== id));
      toast('Task deleted', 'success');
    } catch (err) { toast(err.response?.data?.error || 'Cannot delete task', 'error'); }
    setDeleteId(null);
  };

  const handleAssign = async (taskId, assigneeId) => {
    try {
      const { data } = await api.patch(`/tasks/${taskId}`, { assigned_to: assigneeId || null });
      setTasks(t => t.map(x => x.id === data.id ? data : x));
      toast(assigneeId ? 'Task assigned!' : 'Task unassigned', 'success');
    } catch (err) { toast(err.response?.data?.error || 'Failed to assign', 'error'); }
  };

  const canEdit = (task) => isAdmin || task.created_by === user?.id;
  const unassignedCount = tasks.filter(t => !t.assigned_to).length;

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">
            {isAdmin
              ? `${tasks.length} total · ${unassignedCount} unassigned`
              : `${tasks.filter(t => t.assigned_to === user?.id).length} assigned to me`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchTasks} title="Refresh"><RefreshCw size={15} /></button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> New Task</button>
        </div>
      </div>

      {/* Member Tabs */}
      {!isAdmin && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
          {[
            { key: 'all',      label: 'All Tasks',      count: tasks.length },
            { key: 'assigned', label: 'Assigned to Me', count: tasks.filter(t => t.assigned_to === user?.id).length },
            { key: 'mine',     label: 'I Created',       count: tasks.filter(t => t.created_by  === user?.id).length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition)',
            }}>
              {tab.label}<span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon"/>
          <input className="form-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && (
          <select className="form-select" style={{ width: 180 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Members</option>
            <option value="__unassigned__">⚠️ Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        {(filterStatus || filterPriority || search || filterAssignee) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); }}>
            <X size={13}/> Clear
          </button>
        )}
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="page-loader"><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }}/></div>
      ) : visibleTasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><CheckSquare size={24}/></div>
            <div className="empty-title">No tasks found</div>
            <div className="empty-text">Adjust filters or create a new task</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}><Plus size={15}/> Create Task</button>
          </div>
        </div>
      ) : (
        <div className="task-grid">
          {visibleTasks.map(task => (
            <TaskCard
              key={task.id} task={task} isAdmin={isAdmin} members={members}
              canEdit={canEdit(task)} onEdit={openEdit} onDelete={setDeleteId}
              onAssign={handleAssign} onOpenDrawer={setDrawerTask}
            />
          ))}
        </div>
      )}

      {/* Task Detail Drawer */}
      {drawerTask && (
        <TaskDrawer
          task={drawerTask}
          onClose={() => setDrawerTask(null)}
          onEdit={openEdit}
          canEdit={canEdit(drawerTask)}
          currentUser={user}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Task title" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Optional description…" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}/>
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserCheck size={13} style={{ color: 'var(--accent-light)' }}/> Assign To
                    </label>
                    <select className="form-select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">— Unassigned —</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-input" placeholder="design, backend, review" value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}/>
              </div>

              {/* Recurring tasks */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
                    style={{ cursor: 'pointer', color: form.is_recurring ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <RotateCcw size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recurring Task</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-regenerates on schedule</div>
                  </div>
                  {form.is_recurring && (
                    <select className="form-select" style={{ width: 120, fontSize: 12 }} value={form.recurrence_pattern}
                      onChange={e => setForm(f => ({ ...f, recurrence_pattern: e.target.value }))}>
                      {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                  <input type="checkbox" checked={form.is_recurring} onChange={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 56, height: 56, background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={24} color="var(--danger)"/>
              </div>
              <h2 className="modal-title" style={{ marginBottom: 8 }}>Delete Task?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
