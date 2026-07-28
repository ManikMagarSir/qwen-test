import React, { useState } from 'react';
import api from '../api/axios';
import TerminalConsole from './TerminalConsole';

const STATUS_COLORS = {
  running: '#4ade80',
  stopped: '#f87171',
  paused: '#fbbf24',
  unknown: '#888',
};

export default function InstanceCard({ instance, onDelete, onStatusChange }) {
  const [actionLoading, setActionLoading] = useState('');
  const [snapshots, setSnapshots] = useState(null);
  const [snapName, setSnapName] = useState('');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
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
    if (showSnapshots) {
      setShowSnapshots(false);
      return;
    }
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

  const currentSnap = snapshots?.find((s) => s.name === 'current')?.parent;

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
    if (!window.confirm(`Roll back to snapshot "${name}"? The VM will be reverted.`)) return;
    setError('');
    try {
      await api.post(`/instances/${instance._id}/snapshots/${name}/rollback`);
      const res = await api.get(`/instances/${instance._id}/snapshots`);
      setSnapshots(res.data.snapshots);
    } catch (err) {
      setError(err.response?.data?.error || 'Rollback failed');
    }
  };

  const typeLabel = instance.type === 'qemu' ? 'VM' : 'LXC';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={styles.typeBadge}>{typeLabel}</span>
          <span style={styles.name}>{instance.name}</span>
        </div>
        <span
          style={{
            ...styles.status,
            background: STATUS_COLORS[instance.status] || '#888',
          }}
        >
          {instance.status}
        </span>
      </div>

      <div style={styles.details}>
        <div style={styles.detail}><strong>VMID:</strong> {instance.vmid}</div>
        <div style={styles.detail}><strong>CPU:</strong> {instance.cpus} core(s)</div>
        <div style={styles.detail}><strong>RAM:</strong> {instance.memory} MB</div>
        <div style={styles.detail}><strong>Disk:</strong> {instance.disk} GB</div>
        <div style={{ ...styles.detail, gridColumn: 'span 2' }}>
          <strong>IP:</strong>{' '}
          {instance.ip ? (
            <span style={{ color: '#4ade80' }}>{instance.ip}</span>
          ) : (
            <span style={{ color: '#888' }}>—</span>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        {instance.status === 'stopped' && (
          <button onClick={() => doAction('start', 'start')} disabled={!!actionLoading} style={styles.actionBtn}>
            {actionLoading === 'start' ? '...' : '▶ Start'}
          </button>
        )}
        {instance.status === 'running' && (
          <>
            <button
              onClick={() => setShowConnect(true)}
              disabled={!instance.ip}
              style={{
                ...styles.actionBtn,
                background: instance.ip ? '#3b82f6' : '#555',
                cursor: instance.ip ? 'pointer' : 'not-allowed',
              }}
              title={instance.ip ? `SSH root@${instance.ip}` : 'No IP assigned'}
            >
              💻 Connect
            </button>
            <button onClick={() => doAction('stop', 'stop')} disabled={!!actionLoading} style={{ ...styles.actionBtn, background: '#f87171' }}>
              {actionLoading === 'stop' ? '...' : '⏹ Stop'}
            </button>
            <button onClick={() => doAction('reboot', 'reboot')} disabled={!!actionLoading} style={{ ...styles.actionBtn, background: '#fbbf24', color: '#000' }}>
              {actionLoading === 'reboot' ? '...' : '🔄 Reboot'}
            </button>
            <button onClick={() => doAction('suspend', 'suspend')} disabled={!!actionLoading} style={{ ...styles.actionBtn, background: '#f97316' }}>
              {actionLoading === 'suspend' ? '...' : '⏸ Suspend'}
            </button>
          </>
        )}
        {instance.status === 'paused' && (
          <button onClick={() => doAction('resume', 'resume')} disabled={!!actionLoading} style={styles.actionBtn}>
            {actionLoading === 'resume' ? '...' : '▶ Resume'}
          </button>
        )}
        <button onClick={handleDelete} disabled={!!actionLoading} style={{ ...styles.actionBtn, background: '#dc2626' }}>
          {actionLoading === 'delete' ? '...' : '🗑 Delete'}
        </button>
      </div>

      <div style={styles.snapSection}>
        <button onClick={toggleSnapshots} style={styles.snapToggle}>
          {showSnapshots ? '▼ Hide Snapshots' : '▶ Snapshots'}
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
            {snapshots && snapshots.length > 0 ? (
              <div style={styles.snapList}>
                {snapshots
                  .filter((s) => s.name !== 'current')
                  .map((s) => (
                    <div key={s.name} style={styles.snapItem}>
                      <span style={{ color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {s.name === currentSnap && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />}
                        {s.name}
                      </span>
                      <div style={styles.snapActions}>
                        <button onClick={() => rollbackSnapshot(s.name)} style={styles.snapSmallBtn} title="Rollback">
                          ↩
                        </button>
                        <button onClick={() => deleteSnapshot(s.name)} style={{ ...styles.snapSmallBtn, color: '#f87171' }} title="Delete">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '0.85rem' }}>No snapshots</p>
            )}
          </div>
        )}
      </div>
      {showConnect && <TerminalConsole instance={instance} onClose={() => setShowConnect(false)} />}
    </div>
  );
}

const styles = {
  card: {
    background: '#1a1a2e',
    borderRadius: '10px',
    padding: '18px',
    color: '#eee',
    border: '1px solid #2a2a4a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  typeBadge: {
    background: '#e94560',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginRight: '10px',
  },
  name: { fontSize: '1.05rem', fontWeight: 600 },
  status: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
  },
  details: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '14px',
    fontSize: '0.88rem',
  },
  detail: { color: '#aaa' },
  error: {
    background: '#3d1f1f',
    color: '#ff6b6b',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    marginBottom: '10px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '5px',
    border: 'none',
    background: '#4ade80',
    color: '#000',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  snapSection: {
    borderTop: '1px solid #2a2a4a',
    paddingTop: '10px',
  },
  snapToggle: {
    background: 'transparent',
    border: 'none',
    color: '#e94560',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    padding: 0,
  },
  snapContent: {
    marginTop: '10px',
  },
  snapForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
  },
  snapInput: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #333',
    background: '#16213e',
    color: '#eee',
    fontSize: '0.85rem',
    outline: 'none',
  },
  snapCreateBtn: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.82rem',
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
    padding: '6px 8px',
    background: '#16213e',
    borderRadius: '4px',
    fontSize: '0.85rem',
  },
  snapActions: {
    display: 'flex',
    gap: '4px',
  },
  snapSmallBtn: {
    background: 'transparent',
    border: 'none',
    color: '#4ade80',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '2px 6px',
  },
};
