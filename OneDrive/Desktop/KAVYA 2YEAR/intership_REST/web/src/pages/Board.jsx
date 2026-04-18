import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, CheckSquare } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  { key: 'todo',        label: 'To Do',       color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  { key: 'in_progress', label: 'In Progress',  color: '#48BEFF', bg: 'rgba(72,190,255,0.1)'  },
  { key: 'review',      label: 'Review',       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  { key: 'done',        label: 'Done',         color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
];

const PRIORITY_COLORS = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

const TaskCard = ({ task, onDragStart }) => {
  const initials = task.assignee?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px', marginBottom: 8,
        cursor: 'grab', position: 'relative',
        transition: 'var(--transition)',
        borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(72,190,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
        {task.title}
      </div>
      {task.description && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
            background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority], border: `1px solid ${PRIORITY_COLORS[task.priority]}40` }}>
            {task.priority}
          </span>
          {task.due_date && (
            <span style={{ fontSize: 10, color: new Date(task.due_date) < new Date() ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
              📅 {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {task.assignee && (
          <div title={task.assignee.name} style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg,var(--accent),#a78bfa)',
            display: 'grid', placeItems: 'center',
            fontSize: 8, fontWeight: 800, color: '#001a20', flexShrink: 0,
          }}>
            {task.assignee.avatar
              ? <img src={task.assignee.avatar} alt="" style={{ width: '100%', borderRadius: '50%' }} />
              : initials}
          </div>
        )}
      </div>
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {task.tags.map(t => (
            <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#a78bfa', fontWeight: 700 }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const Column = ({ col, tasks, onDragStart, onDrop, onDragOver, isOver }) => (
  <div
    onDrop={() => onDrop(col.key)}
    onDragOver={e => { e.preventDefault(); onDragOver(col.key); }}
    onDragLeave={() => onDragOver(null)}
    style={{
      flex: 1, minWidth: 240, maxWidth: 320,
      background: isOver ? col.bg : 'var(--bg-secondary)',
      border: `1px solid ${isOver ? col.color + '60' : 'var(--border)'}`,
      borderRadius: 14, padding: 12,
      transition: 'var(--transition)',
      boxShadow: isOver ? `0 0 20px ${col.color}20` : 'none',
    }}
  >
    {/* Column header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `2px solid ${col.color}40` }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
      <span style={{ fontWeight: 800, fontSize: 13, color: col.color, letterSpacing: 0.3 }}>
        {col.label}
      </span>
      <span style={{ marginLeft: 'auto', background: `${col.color}25`, color: col.color, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, border: `1px solid ${col.color}40` }}>
        {tasks.length}
      </span>
    </div>

    {/* Tasks */}
    <div style={{ minHeight: 120 }}>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
      ))}
      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: 12, opacity: 0.5 }}>
          Drop tasks here
        </div>
      )}
    </div>
  </div>
);

const Board = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [overCol, setOverCol]   = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks?limit=200');
      setTasks(data.tasks || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDrop = async (newStatus) => {
    if (!dragging || dragging.status === newStatus) { setDragging(null); setOverCol(null); return; }
    if (!isAdmin && dragging.created_by !== user?.id) {
      toast('You can only move tasks you created', 'error'); return;
    }
    // Optimistic update
    setTasks(t => t.map(x => x.id === dragging.id ? { ...x, status: newStatus } : x));
    setDragging(null); setOverCol(null);
    try {
      await api.patch(`/tasks/${dragging.id}`, { status: newStatus });
      toast(`Moved to "${newStatus.replace('_', ' ')}"`, 'success');
    } catch {
      toast('Failed to update task', 'error');
      fetchTasks();
    }
  };

  const tasksByCol = COLUMNS.reduce((acc, c) => {
    acc[c.key] = tasks.filter(t => t.status === c.key);
    return acc;
  }, {});

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">
            <span style={{ marginRight: 10 }}>🗂️</span>Board
          </h1>
          <p className="page-subtitle">Drag & drop tasks between columns</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchTasks}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>
            <Plus size={15}/> New Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {COLUMNS.map(col => (
            <Column
              key={col.key}
              col={col}
              tasks={tasksByCol[col.key]}
              isOver={overCol === col.key}
              onDragStart={task => setDragging(task)}
              onDragOver={colKey => setOverCol(colKey)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Board;
