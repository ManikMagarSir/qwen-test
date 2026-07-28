import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { User, Mail, Shield, Calendar, Loader } from 'lucide-react';

export default function Profile() {
  const { user, login: refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.put('/profile', { name });
      refreshUser(res.data.user.email, res.data.user.password);
      window.location.reload();
      setMessage({ type: 'success', text: 'Profile updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.put('/profile', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password changed' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Password change failed' });
    } finally {
      setLoading(false);
    }
  };

  const created = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : 'Unknown';

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Profile</h1>
      <p style={styles.sub}>Manage your account settings</p>

      {message.text && (
        <div style={{
          ...styles.msg,
          background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: message.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color: message.type === 'success' ? '#86EFAC' : '#FCA5A5',
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.grid}>
        {/* Info card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Account Info</h2>
          <div style={styles.infoRow}>
            <User size={16} color="#64748B" />
            <div>
              <span style={styles.infoLabel}>Name</span>
              <span style={styles.infoValue}>{user?.name}</span>
            </div>
          </div>
          <div style={styles.infoRow}>
            <Mail size={16} color="#64748B" />
            <div>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{user?.email}</span>
            </div>
          </div>
          <div style={styles.infoRow}>
            <Shield size={16} color="#64748B" />
            <div>
              <span style={styles.infoLabel}>Role</span>
              <span style={{
                ...styles.roleBadge,
                background: user?.role === 'admin' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                color: user?.role === 'admin' ? '#22C55E' : '#60A5FA',
              }}>
                {user?.role}
              </span>
            </div>
          </div>
          <div style={styles.infoRow}>
            <Calendar size={16} color="#64748B" />
            <div>
              <span style={styles.infoLabel}>Member since</span>
              <span style={styles.infoValue}>{created}</span>
            </div>
          </div>
        </div>

        {/* Edit name */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Edit Profile</h2>
          <form onSubmit={handleProfileUpdate}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
              <input
                style={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required={!!newPassword}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                style={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 24px',
    animation: 'fadeIn 0.3s ease',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--color-foreground)',
  },
  sub: {
    color: '#64748B',
    fontSize: '0.88rem',
    marginTop: '4px',
    marginBottom: '24px',
  },
  msg: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
    marginBottom: '20px',
    fontFamily: 'var(--font-heading)',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.72rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#CBD5E1',
    marginTop: '2px',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '0.78rem',
    fontWeight: 500,
    textTransform: 'capitalize',
    marginTop: '2px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    color: '#94A3B8',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    fontSize: '0.88rem',
    outline: 'none',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#020617',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
};
