import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, LogIn, Server, Globe, Terminal, Camera } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Server, text: 'LXC Container Management' },
    { icon: Globe, text: 'Static IP Allocation' },
    { icon: Camera, text: 'Snapshot & Rollback' },
    { icon: Terminal, text: 'Web-based Console' },
  ];

  return (
    <div style={s.page}>
      <div style={s.bgGlow} />
      <div style={s.bgGrid} />

      <div style={s.layout}>
        <div className="auth-brand-col" style={s.brandCol}>
          <div style={s.brandCard}>
            <div style={s.logo}>
              <Cloud size={32} color="var(--accent)" />
            </div>
            <h1 style={s.brandTitle}>Cloud Manager</h1>
            <p style={s.brandDesc}>
              Enterprise container infrastructure.<br />
              Deploy, monitor, and scale.
            </p>
            <div style={s.featureList}>
              {features.map((f, i) => (
                <div key={i} style={s.featureItem}>
                  <div style={s.featureIcon}><f.icon size={14} color="var(--accent)" /></div>
                  <span style={s.featureText}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s.formCol}>
          <div style={s.formCard}>
            <div style={s.formHeader}>
              <h2 style={s.formTitle}>Welcome back</h2>
              <p style={s.formSub}>Sign in to your account</p>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" autoComplete="current-password" style={s.input} />
              </div>
              <button type="submit" disabled={loading} style={s.btn}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={s.spinner} /> Signing in...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <LogIn size={16} /> Sign In
                  </span>
                )}
              </button>
            </form>
            <p style={s.footer}>
              Don't have an account? <Link to="/register" style={s.link}>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden', padding: '24px',
  },
  bgGlow: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 35% at 20% 80%, rgba(59,130,246,0.04) 0%, transparent 50%)',
    zIndex: 0,
  },
  bgGrid: {
    position: 'fixed', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    zIndex: 0,
  },
  layout: {
    display: 'flex', gap: '48px', alignItems: 'center',
    maxWidth: '920px', width: '100%', position: 'relative', zIndex: 1,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  brandCol: { display: 'none', flex: 1, minWidth: '300px', maxWidth: '380px' },
  brandCard: {
    background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)',
    padding: '40px',
  },
  logo: {
    width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
    background: 'var(--accent-dim)', border: '1px solid var(--glass-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '24px', animation: 'breathe 3s ease-in-out infinite',
  },
  brandTitle: {
    fontFamily: 'var(--font)', fontSize: '1.8rem', fontWeight: 700,
    color: 'var(--text-primary)', marginBottom: '10px',
  },
  brandDesc: { color: 'var(--text-tertiary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '28px' },
  featureList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  featureIcon: {
    width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { color: 'var(--text-secondary)', fontSize: '0.88rem' },
  formCol: { flex: 1, minWidth: '340px', maxWidth: '420px' },
  formCard: {
    background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)',
    padding: '36px', animation: 'slideUp 0.4s ease',
  },
  formHeader: { marginBottom: '24px' },
  formTitle: { fontFamily: 'var(--font)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  formSub: { color: 'var(--text-tertiary)', fontSize: '0.9rem' },
  error: {
    background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem', marginBottom: '20px', animation: 'slideDown 0.2s ease',
  },
  field: { marginBottom: '16px' },
  label: { display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)',
    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
    transition: 'all var(--transition)',
  },
  btn: {
    width: '100%', marginTop: '4px', padding: '11px', borderRadius: 'var(--radius-sm)',
    border: 'none', background: 'var(--accent)', color: '#020617',
    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all var(--transition)',
  },
  spinner: {
    width: '16px', height: '16px', border: '2px solid rgba(2,6,23,0.3)',
    borderTopColor: '#020617', borderRadius: '50%',
    animation: 'spin 0.6s linear infinite', display: 'inline-block',
  },
  footer: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.88rem', marginTop: '24px' },
  link: { color: 'var(--accent)', fontWeight: 500 },
};
