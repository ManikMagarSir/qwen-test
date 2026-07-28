const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { Client } = require('ssh2');
const Instance = require('./models/Instance');
const User = require('./models/User');

function setupConsole(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws, req) => {
    const { vmid } = req;

    const ssh = new Client();
    let cols = 80, rows = 24;

    ssh.on('ready', () => {
      ws.send(JSON.stringify({ type: 'connected' }));

      ssh.exec(`lxc-attach -n ${vmid}`, {
        pty: { term: 'xterm-256color', cols: 120, rows: 36 },
      }, (err, stream) => {
        if (err) {
          ws.close(4005, 'Shell failed');
          return;
        }

        ws.on('message', (data) => {
          const text = data.toString();
          try {
            const m = JSON.parse(text);
            if (m.type === 'resize') {
              cols = m.cols;
              rows = m.rows;
              stream.setWindow(rows, cols, 0, 0);
              return;
            }
          } catch (_) {}
          stream.write(text);
        });

        stream.on('data', (data) => {
          if (ws.readyState === ws.OPEN) ws.send(data.toString('base64'));
        });
        stream.stderr.on('data', (data) => {
          if (ws.readyState === ws.OPEN) ws.send(data.toString('base64'));
        });

        stream.on('close', () => ws.close());
        ws.on('close', () => { stream.close(); ssh.end(); });
      });
    });

    ssh.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', message: `SSH to Proxmox: ${err.message}` }));
      ws.close();
    });

    ssh.connect({
      host: process.env.PROXMOX_HOST,
      port: 22,
      username: 'root',
      password: process.env.PROXMOX_PASSWORD,
      readyTimeout: 10000,
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const m = url.pathname.match(/^\/api\/console\/([a-f0-9]+)$/);
    if (!m) { return; }
    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      User.findById(decoded.id).then((user) => {
        if (!user) { socket.destroy(); return; }
        Instance.findOne({ _id: m[1], owner: user._id }).lean().then((inst) => {
          if (!inst) { socket.destroy(); return; }
          request.vmid = inst.vmid;
          wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
        });
      });
    } catch (_) { socket.destroy(); }
  });

  return wss;
}

module.exports = { setupConsole };
