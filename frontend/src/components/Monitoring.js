import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Cpu, HardDrive, MemoryStick, Clock, Loader, Server, Globe, TrendingUp } from 'lucide-react';

const WS_BASE = process.env.REACT_APP_WS_URL || `ws://${window.location.hostname}:5000`;
const MAX_HISTORY = 60;

const COLORS = {
  cpu: '#3B82F6',
  ram: '#8B5CF6',
  swap: '#F59E0B',
  disk: '#22C55E',
};

function fmtBytes(bytes) {
  if (!bytes && bytes !== 0) return 'N/A';
  const mb = bytes / (1024 ** 2);
  if (mb >= 1024) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function fmtUptime(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function calcPercent(used, total) {
  if (!total) return 0;
  return Math.min((used / total) * 100, 100);
}

function buildPath(data, w, h, color) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h * 0.85).toFixed(1)}`);
  const area = `M0,${h} L${pts.join(' L')} L${w - step},${h} Z`;
  const line = `M${pts.join(' L')}`;
  return { area, line, max, current: data[data.length - 1] };
}

function Sparkline({ data, color, height = 50, label }) {
  if (!data || data.length < 2) return <div style={{ height, color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>awaiting data...</div>;
  const w = 180;
  const p = buildPath(data, w, height, color);
  if (!p) return null;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={p.area} fill={`url(#grad-${label})`} />
      <path d={p.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w - 1} cy={parseFloat(p.line.split(' ').pop().slice(1))} r="2.5" fill={color}>
        <animate attributeName="r" values="2.5;3.5;2.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function MetricSparklineCard({ label, value, percent, data, color, icon: Icon }) {
  const formatted = label === 'CPU' ? `${percent.toFixed(1)}%` : `${fmtBytes(value)} / ${fmtBytes(value / (percent / 100 || 1))}`;
  return (
    <div style={metricStyles.card}>
      <div style={metricStyles.header}>
        <div style={metricStyles.labelRow}>
          <div style={{ ...metricStyles.icon, background: `${color}15`, color }}>
            <Icon size={12} />
          </div>
          <span style={metricStyles.label}>{label}</span>
        </div>
        <div style={metricStyles.valueCol}>
          <span style={{ ...metricStyles.pct, color }}>{percent.toFixed(1)}%</span>
          <span style={metricStyles.detail}>{formatted}</span>
        </div>
      </div>
      <Sparkline data={data} color={color} label={label} />
    </div>
  );
}

