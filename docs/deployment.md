# Deployment Guide

---

## Deployment Options

There are three ways to deploy Cloud Manager in production:

1. **Docker Compose** (recommended) — Full stack with MongoDB, backend, and Nginx frontend
2. **Systemd + Nginx** — Traditional single-server deployment
3. **Standalone** — Backend + frontend build served by any web server

---

## 1. Docker Compose (Recommended)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### Setup

```bash
# Clone and configure
git clone <repo-url> cloud
cd cloud
cp backend/.env-example backend/.env

# Edit backend/.env with production values
vim backend/.env

# Start all services
docker compose up -d

# Check logs
docker compose logs -f
```

The stack starts:
- **MongoDB 7** on port 27017 (internal only)
- **Backend** on port 5000
- **Nginx frontend** on port 80

### Configuration

The `docker-compose.yml` sets `MONGO_URI=mongodb://mongodb:27017/cloud` automatically. Your `.env` file is passed to the backend container.

### Updating

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

## 2. Systemd + Nginx (Traditional)

### 2.1 Build the Frontend

```bash
cd frontend
npm ci && npm run build
```

This produces static files in `frontend/build/`.

### 2.2 Backend systemd Service

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
Environment=LOG_LEVEL=warn

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

### 2.3 Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/cloud`:

```nginx
server {
    listen 80;
    server_name cloud.example.com;

    root /opt/cloud/frontend/build;
    index index.html;

    # API proxy (includes WebSocket upgrade)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
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

Enable site and set up TLS:

```bash
sudo ln -s /etc/nginx/sites-available/cloud /etc/nginx/sites-enabled/
sudo certbot --nginx -d cloud.example.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. MongoDB Production Configuration

Enable authentication:

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

## 4. Environment Security

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
CORS_ORIGINS=https://cloud.example.com
LOG_LEVEL=warn
```

### File permissions

```bash
chmod 600 /opt/cloud/backend/.env
chmod 600 /opt/cloud/.ssh/cloud
chmod 644 /opt/cloud/.ssh/cloud.pub
chown -R cloudmgr:cloudmgr /opt/cloud
```

### Rate limiting

In production the backend applies:
- **Global:** 100 requests per 15 minutes per IP
- **Auth:** 20 requests per 15 minutes per IP

These limits are configured in `server.js` and `routes/auth.js`. Adjust `max` values in the `rateLimit()` calls as needed.

---

## 5. Firewall Configuration

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

## 6. Logging

The backend uses **Winston** for structured logging with timestamps. In production, set `LOG_LEVEL=warn` in `.env` to reduce noise.

### Log output format

```
2025-01-28 12:00:00 [ERROR] POST /api/instances/create — Proxmox API error
2025-01-28 12:00:01 [WARN] POST /api/auth/login — Invalid credentials
```

Error logs include stack traces and sanitized request bodies (passwords redacted).

### Viewing logs

```bash
# Docker
docker compose logs -f backend

# systemd
journalctl -u cloud-backend -f

# Direct (if logging to file)
tail -f /var/log/cloud/app.log
```

---

## 7. Backup Strategy

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

## 8. Updating

```bash
# Pull latest code
cd /opt/cloud
git pull

# Docker
docker compose build --no-cache && docker compose up -d

# systemd
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build
sudo systemctl restart cloud-backend
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. Health Checks

The `/api/health` endpoint returns MongoDB connection status and Proxmox reachability:

```bash
curl https://cloud.example.com/api/health
```

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2025-01-28T12:00:00.000Z",
  "mongodb": "connected",
  "proxmox": "reachable"
}
```

Use this with your monitoring system (e.g., UptimeRobot, Prometheus Blackbox Exporter).

---

## 10. Scaling Considerations

- **Multiple Proxmox nodes** — Add logic to distribute instances across nodes
- **Horizontal backend scaling** — Backend is stateless except IPAM (uses MongoDB for atomicity). Run multiple instances behind Nginx.
- **MongoDB replica set** — Use a replica set for failover
- **Redis** — Add Redis for rate limiting and token blacklisting across multiple backend instances

---

## 11. Load Testing

```bash
# Install wrk
sudo apt install -y wrk

# Test API endpoint
wrk -t4 -c100 -d30s http://localhost:5000/api/instances \
  -H "Authorization: Bearer $TOKEN"
```

Monitor Proxmox API load during testing — it is the primary bottleneck.
