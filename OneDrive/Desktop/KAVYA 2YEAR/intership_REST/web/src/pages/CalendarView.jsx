import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalIcon } from 'lucide-react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PRIORITY_COLORS = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const STATUS_COLORS   = { todo: '#64748b', in_progress: '#48BEFF', review: '#a78bfa', done: '#22c55e' };

const CalendarView = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year,  setYear ] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks?limit=500');
      setTasks(data.tasks || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Tasks keyed by day of month (for current month)
  const tasksByDay = {};
  tasks.forEach(t => {
    if (!t.due_date) return;
    const d = new Date(t.due_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(t);
    }
  });

  // Total days to render (previous month padding + current month)
  const gridDays = [];
  for (let i = 0; i < firstDay; i++)  gridDays.push({ day: null, pad: true });
  for (let i = 1; i <= daysInMonth; i++) gridDays.push({ day: i, tasks: tasksByDay[i] || [] });
  // Pad end to complete last week
  while (gridDays.length % 7 !== 0) gridDays.push({ day: null, pad: true });

  // Stats bar
  const monthTasks  = tasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const overdueCount = monthTasks.filter(t => t.status !== 'done' && new Date(t.due_date) < now).length;

  // Months with at least one task (for mini dots)
  const isToday = (d) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  const isPast  = (d) => new Date(year, month, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title"><CalIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Calendar</h1>
          <p className="page-subtitle">Tasks plotted by due date</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={goToday} style={{ fontSize: 12 }}>Today</button>
          <button className="btn btn-ghost" onClick={fetchTasks}><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* Month stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Due this month', value: monthTasks.length,  color: 'var(--accent)' },
          { label: 'Completed',      value: monthTasks.filter(t=>t.status==='done').length, color: '#22c55e' },
          { label: 'Overdue',        value: overdueCount,              color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Month navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={18}/></button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {MONTHS[month]} {year}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={18}/></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="page-loader" style={{ minHeight: 300 }}><div className="spinner"/></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {gridDays.map((cell, idx) => {
              const isHovered   = hoveredDay === cell.day && !cell.pad;
              const today       = !cell.pad && isToday(cell.day);
              const past        = !cell.pad && isPast(cell.day) && !today;
              const hasTasks    = !cell.pad && cell.tasks?.length > 0;
              const hasOverdue  = hasTasks && cell.tasks.some(t => t.status !== 'done');

              return (
                <div
                  key={idx}
                  onMouseEnter={() => !cell.pad && setHoveredDay(cell.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    minHeight: 100,
                    padding: '6px 8px',
                    borderRight: (idx+1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: idx < gridDays.length - 7 ? '1px solid var(--border)' : 'none',
                    background: cell.pad ? 'rgba(0,0,0,0.1)' : today ? 'rgba(72,190,255,0.08)' : isHovered ? 'rgba(72,190,255,0.04)' : 'transparent',
                    transition: 'background .15s',
                    cursor: cell.pad ? 'default' : 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Day number */}
                  {cell.day && (
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: today ? 900 : 600,
                      color: today ? '#001a20' : past ? 'var(--text-muted)' : 'var(--text-primary)',
                      background: today ? 'var(--accent)' : 'transparent',
                      boxShadow: today ? '0 0 12px var(--accent)' : 'none',
                      marginBottom: 4,
                    }}>
                      {cell.day}
                    </div>
                  )}

                  {/* Task chips */}
                  {hasTasks && cell.tasks.slice(0, 3).map(t => (
                    <div key={t.id}
                      onClick={() => navigate('/tasks')}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        marginBottom: 2, lineHeight: 1.4,
                        background: `${STATUS_COLORS[t.status]}20`,
                        color: STATUS_COLORS[t.status],
                        border: `1px solid ${STATUS_COLORS[t.status]}40`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        borderLeft: `3px solid ${PRIORITY_COLORS[t.priority]}`,
                      }}
                      title={`${t.title} [${t.status}]`}
                    >
                      {t.title}
                    </div>
                  ))}
                  {hasTasks && cell.tasks.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 2 }}>
                      +{cell.tasks.length - 3} more
                    </div>
                  )}
                  {/* Overdue indicator */}
                  {hasTasks && past && hasOverdue && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
            <span style={{ color: 'var(--text-muted)' }}>Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
