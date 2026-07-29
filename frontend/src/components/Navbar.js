import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/create': 'New Container',
  '/monitoring': 'Monitoring',
  '/profile': 'Profile',
};

export default function Navbar({ collapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Cloud Manager';

  return (
    <nav style={{
      ...s.nav,
      left: collapsed ? '64px' : '240px',
    }}>
      <div style={s.inner}>
        <h2 style={s.title}>{title}</h2>
        <div style={s.right}>
          <div style={s.userBadge}>
            <div style={s.avatar}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <span style={s.userName}>{user?.name || user?.email}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    position: 'fixed', top: 0, right: 0, zIndex: 80,
    transition: 'left var(--transition-slow)',
    background: 'rgba(5, 7, 10, 0.8)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid var(--glass-border)',
  },
  inner: {
    height: '64px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px',
  },
  title: {
    fontFamily: 'var(--font)', fontSize: '1.05rem', fontWeight: 600,
    color: 'var(--text-primary)',
  },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  userBadge: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '4px 14px 4px 4px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.78rem', fontWeight: 700,
  },
  userName: { color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 },
};
