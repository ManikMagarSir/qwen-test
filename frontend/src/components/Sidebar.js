import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Plus, BarChart3, User, LogOut, Cloud, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/create', icon: Plus, label: 'New Instance' },
    { to: '/monitoring', icon: BarChart3, label: 'Monitoring' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside style={{
      ...s.sidebar,
      width: collapsed ? '64px' : '240px',
    }}>
      <div style={s.brand}>
        <div style={s.brandIcon}>
          <Cloud size={20} color="var(--accent)" />
        </div>
        {!collapsed && (
          <div style={s.brandTextWrap}>
            <span style={s.brandText}>Cloud Manager</span>
            <span style={s.brandBadge}>v2.0</span>
          </div>
        )}
      </div>

      <nav style={s.nav}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/dashboard'}
            style={({ isActive }) => ({
              ...s.link,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            })}>
            {({ isActive }) => (
              <>
                {isActive && <div style={s.activeBar} />}
                <l.icon size={18} />
                {!collapsed && <span style={s.linkLabel}>{l.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={s.footer}>
        {!collapsed && user && (
          <div style={s.userInfo}>
            <div style={s.avatar}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={s.userTextWrap}>
              <span style={s.userName}>{user?.name || 'User'}</span>
              <span style={s.userEmail}>{user?.email}</span>
            </div>
          </div>
        )}
        <div style={s.footerActions}>
          <button onClick={onToggle} style={s.iconBtn} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <LogOut size={16} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 90,
    background: 'rgba(15, 19, 32, 0.9)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex', flexDirection: 'column',
    transition: 'width var(--transition-slow)',
    overflow: 'hidden',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '22px 16px',
    borderBottom: '1px solid var(--glass-border)',
    justifyContent: 'center',
  },
  brandIcon: {
    width: '36px', height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--glass-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  brandTextWrap: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
  brandText: {
    fontFamily: 'var(--font)', fontSize: '0.95rem', fontWeight: 600,
    color: 'var(--text-primary)', whiteSpace: 'nowrap',
  },
  brandBadge: {
    fontSize: '0.6rem', color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500,
  },
  nav: { flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' },
  link: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500,
    position: 'relative', transition: 'all var(--transition)',
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute', left: 0, top: '4px', bottom: '4px',
    width: '3px', borderRadius: '0 3px 3px 0',
    background: 'var(--accent)',
    boxShadow: '0 0 10px var(--accent-glow)',
  },
  linkLabel: { whiteSpace: 'nowrap' },
  footer: {
    borderTop: '1px solid var(--glass-border)',
    padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 6px', borderRadius: 'var(--radius-sm)',
  },
  avatar: {
    width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
  },
  userTextWrap: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, overflow: 'hidden' },
  userName: {
    fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '0.7rem', color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  footerActions: { display: 'flex', gap: '4px' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
    transition: 'all var(--transition)',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem',
    whiteSpace: 'nowrap', transition: 'all var(--transition)',
  },
};
