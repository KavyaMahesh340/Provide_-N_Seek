import { useState, useEffect } from 'react';
import { Building2, Save, Globe, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const Organization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/organizations/me').then(({ data }) => {
      setOrg(data);
      setForm({ name: data.name, description: data.description || '' });
    }).catch(() => toast('Failed to load org', 'error'))
    .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/organizations/me', form);
      setOrg(data);
      toast('Organization updated!', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Organization</h1>
          <p className="page-subtitle">Manage your organization settings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        {/* Edit Form */}
        <div className="card">
          <h2 className="section-title"><Building2 size={18} /> Organization Details</h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of your organization..." />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={16} /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="card">
          <h2 className="section-title"><Globe size={18} /> Organization Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Slug', value: org?.slug },
              { label: 'Members', value: org?.members?.length || '—' },
              { label: 'Created', value: org?.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—' },
              { label: 'Your Role', value: user?.role, badge: true },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                {item.badge ? (
                  <span className={`badge badge-${user?.role}`}>{item.value}</span>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organization;
