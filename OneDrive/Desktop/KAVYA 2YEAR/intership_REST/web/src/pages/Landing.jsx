import { useNavigate } from 'react-router-dom';
import { Zap, LogIn, ShieldCheck, User, CheckSquare, Users, BarChart2, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggleFloat from '../components/ThemeToggleFloat';

const Landing = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const cardBg  = 'var(--bg-card)';
  const cardBdr  = 'var(--border)';
  const textPrimary = 'var(--text-primary)';
  const textMuted   = 'var(--text-muted)';
  const textSec     = 'var(--text-secondary)';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--auth-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px',
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.35s ease',
    }}>
      {/* Floating theme toggle */}
      <ThemeToggleFloat />

      {/* Background glows */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'var(--auth-orb-1)', filter: 'blur(140px)', opacity: 0.18, top: -200, right: -120, pointerEvents: 'none', transition: 'background 0.35s ease' }} />
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'var(--auth-orb-2)', filter: 'blur(120px)', opacity: 0.14, bottom: -100, left: -100, pointerEvents: 'none', transition: 'background 0.35s ease' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.06, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

      {/* Logo + Hero */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--logo-icon-bg)',
            display: 'grid', placeItems: 'center',
            boxShadow: `0 0 40px var(--logo-icon-shadow), 0 8px 20px rgba(0,0,0,0.2)`,
            animation: 'glowPulse 3s ease-in-out infinite',
          }}>
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1.2, color: textPrimary }}>
            Task<span style={{ color: 'var(--accent-light)' }}>Flow</span>
          </span>
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.8, lineHeight: 1.12, marginBottom: 14, color: textPrimary }}>
          Manage your team's work,<br />
          <span className="gradient-text">powerfully.</span>
        </h1>
        <p style={{ fontSize: 16, color: textSec, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
          Role-based task management with multi-tenant isolation, audit trails, and Google OAuth.
        </p>
      </div>

      {/* Role Portal Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, width: '100%', maxWidth: 640, marginBottom: 28 }}>

        {/* Admin Card */}
        {[
          {
            title: 'Admin', sub: 'Full organisation control',
            icon: <ShieldCheck size={22} />, accentVar: 'var(--accent)',
            features: ['Assign & manage all tasks', 'Invite members & manage roles', 'View audit logs & org settings'],
            btnLabel: 'Sign In as Admin',
          },
          {
            title: 'Member', sub: 'Personal task workspace',
            icon: <User size={22} />, accentVar: 'var(--success)',
            features: ['View & create your own tasks', 'Track tasks assigned to you', 'Update status & meet deadlines'],
            btnLabel: 'Sign In as Member',
          },
        ].map(card => (
          <div
            key={card.title}
            style={{
              background: cardBg, border: `1px solid ${cardBdr}`,
              borderRadius: 20, padding: '28px 24px',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = card.accentVar;
              e.currentTarget.style.transform   = 'translateY(-4px)';
              e.currentTarget.style.boxShadow   = `var(--shadow-md), 0 0 25px var(--accent-glow)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = cardBdr;
              e.currentTarget.style.transform   = 'none';
              e.currentTarget.style.boxShadow   = 'var(--shadow-sm)';
            }}
          >
            {/* Top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.accentVar, borderRadius: '20px 20px 0 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 13,
                background: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.1)',
                border: `1px solid ${isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.25)'}`,
                display: 'grid', placeItems: 'center',
                color: 'var(--accent)',
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: textPrimary }}>{card.title}</div>
                <div style={{ fontSize: 12, color: textMuted }}>{card.sub}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
              {card.features.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textSec }}>
                  <span style={{ color: card.accentVar, fontWeight: 800 }}>✓</span> {p}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, fontWeight: 800 }}
            >
              <LogIn size={15} /> {card.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* Register link */}
      <p style={{ fontSize: 14, color: textMuted, marginBottom: 48 }}>
        New here?{' '}
        <span onClick={() => navigate('/register')}
          style={{ color: 'var(--accent-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
          Create your workspace →
        </span>
      </p>

      {/* Feature strip */}
      <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: <Lock size={15} />,       text: 'JWT + Google OAuth',  color: 'var(--accent)' },
          { icon: <CheckSquare size={15} />, text: 'Task Assignment',    color: 'var(--accent-light)' },
          { icon: <Users size={15} />,       text: 'Team Management',   color: 'var(--success)' },
          { icon: <BarChart2 size={15} />,   text: 'Audit Logging',     color: 'var(--accent)' },
        ].map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textMuted }}>
            <span style={{ color: f.color }}>{f.icon}</span> {f.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Landing;
