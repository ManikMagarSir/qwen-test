import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/create': 'New Container',
  '/monitoring': 'Monitoring',
  '/profile': 'Profile',
};

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'Cloud Manager';

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.left}>
          <h2 style={styles.title}>{title}</h2>
        </div>
        <div style={styles.right}>
          <div style={styles.userBadge}>
            <div style={styles.avatar}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <span style={styles.userName}>{user?.name || user?.email}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 80,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
  },
  inner: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(51, 65, 85, 0.3)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22C55E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  userName: {
    color: '#CBD5E1',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
};
