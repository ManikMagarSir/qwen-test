import React, { useState } from 'react';
import api from '../api/axios';
import TerminalConsole from './TerminalConsole';
import ResizeModal from './ResizeModal';
import {
  Play, Square, RefreshCw, Pause, Monitor, Trash2,
  Cpu, HardDrive, Database, Globe, Camera, ChevronDown, ChevronRight, RotateCcw, X, Terminal, Sliders,
} from 'lucide-react';

export default function InstanceCard({ instance, onDelete, onStatusChange }) {
  const [actionLoading, setActionLoading] = useState('');
  const [snapshots, setSnapshots] = useState(null);
  const [snapName, setSnapName] = useState('');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [error, setError] = useState('');

  const doAction = async (action, label) => {
    setError('');
    setActionLoading(label);
    try {
      const res = await api.post(`/instances/${instance._id}/${action}`);
      if (res.data.instance) {
        onStatusChange(instance._id, res.data.instance.status);
      }
    } catch (err) {
      setError(err.response?.data?.error || `${action} failed`);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${instance.name}? This cannot be undone.`)) return;
    setError('');
    setActionLoading('delete');
    try {
      await api.delete(`/instances/${instance._id}`);
      onDelete(instance._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
      setActionLoading('');
    }
  };

  const toggleSnapshots = async () => {
    if (showSnapshots) { setShowSnapshots(false); return; }
    setError('');
    try {
      const res = await api.get(`/instances/${instance._id}/snapshots`);
      setSnapshots(res.data.snapshots);
      setShowSnapshots(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load snapshots');
    }
  };

  const createSnapshot = async (e) => {
    e.preventDefault();
    if (!snapName.trim()) return;
    setError('');
    try {
      await api.post(`/instances/${instance._id}/snapshots`, { snapname: snapName });
      setSnapName('');
      const res = await api.get(`/instances/${instance._id}/snapshots`);
      setSnapshots(res.data.snapshots);
    } catch (err) {
      setError(err.response?.data?.error || 'Snapshot failed');
    }
  };

  const deleteSnapshot = async (name) => {
    if (!window.confirm(`Delete snapshot "${name}"?`)) return;
    setError('');
    try {
      await api.delete(`/instances/${instance._id}/snapshots/${name}`);
      const res = await api.get(`/instances/${instance._id}/snapshots`);
      setSnapshots(res.data.snapshots);
    } catch (err) {
      setError(err.response?.data?.error || 'Delete snapshot failed');
    }
  };

  const rollbackSnapshot = async (name) => {
    if (!window.confirm(`Roll back to snapshot "${name}"?`)) return;
    setError('');
    try {
      await api.post(`/instances/${instance._id}/snapshots/${name}/rollback`);
      const res = await api.get(`/instances/${instance._id}/snapshots`);
      setSnapshots(res.data.snapshots);
    } catch (err) {
      setError(err.response?.data?.error || 'Rollback failed');
    }
  };

  const currentSnap = snapshots?.find((s) => s.name === 'current')?.parent;

  const statusColors = {
    running: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', dot: '#22C55E' },
    stopped: { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', dot: '#EF4444' },
    paused: { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24', dot: '#F59E0B' },
    unknown: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94A3B8', dot: '#64748B' },
    creating: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', dot: '#3B82F6' },
  };

  const sc = statusColors[instance.status] || statusColors.unknown;

  const handleResized = (updated) => {
    if (updated.cpus) instance.cpus = updated.cpus;
    if (updated.memory) instance.memory = updated.memory;
    if (updated.disk) instance.disk = updated.disk;
  };

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div style={styles.topLeft}>
          <span style={styles.typeBadge}>{instance.type === 'qemu' ? 'VM' : 'CT'}</span>
          <span style={styles.name}>{instance.name}</span>
        </div>
        <div style={{ ...styles.status, background: sc.bg, color: sc.text }}>
          <span style={{ ...styles.statusDot, background: sc.dot }} />
          {instance.status}
        </div>
      </div>

      <div style={styles.meta}>
        <Meta icon={Cpu} label={`${instance.cpus} core(s)`} />
        <Meta icon={Database} label={`${instance.memory} MB`} />
        <Meta icon={HardDrive} label={`${instance.disk} GB`} />
        <Meta icon={Globe} label={instance.ip || '\u2014'} />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        {instance.status === 'stopped' && (
          <ActionBtn onClick={() => doAction('start', 'start')} loading={actionLoading === 'start'} icon={Play} label="Start" accent />
        )}
        {instance.status === 'running' && (
          <>
            <ActionBtn onClick={() => setShowConnect(true)} icon={Terminal} label="Console" color="#3B82F6" />
            <ActionBtn onClick={() => setShowResize(true)} icon={Sliders} label="Resize" color="#8B5CF6" />
            <ActionBtn onClick={() => doAction('stop', 'stop')} loading={actionLoading === 'stop'} icon={Square} label="Stop" color="#EF4444" />
            <ActionBtn onClick={() => doAction('reboot', 'reboot')} loading={actionLoading === 'reboot'} icon={RefreshCw} label="Reboot" color="#F59E0B" />
            <ActionBtn onClick={() => doAction('suspend', 'suspend')} loading={actionLoading === 'suspend'} icon={Pause} label="Pause" color="#F97316" />
          </>
        )}
        {instance.status === 'paused' && (
          <ActionBtn onClick={() => doAction('resume', 'resume')} loading={actionLoading === 'resume'} icon={Play} label="Resume" accent />
        )}
        <ActionBtn onClick={handleDelete} loading={actionLoading === 'delete'} icon={Trash2} label="Delete" color="#EF4444" />
      </div>

      <div style={styles.snapSection}>
        <button onClick={toggleSnapshots} style={styles.snapToggle}>
          {showSnapshots ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Camera size={14} />
          Snapshots
        </button>
        {showSnapshots && (
          <div style={styles.snapContent}>
            <form onSubmit={createSnapshot} style={styles.snapForm}>
              <input
                type="text"
                placeholder="snapshot name"
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                required
                style={styles.snapInput}
              />
              <button type="submit" style={styles.snapCreateBtn}>Create</button>
            </form>
            {snapshots && snapshots.filter((s) => s.name !== 'current').length > 0 ? (
              <div style={styles.snapList}>
                {snapshots.filter((s) => s.name !== 'current').map((s) => (
                  <div key={s.name} style={styles.snapItem}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CBD5E1', fontSize: '0.85rem' }}>
                      {s.name === currentSnap && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'breathe 2s ease-in-out infinite' }} />}
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => rollbackSnapshot(s.name)} style={styles.snapActionBtn} title="Rollback"><RotateCcw size={12} /></button>
                      <button onClick={() => deleteSnapshot(s.name)} style={{ ...styles.snapActionBtn, color: '#F87171' }} title="Delete"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748B', fontSize: '0.82rem' }}>No snapshots</p>
            )}
          </div>
        )}
      </div>

      {showResize && <ResizeModal instance={instance} onClose={() => setShowResize(false)} onResized={handleResized} />}
      {showConnect && <TerminalConsole instance={instance} onClose={() => setShowConnect(false)} />}
    </div>
  );
}

function Meta({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.85rem' }}>
      <Icon size={13} />
      <span>{label}</span>
    </div>
  );
}

function ActionBtn({ onClick, loading, icon: Icon, label, accent, color }) {
  const bg = accent ? 'var(--color-accent)' : loading ? '#334155' : color ? `${color}20` : '#334155';
  const textColor = accent ? '#020617' : color || '#CBD5E1';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        ...styles.actionBtn,
        background: bg,
        color: textColor,
        opacity: loading ? 0.6 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
      title={label}
    >
      {loading ? <span style={miniSpinner} /> : <Icon size={14} />}
      {label}
    </button>
  );
}

const miniSpinner = {
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  display: 'block',
};

const styles = {
  card: {
    background: 'var(--color-muted)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    border: '1px solid var(--color-border)',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    animation: 'slideUp 0.3s ease both',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  typeBadge: {
    background: 'var(--color-accent)',
    color: '#020617',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    flexShrink: 0,
  },
  name: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-foreground)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
  },
  meta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    marginBottom: '12px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '14px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'opacity var(--transition-fast)',
  },
  snapSection: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '12px',
  },
  snapToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 0',
  },
  snapContent: {
    marginTop: '10px',
    paddingLeft: '4px',
  },
  snapForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
  },
  snapInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  snapCreateBtn: {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#020617',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  snapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  snapItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    background: 'var(--color-background)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
  },
  snapActionBtn: {
    background: 'transparent',
    border: 'none',
    color: '#22C55E',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'flex',
  },
};
