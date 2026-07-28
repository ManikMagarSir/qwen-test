import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Server, Loader, Cpu, HardDrive, Database, Globe, Key, Network } from 'lucide-react';

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
    if (memory < 64 || memory > 131072) errs.memory = 'Must be 64-131072 MB';
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

  const fields = [
    { icon: Globe, label: 'Container Name', value: name, set: (v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }, err: errors.name, type: 'text', placeholder: 'my-container', min: undefined, max: undefined },
    { icon: Server, label: 'OS Template', err: errors.template, isTemplate: true },
    { icon: Cpu, label: 'CPU Cores', value: cpus, set: (v) => { setCpus(v); setErrors((p) => ({ ...p, cpus: '' })); }, err: errors.cpus, type: 'number', min: 1, max: 32 },
    { icon: Database, label: 'Memory (MB)', value: memory, set: (v) => { setMemory(v); setErrors((p) => ({ ...p, memory: '' })); }, err: errors.memory, type: 'number', min: 64, max: 131072 },
    { icon: HardDrive, label: 'Disk (GB)', value: disk, set: (v) => { setDisk(v); setErrors((p) => ({ ...p, disk: '' })); }, err: errors.disk, type: 'number', min: 1, max: 1000 },
    { icon: Network, label: 'Storage', value: storage, set: setStorage, err: undefined, type: 'text', placeholder: 'local-lvm' },
    { icon: Network, label: 'Bridge', value: bridge, set: setBridge, err: undefined, type: 'text', placeholder: 'vmbr0' },
    { icon: Key, label: 'Root Password', value: password, set: (v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }, err: errors.password, type: 'text', placeholder: 'changeme' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={styles.header}>
          <h1 style={styles.heading}>New LXC Container</h1>
          <p style={styles.subheading}>Configure and deploy a container to your infrastructure.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="create-form-grid" style={styles.grid}>
            {fields.map((f) => (
              <div key={f.label} style={styles.field}>
                <label style={styles.label}>
                  <f.icon size={13} color="#94A3B8" />
                  {f.label}
                </label>
                {f.isTemplate ? (
                  loadingTemplates ? (
                    <div style={styles.loadingText}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div style={styles.errorText}>No templates found</div>
                  ) : (
                    <select value={template} onChange={(e) => setTemplate(e.target.value)} style={styles.input}>
                      {templates.map((t) => (
                        <option key={t.volid} value={t.volid}>{t.name}</option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.set(f.type === 'number' ? Number(e.target.value) : e.target.value)}
                    min={f.min}
                    max={f.max}
                    placeholder={f.placeholder}
                    style={{ ...styles.input, borderColor: f.err ? '#EF4444' : undefined }}
                    required={!f.isTemplate}
                  />
                )}
                {f.err && <span style={styles.fieldError}>{f.err}</span>}
              </div>
            ))}
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary" style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading || loadingTemplates || templates.length === 0} className="btn-primary" style={styles.submitBtn}>
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

const btnSpinner = {
  width: '16px', height: '16px',
  border: '2px solid rgba(2, 6, 23, 0.3)',
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
    maxWidth: '720px',
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
    transition: 'color var(--transition-fast)',
  },
  header: {
    marginBottom: '28px',
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
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    marginBottom: '20px',
    animation: 'slideDown 0.2s ease',
  },
  form: {
    background: 'rgba(26, 30, 47, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    border: '1px solid rgba(51, 65, 85, 0.4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'rgba(2, 6, 23, 0.5)',
    color: 'var(--color-foreground)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  fieldError: {
    color: '#F87171',
    fontSize: '0.78rem',
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#94A3B8',
    fontSize: '0.85rem',
    padding: '10px 0',
  },
  errorText: {
    color: '#F87171',
    fontSize: '0.85rem',
    padding: '10px 0',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
};
