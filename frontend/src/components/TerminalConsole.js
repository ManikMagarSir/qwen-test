import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Monitor, X, Maximize2, Minimize2 } from 'lucide-react';

function TerminalContent({ instance, onClose }) {
  const termRef = useRef(null);
  const [fullscreen, setFullscreen] = React.useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:5000/api/console/${instance._id}?token=${token}`;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
      theme: {
        background: '#0A0F1E',
        foreground: '#E2E8F0',
        cursor: '#22C55E',
        cursorAccent: '#0A0F1E',
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
    setTimeout(() => fit.fit(), 50);

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
    <div style={styles.overlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.container,
          maxWidth: fullscreen ? '100%' : '1000px',
          height: fullscreen ? '100dvh' : '85vh',
          borderRadius: fullscreen ? 0 : 'var(--radius-lg)',
        }}
      >
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrap}>
              <Monitor size={15} color="#22C55E" />
            </div>
            <span style={styles.title}>{instance.name}</span>
            {instance.ip && (
              <>
                <span style={styles.separator}>|</span>
                <span style={styles.ip}>{instance.ip}</span>
              </>
            )}
          </div>
          <div style={styles.headerRight}>
            <span style={styles.connStatus}>
              <span style={styles.connDot} />
              connected
            </span>
            <button onClick={() => setFullscreen(!fullscreen)} style={styles.headerBtn} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <div style={styles.headerDivider} />
            <button onClick={onClose} style={{ ...styles.headerBtn, color: '#F87171' }} title="Close console">
              <X size={16} />
            </button>
          </div>
        </div>
        <div ref={termRef} style={styles.terminal} />
      </div>
    </div>
  );
}

export default function TerminalConsole(props) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted) return null;
  return ReactDOM.createPortal(
    <TerminalContent {...props} />,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2147483647,
    padding: '16px',
    animation: 'fadeIn 0.15s ease',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    boxShadow: '0 0 60px rgba(34, 197, 94, 0.12), 0 30px 80px rgba(0, 0, 0, 0.7)',
    background: '#0A0F1E',
    animation: 'scaleIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.95)',
    borderBottom: '1px solid rgba(34, 197, 94, 0.15)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconWrap: {
    width: '30px', height: '30px',
    borderRadius: '6px',
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#F1F5F9', fontWeight: 600, fontSize: '0.92rem' },
  separator: { color: '#334155', fontSize: '0.85rem' },
  ip: { color: '#64748B', fontSize: '0.82rem', fontFamily: 'var(--font-heading)' },
  connStatus: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px',
    background: 'rgba(34, 197, 94, 0.1)', color: '#4ADE80',
    fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase', letterSpacing: '0.3px',
  },
  connDot: {
    width: 5, height: 5, borderRadius: '50%', background: '#22C55E',
    animation: 'glowPulse 1.5s ease-in-out infinite',
  },
  headerBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', borderRadius: '6px', border: 'none',
    background: 'transparent', color: '#94A3B8', cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  headerDivider: { width: '1px', height: '20px', background: 'rgba(51, 65, 85, 0.5)' },
  terminal: { flex: 1, background: '#0A0F1E', padding: '6px' },
};
