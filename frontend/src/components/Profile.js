import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { User, Mail, Shield, Calendar, Loader, Save, Lock } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
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
      await api.put('/profile', { name });
      await refreshUser();
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
      await api.put('/profile', { currentPassword, newPassword });
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
      <div style={styles.header}>
        <h1 style={styles.heading}>Profile</h1>
        <p style={styles.sub}>Manage your account settings</p>
      </div>

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
        <div className="stagger-1" style={styles.card}>
          <div style={styles.cardHeader}>
            <User size={16} color="#22C55E" />
            <h2 style={styles.cardTitle}>Account Info</h2>
          </div>
          <div style={styles.infoRows}>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}><User size={14} color="#64748B" /></div>
              <div>
                <span style={styles.infoLabel}>Name</span>
                <span style={styles.infoValue}>{user?.name}</span>
              </div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}><Mail size={14} color="#64748B" /></div>
              <div>
                <span style={styles.infoLabel}>Email</span>
                <span style={styles.infoValue}>{user?.email}</span>
              </div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}><Shield size={14} color="#64748B" /></div>
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
            <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
              <div style={styles.infoIcon}><Calendar size={14} color="#64748B" /></div>
              <div>
                <span style={styles.infoLabel}>Member since</span>
                <span style={styles.infoValue}>{created}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stagger-2" style={styles.card}>
          <div style={styles.cardHeader}>
            <Save size={16} color="#22C55E" />
            <h2 style={styles.cardTitle}>Edit Profile</h2>
          </div>
          <form onSubmit={handleProfileUpdate}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={styles.btn}>
              {loading ? (
                <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </form>
        </div>

        <div className="stagger-3" style={styles.card}>
          <div style={styles.cardHeader}>
            <Lock size={16} color="#F59E0B" />
            <h2 style={styles.cardTitle}>Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
                <input
                  style={styles.input}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
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
                  autoComplete="new-password"
                />
            </div>
            <button type="submit" className="btn-primary" style={{ ...styles.btn, background: '#F59E0B', color: '#020617' }}>
              {loading ? (
                <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
              ) : (
                <><Lock size={14} /> Change Password</>
              )}
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
  header: {
    marginBottom: '28px',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--text-primary)',
  },
  sub: {
    color: 'var(--text-tertiary)',
    fontSize: '0.88rem',
    marginTop: '4px',
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
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    animation: 'slideUp 0.4s ease both',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-heading)',
  },
  infoRows: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  infoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    display: 'block',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
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
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
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
    fontSize: '0.88rem',
  },
};
