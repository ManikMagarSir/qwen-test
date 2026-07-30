import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }) {
  if (!open) return null;

  const accentColor = variant === 'danger' ? '#EF4444' : 'var(--accent)';
  const accentBg = variant === 'danger' ? 'rgba(239,68,68,0.15)' : 'var(--accent-dim)';

  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={{ ...s.iconWrap, background: accentBg, color: accentColor }}>
            <AlertTriangle size={20} />
          </div>
          <button onClick={onCancel} style={s.closeBtn}><X size={16} /></button>
        </div>
        <h3 style={s.title}>{title}</h3>
        <p style={s.message}>{message}</p>
        <div style={s.actions}>
          <button onClick={onCancel} style={s.cancelBtn}>{cancelLabel || 'Cancel'}</button>
          <button onClick={onConfirm} style={{ ...s.confirmBtn, background: accentColor }}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%',
    maxWidth: '400px', animation: 'scaleIn 0.2s ease',
    boxShadow: 'var(--shadow-glass-xl)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '16px',
  },
  iconWrap: {
    width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
    cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-xs)',
    display: 'flex', transition: 'all var(--transition)',
  },
  title: {
    fontFamily: 'var(--font)', fontSize: '1.1rem', fontWeight: 600,
    color: 'var(--text-primary)', marginBottom: '8px',
  },
  message: {
    color: 'var(--text-tertiary)', fontSize: '0.9rem', lineHeight: 1.6,
    marginBottom: '24px',
  },
  actions: {
    display: 'flex', gap: '10px',
  },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem',
    fontWeight: 500, transition: 'all var(--transition)',
  },
  confirmBtn: {
    flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
    border: 'none', color: '#020617', cursor: 'pointer', fontSize: '0.88rem',
    fontWeight: 600, transition: 'all var(--transition)',
  },
};
