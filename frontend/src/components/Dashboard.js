import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import InstanceCard from './InstanceCard';

export default function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInstances = useCallback(async () => {
    try {
      const res = await api.get('/instances');
      setInstances(res.data.instances);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleDelete = (id) => {
    setInstances((prev) => prev.filter((i) => i._id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    setInstances((prev) =>
      prev.map((i) => (i._id === id ? { ...i, status: newStatus } : i))
    );
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#888' }}>Loading instances...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>My Instances</h2>
      {error && <div style={styles.error}>{error}</div>}
      {instances.length === 0 ? (
        <div style={styles.empty}>
          <p>No instances yet.</p>
          <a href="/create" style={styles.createLink}>+ Create your first instance</a>
        </div>
      ) : (
        <div style={styles.grid}>
          {instances.map((inst) => (
            <InstanceCard
              key={inst._id}
              instance={inst}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  heading: {
    color: '#eee',
    fontSize: '1.5rem',
    marginBottom: '20px',
  },
  center: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    background: '#3d1f1f',
    color: '#ff6b6b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888',
  },
  createLink: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#e94560',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
};
