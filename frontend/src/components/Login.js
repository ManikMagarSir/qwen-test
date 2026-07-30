import React, { useState, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, LogIn, Server, Globe, Terminal, Camera, Loader } from 'lucide-react';
const Scene3D = React.lazy(() => import('./LoginScene3D'));

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
    } finally { setLoading(false); }
  };

  const features = [
    { icon: Server, text: 'LXC Container Management' },
    { icon: Globe, text: 'Static IP Allocation' },
    { icon: Camera, text: 'Snapshot & Rollback' },
    { icon: Terminal, text: 'Web-based Console' },
  ];

  return (
    <div style={s.page}>
      <div style={s.canvasWrap}>
        <Suspense fallback={
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          </div>
        }>
          <Scene3D />
        </Suspense>
      </div>

      <div style={s.layout}>
        <div style={s.formCard}>
          <div style={s.logo}><Cloud size={24} color="var(--accent)" /></div>
          <h2 style={s.formTitle}>Sign in</h2>
          <p style={s.formSub}>to your Cloud Manager account</p>

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

          <div style={s.features}>
            {features.map((f, i) => (
              <div key={i} style={s.featureItem}>
                <div style={s.featureIcon}><f.icon size={12} color="var(--accent)" /></div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', background: 'var(--bg-deep)',
  },
  canvasWrap: {
    position: 'fixed', inset: 0, zIndex: 0,
  },
  layout: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: '400px', padding: '20px',
  },
  formCard: {
    background: 'rgba(5, 7, 10, 0.7)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-xl)',
    padding: '36px',
    animation: 'slideUp 0.5s ease',
  },
  logo: {
    width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '20px', animation: 'breathe 3s ease-in-out infinite',
  },
  formTitle: {
    fontFamily: 'var(--font)', fontSize: '1.3rem', fontWeight: 600,
    color: 'var(--text-primary)', marginBottom: '4px',
  },
  formSub: {
    color: 'var(--text-tertiary)', fontSize: '0.88rem',
    marginBottom: '24px',
  },
  error: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem', marginBottom: '20px', animation: 'slideDown 0.2s ease',
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block', color: 'var(--text-secondary)', fontWeight: 500,
    marginBottom: '6px', fontSize: '0.85rem',
  },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
  },
  btn: {
    width: '100%', marginTop: '4px', padding: '11px', borderRadius: 'var(--radius-sm)',
    border: 'none', background: 'var(--accent)', color: '#020617',
    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
  },
  spinner: {
    width: '16px', height: '16px', border: '2px solid rgba(2,6,23,0.3)',
    borderTopColor: '#020617', borderRadius: '50%',
    animation: 'spin 0.6s linear infinite', display: 'inline-block',
  },
  footer: {
    textAlign: 'center', color: 'var(--text-tertiary)',
    fontSize: '0.88rem', marginTop: '24px', marginBottom: '24px',
  },
  link: { color: 'var(--accent)', fontWeight: 500 },
  features: {
    display: 'flex', justifyContent: 'center', gap: '16px',
    paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  featureItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  featureIcon: {
    width: '26px', height: '26px', borderRadius: 'var(--radius-xs)',
    background: 'rgba(16,185,129,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { color: 'var(--text-tertiary)', fontSize: '0.78rem' },
};
