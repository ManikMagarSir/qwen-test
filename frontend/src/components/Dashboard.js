import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import InstanceCard from './InstanceCard';
import { Server, Plus, RefreshCw, Activity, Cpu, Database } from 'lucide-react';

export default function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
  const totalCpus = instances.reduce((s, i) => s + (i.cpus || 0), 0);
  const totalMem = instances.reduce((s, i) => s + (i.memory || 0), 0);

  const stats = [
    { label: 'Total', value: instances.length, icon: Server, color: '#3B82F6' },
    { label: 'Running', value: running, icon: Activity, color: '#22C55E' },
    { label: 'Stopped', value: stopped, icon: Activity, color: '#EF4444' },
    { label: 'CPU Cores', value: totalCpus, icon: Cpu, color: '#8B5CF6' },
    { label: 'Memory', value: totalMem >= 1024 ? `${(totalMem / 1024).toFixed(1)} GB` : `${totalMem} MB`, icon: Database, color: '#F59E0B' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Dashboard</h1>
          <p style={styles.subheading}>
            {loading ? 'Loading...' : `${instances.length} container${instances.length !== 1 ? 's' : ''} across your infrastructure`}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchInstances} style={styles.refreshBtn} title="Refresh" disabled={loading}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => navigate('/create')} className="btn-primary" style={styles.createBtn}>
            <Plus size={16} /> New Container
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="dashboard-stats" style={styles.statsGrid}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={styles.statSkeleton} />
            ))}
          </div>
          <div className="instance-grid" style={styles.grid}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <div className="dashboard-stats" style={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={s.label} className={`stagger-${i + 1}`} style={styles.statCard}>
                <div style={styles.statTop}>
                  <span style={styles.statValue}>{s.value}</span>
                  <div style={{ ...styles.statIcon, background: `${s.color}15`, color: s.color }}>
                    <s.icon size={16} />
                  </div>
                </div>
                <span style={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          {instances.length === 0 ? (
            <div className="stagger-5" style={styles.empty}>
              <div style={styles.emptyIcon}>
                <Server size={48} color="#334155" />
              </div>
              <h3 style={styles.emptyTitle}>No instances yet</h3>
              <p style={styles.emptyText}>
                Create your first container to start managing your infrastructure.
              </p>
              <button onClick={() => navigate('/create')} className="btn-primary" style={styles.emptyBtn}>
                <Plus size={16} /> Create Instance
              </button>
            </div>
          ) : (
            <div className="instance-grid" style={styles.grid}>
              {instances.map((inst, i) => (
                <div key={inst._id} className={`stagger-${(i % 8) + 1}`}>
                  <InstanceCard
                    instance={inst}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  const shimmer = {
    background: 'linear-gradient(90deg, #1E293B 25%, #1A1E2F 50%, #1E293B 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };
  return (
    <div style={skeleton.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ ...shimmer, width: '50px', height: '20px', borderRadius: '4px' }} />
        <div style={{ ...shimmer, width: '70px', height: '20px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ ...shimmer, height: '14px', borderRadius: '4px', width: '80%' }} />
        <div style={{ ...shimmer, height: '14px', borderRadius: '4px', width: '60%' }} />
        <div style={{ ...shimmer, height: '14px', borderRadius: '4px', width: '70%' }} />
        <div style={{ ...shimmer, height: '14px', borderRadius: '4px', width: '50%' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <div style={{ ...shimmer, width: '70px', height: '30px', borderRadius: '4px' }} />
        <div style={{ ...shimmer, width: '70px', height: '30px', borderRadius: '4px' }} />
        <div style={{ ...shimmer, width: '70px', height: '30px', borderRadius: '4px' }} />
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
    gap: '16px',
    flexWrap: 'wrap',
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
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  createBtn: {
    padding: '10px 18px',
    fontSize: '0.88rem',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all var(--transition-fast)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    marginBottom: '28px',
  },
  statCard: {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '18px',
    transition: 'all var(--transition-normal)',
  },
  statTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  statValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-foreground)',
    lineHeight: 1,
  },
  statIcon: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  statSkeleton: {
    height: '80px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    animation: 'pulse 2s ease-in-out infinite',
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
  emptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(51, 65, 85, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  emptyText: {
    color: '#64748B',
    fontSize: '0.9rem',
    marginTop: '6px',
    marginBottom: '20px',
  },
  emptyBtn: {
    padding: '10px 20px',
    fontSize: '0.88rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px',
  },
};
