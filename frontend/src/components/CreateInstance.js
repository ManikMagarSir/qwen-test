import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Server, Loader } from 'lucide-react';

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
  const [errors, setErrors] = useState({});

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

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    else if (!/^[a-zA-Z0-9_-]+$/.test(name)) errs.name = 'Only letters, numbers, hyphens, underscores';
    if (cpus < 1 || cpus > 32) errs.cpus = 'Must be 1-32';
    if (memory < 128 || memory > 131072) errs.memory = 'Must be 128-131072 MB';
    if (disk < 1 || disk > 1000) errs.disk = 'Must be 1-1000 GB';
    if (!template) errs.template = 'Select a template';
    if (!password.trim()) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/instances/create', {
        type: 'lxc',
        name: name.trim(),
        cpus: Number(cpus),
        memory: Number(memory),
        disk: Number(disk),
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
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Instances
        </button>

        <h1 style={styles.heading}>New LXC Container</h1>
        <p style={styles.subheading}>Configure your container and deploy it to the cluster.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="create-form-grid" style={styles.grid}>
            <Field label="Container Name" error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="my-container"
                style={{ ...styles.input, borderColor: errors.name ? '#EF4444' : undefined }}
              />
            </Field>

            <Field label="OS Template" error={errors.template}>
              {loadingTemplates ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '0.85rem', padding: '10px 0' }}>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div style={{ color: '#F87171', fontSize: '0.85rem', padding: '10px 0' }}>No templates found in storage</div>
              ) : (
                <select value={template} onChange={(e) => setTemplate(e.target.value)} style={styles.input}>
                  {templates.map((t) => (
                    <option key={t.volid} value={t.volid}>{t.name}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="CPU Cores" error={errors.cpus}>
              <input
                type="number"
                value={cpus}
                onChange={(e) => { setCpus(e.target.value); setErrors((p) => ({ ...p, cpus: '' })); }}
                min={1} max={32}
                style={{ ...styles.input, borderColor: errors.cpus ? '#EF4444' : undefined }}
              />
            </Field>

            <Field label="Memory (MB)" error={errors.memory}>
              <input
                type="number"
                value={memory}
                onChange={(e) => { setMemory(e.target.value); setErrors((p) => ({ ...p, memory: '' })); }}
                min={128} max={131072}
                style={{ ...styles.input, borderColor: errors.memory ? '#EF4444' : undefined }}
              />
            </Field>

            <Field label="Disk (GB)" error={errors.disk}>
              <input
                type="number"
                value={disk}
                onChange={(e) => { setDisk(e.target.value); setErrors((p) => ({ ...p, disk: '' })); }}
                min={1} max={1000}
                style={{ ...styles.input, borderColor: errors.disk ? '#EF4444' : undefined }}
              />
            </Field>

            <Field label="Storage">
              <input type="text" value={storage} onChange={(e) => setStorage(e.target.value)} style={styles.input} />
            </Field>

            <Field label="Bridge">
              <input type="text" value={bridge} onChange={(e) => setBridge(e.target.value)} style={styles.input} />
            </Field>

            <Field label="Root Password" error={errors.password}>
              <input
                type="text"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                style={{ ...styles.input, borderColor: errors.password ? '#EF4444' : undefined }}
              />
            </Field>
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={() => navigate('/dashboard')} style={styles.cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingTemplates || templates.length === 0}
              style={styles.submitBtn}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span style={btnSpinner} /> Deploying...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Server size={16} /> Deploy Container
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 500 }}>{label}</label>
      {children}
      {error && <span style={{ color: '#F87171', fontSize: '0.78rem' }}>{error}</span>}
    </div>
  );
}

const btnSpinner = {
  width: '16px', height: '16px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#020617',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  display: 'inline-block',
};

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-background)',
    padding: '32px 24px',
  },
  container: {
    maxWidth: '680px',
    margin: '0 auto',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: '0.88rem',
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: '24px',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    color: 'var(--color-foreground)',
  },
  subheading: {
    color: '#64748B',
    fontSize: '0.9rem',
    marginTop: '6px',
    marginBottom: '28px',
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
  form: {
    background: 'var(--color-muted)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    border: '1px solid var(--color-border)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: '#94A3B8',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#020617',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};