const metricStyles = {
  card: {
    background: 'rgba(2, 6, 23, 0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    border: '1px solid rgba(51, 65, 85, 0.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '8px',
  },
  labelRow: {
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  icon: {
    width: '24px', height: '24px', borderRadius: '4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: '0.3px',
  },
  valueCol: {
    textAlign: 'right',
  },
  pct: {
    fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)',
    lineHeight: 1.2,
  },
  detail: {
    fontSize: '0.65rem', color: '#64748B',
  },
};

export default function Monitoring() {
  const [instances, setInstances] = useState([]);
  const [details, setDetails] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const historyRef = useRef({});
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const updateHistory = useCallback((msgDetails) => {
    const h = { ...historyRef.current };
    for (const [id, d] of Object.entries(msgDetails)) {
      const mem = d.memory || {};
      const swap = d.swap || {};
      const disk = d.disk || {};
      if (!h[id]) h[id] = { cpu: [], ram: [], swap: [], disk: [] };
      const cpuPct = Math.min((d.cpu || 0) * 100, 100);
      const ramPct = calcPercent(mem.used, mem.total);
      const swapPct = calcPercent(swap.used, swap.total);
      const diskPct = calcPercent(disk.used, disk.total);
      h[id].cpu = [...(h[id].cpu || []).slice(-(MAX_HISTORY - 1)), cpuPct];
      h[id].ram = [...(h[id].ram || []).slice(-(MAX_HISTORY - 1)), ramPct];
      h[id].swap = [...(h[id].swap || []).slice(-(MAX_HISTORY - 1)), swapPct];
      h[id].disk = [...(h[id].disk || []).slice(-(MAX_HISTORY - 1)), diskPct];
    }
    historyRef.current = h;
    setHistory(h);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      const token = localStorage.getItem('token');
      if (!token) return;

      const ws = new WebSocket(`${WS_BASE}/api/monitor/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setError('');
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'update') {
            const insts = msg.instances || [];
            const dets = msg.details || {};
            setInstances(insts);
            setDetails(dets);
            updateHistory(dets);
            setLoading(false);
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        if (!cancelled) setError('WebSocket connection error');
      };

      ws.onclose = () => {
        if (cancelled) return;
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [updateHistory]);

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>Monitoring</h1>
        <div style={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '80px', borderRadius: 'var(--radius-md)', background: 'var(--color-muted)', border: '1px solid var(--color-border)', animation: 'pulse 2s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...styles.cardSkeleton, animation: 'pulse 2s ease-in-out infinite' }}>
              <div style={{ height: '16px', background: '#1E293B', borderRadius: '4px', width: '60%', marginBottom: '12px' }} />
              <div style={{ height: '10px', background: '#1E293B', borderRadius: '4px', width: '90%', marginBottom: '8px' }} />
              <div style={{ height: '10px', background: '#1E293B', borderRadius: '4px', width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && instances.length === 0) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>Monitoring</h1>
        <div style={styles.errorBox}>{error}</div>
      </div>
    );
  }

  const runningCount = instances.filter((i) => i.status === 'running').length;
  const totalCpus = instances.reduce((s, i) => s + (i.cpus || 0), 0);
  const totalMem = instances.reduce((s, i) => s + (i.memory || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Monitoring</h1>
        <p style={styles.sub}>
          {instances.length} container{instances.length !== 1 ? 's' : ''}
          {runningCount > 0 && ` · ${runningCount} running`}
          <span style={styles.liveBadge}>
            <span style={styles.liveDot} />
            live
          </span>
        </p>
      </div>

      <div style={styles.statsGrid}>
        <div className="stagger-1" style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statVal}>{instances.length}</span>
            <Server size={16} color="#3B82F6" />
          </div>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div className="stagger-2" style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={{ ...styles.statVal, color: '#22C55E' }}>{runningCount}</span>
            <Activity size={16} color="#22C55E" />
          </div>
          <span style={styles.statLabel}>Running</span>
        </div>
        <div className="stagger-3" style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statVal}>{totalCpus}</span>
            <Cpu size={16} color="#8B5CF6" />
          </div>
          <span style={styles.statLabel}>CPU Cores</span>
        </div>
        <div className="stagger-4" style={styles.statCard}>
          <div style={styles.statTop}>
            <span style={styles.statVal}>
              {totalMem >= 1024 ? `${(totalMem / 1024).toFixed(1)}GB` : `${totalMem}MB`}
            </span>
            <MemoryStick size={16} color="#F59E0B" />
          </div>
          <span style={styles.statLabel}>Memory</span>
        </div>
      </div>

      {instances.length === 0 ? (
        <div className="stagger-5" style={styles.empty}>
          <div style={styles.emptyIcon}>
            <Activity size={40} color="#334155" />
          </div>
          <p style={{ color: '#64748B', marginTop: '12px' }}>No containers to monitor.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {instances.map((inst, i) => {
            const d = details[inst._id];
            const h = history[inst._id];
            const mem = d?.memory || {};
            const swap = d?.swap || {};
            const disk = d?.disk || {};

            return (
              <div key={inst._id} className={`stagger-${(i % 8) + 1}`} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <span style={styles.cardName}>{inst.name}</span>
                    <span style={{
                      ...styles.statusDot,
                      background: inst.status === 'running' ? '#22C55E' : inst.status === 'stopped' ? '#64748B' : '#F59E0B',
                    }} />
                    <span style={{
                      ...styles.statusText,
                      color: inst.status === 'running' ? '#22C55E' : '#64748B',
                    }}>
                      {inst.status}
                    </span>
                  </div>
                  <span style={styles.cardIp}>
                    <Globe size={11} color="#64748B" />
                    {inst.ip || '-'}
                  </span>
                </div>

                <div style={styles.specRow}>
                  <span style={styles.spec}><Cpu size={12} /> {inst.cpus || '-'} cores</span>
                  <span style={styles.spec}><MemoryStick size={12} /> {inst.memory || '-'} MB</span>
                  <span style={styles.spec}><HardDrive size={12} /> {inst.disk || '-'} GB</span>
                </div>

                {inst.status === 'running' && d ? (
                  <div style={styles.metricsGrid}>
                    <MetricSparklineCard
                      label="CPU"
                      value={(d.cpu || 0)}
                      percent={Math.min((d.cpu || 0) * 100, 100)}
                      data={h?.cpu}
                      color={COLORS.cpu}
                      icon={Cpu}
                    />
                    <MetricSparklineCard
                      label="RAM"
                      value={mem.used || 0}
                      percent={calcPercent(mem.used, mem.total)}
                      data={h?.ram}
                      color={COLORS.ram}
                      icon={MemoryStick}
                    />
                    <MetricSparklineCard
                      label="Swap"
                      value={swap.used || 0}
                      percent={calcPercent(swap.used, swap.total)}
                      data={h?.swap}
                      color={COLORS.swap}
                      icon={Activity}
                    />
                    <MetricSparklineCard
                      label="Disk"
                      value={disk.used || 0}
                      percent={calcPercent(disk.used, disk.total)}
                      data={h?.disk}
                      color={COLORS.disk}
                      icon={HardDrive}
                    />
                    <div style={styles.uptimeRow}>
                      <TrendingUp size={12} color="#64748B" />
                      <span style={styles.uptimeText}>5 min trend · Uptime: {fmtUptime(d.uptime)}</span>
                    </div>
                  </div>
                ) : inst.status === 'running' ? (
                  <div style={styles.loadingMetrics}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#64748B', fontSize: '0.82rem' }}>Loading metrics...</span>
                  </div>
                ) : (
                  <div style={styles.stoppedNotice}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Container is stopped</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    marginBottom: '24px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 10px',
    borderRadius: '20px',
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#22C55E',
    fontSize: '0.72rem',
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22C55E',
    animation: 'glowPulse 1.5s ease-in-out infinite',
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
  statVal: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-foreground)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  cardSkeleton: {
    background: 'var(--color-muted)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    border: '1px solid var(--color-border)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    transition: 'all var(--transition-normal)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardName: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '0.78rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  cardIp: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.8rem',
    color: '#64748B',
  },
  specRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '14px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
  },
  spec: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#94A3B8',
    fontSize: '0.78rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  uptimeRow: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(51, 65, 85, 0.2)',
  },
  uptimeText: {
    color: '#64748B',
    fontSize: '0.72rem',
  },
  loadingMetrics: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
  },
  stoppedNotice: {
    textAlign: 'center',
    padding: '20px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(51, 65, 85, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
  },
};