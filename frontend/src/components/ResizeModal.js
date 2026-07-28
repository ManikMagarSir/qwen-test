import React, { useState } from 'react';
import api from '../api/axios';
import { Cpu, HardDrive, Database, X, Loader } from 'lucide-react';

export default function ResizeModal({ instance, onClose, onResized }) {
  const [cpus, setCpus] = useState(instance.cpus || 1);
  const [memory, setMemory] = useState(instance.memory || 1024);
  const [disk, setDisk] = useState(instance.disk || 8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cpus < 1 || cpus > 32) { setError('CPU cores must be 1–32'); return; }
    if (memory < 128 || memory > 131072) { setError('Memory must be 128–131072 MB'); return; }
    if (disk < 1 || disk > 1000) { setError('Disk must be 1–1000 GB'); return; }
    if (disk < instance.disk) { setError('Disk cannot be shrunk'); return; }

    setLoading(true);
    try {
      const res = await api.put(`/instances/${instance._id}/resize`, { cpus, memory, disk });
      onResized(res.data.instance);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Resize failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Resize Container</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={16} /></button>
        </div>
        <p style={styles.sub}>Adjust resources for <strong>{instance.name}</strong></p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}><Cpu size={14} /> CPU Cores</label>
            <input
              type="number"
              min={1}
              max={32}
              value={cpus}
              onChange={(e) => setCpus(Number(e.target.value))}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}><Database size={14} /> Memory (MB)</label>
            <input
              type="number"
              min={128}
              max={131072}
              step={256}
              value={memory}
              onChange={(e) => setMemory(Number(e.target.value))}
              style={styles.input}
            />
            <span style={styles.hint}>{memory >= 1024 ? `${(memory / 1024).toFixed(1)} GB` : `${memory} MB`}</span>
          </div>
          <div style={styles.field}>
            <label style={styles.label}><HardDrive size={14} /> Disk (GB)</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={disk}
              onChange={(e) => setDisk(Number(e.target.value))}
              style={styles.input}
            />
            <span style={styles.hint}>Min {instance.disk} GB (cannot shrink)</span>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Resizing...' : 'Apply Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(2, 6, 23, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    width: '100%',
    maxWidth: '420px',
    animation: 'fadeIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    color: 'var(--color-foreground)',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: '#94A3B8',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
  },
  sub: {
    color: '#64748B',
    fontSize: '0.85rem',
    marginBottom: '20px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    marginBottom: '16px',
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#94A3B8',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-heading)',
    outline: 'none',
  },
  hint: {
    display: 'block',
    color: '#64748B',
    fontSize: '0.75rem',
    marginTop: '4px',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '11px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#020617',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
