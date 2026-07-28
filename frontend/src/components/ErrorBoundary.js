import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={styles.container}>
          <AlertTriangle size={40} color="#EF4444" />
          <h2 style={styles.heading}>Something went wrong</h2>
          <p style={styles.text}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={styles.btn}
          >
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-foreground)',
    marginTop: '16px',
    fontSize: '1.2rem',
  },
  text: {
    color: '#64748B',
    fontSize: '0.9rem',
    marginTop: '8px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '20px',
    background: 'var(--color-accent)',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
};
