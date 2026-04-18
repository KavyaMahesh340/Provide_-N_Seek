import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Floating theme toggle button — used on auth/landing pages
 * (the sidebar has its own inline toggle for app pages)
 */
const ThemeToggleFloat = ({ style = {} }) => {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      style={{
        position: 'fixed', top: 20, right: 24, zIndex: 50,
        width: 40, height: 40, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background  = 'var(--accent)';
        e.currentTarget.style.color       = 'white';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform   = 'rotate(20deg) scale(1.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = 'var(--bg-card)';
        e.currentTarget.style.color       = 'var(--text-secondary)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform   = 'none';
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggleFloat;
