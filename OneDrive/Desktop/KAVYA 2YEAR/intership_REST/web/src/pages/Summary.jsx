import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, PieChart, TrendingUp, Target, CheckSquare,
  AlertCircle, Clock, Users, Download, RefreshCw, Zap
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

/* ══════════════════════════════════════════════════
   SVG DONUT CHART
══════════════════════════════════════════════════ */
const DonutChart = ({ segments, size = 180, thickness = 36, title, centerLabel, centerSub }) => {
  const r = (size / 2) - (thickness / 2);
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* track */}
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {segments.filter(s => s.value > 0).map((seg, i) => {
            const dash = (seg.value / 100) * circ;
            const el = (
              <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                stroke={seg.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.8s ease', opacity: 0.92 }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
            {centerLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
            {centerSub}
          </div>
        </div>
      </div>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 12 }}>{title}</div>}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   SVG AREA / SPARKLINE CHART
══════════════════════════════════════════════════ */
const SparkArea = ({ data, color = '#48BEFF', height = 80 }) => {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const max  = Math.max(...data, 1);
  const w    = 300;
  const pts  = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    height - (v / max) * (height - 8),
  ]);
  const linePath  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath  = `${linePath} L ${pts[pts.length-1][0]} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark_${color.replace('#','')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill={color}
          stroke="var(--bg-card)" strokeWidth="2" opacity={i === pts.length-1 ? 1 : 0.5} />
      ))}
    </svg>
  );
};

/* ══════════════════════════════════════════════════
   HORIZONTAL BAR ROW
══════════════════════════════════════════════════ */
const HBar = ({ label, value, max, color, pct }) => {
  const p = pct ?? (max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p}%)</span>
        </span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${p}%`, background: color, borderRadius: 99,
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   LEGEND DOT
══════════════════════════════════════════════════ */
const LegendDot = ({ color, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN SUMMARY PAGE
══════════════════════════════════════════════════ */
const STATUS_META = [
  { key: 'todo',        label: 'To Do',       color: '#64748b' },
  { key: 'in_progress', label: 'In Progress',  color: '#48BEFF' },
  { key: 'review',      label: 'In Review',    color: '#a78bfa' },
  { key: 'done',        label: 'Done',         color: '#22c55e' },
];
const PRIORITY_META = [
  { key: 'low',    label: 'Low',    color: '#64748b' },
  { key: 'medium', label: 'Medium', color: '#3b82f6' },
  { key: 'high',   label: 'High',   color: '#f59e0b' },
  { key: 'urgent', label: 'Urgent', color: '#ef4444' },
];

const Summary = () => {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();

  const [data,    setData   ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/analytics/summary');
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchData();
  }, [isAdmin, navigate, fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/analytics/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `tasks-summary-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (!isAdmin) return null;
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const { totals = {}, completionRate = 0, avgCycleTime, memberStats = [], weeklyCreated = [] } = data || {};
  const total = totals.total || 0;

  // Build donut segments as percentages
  const statusSegments = STATUS_META.map(s => ({
    color: s.color,
    value: total > 0 ? Math.round(((totals[s.key] || 0) / total) * 100) : 0,
  }));
  const prioritySegments = PRIORITY_META.map(s => ({
    color: s.color,
    value: total > 0 ? Math.round(((totals[s.key] || 0) / total) * 100) : 0,
  }));

  const weeklyTrend = (weeklyCreated || []).map(w => w.completed || 0);
  const createdTrend = (weeklyCreated || []).map(w => w.created || 0);

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={24} color="var(--accent)" />
            Summary
          </h1>
          <p className="page-subtitle">Organisation performance at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={14}/></button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            <Download size={14}/> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Tasks',      value: total,            icon: <CheckSquare size={20}/>, color: 'indigo' },
          { label: 'Completion Rate',  value: `${completionRate}%`, icon: <TrendingUp size={20}/>,  color: 'green'  },
          { label: 'Overdue',          value: totals.overdue || 0,  icon: <AlertCircle size={20}/>, color: 'red'    },
          { label: 'Avg Cycle (days)', value: avgCycleTime != null ? `${avgCycleTime}d` : '—', icon: <Clock size={20}/>, color: 'amber' },
          { label: 'Team Members',     value: memberStats.length,   icon: <Users size={20}/>,       color: 'indigo' },
          { label: 'Unassigned',       value: totals.unassigned || 0, icon: <Target size={20}/>,    color: 'amber'  },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Two donuts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Status donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="section-title" style={{ alignSelf: 'flex-start' }}>
            <PieChart size={15}/> Status Split
          </h2>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <DonutChart
              segments={statusSegments}
              size={180} thickness={32}
              centerLabel={`${completionRate}%`}
              centerSub="complete"
            />
            <div>
              {STATUS_META.map(s => (
                <LegendDot key={s.key} color={s.color} label={s.label} value={totals[s.key] || 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Priority donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="section-title" style={{ alignSelf: 'flex-start' }}>
            <Target size={15}/> Priority Split
          </h2>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <DonutChart
              segments={prioritySegments}
              size={180} thickness={32}
              centerLabel={totals.urgent || 0}
              centerSub="urgent"
            />
            <div>
              {PRIORITY_META.map(s => (
                <LegendDot key={s.key} color={s.color} label={s.label} value={totals[s.key] || 0} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Sparklines ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h2 className="section-title"><TrendingUp size={15}/> Weekly Completed</h2>
          <SparkArea data={weeklyTrend} color="#22c55e" height={90} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {(weeklyCreated || []).map((w, i) => (
              <div key={i} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{w.label}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="section-title"><BarChart2 size={15}/> Weekly Created</h2>
          <SparkArea data={createdTrend} color="#48BEFF" height={90} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {(weeklyCreated || []).map((w, i) => (
              <div key={i} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{w.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Horizontal bars ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h2 className="section-title"><BarChart2 size={15}/> Status Breakdown</h2>
          {STATUS_META.map(s => (
            <HBar key={s.key} label={s.label} value={totals[s.key]||0} max={total} color={s.color} />
          ))}
          <HBar label="Overdue" value={totals.overdue||0} max={total} color="#ef4444" />
        </div>
        <div className="card">
          <h2 className="section-title"><Target size={15}/> Priority Breakdown</h2>
          {PRIORITY_META.map(s => (
            <HBar key={s.key} label={s.label} value={totals[s.key]||0} max={total} color={s.color} />
          ))}
        </div>
      </div>

      {/* ── Row 4: Member productivity table ── */}
      <div className="card">
        <h2 className="section-title"><Users size={15}/> Member Performance</h2>
        {memberStats.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-title">No members yet</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Completion %</th>
                  <th style={{ width: 160 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map(m => {
                  const pct = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
                  const initials = m.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#a78bfa)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#001a20', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                      <td style={{ fontWeight: 700 }}>{m.assigned}</td>
                      <td style={{ color: '#22c55e', fontWeight: 700 }}>{m.completed}</td>
                      <td style={{ color: '#48BEFF', fontWeight: 700 }}>{m.in_progress}</td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 15, color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {pct}%
                        </span>
                      </td>
                      <td>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.8s ease' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
