# Setup Guide

Detailed instructions for setting up Cloud Manager from scratch.

---

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18+ | Required for both backend and frontend |
| MongoDB | 6+ | Local or remote instance |
| Proxmox VE | 7+ | With API access enabled |
| Linux | any | Backend runs on any POSIX system |

---

## 1. MongoDB Setup

### Option A: Install locally (Ubuntu/Debian)

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository (Ubuntu 22.04)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

### Option B: Start temporary instance for development

```bash
mkdir -p /tmp/cloud-mongodb
mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork
```

### Verify

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# { "ok": 1 }
```

---

## 2. Proxmox VE Configuration

### Enable API access

Proxmox VE API is enabled by default on port 8006. Verify:

```bash
curl -k https://<proxmox-ip>:8006/api2/json/version
# Returns JSON with version info
```

### Create a dedicated API user (optional but recommended)

```bash
pveum user add cloudmgr@pve --password <password>
pveum acl modify / --user cloudmgr@pve --role PVEAdmin
```

### Note the required values

You'll need these for `.env`:

```
PROXMOX_HOST=<proxmox-ip>
PROXMOX_PORT=8006
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=<password>
PROXMOX_NODE=<node-name>
```

Find your node name:

```bash
pvesh get /cluster/status --output-format json | jq '.[] | select(.type == "node") | .name'
```

---

## 3. Application Setup

### Clone & install

```bash
git clone <repo-url> cloud
cd cloud

# Backend
cd backend
cp .env-example .env
npm install

# Frontend
cd ../frontend
npm install
cd ..
```

### Configure backend

Edit `backend/.env`:

```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/cloud
JWT_SECRET=replace-with-a-random-64-char-string
PROXMOX_HOST=192.168.1.100
PROXMOX_PORT=8006
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=your-proxmox-password
PROXMOX_NODE=pve
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Network Configuration

### Container network bridging

The IPAM assigns addresses from `192.168.55.0/24`. Ensure your Proxmox bridge (`vmbr0` by default) can route this subnet, or configure a dedicated bridge.

### Static IP allocation flow

1. Pool is seeded with all 253 addresses on first startup (`initPool()`)
2. Each new container atomically claims an unallocated IP
3. IPs are released back to the pool on container deletion
4. The gateway is `192.168.55.1` (reserved, not assigned)

If your Proxmox host needs to route traffic to containers, add the bridge IP:

```bash
ip addr add 192.168.55.1/24 dev vmbr0
```

---

## 5. SSH Key Setup

The application automatically generates an RSA keypair on first startup at `.ssh/cloud` and `.ssh/cloud.pub`. This key is used to SSH into the Proxmox host for the Web Console feature.

### Manual generation (if needed)

```bash
mkdir -p .ssh
ssh-keygen -t rsa -b 4096 -f .ssh/cloud -N ""
```

The public key is injected into new containers via Proxmox's `ssh-public-keys` option during creation.

---

## 6. Running

### Quick start (recommended for development)

```bash
./start.sh
```

This starts MongoDB, backend, and frontend in a single terminal with Ctrl+C cleanup.

### Manual start (three terminals)

**Terminal 1 — MongoDB:**

```bash
mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork
```

**Terminal 2 — Backend:**

```bash
cd backend
node server.js
# or: npx nodemon server.js (auto-restart on changes)
```

**Terminal 3 — Frontend:**

```bash
cd frontend
npm start
```

---

## 7. Verification

1. Open `http://localhost:3000` in your browser
2. Click "Create an account" and register
3. Navigate to "New Instance" and create a container
4. The dashboard should show your new instance
5. Start the instance and click the Terminal icon to test the Web Console

---

## Troubleshooting

### MongoDB won't start

```bash
# Check logs
cat /tmp/cloud-mongodb/mongo.log

# Kill existing process
kill $(pgrep -f mongod)

# Restart
mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork
```

### Proxmox API connection fails

```bash
# Test connectivity
curl -k https://192.168.55.195:8006/api2/json/version

# If connection refused, check Proxmox is running
systemctl status pveproxy
```

### IP pool not seeding

The pool seeds on backend startup via `initPool()`. Check backend logs for:

```
IP pool initialized with X addresses
```

If the pool is empty, allocations will fail with "No free IPs".

### Console not connecting

The console requires SSH access to the Proxmox host. Verify:

```bash
ssh root@<proxmox-ip>
```

If SSH works, check that the instance ID in the URL matches a MongoDB `_id` and that the instance status is `"running"`.
