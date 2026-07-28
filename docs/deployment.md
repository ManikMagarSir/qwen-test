# Deployment Guide

---

## Production Architecture

```
Internet ──> Nginx (reverse proxy, TLS) ──> Backend (port 5000)
                                      └──> Frontend (static files / build/)

Backend ──> MongoDB
Backend ──> Proxmox VE (port 8006, internal)
Backend ──> SSH to Proxmox host (port 22, internal)
```

In production you should:
- Serve the React build as static files from Nginx (not `npm start`)
- Run the backend as a systemd service
- Use a reverse proxy with TLS termination
- Restrict Proxmox API/SSH to local network
- Use a properly configured MongoDB instance (auth enabled)

---

## 1. Build the Frontend

```bash
cd frontend
npm run build
```

This produces static files in `frontend/build/`. Copy them to your web server's docroot.

---

## 2. Backend systemd Service

Create `/etc/systemd/system/cloud-backend.service`:

```ini
[Unit]
Description=Cloud Manager Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=cloudmgr
WorkingDirectory=/opt/cloud/backend
ExecStart=/usr/bin/node /opt/cloud/backend/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/cloud/backend/.ssh

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloud-backend
```

Check status:

```bash
sudo journalctl -u cloud-backend -f
```

---

## 3. Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/cloud`:

```nginx
server {
    listen 80;
    server_name cloud.example.com;

    # Frontend static files
    root /opt/cloud/frontend/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket console proxy
    location /api/console/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA fallback — serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Enable site and TLS:

```bash
sudo ln -s /etc/nginx/sites-available/cloud /etc/nginx/sites-enabled/
sudo certbot --nginx -d cloud.example.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. MongoDB Production Configuration

Enable authentication and create a dedicated user:

```bash
mongosh
```

```javascript
use admin
db.createUser({
  user: "cloudadmin",
  pwd: "<strong-password>",
  roles: [ { role: "root", db: "admin" } ]
})

use cloud
db.createUser({
  user: "cloudapp",
  pwd: "<app-password>",
  roles: [ { role: "readWrite", db: "cloud" } ]
})
```

Update `backend/.env`:

```ini
MONGO_URI=mongodb://cloudapp:<app-password>@localhost:27017/cloud?authSource=cloud
```

Enable MongoDB auth in `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

---

## 5. Environment Security

### Production `.env`

```ini
PORT=5000
MONGO_URI=mongodb://cloudapp:password@localhost:27017/cloud?authSource=cloud
JWT_SECRET=<64-char-random-hex>
PROXMOX_HOST=10.0.0.5
PROXMOX_PORT=8006
PROXMOX_USER=cloudmgr@pve
PROXMOX_PASSWORD=<strong-password>
PROXMOX_NODE=pve
```

### File permissions

```bash
chmod 600 /opt/cloud/backend/.env
chmod 600 /opt/cloud/.ssh/cloud
chmod 644 /opt/cloud/.ssh/cloud.pub
chown -R cloudmgr:cloudmgr /opt/cloud
```

---

## 6. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH from management IPs only
sudo ufw allow from <your-ip> to any port 22

# Deny Proxmox API access from outside
sudo ufw deny from any to <proxmox-ip> port 8006

# Deny MongoDB from outside
sudo ufw deny from any to <mongodb-ip> port 27017
```

---

## 7. Monitoring

### Process monitoring

systemd automatically restarts the backend on failure. Check status:

```bash
systemctl status cloud-backend
journalctl -u cloud-backend --since "1 hour ago"
```

### Logging

The backend logs to stdout (captured by journald). For file logging, add `pino` or `winston` to `server.js`:

```javascript
const fs = require('fs');
const accessLog = fs.createWriteStream('/var/log/cloud/access.log', { flags: 'a' });
app.use((req, res, next) => {
  accessLog.write(`${new Date().toISOString()} ${req.method} ${req.url}\n`);
  next();
});
```

Create the log directory:

```bash
sudo mkdir -p /var/log/cloud
sudo chown cloudmgr:cloudmgr /var/log/cloud
```

---

## 8. Backup Strategy

### What to back up

| Data | Location | Frequency |
|------|----------|-----------|
| MongoDB | `cloud` database | Daily |
| SSH keys | `.ssh/cloud`, `.ssh/cloud.pub` | Once (or after regeneration) |
| `.env` | `backend/.env` | Once (or after config changes) |

### MongoDB backup

```bash
# Automated daily backup via cron
0 2 * * * mongodump --uri="mongodb://cloudapp:password@localhost:27017/cloud" --out=/backups/mongodb/$(date +\%Y\%m\%d)
```

### Restore

```bash
mongorestore --uri="mongodb://cloudapp:password@localhost:27017/cloud" /backups/mongodb/20250128/cloud
```

---

## 9. Updating

```bash
# Pull latest code
cd /opt/cloud
git pull

# Update dependencies
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build

# Restart backend
sudo systemctl restart cloud-backend

# Reload Nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. Scaling Considerations

For a single Proxmox host, this setup is sufficient. To scale:

- **Multiple Proxmox nodes** — Add `PROXMOX_NODE` as a list, route instances across nodes
- **Horizontal scaling** — Run multiple backend instances behind the Nginx reverse proxy (stateless except IPAM which uses MongoDB for atomicity)
- **MongoDB replica set** — Use a replica set for failover instead of a single instance
- **Redis session cache** — Add Redis for rate limiting and token blacklisting

---

## Load Testing

Basic load test with `wrk`:

```bash
# Install wrk
sudo apt install -y wrk

# Test API endpoint
wrk -t4 -c100 -d30s http://localhost:5000/api/instances \
  -H "Authorization: Bearer $TOKEN"
```

Monitor Proxmox API load during testing — it is the primary bottleneck.
