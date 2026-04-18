import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  LayoutDashboard, CheckSquare, Users, ClipboardList,
  LogOut, Building2, Zap, Bell, BarChart2, Activity,
  Settings, Kanban, Calendar, PieChart, Sun, Moon, Video
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notification count every 30s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications?limit=1');
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, []);

  // SSE for real-time notification badge updates
  useEffect(() => {
    let es;
    try {
      const token = localStorage.getItem('accessToken');
      es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/stream?token=${token}`);
      es.addEventListener('notification', () => setUnreadCount(c => c + 1));
    } catch {}
    return () => { if (es) es.close(); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard',     icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/tasks',         icon: <CheckSquare size={18} />,     label: 'Tasks' },
    { to: '/board',         icon: <Kanban size={18} />,          label: 'Board' },
    { to: '/calendar',      icon: <Calendar size={18} />,        label: 'Calendar' },
    {
      to: '/notifications',
      icon: <Bell size={18} />,
      label: 'Notifications',
      badge: unreadCount > 0 ? unreadCount : null,
    },
    ...(isAdmin ? [
      { to: '/summary',     icon: <PieChart size={18} />,        label: 'Summary' },
      { to: '/analytics',   icon: <BarChart2 size={18} />,       label: 'Analytics' },
      { to: '/activity',    icon: <Activity size={18} />,        label: 'Activity Feed' },
      { to: '/meets',       icon: <Video size={18} />,           label: 'Google Meet' },
      { to: '/users',       icon: <Users size={18} />,           label: 'Team Members' },
      { to: '/audit',       icon: <ClipboardList size={18} />,   label: 'Audit Log' },
      { to: '/organization',icon: <Building2 size={18} />,       label: 'Organization' },
    ] : []),
    { to: '/settings',      icon: <Settings size={18} />,        label: 'Settings' },
  ];

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      {/* Logo + Org */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="logo-mark">
            <div className="logo-icon">
              <Zap size={20} color="white" />
            </div>
            <div>
              <div className="logo-text">Task<span>Flow</span></div>
            </div>
          </div>
          {/* ── Theme Toggle ── */}
          <button
            className="theme-toggle"
            onClick={toggle}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun size={16} />
              : <Moon size={16} />}
          </button>
        </div>
        <div className="org-name">{user?.organization?.name || 'My Organization'}</div>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge && (
              <span className="nav-badge">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User logout */}
      <div className="sidebar-footer">
        <div className="user-card" onClick={handleLogout} title="Click to logout">
          <div className="avatar">
            {user?.avatar ? <img src={user.avatar} alt={user.name} /> : initials}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className={`user-role ${isAdmin ? 'role-badge-admin' : ''}`}>{user?.role}</div>
          </div>
          <LogOut size={15} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
