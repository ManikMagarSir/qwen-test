import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalConsole({ instance, onClose }) {
  const termRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:5000/api/console/${instance._id}?token=${token}`;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: '#0f0f23',
        foreground: '#e0e0e0',
        cursor: '#e94560',
        selectionBackground: '#2a2a4a',
        black: '#1a1a2e',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e0e0e0',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    term.open(termRef.current);
    fit.fit();

    term.write('Connecting to container...\r\n');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.clear();
      term.focus();
    };

    ws.onmessage = (event) => {
      const data = event.data;
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'error') {
          term.writeln(`\r\n\x1b[31m${msg.message}\x1b[0m`);
        }
        return;
      } catch (_) {
        // binary base64 data
        term.write(atob(data));
      }
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mWebSocket connection failed\x1b[0m');
    };

    ws.onclose = (e) => {
      const reasons = {
        4004: 'Instance not ready (no IP/password)',
        4005: 'Shell session failed',
      };
      const msg = reasons[e.code] || (e.reason || `Connection closed (code ${e.code})`);
      term.writeln(`\r\n\x1b[33m${msg}\x1b[0m`);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try { fit.fit(); } catch (_) {}
    });
    resizeObserver.observe(termRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [instance._id]);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={{ color: '#eee', fontWeight: 600 }}>
            💻 {instance.name} ({instance.ip})
          </span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div ref={termRef} style={styles.terminal} />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  container: {
    width: '90%', maxWidth: '960px', height: '80vh',
    display: 'flex', flexDirection: 'column',
    borderRadius: '10px', overflow: 'hidden',
    border: '1px solid #2a2a4a',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px', background: '#1a1a2e', borderBottom: '1px solid #2a2a4a',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#888',
    fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px',
  },
  terminal: {
    flex: 1,
    background: '#0f0f23',
    padding: '4px',
  },
};
