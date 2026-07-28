# Cloud Manager

A multi-tenant cloud management platform that sits between users and Proxmox VE. Users can create, manage, and monitor LXC containers through a web interface — with complete isolation so each user only sees their own resources.

Built with the **MERN stack** (MongoDB, Express, React, Node.js).

## Features

- **Multi-tenant isolation** — Users register and authenticate via JWT; each user sees only their own instances
- **LXC container management** — Create, start, stop, reboot, suspend, and delete containers
- **Static IP allocation** — Automatic IP assignment from `192.168.55.0/24` with atomic claim/release
- **OS template browser** — Lists available templates from Proxmox storage for easy selection
- **Snapshot management** — Create, list, rollback, and delete snapshots per container
- **Web console** — Browser-based terminal via Proxmox host SSH + `lxc-attach` (no SSH needed inside containers)
- **Dark theme UI** — Professional interface with Fira Code/Fira Sans typography and Lucide icons

## Architecture

```
Browser ──HTTP──> React Frontend ──API──> Express Backend ──Proxmox API──> Proxmox VE
                        │                      │
                        │                      ├── MongoDB (users, instances, IP allocations)
                        │                      └── SSH ──> Proxmox Host ──lxc-attach──> Container shell
                        │
                        └── WebSocket ──> Console Proxy
```

See `docs/architecture.md` for a detailed breakdown.

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Proxmox VE 7+ with API access
- Network access to Proxmox host on port 22 (SSH) and 8006 (API)

## Quick Start

### 1. Clone and install

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

### 2. Configure

Edit `backend/.env`:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `PROXMOX_HOST` | IP of your Proxmox host |
| `PROXMOX_PORT` | API port (default 8006) |
| `PROXMOX_USER` | Proxmox API user (e.g. `root@pam`) |
| `PROXMOX_PASSWORD` | Proxmox API password |
| `PROXMOX_NODE` | Proxmox node name |

### 3. Run

```bash
./start.sh
```

Or start individually:

```bash
# Terminal 1 — MongoDB
mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork

# Terminal 2 — Backend
cd backend && node server.js

# Terminal 3 — Frontend
cd frontend && npm start
```

- Frontend: `http://localhost:3000` (also on LAN at `http://<lan-ip>:3000`)
- Backend: `http://localhost:5000`

## Usage

1. **Register** at `/register` — create your account
2. **Create a container** — pick an OS template, set CPU/memory/disk, choose a root password
3. **Manage** — start, stop, reboot, suspend from the dashboard
4. **Console** — click the Terminal button on a running container for browser-based shell access
5. **Snapshots** — expand the snapshots section to create, rollback, or delete snapshots

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Instances
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/instances` | List user's instances |
| POST | `/api/instances/create` | Create LXC container |
| GET | `/api/instances/:id` | Get instance details |
| DELETE | `/api/instances/:id` | Delete instance |
| POST | `/api/instances/:id/start` | Start instance |
| POST | `/api/instances/:id/stop` | Stop instance |
| POST | `/api/instances/:id/reboot` | Reboot instance |
| POST | `/api/instances/:id/suspend` | Suspend instance |
| POST | `/api/instances/:id/resume` | Resume instance |

### Snapshots
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/instances/:id/snapshots` | List snapshots |
| POST | `/api/instances/:id/snapshots` | Create snapshot |
| DELETE | `/api/instances/:id/snapshots/:name` | Delete snapshot |
| POST | `/api/instances/:id/snapshots/:name/rollback` | Rollback to snapshot |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List OS templates |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, react-router-dom, Lucide React, xterm.js |
| Backend | Node.js, Express, Mongoose, JWT, ssh2 |
| Database | MongoDB |
| Virtualization | Proxmox VE API |
| Fonts | Fira Code, Fira Sans |
