import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Zap } from 'lucide-react';
import api from '../api/axios';

const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
            <div className="logo-icon"><Zap size={18} color="white"/></div>
            <span className="logo-text">Task<span>Flow</span></span>
          </div>
        </div>

        {!sent ? (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-subtitle">Enter your email and we'll send a reset link.</p>

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#f87171' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="input-icon-wrap">
                  <Mail size={16} className="form-icon"/>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent:'center' }} disabled={loading}>
                {loading ? <span className="spinner"/> : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📬</div>
            <h2 className="auth-title" style={{ marginBottom:8 }}>Link generated!</h2>
            <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>
              A password reset link was generated for <strong style={{ color:'var(--text-primary)' }}>{email}</strong>.<br/>
              Link expires in 30 minutes.
            </p>
            <div style={{
              marginTop:16, padding:'12px 14px',
              background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)',
              borderRadius:10, textAlign:'left'
            }}>
              <p style={{ fontSize:12, color:'var(--accent-light)', fontWeight:700, marginBottom:4 }}>🛠️ Dev Mode Tip</p>
              <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6, margin:0 }}>
                Email is not configured yet. Copy the <strong style={{color:'var(--text-primary)'}}>reset link</strong> directly from the
                <strong style={{color:'var(--text-primary)'}}> backend terminal</strong> window (look for 🔗 in the logs).
              </p>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:12 }}>
              To enable real emails, configure <code style={{color:'var(--accent-light)'}}>EMAIL_USER</code> &amp; <code style={{color:'var(--accent-light)'}}>EMAIL_PASS</code> in <code style={{color:'var(--accent-light)'}}>backend/.env</code>
            </p>
          </div>
        )}

        <div className="auth-footer" style={{ marginTop:20 }}>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--accent-light)', fontWeight:600, fontSize:14 }}>
            <ArrowLeft size={14}/> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
