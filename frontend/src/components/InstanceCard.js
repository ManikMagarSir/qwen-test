import React, { useState } from 'react';
import api from '../api/axios';
import TerminalConsole from './TerminalConsole';
import ResizeModal from './ResizeModal';
import ConfirmModal from './ConfirmModal';
import {
  Play, Square, RefreshCw, Pause, Trash2,
  Cpu, HardDrive, Database, Globe, Camera, ChevronDown, ChevronRight, RotateCcw, X, Terminal, Sliders,
} from 'lucide-react';

export default function InstanceCard({ instance, onDelete, onStatusChange }) {
  const [actionLoading, setActionLoading] = useState('');
  const [snapLoading, setSnapLoading] = useState('');
  const [snapshots, setSnapshots] = useState(null);
  const [snapName, setSnapName] = useState('');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, variant: 'danger' });

  const doAction = async (action, label) => {
    setError('');
    setActionLoading(label);
    try {
      const res = await api.post(`/instances/${instance._id}/${action}`);
      if (res.data.instance) onStatusChange(instance._id, res.data.instance.status);
    } catch (err) {
      setError(err.response?.data?.error || `${action} failed`);
    } finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    setConfirm({
      open: true, variant: 'danger',
      title: 'Delete instance?',
      message: `Delete "${instance.name}"? This action cannot be undone. All data will be permanently removed.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirm({ open: false });
        setError(''); setActionLoading('delete');
        try { await api.delete(`/instances/${instance._id}`); onDelete(instance._id); }
        catch (err) { setError(err.response?.data?.error || 'Delete failed'); setActionLoading(''); }
      },
    });
  };

  const toggleSnapshots = async () => {
    if (showSnapshots) { setShowSnapshots(false); return; }
    setError('');
    try { const res = await api.get(`/instances/${instance._id}/snapshots`); setSnapshots(res.data.snapshots); setShowSnapshots(true); }
    catch (err) { setError(err.response?.data?.error || 'Failed to load snapshots'); }
  };

  const createSnapshot = async (e) => {
    e.preventDefault();
    if (!snapName.trim()) return;
    setError(''); setSnapLoading('create');
    try { await api.post(`/instances/${instance._id}/snapshots`, { snapname: snapName }); setSnapName(''); const res = await api.get(`/instances/${instance._id}/snapshots`); setSnapshots(res.data.snapshots); }
    catch (err) { setError(err.response?.data?.error || 'Snapshot failed'); }
    finally { setSnapLoading(''); }
  };

  const deleteSnapshot = (name) => {
    setConfirm({
      open: true, variant: 'danger',
      title: 'Delete snapshot?',
      message: `Delete snapshot "${name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirm({ open: false }); setError(''); setSnapLoading('delete');
        try { await api.delete(`/instances/${instance._id}/snapshots/${name}`); const res = await api.get(`/instances/${instance._id}/snapshots`); setSnapshots(res.data.snapshots); }
        catch (err) { setError(err.response?.data?.error || 'Delete snapshot failed'); }
        finally { setSnapLoading(''); }
      },
    });
  };

  const rollbackSnapshot = (name) => {
    setConfirm({
      open: true, variant: 'danger',
      title: 'Roll back snapshot?',
      message: `Roll back to snapshot "${name}"? This will revert the container to this snapshot's state.`,
      confirmLabel: 'Rollback',
      onConfirm: async () => {
        setConfirm({ open: false }); setError(''); setSnapLoading('rollback');
        try { await api.post(`/instances/${instance._id}/snapshots/${name}/rollback`); const res = await api.get(`/instances/${instance._id}/snapshots`); setSnapshots(res.data.snapshots); }
        catch (err) { setError(err.response?.data?.error || 'Rollback failed'); }
        finally { setSnapLoading(''); }
      },
    });
  };

  const currentSnap = snapshots?.find(s => s.name === 'current')?.parent;
  const cfg = {
    running: { bg: 'rgba(16,185,129,0.1)', text: 'var(--accent)', dot: 'var(--accent)', glow: true },
    stopped: { bg: 'rgba(239,68,68,0.08)', text: '#F87171', dot: '#EF4444', glow: false },
    paused: { bg: 'rgba(245,158,11,0.08)', text: '#FBBF24', dot: '#F59E0B', glow: false },
    creating: { bg: 'rgba(59,130,246,0.08)', text: '#60A5FA', dot: '#3B82F6', glow: false },
  };
  const sc = cfg[instance.status] || { bg: 'var(--glass-bg)', text: 'var(--text-muted)', dot: 'var(--text-muted)', glow: false };

  const handleResized = (updated) => { if (updated.cpus) instance.cpus = updated.cpus; if (updated.memory) instance.memory = updated.memory; if (updated.disk) instance.disk = updated.disk; };

  return (
    <div className="glass-card" style={{ padding: '20px', position: 'relative' }}>
      <div style={s.top}>
        <div style={s.topLeft}>
          <span style={s.typeBadge}>LXC</span>
          <span style={s.name}>{instance.name}</span>
        </div>
        <div style={{ ...s.status, background: sc.bg, color: sc.text }}>
          {sc.glow && <div style={{ ...s.statusGlow, boxShadow: `0 0 6px ${sc.dot}` }} />}
          <span style={{ ...s.statusDot, background: sc.dot }} />
          {instance.status}
        </div>
      </div>

      <div style={s.meta}>
        <Meta icon={Cpu} label={`${instance.cpus} core${instance.cpus !== 1 ? 's' : ''}`} />
        <Meta icon={Database} label={`${instance.memory} MB`} />
        <Meta icon={HardDrive} label={`${instance.disk} GB`} />
        <Meta icon={Globe} label={instance.ip || '\u2014'} />
      </div>

      {error && <div style={s.error}>{error}</div>}

      {instance.status !== 'creating' && (
        <div style={s.actions}>
          {instance.status === 'stopped' && <ActBtn onClick={() => doAction('start', 'start')} loading={actionLoading === 'start'} icon={Play} label="Start" accent />}
          {instance.status === 'running' && <>
            <ActBtn onClick={() => setShowConnect(true)} icon={Terminal} label="Console" color="#3B82F6" />
            <ActBtn onClick={() => setShowResize(true)} icon={Sliders} label="Resize" color="#8B5CF6" />
            <ActBtn onClick={() => doAction('stop', 'stop')} loading={actionLoading === 'stop'} icon={Square} label="Stop" color="#EF4444" />
            <ActBtn onClick={() => doAction('reboot', 'reboot')} loading={actionLoading === 'reboot'} icon={RefreshCw} label="Reboot" color="#F59E0B" />
            <ActBtn onClick={() => doAction('suspend', 'suspend')} loading={actionLoading === 'suspend'} icon={Pause} label="Pause" />
          </>}
          {instance.status === 'paused' && <ActBtn onClick={() => doAction('resume', 'resume')} loading={actionLoading === 'resume'} icon={Play} label="Resume" accent />}
          <ActBtn onClick={handleDelete} loading={actionLoading === 'delete'} icon={Trash2} label="Delete" color="#EF4444" />
        </div>
      )}

      <div style={s.snapSection}>
        <button onClick={toggleSnapshots} style={s.snapToggle}>
          {showSnapshots ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Camera size={13} />
          Snapshots
        </button>
        {showSnapshots && (
          <div style={s.snapContent}>
            <form onSubmit={createSnapshot} style={s.snapForm}>
              <input type="text" placeholder="snapshot name" value={snapName} onChange={e => setSnapName(e.target.value)} required style={s.snapInput} disabled={!!snapLoading} />
              <button type="submit" style={s.snapCreateBtn} disabled={!!snapLoading}>
                {snapLoading === 'create' ? <span style={sp} /> : 'Create'}
              </button>
            </form>
            {snapshots && snapshots.filter(s => s.name !== 'current').length > 0 ? (
              <div style={s.snapList}>
                {snapshots.filter(s => s.name !== 'current').map(s => (
                  <div key={s.name} style={s.snapItem}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {s.name === currentSnap && <span style={s.snapActive} />}
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => rollbackSnapshot(s.name)} style={s.snapActionBtn} disabled={!!snapLoading} title="Rollback">
                        {snapLoading === 'rollback' ? <span style={sp} /> : <RotateCcw size={12} />}
                      </button>
                      <button onClick={() => deleteSnapshot(s.name)} style={{ ...s.snapActionBtn, color: '#F87171' }} disabled={!!snapLoading} title="Delete">
                        {snapLoading === 'delete' ? <span style={sp} /> : <X size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No snapshots</p>
            )}
          </div>
        )}
      </div>

      {showResize && <ResizeModal instance={instance} onClose={() => setShowResize(false)} onResized={handleResized} />}
      {showConnect && <TerminalConsole instance={instance} onClose={() => setShowConnect(false)} />}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  );
}

function Meta({ icon: Icon, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}><Icon size={13} /><span>{label}</span></div>;
}

function ActBtn({ onClick, loading, icon: Icon, label, accent, color }) {
  const bg = accent ? 'var(--accent)' : color ? `${color}15` : 'var(--glass-bg)';
  const txt = accent ? '#020617' : color || 'var(--text-secondary)';
  return <button onClick={onClick} disabled={loading} style={{ ...s.actBtn, background: bg, color: txt, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }} title={label}>
    {loading ? <span style={sp} /> : <Icon size={13} />}{label}
  </button>;
}

const sp = { width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'block' };

const s = {
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  topLeft: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  typeBadge: { background: 'var(--accent)', color: '#020617', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font)', flexShrink: 0, letterSpacing: '0.3px' },
  name: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  status: { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font)', textTransform: 'uppercase', flexShrink: 0, position: 'relative' },
  statusGlow: { position: 'absolute', inset: 0, borderRadius: '20px', animation: 'glowPulse 2s ease-in-out infinite', opacity: 0.3 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', display: 'inline-block', position: 'relative', zIndex: 1 },
  meta: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: '12px', animation: 'slideDown 0.2s ease' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' },
  actBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: 'none', fontSize: '0.78rem', fontWeight: 500, transition: 'all var(--transition)' },
  snapSection: { borderTop: '1px solid var(--glass-border)', paddingTop: '12px' },
  snapToggle: { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', padding: '4px 0' },
  snapContent: { marginTop: '10px', paddingLeft: '4px' },
  snapForm: { display: 'flex', gap: '8px', marginBottom: '10px' },
  snapInput: { flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' },
  snapCreateBtn: { padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: '#020617', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' },
  snapList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  snapItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' },
  snapActive: { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'breathe 2s ease-in-out infinite' },
  snapActionBtn: { background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', display: 'flex' },
};
