import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/dashboard" style={styles.brand}>☁️ Cloud Manager</Link>
      <div style={styles.right}>
        <span style={styles.user}>{user?.name || user?.email}</span>
        <Link to="/create" style={styles.btn}>+ New Instance</Link>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#1a1a2e',
    color: '#eee',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#e94560',
    textDecoration: 'none',
  },
  right: { display: 'flex', alignItems: 'center', gap: '16px' },
  user: { color: '#aaa', fontSize: '0.9rem' },
  btn: {
    background: '#e94560',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  logoutBtn: {
    background: 'transparent',
    color: '#aaa',
    border: '1px solid #555',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};
