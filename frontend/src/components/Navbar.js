import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={{ flex: 1 }} />
        <div style={styles.right}>
          <span style={styles.userText}>{user?.name || user?.email}</span>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign out">
            <LogOut size={16} />
          </button>
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
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border)',
    marginLeft: 'inherit',
  },
  inner: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 24px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userText: {
    color: '#94A3B8',
    fontSize: '0.88rem',
  },
  logoutBtn: {
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
  },
};
