import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, CheckSquare, Clock,
  AlertCircle, Download, RefreshCw, BarChart2,
  Target, Award, Activity
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const COLORS = {
  done: '#22c55e', in_progress: '#3b82f6', review: '#a78bfa',
  todo: '#64748b', urgent: '#ef4444', high: '#f59e0b',
  medium: '#3b82f6', low: '#64748b',
};

const Bar = ({ label, value, max, color, suffix = '' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {value}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {max}{suffix}</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

const MiniBar = ({ value, max, color }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, height: 5, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s' }} />
    </div>
  );
};

const Analytics = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/analytics/summary');
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchAnalytics();
  }, [isAdmin, navigate, fetchAnalytics]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/analytics/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `tasks-export-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (!isAdmin) return null;
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const { totals, completionRate, avgCycleTime, memberStats, weeklyCreated } = data || {};

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title">Analytics & Reporting 📊</h1>
          <p className="page-subtitle">Organisation-wide performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchAnalytics} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Tasks',     value: totals?.total,      icon: <CheckSquare size={20} />, color: 'indigo' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: <TrendingUp size={20} />, color: 'green' },
          { label: 'Overdue',         value: totals?.overdue,    icon: <AlertCircle size={20} />, color: 'red' },
          { label: 'Avg Cycle Time',  value: avgCycleTime != null ? `${avgCycleTime}d` : 'N/A', icon: <Clock size={20} />, color: 'amber' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two column: status breakdown + priority breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h2 className="section-title"><BarChart2 size={16} /> Status Breakdown</h2>
          <Bar label="Done"        value={totals?.done}        max={totals?.total} color={COLORS.done} />
          <Bar label="In Progress" value={totals?.in_progress} max={totals?.total} color={COLORS.in_progress} />
          <Bar label="Review"      value={totals?.review}      max={totals?.total} color={COLORS.review} />
          <Bar label="Todo"        value={totals?.todo}        max={totals?.total} color={COLORS.todo} />
          <Bar label="Unassigned"  value={totals?.unassigned}  max={totals?.total} color="#f59e0b" />
        </div>

        <div className="card">
          <h2 className="section-title"><Target size={16} /> Priority Distribution</h2>
          <Bar label="Urgent" value={totals?.urgent} max={totals?.total} color={COLORS.urgent} />
          <Bar label="High"   value={totals?.high}   max={totals?.total} color={COLORS.high} />
          <Bar label="Medium" value={totals?.medium} max={totals?.total} color={COLORS.medium} />
          <Bar label="Low"    value={totals?.low}    max={totals?.total} color={COLORS.low} />
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title"><Activity size={16} /> Weekly Task Velocity (last 8 weeks)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 8 }}>
          {(weeklyCreated || []).map((w, i) => {
            const maxVal = Math.max(...(weeklyCreated || []).map(x => Math.max(x.created, x.completed)), 1);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
                  <div title={`${w.created} created`} style={{ width: 12, height: `${(w.created / maxVal) * 90}px`, background: '#6366f1', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                  <div title={`${w.completed} completed`} style={{ width: 12, height: `${(w.completed / maxVal) * 90}px`, background: '#22c55e', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{w.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, background: '#6366f1', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Created</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
          </div>
        </div>
      </div>

      {/* Member productivity */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}><Users size={16} /> Member Productivity</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{memberStats?.length} members</span>
        </div>
        {(memberStats || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No members yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {(memberStats || []).map(m => {
              const completionPct = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
              const initials = m.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={m.id} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>
                      {m.avatar ? <img src={m.avatar} alt={m.name} /> : initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.role}</div>
                    </div>
                    <div style={{ padding: '3px 8px', background: 'var(--accent)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'white' }}>{completionPct}%</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.assigned}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#22c55e' }}>{m.completed}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Done</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>{m.in_progress}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Active</div>
                    </div>
                  </div>
                  <MiniBar value={m.completed} max={m.assigned || 1} color="#22c55e" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
