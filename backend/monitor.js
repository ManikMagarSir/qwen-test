const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const Instance = require('./models/Instance');
const User = require('./models/User');
const proxmox = require('./services/proxmox');

function setupMonitor(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws, req) => {
    const { user } = req;
    let interval;

    async function pushMetrics() {
      if (ws.readyState !== ws.OPEN) return;
      try {
        const instances = await Instance.find({ owner: user._id }).sort('-createdAt').lean();
        const detailMap = {};
        const running = instances.filter((i) => i.status === 'running');
        if (running.length > 0) {
          const results = await Promise.allSettled(
            running.map((i) =>
              proxmox.getInstance(i.node, i.type, i.vmid).catch(() => null)
            )
          );
          running.forEach((i, idx) => {
            if (results[idx].status === 'fulfilled' && results[idx].value) {
              detailMap[i._id] = results[idx].value;
            }
          });
        }
        ws.send(JSON.stringify({ type: 'update', instances, details: detailMap }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }

    interval = setInterval(pushMetrics, 5000);
    pushMetrics();

    ws.on('close', () => clearInterval(interval));
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== '/api/monitor/ws') { return; }

    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      User.findById(decoded.id).then((user) => {
        if (!user) { socket.destroy(); return; }
        request.user = user;
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
      }).catch(() => socket.destroy());
    } catch (_) { socket.destroy(); }
  });

  return wss;
}

module.exports = { setupMonitor };
