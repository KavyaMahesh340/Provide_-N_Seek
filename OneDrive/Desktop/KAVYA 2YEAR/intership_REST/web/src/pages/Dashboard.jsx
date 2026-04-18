import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertCircle, TrendingUp,
  Plus, ArrowRight, Calendar, User, Users,
  Target, ListChecks, Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const priorityColors = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
const statusColors   = { todo: 'badge-todo', in_progress: 'badge-in_progress', review: 'badge-review', done: 'badge-done' };

/* ─── Small reusable stat card ─────────────────────────────── */
const StatCard = ({ label, value, icon, color, note }) => (
  <div className={`stat-card ${color}`}>
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{note}</div>}
  </div>
);

/* ─── Task preview row ──────────────────────────────────────── */
const TaskRow = ({ task, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 20px', cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'var(--transition)',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    {/* Priority dot */}
    <div style={{
      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
      background: { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }[task.priority],
    }} />

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
      {task.assignee && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>→ {task.assignee.name}</div>
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span className={`badge ${statusColors[task.status]}`} style={{ fontSize: 10 }}>
        {task.status.replace('_', ' ')}
      </span>
      {task.due_date && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ user, tasks, stats, members, navigate }) => {
  const assignedPercent  = stats.total > 0 ? Math.round((stats.assigned  / stats.total) * 100) : 0;
  const completedPercent = stats.total > 0 ? Math.round((stats.done      / stats.total) * 100) : 0;

  /* per-member task count */
  const memberStats = members.map(m => ({
    ...m,
    count:      tasks.filter(t => t.assigned_to === m.id).length,
    completed:  tasks.filter(t => t.assigned_to === m.id && t.status === 'done').length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const unassigned = tasks.filter(t => !t.assigned_to);

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <div>
          <h1 className="page-title">Admin Dashboard 🛡️</h1>
          <p className="page-subtitle">Organisation-wide overview · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Tasks"    value={stats.total}       icon={<CheckSquare size={20}/>}  color="indigo" />
        <StatCard label="In Progress"    value={stats.in_progress} icon={<Clock size={20}/>}         color="amber"  />
        <StatCard label="Urgent"         value={stats.urgent}      icon={<AlertCircle size={20}/>}   color="red"    />
        <StatCard label="Completed"      value={`${completedPercent}%`} icon={<TrendingUp size={20}/>} color="green" note={`${stats.done} of ${stats.total}`} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Progress bars */}
        <div className="card">
          <h2 className="section-title"><Target size={16}/> Task Breakdown</h2>
          {[
            { label: 'Completed',   val: stats.done,        total: stats.total, color: '#22c55e' },
            { label: 'In Progress', val: stats.in_progress, total: stats.total, color: '#3b82f6' },
            { label: 'Assigned',    val: stats.assigned,    total: stats.total, color: '#6366f1' },
            { label: 'Unassigned',  val: unassigned.length, total: stats.total, color: '#f59e0b' },
          ].map(b => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{b.label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{b.val}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {b.total}</span></span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.total > 0 ? (b.val / b.total) * 100 : 0}%`, background: b.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Member workload */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}><Users size={16}/> Member Workload</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>Manage <ArrowRight size={13}/></button>
          </div>
          {memberStats.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No members yet — invite your team!</p>
          ) : memberStats.map(m => {
            const initials = m.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const pct = m.count > 0 ? Math.round((m.completed / m.count) * 100) : 0;
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                  {m.avatar ? <img src={m.avatar} alt={m.name} /> : initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{m.completed}/{m.count} done</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 99 }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{m.count} tasks</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Unassigned tasks */}
        <div>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              <AlertCircle size={16} style={{ color: 'var(--warning)' }} /> Unassigned Tasks
              {unassigned.length > 0 && (
                <span className="nav-badge" style={{ marginLeft: 8, background: 'var(--warning)' }}>{unassigned.length}</span>
              )}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all <ArrowRight size={13}/></button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {unassigned.slice(0, 5).length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
                <div className="empty-title" style={{ fontSize: 14 }}>All tasks assigned!</div>
              </div>
            ) : unassigned.slice(0, 5).map(t => (
              <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}><ListChecks size={16}/> Recent Tasks</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all <ArrowRight size={13}/></button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {tasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MEMBER DASHBOARD
═══════════════════════════════════════════════════════════════ */
const MemberDashboard = ({ user, allTasks, navigate }) => {
  const myAssigned = allTasks.filter(t => t.assigned_to === user?.id);
  const myCreated  = allTasks.filter(t => t.created_by  === user?.id);
  const myDone     = myAssigned.filter(t => t.status === 'done');
  const myUrgent   = myAssigned.filter(t => t.priority === 'urgent' && t.status !== 'done');
  const dueSoon    = myAssigned.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const diff = (new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Your personal workspace overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>
          <Plus size={16}/> New Task
        </button>
      </div>

      {/* My Stats */}
      <div className="stats-grid">
        <StatCard label="Assigned to Me"  value={myAssigned.length} icon={<Target size={20}/>}         color="indigo" />
        <StatCard label="I Created"       value={myCreated.length}  icon={<CheckSquare size={20}/>}     color="green"  />
        <StatCard label="Urgent"          value={myUrgent.length}   icon={<AlertCircle size={20}/>}     color="red"    />
        <StatCard label="Due This Week"   value={dueSoon.length}    icon={<Calendar size={20}/>}         color="amber"  />
      </div>

      {/* Completion bar */}
      {myAssigned.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <span className="section-title" style={{ marginBottom: 0 }}><Award size={16}/> My Progress</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {myDone.length} of {myAssigned.length} completed ({Math.round((myDone.length / myAssigned.length) * 100)}%)
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(myDone.length / myAssigned.length) * 100}%`, background: 'linear-gradient(90deg,var(--accent),#a78bfa)', borderRadius: 99, transition: 'width 1s ease' }} />
          </div>
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Tasks assigned to me */}
        <div>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}><Target size={16}/> Assigned to Me</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all <ArrowRight size={13}/></button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {myAssigned.filter(t => t.status !== 'done').slice(0, 6).length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
                <div className="empty-title" style={{ fontSize: 14 }}>No pending tasks assigned</div>
              </div>
            ) : myAssigned.filter(t => t.status !== 'done').slice(0, 6).map(t => (
              <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />
            ))}
          </div>
        </div>

        {/* Tasks I created */}
        <div>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}><ListChecks size={16}/> Tasks I Created</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks?new=1')}><Plus size={13}/> New</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {myCreated.slice(0, 6).length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
                <div className="empty-title" style={{ fontSize: 14 }}>No tasks created yet</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/tasks?new=1')}>
                  <Plus size={14}/> Create one
                </button>
              </div>
            ) : myCreated.slice(0, 6).map(t => <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tasks,   setTasks  ] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats,   setStats  ] = useState({ total: 0, in_progress: 0, done: 0, urgent: 0, assigned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const taskRes = await api.get('/tasks?limit=100');
        const all = taskRes.data.tasks || [];
        setTasks(all);
        setStats({
          total:       taskRes.data.total || all.length,
          in_progress: all.filter(t => t.status === 'in_progress').length,
          done:        all.filter(t => t.status === 'done').length,
          urgent:      all.filter(t => t.priority === 'urgent').length,
          assigned:    all.filter(t => t.assigned_to).length,
        });

        if (isAdmin) {
          const userRes = await api.get('/users');
          setMembers(userRes.data || []);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [isAdmin]);

  if (loading) return (
    <div className="page-loader"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
  );

  return isAdmin
    ? <AdminDashboard  user={user} tasks={tasks} stats={stats} members={members} navigate={navigate} />
    : <MemberDashboard user={user} allTasks={tasks} navigate={navigate} />;
};

export default Dashboard;
