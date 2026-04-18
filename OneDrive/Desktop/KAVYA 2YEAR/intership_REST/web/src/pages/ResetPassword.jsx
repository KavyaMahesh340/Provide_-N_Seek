import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Zap } from 'lucide-react';
import api from '../api/axios';

const ResetPassword = () => {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const navigate                = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired link. Request a new one.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <h2 className="auth-title">Invalid Link</h2>
        <p style={{ color:'var(--text-secondary)', fontSize:14, margin:'10px 0 20px' }}>This reset link is missing a token.</p>
        <Link to="/forgot-password" className="btn btn-primary" style={{ justifyContent:'center' }}>Request a new link</Link>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
            <div className="logo-icon"><Zap size={18} color="white"/></div>
            <span className="logo-text">Task<span>Flow</span></span>
          </div>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2 className="auth-title" style={{ marginBottom:8 }}>Password updated!</h2>
            <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Set new password</h1>
            <p className="auth-subtitle">Choose a strong password for your account.</p>

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#f87171' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-icon-wrap" style={{ position:'relative' }}>
                  <Lock size={16} className="form-icon"/>
                  <input
                    className="form-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight:42 }}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4 }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrap">
                  <Lock size={16} className="form-icon"/>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent:'center' }} disabled={loading}>
                {loading ? <span className="spinner"/> : 'Update Password'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer" style={{ marginTop:20 }}>
          <Link to="/login" style={{ color:'var(--accent-light)', fontWeight:600, fontSize:14 }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
