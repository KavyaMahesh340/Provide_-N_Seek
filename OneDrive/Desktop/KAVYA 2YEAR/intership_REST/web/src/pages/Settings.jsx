import { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare, User, Settings as SettingsIcon, Shield, Bell, Key, Globe,
  Plus, Trash2, ToggleLeft, ToggleRight, Download, Copy, Eye, EyeOff, QrCode, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Section = ({ title, icon, children }) => (
  <div className="card" style={{ marginBottom: 20 }}>
    <h2 className="section-title">{icon} {title}</h2>
    {children}
  </div>
);

const Toggle2 = ({ on, onChange }) => (
  <div onClick={onChange} style={{ cursor: 'pointer', transition: 'opacity .15s' }}>
    {on
      ? <ToggleRight size={28} color="var(--accent)" />
      : <ToggleLeft size={28} color="var(--text-muted)" />}
  </div>
);

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile]     = useState({ name: user?.name || '', notif_prefs: user?.notif_prefs || {} });
  const [saving, setSaving]       = useState(false);

  // 2FA
  const [twoFAState, setTwoFAState] = useState({ enabled: user?.totp_enabled || false, qr: null, secret: null, token: '' });
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Org settings
  const [flags, setFlags]           = useState({});
  const [flagsSaving, setFlagsSaving] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks]     = useState([]);
  const [newWh, setNewWh]           = useState({ name: '', url: '', events: ['task.created','task.updated','task.deleted'] });
  const [whLoading, setWhLoading]   = useState(false);

  // API keys
  const [apiKeys, setApiKeys]       = useState([]);
  const [newKey, setNewKey]         = useState({ name: '', expires_in_days: '' });
  const [createdKey, setCreatedKey] = useState(null);
  const [keyLoading, setKeyLoading] = useState(false);

  const loadOrgData = useCallback(async () => {
    try {
      const [settingsRes, whRes, keyRes] = await Promise.all([
        api.get('/settings'),
        api.get('/webhooks'),
        api.get('/keys'),
      ]);
      setFlags(settingsRes.data.feature_flags || {});
      setWebhooks(whRes.data || []);
      setApiKeys(keyRes.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAdmin) loadOrgData();
  }, [isAdmin, loadOrgData]);

  // ── Profile save ──────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch('/users/me', { name: profile.name, notif_prefs: profile.notif_prefs });
      toast('Profile updated!', 'success');
    } catch { toast('Failed to update profile', 'error'); }
    setSaving(false);
  };

  // ── 2FA ───────────────────────────────────────────────────────
  const setup2FA = async () => {
    setTwoFALoading(true);
    try {
      const { data } = await api.post('/users/me/2fa/setup');
      setTwoFAState(s => ({ ...s, qr: data.qr, secret: data.secret }));
      toast('Scan the QR code with your authenticator app', 'success');
    } catch { toast('Failed to setup 2FA', 'error'); }
    setTwoFALoading(false);
  };

  const verify2FA = async () => {
    setTwoFALoading(true);
    try {
      await api.post('/users/me/2fa/verify', { token: twoFAState.token });
      setTwoFAState(s => ({ ...s, enabled: true, qr: null, secret: null, token: '' }));
      toast('2FA enabled successfully! 🔐', 'success');
    } catch { toast('Invalid token — try again', 'error'); }
    setTwoFALoading(false);
  };

  const disable2FA = async () => {
    if (!confirm('Disable 2FA? This will remove your extra security layer.')) return;
    setTwoFALoading(true);
    try {
      await api.post('/users/me/2fa/disable');
      setTwoFAState(s => ({ ...s, enabled: false, qr: null, secret: null }));
      toast('2FA disabled', 'success');
    } catch { toast('Failed to disable 2FA', 'error'); }
    setTwoFALoading(false);
  };

  // ── GDPR Export ───────────────────────────────────────────────
  const exportData = async () => {
    try {
      const response = await api.get('/users/me/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `my-data-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast('Data exported!', 'success');
    } catch { toast('Export failed', 'error'); }
  };

  // ── Feature flags ─────────────────────────────────────────────
  const toggleFlag = async (key) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    setFlagsSaving(true);
    try {
      await api.patch('/settings', { feature_flags: updated });
      toast(`Feature "${key}" ${updated[key] ? 'enabled' : 'disabled'}`, 'success');
    } catch { toast('Failed to update settings', 'error'); }
    setFlagsSaving(false);
  };

  // ── Webhooks ──────────────────────────────────────────────────
  const createWebhook = async (e) => {
    e.preventDefault(); setWhLoading(true);
    try {
      const { data } = await api.post('/webhooks', newWh);
      setWebhooks(w => [data, ...w]);
      setNewWh({ name: '', url: '', events: ['task.created','task.updated','task.deleted'] });
      toast('Webhook created!', 'success');
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
    setWhLoading(false);
  };

  const deleteWebhook = async (id) => {
    await api.delete(`/webhooks/${id}`).catch(() => {});
    setWebhooks(w => w.filter(x => x.id !== id));
    toast('Webhook deleted', 'success');
  };

  const toggleWebhook = async (wh) => {
    const { data } = await api.patch(`/webhooks/${wh.id}`, { is_active: !wh.is_active });
    setWebhooks(w => w.map(x => x.id === data.id ? data : x));
  };

  // ── API Keys ──────────────────────────────────────────────────
  const createApiKey = async (e) => {
    e.preventDefault(); setKeyLoading(true);
    try {
      const { data } = await api.post('/keys', {
        name: newKey.name,
        expires_in_days: newKey.expires_in_days ? parseInt(newKey.expires_in_days) : undefined,
      });
      setApiKeys(k => [data, ...k]);
      setCreatedKey(data.full_key);
      setNewKey({ name: '', expires_in_days: '' });
      toast('API key created — copy it now!', 'success');
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
    setKeyLoading(false);
  };

  const revokeApiKey = async (id) => {
    await api.delete(`/keys/${id}`).catch(() => {});
    setApiKeys(k => k.filter(x => x.id !== id));
    toast('Key revoked', 'success');
  };

  const FLAG_LABELS = {
    subtasks: 'Subtasks', file_attachments: 'File Attachments', comments: 'Task Comments',
    webhooks: 'Outgoing Webhooks', api_keys: 'API Keys', recurring_tasks: 'Recurring Tasks', two_factor: 'Two-Factor Auth',
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title"><SettingsIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Settings</h1>
          <p className="page-subtitle">Profile, security, and organisation configuration</p>
        </div>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={<User size={16} />}>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Notification Preferences</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'task_assigned', label: 'Task assigned to me' },
                { key: 'task_mentioned', label: '@Mentions' },
                { key: 'task_due_soon', label: 'Due date reminders' },
                { key: 'digest', label: 'Daily digest email' },
              ].map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.label}</span>
                  <Toggle2
                    on={profile.notif_prefs[p.key] ?? true}
                    onChange={() => setProfile(pr => ({ ...pr, notif_prefs: { ...pr.notif_prefs, [p.key]: !(pr.notif_prefs[p.key] ?? true) } }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </form>
      </Section>

      {/* 2FA */}
      <Section title="Two-Factor Authentication" icon={<Shield size={16} />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: twoFAState.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', borderRadius: 10, border: `1px solid ${twoFAState.enabled ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
          <Shield size={20} color={twoFAState.enabled ? '#22c55e' : '#ef4444'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>TOTP via Authenticator App</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{twoFAState.enabled ? 'Active — your account is protected' : 'Not enabled — add extra security'}</div>
          </div>
          <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: twoFAState.enabled ? '#22c55e' : '#ef4444', color: 'white' }}>
            {twoFAState.enabled ? 'ON' : 'OFF'}
          </div>
        </div>

        {!twoFAState.enabled && !twoFAState.qr && (
          <button className="btn btn-primary" onClick={setup2FA} disabled={twoFALoading}>
            <Shield size={14} /> {twoFALoading ? 'Setting up…' : 'Enable 2FA'}
          </button>
        )}

        {twoFAState.qr && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Scan this QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code below:
            </p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <img src={twoFAState.qr} alt="2FA QR Code" style={{ width: 160, height: 160, background: 'white', padding: 8, borderRadius: 10 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="form-group">
                  <label className="form-label">Secret (manual entry)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="form-input" value={twoFAState.secret || ''} readOnly style={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(twoFAState.secret)}><Copy size={13} /></button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input className="form-input" placeholder="000000" maxLength={6} value={twoFAState.token}
                    onChange={e => setTwoFAState(s => ({ ...s, token: e.target.value }))}
                    style={{ letterSpacing: 4, fontSize: 18, textAlign: 'center' }} />
                </div>
                <button className="btn btn-primary" onClick={verify2FA} disabled={twoFALoading || twoFAState.token.length < 6}>
                  {twoFALoading ? <span className="spinner" /> : 'Verify & Enable'}
                </button>
              </div>
            </div>
          </div>
        )}

        {twoFAState.enabled && (
          <button className="btn btn-secondary" onClick={disable2FA} disabled={twoFALoading} style={{ marginTop: 8 }}>
            {twoFALoading ? <span className="spinner" /> : 'Disable 2FA'}
          </button>
        )}
      </Section>

      {/* GDPR Export */}
      <Section title="Data Privacy & GDPR" icon={<Download size={16} />}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Download a complete export of all your personal data including tasks, comments, and activity logs.
        </p>
        <button className="btn btn-secondary" onClick={exportData}>
          <Download size={14} /> Export My Data
        </button>
      </Section>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Feature flags */}
          <Section title="Feature Flags" icon={<ToggleRight size={16} />}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Enable or disable features for your entire organisation.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(FLAG_LABELS).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{flags[key] ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <Toggle2 on={!!flags[key]} onChange={() => toggleFlag(key)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Webhooks */}
          <Section title="Outgoing Webhooks" icon={<Globe size={16} />}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Fire HTTP POST events to external endpoints on task changes.</p>
            <form onSubmit={createWebhook} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 20 }}>
              <input className="form-input" placeholder="Webhook name" value={newWh.name} onChange={e => setNewWh(w => ({ ...w, name: e.target.value }))} required />
              <input className="form-input" placeholder="https://example.com/webhook" value={newWh.url} onChange={e => setNewWh(w => ({ ...w, url: e.target.value }))} required />
              <button type="submit" className="btn btn-primary" disabled={whLoading}>
                <Plus size={15} /> Add
              </button>
            </form>
            {webhooks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No webhooks configured</p>
            ) : webhooks.map(wh => (
              <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{wh.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wh.url}</div>
                  {wh.last_triggered_at && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Last: {new Date(wh.last_triggered_at).toLocaleString()} · {wh.delivery_count} deliveries</div>}
                </div>
                <Toggle2 on={wh.is_active} onChange={() => toggleWebhook(wh)} />
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteWebhook(wh.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </Section>

          {/* API Keys */}
          <Section title="API Keys" icon={<Key size={16} />}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Generate keys for programmatic access. Keys are only shown once.</p>

            {createdKey && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>✅ New key created — copy it now, it won't be shown again:</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, wordBreak: 'break-all' }}>{createdKey}</code>
                  <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(createdKey); toast('Copied!', 'success'); }}><Copy size={13} /></button>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setCreatedKey(null)}>Dismiss</button>
              </div>
            )}

            <form onSubmit={createApiKey} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 10, marginBottom: 20 }}>
              <input className="form-input" placeholder="Key name (e.g. CI/CD Pipeline)" value={newKey.name} onChange={e => setNewKey(k => ({ ...k, name: e.target.value }))} required />
              <input className="form-input" placeholder="Expires in days" type="number" min="1" value={newKey.expires_in_days} onChange={e => setNewKey(k => ({ ...k, expires_in_days: e.target.value }))} />
              <button type="submit" className="btn btn-primary" disabled={keyLoading}><Plus size={15} /> Generate</button>
            </form>

            {apiKeys.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No API keys yet</p>
            ) : apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
                <Key size={15} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{k.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{k.key_prefix}…</div>
                  {k.last_used_at && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Last used: {new Date(k.last_used_at).toLocaleString()}</div>}
                </div>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => revokeApiKey(k.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
};

export default Settings;
