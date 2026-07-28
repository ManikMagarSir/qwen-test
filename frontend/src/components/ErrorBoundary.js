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
          <div style={styles.iconWrap}>
            <AlertTriangle size={40} color="#EF4444" />
          </div>
          <h2 style={styles.heading}>Something went wrong</h2>
          <p style={styles.text}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="btn-primary"
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
    animation: 'fadeIn 0.3s ease',
  },
  iconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: '24px',
  },
};
