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
    <div style={styles.page}>
      <div className="mesh-bg" />
      <div style={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>

      <div className="auth-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarContent}>
          <div style={styles.logoWrap}>
            <Cloud size={40} color="#22C55E" />
          </div>
          <h1 style={styles.sidebarTitle}>Cloud Manager</h1>
          <p style={styles.sidebarDesc}>
            Enterprise-grade infrastructure management. Deploy, monitor, and scale your containers with confidence.
          </p>
          <div style={styles.features}>
            {features.map((f, i) => (
              <div key={i} style={styles.featureRow}>
                <div style={styles.featureIcon}>
                  <f.icon size={14} color="#22C55E" />
                </div>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={styles.trustRow}>
            <span style={styles.trustDot} />
            <span style={styles.trustText}>99.9% Uptime SLA</span>
          </div>
        </div>
      </div>

      <div style={styles.formWrap}>
        <div style={styles.formContainer}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Welcome back</h2>
              <p style={styles.formSub}>Sign in to your account to continue</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={styles.field}>
                <label htmlFor="email" style={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label htmlFor="password" style={styles.label}>Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={styles.input}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={styles.button}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={spinnerStyle} /> Signing in...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <LogIn size={16} /> Sign In
                  </span>
                )}
              </button>
            </form>

            <p style={styles.footer}>
              Don't have an account?{' '}
              <Link to="/register" style={styles.link}>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const spinnerStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(2, 6, 23, 0.3)',
  borderTopColor: '#020617',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  display: 'inline-block',
};

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    background: 'var(--color-background)',
    position: 'relative',
    overflow: 'hidden',
  },
  particles: {
    position: 'fixed',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  dot: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.3)',
    animation: 'float 6s ease-in-out infinite',
  },
  sidebar: {
    display: 'none',
    width: '440px',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: '56px 48px',
    flexDirection: 'column',
    justifyContent: 'center',
    borderRight: '1px solid rgba(51, 65, 85, 0.4)',
    position: 'relative',
    zIndex: 2,
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  logoWrap: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'breathe 3s ease-in-out infinite',
  },
  sidebarTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.8rem',
    color: 'var(--color-foreground)',
    lineHeight: 1.2,
  },
  sidebarDesc: {
    color: '#94A3B8',
    fontSize: '0.95rem',
    lineHeight: 1.7,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  featureIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(34, 197, 94, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    color: '#CBD5E1',
    fontSize: '0.9rem',
  },
  trustRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(34, 197, 94, 0.04)',
    border: '1px solid rgba(34, 197, 94, 0.1)',
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22C55E',
    flexShrink: 0,
    animation: 'glowPulse 2s ease-in-out infinite',
  },
  trustText: {
    color: '#22C55E',
    fontSize: '0.82rem',
    fontWeight: 500,
  },
  formWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    zIndex: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
  },
  formCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    borderRadius: 'var(--radius-xl)',
    padding: '36px',
    animation: 'fadeIn 0.5s ease',
  },
  formHeader: {
    marginBottom: '28px',
  },
  formTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--color-foreground)',
    marginBottom: '6px',
  },
  formSub: {
    color: '#64748B',
    fontSize: '0.9rem',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    marginBottom: '20px',
    animation: 'slideDown 0.2s ease',
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'rgba(2, 6, 23, 0.5)',
    color: 'var(--color-foreground)',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    width: '100%',
    marginTop: '8px',
    padding: '12px',
    fontSize: '0.95rem',
  },
  footer: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: '0.88rem',
    marginTop: '24px',
  },
  link: {
    color: 'var(--color-accent)',
    fontWeight: 500,
  },
};
