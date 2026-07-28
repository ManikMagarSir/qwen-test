import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Plus, BarChart3, User, LogOut, Cloud, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        <div style={styles.brandIcon}>
          <Cloud size={22} color="#22C55E" />
        </div>
        {!collapsed && (
          <div style={styles.brandTextWrap}>
            <span style={styles.brandText}>Cloud Manager</span>
            <span style={styles.brandBadge}>v2.0</span>
          </div>
        )}
      </div>

      <nav style={styles.nav}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/dashboard'}
            style={({ isActive }) => ({
              ...styles.link,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
              color: isActive ? '#22C55E' : '#94A3B8',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && <div style={styles.activeBar} />}
                <l.icon size={18} />
                {!collapsed && <span style={styles.linkLabel}>{l.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        {!collapsed && user && (
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={styles.userTextWrap}>
              <span style={styles.userName}>{user?.name || 'User'}</span>
              <span style={styles.userEmail}>{user?.email}</span>
            </div>
          </div>
        )}
        <div style={styles.footerActions}>
          <button onClick={onToggle} style={styles.iconBtn} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign out">
            <LogOut size={16} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
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
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(51, 65, 85, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width var(--transition-normal)',
    overflow: 'hidden',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
    justifyContent: 'center',
  },
  brandIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  brandText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
    whiteSpace: 'nowrap',
  },
  brandBadge: {
    fontSize: '0.65rem',
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 500,
    position: 'relative',
    transition: 'all var(--transition-fast)',
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '4px',
    bottom: '4px',
    width: '3px',
    borderRadius: '0 3px 3px 0',
    background: '#22C55E',
    boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
  },
  linkLabel: {
    whiteSpace: 'nowrap',
  },
  footer: {
    borderTop: '1px solid rgba(51, 65, 85, 0.3)',
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 6px',
    borderRadius: 'var(--radius-sm)',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22C55E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.82rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  userTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
    overflow: 'hidden',
  },
  userName: {
    fontSize: '0.82rem',
    color: '#CBD5E1',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '0.7rem',
    color: '#64748B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footerActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all var(--transition-fast)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flex: 1,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
  },
};
