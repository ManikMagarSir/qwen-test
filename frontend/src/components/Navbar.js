import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, Plus, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/dashboard" style={styles.brand}>
          <Cloud size={22} color="#22C55E" />
          <span style={styles.brandText}>Cloud Manager</span>
        </Link>

        <div className="nav-desktop" style={styles.desktop}>
          <span style={styles.user}>{user?.name || user?.email}</span>
          <Link to="/create" style={styles.createBtn}>
            <Plus size={16} />
            New Instance
          </Link>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>

        <button
          className="nav-menu-btn"
          onClick={() => setOpen(!open)}
          style={styles.menuBtn}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div style={styles.mobile}>
          <span style={styles.mobileUser}>{user?.name || user?.email}</span>
          <Link to="/create" style={styles.mobileCreate} onClick={() => setOpen(false)}>
            <Plus size={16} /> New Instance
          </Link>
          <button onClick={handleLogout} style={styles.mobileLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border)',
  },
  inner: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '64px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  brandText: {
    fontSize: '1.15rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
    fontFamily: 'var(--font-heading)',
  },
  desktop: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    '@media (max-width: 640px)': { display: 'none' },
  },
  user: {
    color: 'var(--color-border)',
    fontSize: '0.88rem',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--color-accent)',
    color: '#020617',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.88rem',
    textDecoration: 'none',
    transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
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
    color: 'var(--color-border)',
    cursor: 'pointer',
  },
  menuBtn: {
    display: 'none',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-foreground)',
    padding: '8px',
    cursor: 'pointer',
  },
  mobile: {
    padding: '12px 24px 20px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mobileUser: {
    color: 'var(--color-border)',
    fontSize: '0.88rem',
  },
  mobileCreate: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--color-accent)',
    color: '#020617',
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
  mobileLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-border)',
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};


