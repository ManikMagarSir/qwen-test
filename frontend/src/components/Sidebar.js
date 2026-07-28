import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Server, Plus, BarChart3, User, LogOut, Cloud, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: collapsed ? '12px' : '10px 14px',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: isActive ? 'var(--color-accent)' : '#94A3B8',
    background: isActive ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
    justifyContent: collapsed ? 'center' : 'flex-start',
    transition: 'all var(--transition-fast)',
  });

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/create', icon: Plus, label: 'New Instance' },
    { to: '/monitoring', icon: BarChart3, label: 'Monitoring' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside style={{
      ...styles.sidebar,
      width: collapsed ? '64px' : '240px',
    }}>
      <div style={styles.brand}>
        <Cloud size={24} color="#22C55E" />
        {!collapsed && <span style={styles.brandText}>Cloud Manager</span>}
      </div>

      <nav style={styles.nav}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} style={({ isActive }) => linkStyle(isActive)} end={l.to === '/dashboard'}>
            <l.icon size={18} />
            {!collapsed && l.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <button onClick={onToggle} style={styles.collapseBtn} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Sign out">
          <LogOut size={16} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 90,
    background: 'var(--color-primary)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width var(--transition-normal)',
    overflow: 'hidden',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '18px 16px',
    borderBottom: '1px solid var(--color-border)',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
    whiteSpace: 'nowrap',
  },
  nav: {
    flex: 1,
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  footer: {
    borderTop: '1px solid var(--color-border)',
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  collapseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
};
