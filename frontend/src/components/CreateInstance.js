import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CreateInstance() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [cpus, setCpus] = useState(1);
  const [memory, setMemory] = useState(1024);
  const [disk, setDisk] = useState(8);
  const [storage, setStorage] = useState('local-lvm');
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState('');
  const [password, setPassword] = useState('changeme');
  const [bridge, setBridge] = useState('vmbr0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    api.get('/templates')
      .then((res) => {
        const t = res.data.templates.map((item) => ({
          volid: item.volid,
          name: item.volid.split('/').pop(),
          size: item.size,
        }));
        setTemplates(t);
        if (t.length > 0) setTemplate(t[0].volid);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Failed to load templates');
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/instances/create', {
        type: 'lxc',
        name,
        cpus,
        memory,
        disk,
        storage,
        bridge,
        ostemplate: template,
        password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.heading}>New LXC Container</h2>

        {error && <div style={styles.error}>⚠ {error}{error.includes('localhost') || error.includes('connect') ? ' — Is the backend running?' : ''}</div>}

        <label style={styles.label}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="my-container"
          style={styles.input}
        />

        <label style={styles.label}>OS Template</label>
        {loadingTemplates ? (
          <div style={{ color: '#888', fontSize: '0.9rem' }}>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div style={{ color: '#f87171', fontSize: '0.9rem' }}>No templates found in storage</div>
        ) : (
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={styles.input}
          >
            {templates.map((t) => (
              <option key={t.volid} value={t.volid}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <label style={styles.label}>CPU Cores</label>
        <input
          type="number"
          value={cpus}
          onChange={(e) => setCpus(Number(e.target.value))}
          min={1}
          max={32}
          style={styles.input}
        />

        <label style={styles.label}>Memory (MB)</label>
        <input
          type="number"
          value={memory}
          onChange={(e) => setMemory(Number(e.target.value))}
          min={128}
          max={131072}
          style={styles.input}
        />

        <label style={styles.label}>Disk (GB)</label>
        <input
          type="number"
          value={disk}
          onChange={(e) => setDisk(Number(e.target.value))}
          min={1}
          max={1000}
          style={styles.input}
        />

        <label style={styles.label}>Storage</label>
        <input
          type="text"
          value={storage}
          onChange={(e) => setStorage(e.target.value)}
          placeholder="local-lvm"
          style={styles.input}
        />

        <label style={styles.label}>Bridge</label>
        <input
          type="text"
          value={bridge}
          onChange={(e) => setBridge(e.target.value)}
          placeholder="vmbr0"
          style={styles.input}
        />

        <label style={styles.label}>Root Password</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <div style={styles.buttons}>
          <button type="button" onClick={() => navigate('/dashboard')} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || loadingTemplates || templates.length === 0}
            style={styles.submitBtn}
          >
            {loading ? 'Creating...' : 'Create Container'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '40px',
    background: '#0f0f23',
  },
  form: {
    background: '#1a1a2e',
    padding: '32px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  heading: {
    color: '#eee',
    margin: '0 0 8px 0',
    fontSize: '1.4rem',
  },
  error: {
    background: '#3d1f1f',
    color: '#ff6b6b',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '0.9rem',
  },
  label: {
    color: '#aaa',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginTop: '4px',
  },
  input: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: '#16213e',
    color: '#eee',
    fontSize: '0.95rem',
    outline: 'none',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #555',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
