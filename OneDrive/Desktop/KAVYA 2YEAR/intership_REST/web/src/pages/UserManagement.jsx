import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, UserX, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const UserManagement = () => {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'member' });
  const [saving, setSaving] = useState(false);
  const [showTempPwd, setShowTempPwd] = useState(null);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get('/users');
      setMembers(data);
    } catch { toast('Failed to load members', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/users/invite', form);
      setMembers(m => [...m, data.user]);
      setShowTempPwd(data.tempPassword);
      setForm({ name: '', email: '', role: 'member' });
      setShowInvite(false);
      toast(`${data.user.name} invited!`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Invite failed', 'error');
    } finally { setSaving(false); }
  };

  const changeRole = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/users/${userId}/role`, { role: newRole });
      setMembers(m => m.map(u => u.id === userId ? { ...u, role: data.role } : u));
      toast('Role updated!', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update role', 'error');
    }
  };

  const deactivate = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      setMembers(m => m.filter(u => u.id !== userId));
      toast('Member removed', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to remove member', 'error');
    }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage your organization's members and roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}><UserPlus size={16} /> Invite Member</button>
      </div>

      {/* Temp password notice */}
      {showTempPwd && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>✅ Invitation sent!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Share this temporary password securely: <code style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-primary)', fontWeight: 700 }}>{showTempPwd}</code>
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowTempPwd(null)}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="card">
        {loading ? (
          <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {member.avatar ? <img src={member.avatar} alt={member.name} /> : initials(member.name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{member.name}
                          {member.id === me?.id && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                    <td>
                      {member.id !== me?.id ? (
                        <select
                          className="form-select"
                          value={member.role}
                          onChange={e => changeRole(member.id, e.target.value)}
                          style={{ width: 110, padding: '5px 10px', fontSize: 12 }}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${member.role}`}>{member.role}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: member.is_active ? 'var(--success)' : 'var(--danger)' }} />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {member.id !== me?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => deactivate(member.id)}>
                          <UserX size={13} /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Invite Team Member</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInvite(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Jane Smith" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="jane@company.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : <><UserPlus size={16} /> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
