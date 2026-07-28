import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, UserPlus } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="auth-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarContent}>
          <Cloud size={48} color="#22C55E" />
          <h1 style={styles.sidebarTitle}>Cloud Manager</h1>
          <p style={styles.sidebarDesc}>
            Your private cloud platform. Create and manage containers with ease.
          </p>
          <div style={styles.features}>
            <Feature text="Multi-tenant isolation" />
            <Feature text="One-click LXC deployment" />
            <Feature text="Static IP assignment" />
            <Feature text="Real-time monitoring" />
          </div>
        </div>
      </div>

      <div style={styles.formWrap}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Create account</h2>
          <p style={styles.formSub}>Get started with your private cloud</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="name" style={styles.label}>Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                style={styles.input}
              />
            </div>
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
                minLength={6}
                placeholder="At least 6 characters"
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span style={spinnerStyle} /> Creating account...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <UserPlus size={16} /> Create Account
                </span>
              )}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8', fontSize: '0.9rem' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
      {text}
    </div>
  );
}

const spinnerStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  display: 'inline-block',
};

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    background: 'var(--color-background)',
  },
  sidebar: {
    display: 'none',
    width: '440px',
    background: 'var(--color-muted)',
    padding: '48px',
    flexDirection: 'column',
    justifyContent: 'center',
    borderRight: '1px solid var(--color-border)',
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    gap: '12px',
    marginTop: '8px',
  },
  formWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
  },
  formTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--color-foreground)',
    marginBottom: '6px',
  },
  formSub: {
    color: '#94A3B8',
    fontSize: '0.9rem',
    marginBottom: '28px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-muted)',
    color: 'var(--color-foreground)',
    fontSize: '0.95rem',
  },
  button: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#020617',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: '0.88rem',
    marginTop: '24px',
  },
  link: {
    color: 'var(--color-accent)',
    fontWeight: 500,
  },
};


