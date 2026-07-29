import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import InstanceCard from './InstanceCard';
import { Server, Plus, RefreshCw, Activity, Cpu, Database, Box } from 'lucide-react';

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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 15000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  const handleDelete = (id) => setInstances(prev => prev.filter(i => i._id !== id));
  const handleStatusChange = (id, newStatus) =>
    setInstances(prev => prev.map(i => i._id === id ? { ...i, status: newStatus } : i));

  const running = instances.filter(i => i.status === 'running').length;
  const stopped = instances.filter(i => i.status === 'stopped').length;
  const totalCpus = instances.reduce((s, i) => s + (i.cpus || 0), 0);
  const totalMem = instances.reduce((s, i) => s + (i.memory || 0), 0);

  const stats = [
    { label: 'Total', value: instances.length, icon: Box, color: '#3B82F6' },
    { label: 'Running', value: running, icon: Activity, color: 'var(--accent)' },
    { label: 'Stopped', value: stopped, icon: Activity, color: '#EF4444' },
    { label: 'CPU Cores', value: totalCpus, icon: Cpu, color: '#8B5CF6' },
    { label: 'Memory', value: totalMem >= 1024 ? `${(totalMem / 1024).toFixed(1)} GB` : `${totalMem} MB`, icon: Database, color: '#F59E0B' },
  ];

  return (
    <div style={s.container}>
      <div style={s.top}>
        <div>
          <h1 style={s.heading}>Dashboard</h1>
          <p style={s.sub}>
            {loading ? 'Loading...' : `${instances.length} container${instances.length !== 1 ? 's' : ''} across your infrastructure`}
          </p>
        </div>
        <div style={s.topActions}>
          <button onClick={fetchInstances} style={s.refreshBtn} disabled={loading}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => navigate('/create')} className="btn btn-primary" style={{ padding: '9px 18px' }}>
            <Plus size={16} /> New Container
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="bento-grid" style={s.bentoGrid}>
            {[1,2,3,4,5].map(i => <div key={i} style={s.skelStat} />)}
          </div>
          <div className="bento-grid" style={s.instanceGrid}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : error ? (
        <div style={s.error}>{error}</div>
      ) : (
        <>
          <div className="bento-grid" style={s.bentoGrid}>
            {stats.map((st, i) => (
              <div key={st.label} className={`stagger-${i + 1}`} style={s.statCard}>
                <div style={s.statTop}>
                  <span style={s.statVal}>{st.value}</span>
                  <div style={{ ...s.statIcon, background: `${st.color}12`, color: st.color }}>
                    <st.icon size={16} />
                  </div>
                </div>
                <span style={s.statLabel}>{st.label}</span>
              </div>
            ))}
          </div>

          {instances.length === 0 ? (
            <div className="stagger-5" style={s.empty}>
              <div style={s.emptyIcon}><Server size={36} color="var(--text-muted)" /></div>
              <h3 style={s.emptyTitle}>No instances yet</h3>
              <p style={s.emptyText}>Create your first container to start.</p>
              <button onClick={() => navigate('/create')} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                <Plus size={16} /> Create Instance
              </button>
            </div>
          ) : (
            <div className="bento-grid" style={s.instanceGrid}>
              {instances.map((inst, i) => (
                <div key={inst._id} className={`stagger-${(i % 8) + 1}`}>
                  <InstanceCard instance={inst} onDelete={handleDelete} onStatusChange={handleStatusChange} />
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
  const sh = { background: 'linear-gradient(90deg, var(--glass-bg) 25%, var(--glass-bg-hover) 50%, var(--glass-bg) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' };
  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ ...sh, width: '50px', height: '20px', borderRadius: '4px' }} />
        <div style={{ ...sh, width: '70px', height: '20px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ ...sh, height: '14px', borderRadius: '4px', width: '80%' }} />
        <div style={{ ...sh, height: '14px', borderRadius: '4px', width: '60%' }} />
        <div style={{ ...sh, height: '14px', borderRadius: '4px', width: '70%' }} />
        <div style={{ ...sh, height: '14px', borderRadius: '4px', width: '50%' }} />
      </div>
    </div>
  );
}

const s = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.3s ease' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' },
  heading: { fontFamily: 'var(--font)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)' },
  sub: { color: 'var(--text-tertiary)', fontSize: '0.88rem', marginTop: '4px' },
  topActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
    backdropFilter: 'blur(24px)',
  },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px', marginBottom: '28px',
  },
  statCard: {
    background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
    padding: '18px',
  },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  statVal: { fontFamily: 'var(--font)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 },
  statIcon: { width: '32px', height: '32px', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 },
  skelStat: { height: '76px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', animation: 'pulse 2s ease-in-out infinite' },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' },
  emptyIcon: { width: '72px', height: '72px', borderRadius: 'var(--radius-xl)', background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' },
  emptyTitle: { color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600 },
  emptyText: { color: 'var(--text-tertiary)', fontSize: '0.88rem', marginTop: '6px', marginBottom: '20px' },
  instanceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '14px' },
};
