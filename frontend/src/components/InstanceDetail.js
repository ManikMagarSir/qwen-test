import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Cpu, HardDrive, MemoryStick, Clock, Globe, Server, Loader } from 'lucide-react';
import api from '../api/axios';

const WS_BASE = process.env.REACT_APP_WS_URL || `ws://${window.location.hostname}:5000`;
const MAX_LIVE = 120;

const COLORS = { cpu: '#3B82F6', ram: '#8B5CF6', swap: '#F59E0B', disk: '#22C55E' };

const RANGES = [
  { key: '5m', label: '5 min', ms: 5 * 60 * 1000, api: false },
  { key: '30m', label: '30 min', ms: 30 * 60 * 1000, api: false },
  { key: '1h', label: '1 hour', ms: 60 * 60 * 1000, api: false },
  { key: '3h', label: '3 hours', ms: 3 * 60 * 60 * 1000, api: false },
  { key: '24h', label: '24 hours', ms: 24 * 60 * 60 * 1000, api: true },
  { key: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000, api: true },
];

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
  return `${h}h ${m}h`;
}

function calcPercent(used, total) {
  if (!total) return 0;
  return Math.min((used / total) * 100, 100);
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DetailChart({ data, color, label, currentValue, currentPercent }) {
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length < 2) {
    return (
      <div style={chartStyles.container}>
        <div style={chartStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
            <span style={chartStyles.label}>{label}</span>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>awaiting data...</span>
        </div>
      </div>
    );
  }

  const w = 600, h = 200;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const max = Math.max(...data.map(d => d.value), 1);
  const step = plotW / (data.length - 1);

  function yPos(v) { return pad.top + plotH - (v / max) * plotH * 0.85; }

  const pts = data.map((d, i) => `${(pad.left + i * step).toFixed(1)},${yPos(d.value).toFixed(1)}`);
  const area = `M${pad.left},${pad.top + plotH} L${pts.join(' L')} L${pad.left + plotW},${pad.top + plotH} Z`;
  const line = `M${pts.join(' L')}`;

  const gridLines = [0, 25, 50, 75, 100].map(pct => ({ y: yPos(pct), label: `${pct}%` }));

  function onMouseMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const relX = mx / rect.width * w - pad.left;
    const idx = Math.round(relX / step);
    if (idx < 0 || idx >= data.length) { setHovered(null); return; }
    const pt = data[idx];
    const cx = pad.left + idx * step;
    const cy = yPos(pt.value);
    setHovered({ point: pt, cx, cy });
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div style={chartStyles.container}>
      <div style={chartStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
          <span style={chartStyles.label}>{label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ ...chartStyles.bigVal, color }}>{currentPercent.toFixed(1)}%</span>
          <span style={chartStyles.subVal}>{currentValue}</span>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={onMouseMove} onMouseLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            <filter id={`glow-${label}`}><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {gridLines.map((g, i) => (
            <g key={i}>
              <line x1={pad.left} y1={g.y} x2={pad.left + plotW} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <text x={pad.left - 6} y={g.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">{g.label}</text>
            </g>
          ))}
          <path d={area} fill={`url(#grad-${label})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pad.left + plotW} cy={yPos(data[data.length - 1].value)} r="3" fill={color} filter={`url(#glow-${label})`}>
            <animate attributeName="r" values="3;4.5;3" dur="1.5s" repeatCount="indefinite" />
          </circle>
          {hovered && (
            <g>
              <line x1={hovered.cx} y1={pad.top} x2={hovered.cx} y2={pad.top + plotH} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <circle cx={hovered.cx} cy={hovered.cy} r="4" fill={color} stroke="var(--bg-deep)" strokeWidth="1.5" />
            </g>
          )}
          <text x={pad.left + plotW} y={pad.top + plotH + 18} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">now</text>
          <text x={pad.left} y={pad.top + plotH + 18} textAnchor="start" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">
            {data.length > 1 ? (Date.now() - data[0].time > 86400000 ? fmtDate(data[0].time) : fmtTime(data[0].time)) : ''}
          </text>
        </svg>
        {hovered && (
          <div style={{
            position: 'absolute', left: Math.min(tooltipPos.x + 12, 500), top: Math.max(tooltipPos.y - 60, 0),
            background: 'var(--bg-surface)', border: `1px solid ${color}40`, borderRadius: 'var(--radius-sm)',
            padding: '8px 12px', pointerEvents: 'none', zIndex: 10, minWidth: '100px',
            boxShadow: 'var(--shadow-glass-lg)',
          }}>
            <div style={{ color, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font)' }}>{hovered.point.value.toFixed(1)}%</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', marginTop: '2px' }}>
              {hovered.point.time > 9999999999 ? fmtDate(hovered.point.time) : fmtTime(hovered.point.time)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const chartStyles = {
  container: {
    background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  bigVal: { fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font)', lineHeight: 1.2, display: 'block' },
  subVal: { fontSize: '0.75rem', color: 'var(--text-tertiary)' },
};

export default function InstanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [detail, setDetail] = useState(null);
  const [range, setRange] = useState('1h');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [displayData, setDisplayData] = useState({ cpu: [], ram: [], swap: [], disk: [] });
  const [loadingHistory, setLoadingHistory] = useState(true);
  const rawRef = useRef({ cpu: [], ram: [], swap: [], disk: [] });
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const selectedRange = RANGES.find(r => r.key === range) || RANGES[2];

  const mergeDisplay = useCallback(() => {
    const r = rawRef.current;
    const now = Date.now();
    const cutoff = now - selectedRange.ms;
    setDisplayData({
      cpu: (r.cpu || []).filter(d => d.time >= cutoff),
      ram: (r.ram || []).filter(d => d.time >= cutoff),
      swap: (r.swap || []).filter(d => d.time >= cutoff),
      disk: (r.disk || []).filter(d => d.time >= cutoff),
    });
  }, [selectedRange.ms]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchHistory() {
      setLoadingHistory(true);
      try {
        const res = await api.get(`/instances/${id}/metrics?range=${range}`);
        if (cancelled) return;
        const metrics = res.data.metrics || [];
        const r = rawRef.current;
        r.cpu = [];
        r.ram = [];
        r.swap = [];
        r.disk = [];
        for (const m of metrics) {
          const t = new Date(m.timestamp).getTime();
          r.cpu.push({ value: Math.min((m.cpu || 0) * 100, 100), time: t });
          r.ram.push({ value: calcPercent(m.memory_used, m.memory_total), time: t });
          r.swap.push({ value: calcPercent(m.swap_used, m.swap_total), time: t });
          r.disk.push({ value: calcPercent(m.disk_used, m.disk_total), time: t });
        }
        mergeDisplay();
      } catch (_) {} finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [id, range, mergeDisplay]);

  useEffect(() => {
    let cancelled = false;
    let reconnectCount = 0;

    function connect() {
      const token = localStorage.getItem('token');
      if (!token) return;
      const ws = new WebSocket(`${WS_BASE}/api/monitor/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => { if (cancelled) return; setConnected(true); setError(''); reconnectCount = 0; };
      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'update') {
            const inst = (msg.instances || []).find(i => i._id === id);
            if (inst) setInstance(inst);
            const d = msg.details?.[id];
            if (d) {
              setDetail(d);
              const mem = d.memory || {}; const swap = d.swap || {}; const disk = d.disk || {};
              const now = Date.now();
              const pts = {
                cpu: Math.min((d.cpu || 0) * 100, 100),
                ram: calcPercent(mem.used, mem.total),
                swap: calcPercent(swap.used, swap.total),
                disk: calcPercent(disk.used, disk.total),
              };
              const r = rawRef.current;
              for (const k of ['cpu', 'ram', 'swap', 'disk']) {
                r[k] = [...(r[k] || []), { value: pts[k], time: now }];
              }
              mergeDisplay();
            }
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        } catch (_) {}
      };
      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        if (reconnectCount < 10) { reconnectCount++; reconnectTimer.current = setTimeout(connect, 3000); }
      };
    }

    connect();
    const iv = setInterval(mergeDisplay, 5000);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(reconnectTimer.current); if (wsRef.current) wsRef.current.close(); };
  }, [id, mergeDisplay]);

  const mem = detail?.memory || {};
  const swap = detail?.swap || {};
  const disk = detail?.disk || {};

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => navigate('/monitoring')} style={s.backBtn}><ArrowLeft size={16} /> Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ ...s.liveDot, background: connected ? 'var(--accent)' : '#EF4444', animation: connected ? 'glowPulse 1.5s ease-in-out infinite' : 'none' }} />
          <span style={{ color: connected ? 'var(--accent)' : '#EF4444', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {instance ? (
        <>
          <div style={s.hero}>
            <div>
              <h1 style={s.heading}>{instance.name}</h1>
              <div style={s.heroMeta}>
                <span style={{ ...s.statusBadge, color: instance.status === 'running' ? 'var(--accent)' : 'var(--text-muted)', borderColor: instance.status === 'running' ? 'var(--glass-border)' : 'var(--glass-border)' }}>
                  <span style={{ ...s.statusDotSmall, background: instance.status === 'running' ? 'var(--accent)' : 'var(--text-muted)' }} />
                  {instance.status}
                </span>
                <span style={s.metaItem}><Globe size={12} /> {instance.ip || '-'}</span>
                <span style={s.metaItem}><Server size={12} /> VMID {instance.vmid}</span>
              </div>
            </div>
            <div style={s.specs}>
              <div style={s.specChip}><Cpu size={13} color="#3B82F6" /> {instance.cpus} cores</div>
              <div style={s.specChip}><MemoryStick size={13} color="#8B5CF6" /> {instance.memory} MB</div>
              <div style={s.specChip}><HardDrive size={13} color="#22C55E" /> {instance.disk} GB</div>
              {detail?.uptime && <div style={s.specChip}><Clock size={13} color="#F59E0B" /> {fmtUptime(detail.uptime)}</div>}
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          {instance.status === 'running' ? (
            <>
              <div style={s.rangeBar}>
                {RANGES.map(r => (
                  <button key={r.key} onClick={() => setRange(r.key)}
                    style={{
                      ...s.rangeBtn,
                      background: range === r.key ? 'var(--accent-dim)' : 'var(--glass-bg)',
                      color: range === r.key ? 'var(--accent)' : 'var(--text-tertiary)',
                      borderColor: range === r.key ? 'var(--glass-border)' : 'var(--glass-border)',
                    }}>
                    {r.label}
                  </button>
                ))}
                <span style={s.rangeSamples}>{displayData.cpu.length} pts</span>
              </div>
              {loadingHistory ? (
                <div style={s.loadingMetrics}><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ color: 'var(--text-tertiary)' }}>Loading historical data...</span></div>
              ) : (
                <div style={s.chartsGrid}>
                  <DetailChart label="CPU" data={displayData.cpu} color={COLORS.cpu}
                    currentValue={`${((detail?.cpu || 0)).toFixed(2)} / 1 core`}
                    currentPercent={Math.min((detail?.cpu || 0) * 100, 100)} />
                  <DetailChart label="RAM" data={displayData.ram} color={COLORS.ram}
                    currentValue={`${fmtBytes(mem.used || 0)} / ${fmtBytes(mem.total || 0)}`}
                    currentPercent={calcPercent(mem.used, mem.total)} />
                  <DetailChart label="Swap" data={displayData.swap} color={COLORS.swap}
                    currentValue={`${fmtBytes(swap.used || 0)} / ${fmtBytes(swap.total || 0)}`}
                    currentPercent={calcPercent(swap.used, swap.total)} />
                  <DetailChart label="Disk" data={displayData.disk} color={COLORS.disk}
                    currentValue={`${fmtBytes(disk.used || 0)} / ${fmtBytes(disk.total || 0)}`}
                    currentPercent={calcPercent(disk.used, disk.total)} />
                </div>
              )}
            </>
          ) : instance.status === 'stopped' ? (
            <div style={s.stopped}><Activity size={32} color="var(--text-muted)" /><p style={{ color: 'var(--text-tertiary)', marginTop: '12px', fontSize: '1rem' }}>Container is stopped</p><p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Start it to view live metrics.</p></div>
          ) : (
            <div style={s.loadingMetrics}><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ color: 'var(--text-tertiary)' }}>Loading...</span></div>
          )}
        </>
      ) : (
        <div style={s.loadingMetrics}><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ color: 'var(--text-tertiary)' }}>Connecting via WebSocket...</span></div>
      )}
    </div>
  );
}

const s = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.3s ease' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(24px)' },
  liveDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)' },
  heading: { fontFamily: 'var(--font)', fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '8px' },
  heroMeta: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 10px', borderRadius: '20px', border: '1px solid', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' },
  statusDotSmall: { width: 6, height: 6, borderRadius: '50%' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: '0.82rem' },
  specs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  specChip: { display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', color: 'var(--text-tertiary)', fontSize: '0.82rem' },
  rangeBar: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' },
  rangeBtn: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all var(--transition)', backdropFilter: 'blur(24px)' },
  rangeSamples: { marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' },
  chartsGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px' },
  stopped: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' },
  loadingMetrics: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px' },
};
