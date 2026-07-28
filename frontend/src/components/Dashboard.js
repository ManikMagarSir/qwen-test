import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import InstanceCard from './InstanceCard';
import { Server, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInstances = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/instances');
      setInstances(res.data.instances);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 15000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  const handleDelete = (id) => {
    setInstances((prev) => prev.filter((i) => i._id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    setInstances((prev) =>
      prev.map((i) => (i._id === id ? { ...i, status: newStatus } : i))
    );
  };

  const running = instances.filter((i) => i.status === 'running').length;
  const stopped = instances.filter((i) => i.status === 'stopped').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Instances</h1>
          <p style={styles.subheading}>
            {loading ? 'Loading...' : `${instances.length} total \u00B7 ${running} running \u00B7 ${stopped} stopped`}
          </p>
        </div>
        <button onClick={fetchInstances} style={styles.refreshBtn} title="Refresh" disabled={loading}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div className="instance-grid" style={styles.grid}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : instances.length === 0 ? (
        <div style={styles.empty}>
          <Server size={48} color="#334155" />
          <h3 style={{ color: '#94A3B8', marginTop: '16px', fontSize: '1.1rem' }}>No instances yet</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '6px' }}>
            Create your first container to get started.
          </p>
          <a href="/create" style={styles.emptyCta}>Create Instance</a>
        </div>
      ) : (
        <div className="instance-grid" style={styles.grid}>
          {instances.map((inst) => (
            <InstanceCard
              key={inst._id}
              instance={inst}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={skeleton.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={skeleton.badge} />
        <div style={{ ...skeleton.badge, width: '60px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ ...skeleton.line, width: '80%' }} />
        <div style={{ ...skeleton.line, width: '60%' }} />
        <div style={{ ...skeleton.line, width: '70%' }} />
        <div style={{ ...skeleton.line, width: '50%' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <div style={{ ...skeleton.line, width: '70px', height: '30px', borderRadius: '4px' }} />
        <div style={{ ...skeleton.line, width: '70px', height: '30px', borderRadius: '4px' }} />
        <div style={{ ...skeleton.line, width: '70px', height: '30px', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

const skeleton = {
  card: {
    background: 'var(--color-muted)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    border: '1px solid var(--color-border)',
  },
  badge: {
    width: '50px',
    height: '20px',
    borderRadius: '4px',
    background: '#1E293B',
    animation: 'pulse 2s ease-in-out infinite',
  },
  line: {
    height: '14px',
    borderRadius: '4px',
    background: '#1E293B',
    animation: 'pulse 2s ease-in-out infinite',
  },
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--color-foreground)',
  },
  subheading: {
    color: '#64748B',
    fontSize: '0.88rem',
    marginTop: '4px',
  },
  refreshBtn: {
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
    flexShrink: 0,
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    marginBottom: '20px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyCta: {
    display: 'inline-block',
    marginTop: '20px',
    background: 'var(--color-accent)',
    color: '#020617',
    padding: '10px 24px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px',
  },
};
