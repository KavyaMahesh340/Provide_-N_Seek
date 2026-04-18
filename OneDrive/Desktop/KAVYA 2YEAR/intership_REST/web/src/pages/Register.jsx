import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Zap, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ThemeToggleFloat from '../components/ThemeToggleFloat';
import api from '../api/axios';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      toast('Welcome to TaskFlow! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const googleOAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      {/* Floating buttons */}
      <ThemeToggleFloat />
      <Link to="/" style={{
        position: 'fixed', top: 20, left: 24, zIndex: 50,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--accent-light)', fontSize: 13, fontWeight: 700,
        textDecoration: 'none', backdropFilter: 'blur(8px)',
        transition: 'all 0.2s',
      }}>
        <Home size={14} /> Home
      </Link>

      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div className="logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Zap size={22} color="white" />
            </div>
            <span className="logo-text" style={{ fontSize: 22 }}>Task<span>Flow</span></span>
          </div>
        </div>

        <h1 className="auth-title">Create your workspace</h1>
        <p className="auth-subtitle">Start managing tasks with your team</p>

        <button className="btn-google" onClick={googleOAuth} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or create with email</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-icon-wrap">
              <User size={16} className="form-icon" />
              <input className="form-input" placeholder="Alice Johnson" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="form-icon" />
              <input className="form-input" type="email" placeholder="alice@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <div className="input-icon-wrap">
              <Building2 size={16} className="form-icon" />
              <input className="form-input" placeholder="Acme Corp" value={form.orgName}
                onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="form-icon" />
              <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
          </div>
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '13px' }} disabled={loading}>
            {loading ? <span className="spinner" /> : <><ArrowRight size={16} /> Create Workspace</>}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
