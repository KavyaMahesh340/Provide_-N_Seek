import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Zap, ArrowRight, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ThemeToggleFloat from '../components/ThemeToggleFloat';
import api from '../api/axios';

const DEMO_ACCOUNTS = [
  { label: '👑 Admin Demo',  email: 'admin@demo.com',  password: 'Admin1234!',  role: 'admin',  color: '#48BEFF' },
  { label: '👤 Member Demo', email: 'member@demo.com', password: 'Member1234!', role: 'member', color: '#43C59E' },
];

const Login = () => {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      toast(`Welcome back, ${data.user.name}! 👋`, 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setForm({ email: acc.email, password: acc.password });
    toast(`Demo credentials filled — click Sign In!`, 'info');
  };

  const googleOAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      {/* Floating theme toggle */}
      <ThemeToggleFloat />

      {/* ← Back to Home button */}
      <Link
        to="/"
        style={{
          position: 'fixed', top: 20, left: 24,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 10,
          background: 'rgba(72,190,255,0.1)', border: '1px solid rgba(72,190,255,0.25)',
          color: '#48BEFF', fontSize: 13, fontWeight: 700,
          textDecoration: 'none', transition: 'all 0.2s',
          backdropFilter: 'blur(8px)', zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(72,190,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(72,190,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
      >
        <Home size={14} /> Back to Home
      </Link>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div className="logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Zap size={22} color="white" />
            </div>
            <span className="logo-text" style={{ fontSize: 22 }}>Task<span>Flow</span></span>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>

        {/* ── Demo Quick-Login ── */}
        <div style={{
          background: 'rgba(72,190,255,0.06)', border: '1px solid rgba(72,190,255,0.2)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Sparkles size={13} color="#48BEFF" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#48BEFF', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Try Demo Account
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc)}
                style={{
                  flex: 1, padding: '9px 10px', borderRadius: 9,
                  border: `1px solid ${acc.color}40`,
                  background: `${acc.color}12`,
                  color: acc.color, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.18s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${acc.color}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${acc.color}12`; e.currentTarget.style.transform = 'none'; }}
              >
                <span style={{ fontSize: 14 }}>{acc.label.split(' ')[0]}</span>
                <span>{acc.label.split(' ').slice(1).join(' ')}</span>
                <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500, marginTop: 1 }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Google OAuth */}
        <button className="btn-google" onClick={googleOAuth} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or sign in with email</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="form-icon" />
              <input className="form-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="form-icon" />
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -12, marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '13px' }} disabled={loading}>
            {loading ? <span className="spinner" /> : <><ArrowRight size={16} /> Sign In</>}
          </button>
        </form>

        <p className="auth-footer">
          No account yet? <Link to="/register" className="auth-link">Create workspace</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
