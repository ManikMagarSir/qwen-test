import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Monitor, X } from 'lucide-react';

export default function TerminalConsole({ instance, onClose }) {
  const termRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:5000/api/console/${instance._id}?token=${token}`;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
      theme: {
        background: '#020617',
        foreground: '#CBD5E1',
        cursor: '#22C55E',
        cursorAccent: '#020617',
        selectionBackground: '#334155',
        black: '#1E293B', red: '#F87171', green: '#4ADE80', yellow: '#FBBF24',
        blue: '#60A5FA', magenta: '#C084FC', cyan: '#22D3EE', white: '#F8FAFC',
        brightBlack: '#475569', brightRed: '#FCA5A5', brightGreen: '#86EFAC',
        brightYellow: '#FDE68A', brightBlue: '#93C5FD', brightMagenta: '#D8B4FE',
        brightCyan: '#67E8F9', brightWhite: '#F8FAFC',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();

    term.write('Connecting to container...\r\n');

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      term.clear();
      term.focus();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'error') {
          term.writeln(`\r\n\x1b[31m${msg.message}\x1b[0m`);
        }
        return;
      } catch (_) {
        term.write(atob(event.data));
      }
    };

    ws.onclose = (e) => {
      const reasons = { 4004: 'Instance not ready', 4005: 'Session failed' };
      const msg = reasons[e.code] || e.reason || `Connection closed (code ${e.code})`;
      term.writeln(`\r\n\x1b[33m${msg}\x1b[0m`);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch (_) {} });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      ws.close();
      term.dispose();
    };
  }, [instance._id]);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrap}>
              <Monitor size={14} color="#22C55E" />
            </div>
            <span style={styles.title}>{instance.name}</span>
            {instance.ip && <span style={styles.ip}>{instance.ip}</span>}
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Close console">
            <X size={16} />
          </button>
        </div>
        <div ref={termRef} style={styles.terminal} />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(2, 6, 23, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '16px',
    animation: 'fadeIn 0.2s ease',
  },
  container: {
    width: '100%',
    maxWidth: '960px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    boxShadow: 'var(--shadow-lg)',
    background: '#020617',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#CBD5E1',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  ip: {
    color: '#64748B',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-heading)',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  terminal: {
    flex: 1,
    background: '#020617',
    padding: '4px',
  },
};
