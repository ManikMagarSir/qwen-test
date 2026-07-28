# Architecture Documentation

## System Overview

Cloud Manager is a multi-tenant orchestration layer that abstracts a single Proxmox VE cluster into an isolated per-user cloud platform. Users interact with a web UI to provision and manage LXC containers without ever touching the Proxmox interface directly.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                         │
│  Login · Register · Dashboard · Create · Monitoring · Profile     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Sidebar  │ │ Navbar   │ │ Instance │ │ Terminal │ │Error   │ │
│  │ (nav)    │ │ (user)   │ │ Card     │ │ Console  │ │Boundary│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP REST + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Express Backend (port 5000)                     │
│                                                                     │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ Auth       │ │ Profile      │ │ Instance     │ │ Console WS  │ │
│  │ /api/auth  │ │ /api/profile │ │ /api/instances│ │ /api/console│ │
│  │ (rate-ltd) │ │ (Joi val)    │ │ (Joi val)    │ │ /:id        │ │
│  └──────┬─────┘ └──────┬───────┘ └──────┬───────┘ └──────┬──────┘ │
│         │              │                │                │        │
│         ▼              ▼                ▼                ▼        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Services                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ proxmox  │ │  ipam    │ │ sshkeys  │ │ monitor WS     │  │  │
│  │  │ .js      │ │  .js     │ │  .js     │ │ /api/monitor/ws│  │  │
│  │  └────┬─────┘ └────┬─────┘ └──────────┘ └────────────────┘  │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │ Middleware & Utilities                                 │   │  │
│  │  │  auth.js (JWT) · errorHandler.js · validate.js (Joi)   │   │  │
│  │  │  logger.js (Winston) · rateLimit (express-rate-limit)  │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│    MongoDB       │ │  Proxmox VE  │ │  Proxmox Host (SSH)     │
│  users           │ │  API :8006   │ │  lxc-attach console     │
│  instances       │ │  LXC CRUD    │ │  (via ssh2)             │
│  ipallocations   │ │  Snapshots   │ └──────────────────────────┘
└─────────────────┘ └──────────────┘
```

## Key Design Decisions

### 1. Multi-Tenant Isolation

Each MongoDB `Instance` document stores an `owner` field (ObjectId ref to `User`). Every API endpoint filters by `owner: req.user._id`. Authentication uses JWT (7-day expiry) with the `auth` middleware decoding the token and attaching the user to `req.user`.

### 2. Static IP Allocation

Instead of DHCP, containers receive statically assigned IPs from `192.168.55.0/24`. The IPAM service uses `findOneAndUpdate` with an atomic filter `{ ip, instance: null }` to ensure no two containers get the same IP, even under concurrent requests.

- **Pre-seeded pool** — 253 IPs inserted on first startup
- **Atomic claim** — `findOneAndUpdate` with `{ ip, instance: null }`
- **Release on delete** — container deletion frees the IP back to the pool
- **Deduplication** — `initPool()` detects and frees double-claimed IPs

### 3. Web Console (lxc-attach proxy)

The browser-based terminal uses a three-hop path to avoid requiring SSH inside containers:

```
Browser WebSocket ──> Backend SSH ──> Proxmox Host ──lxc-attach──> Container Shell
```

1. Frontend opens WebSocket to `ws://backend:5000/api/console/:id?token=`
2. Backend verifies JWT and instance ownership
3. Backend SSHes into the Proxmox host (credentials from `.env`)
4. Runs `lxc-attach -n {vmid}` which enters the container's root shell
5. Bidirectional base64 streaming: WebSocket ↔ SSH ↔ container
6. Resize messages forwarded to PTY via `stream.setWindow(rows, cols, 0, 0)`

### 4. Live Monitoring (WebSocket push)

Instead of HTTP polling, monitoring data is pushed via a dedicated WebSocket:

1. Frontend connects to `ws://backend:5000/api/monitor/ws?token=`
2. Backend verifies JWT, loads user's instances
3. Every 5 seconds, fetches instance list + Proxmox status for running containers
4. Pushes `{ type: 'update', instances, details }` to the client
5. Auto-reconnects with 3s delay on disconnect
6. Backend uses `Promise.allSettled` for parallel status fetches

### 5. Real-Time Resource Scaling

CPU, memory, and disk can be adjusted on running containers without recreation:

- **CPU/Memory** — `PUT /nodes/{node}/lxc/{vmid}/config` (hot-pluggable)
- **Disk** — `PUT /nodes/{node}/lxc/{vmid}/resize` with `disk=rootfs` + `size=XG`
- Disk shrink is blocked at both frontend and backend
- MongoDB record updated after successful Proxmox API call

### 6. Auto-Status Sync

When listing instances via `GET /api/instances`, the backend fetches the actual Proxmox status for each instance in parallel, detects changes, updates MongoDB via `bulkWrite`, and returns the correct status. This ensures dashboard accuracy even when containers are shutdown from inside.

### 7. Proxmox API Integration

The `proxmox.js` service wraps the Proxmox VE API:

- **Authentication** — POST to `/access/ticket`; stores `PVEAuthCookie` and `CSRFPreventionToken`
- **Auto re-auth** — 401 response triggers automatic re-authentication
- **Self-signed certs** — `rejectUnauthorized: false` for all HTTPS requests
- Key endpoints: `/cluster/nextid`, `/nodes/{node}/lxc`, `/nodes/{node}/lxc/{vmid}/config`, `/nodes/{node}/lxc/{vmid}/status/current`, snapshots, resize

### 8. OS Template Browser

Templates are fetched from Proxmox storage via `GET /nodes/{node}/storage/{storage}/content` and filtered to `vztmpl` type.

## Security

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt, 12 rounds |
| JWT expiry | 7 days |
| Rate limiting | Auth: 20 req/15min. Global: 100 req/15min |
| CORS | Whitelist via `CORS_ORIGINS` env var, blocked in production |
| Input validation | Joi schemas on all POST/PUT endpoints |
| Error sanitization | Winston logger strips passwords from log output |
| Auth middleware | Every route except register/login requires valid JWT |
| Ownership check | All instance queries filter by `owner: req.user._id` |
| `.env` | Excluded from git via `.gitignore` |
| `.ssh/` | Excluded from git via `.gitignore` |

## Data Models

### User
```
{
  email:        String (unique, lowercase, trimmed)
  password:     String (bcrypt-hashed, min 6)
  name:         String (trimmed)
  role:         'user' | 'admin' (default: 'user')
  timestamps:   createdAt, updatedAt
}
```

### Instance
```
{
  owner:        ObjectId (ref: User)
  type:         'lxc' | 'qemu'
  vmid:         Number
  node:         String
  name:         String
  status:       'running' | 'stopped' | 'paused' | 'unknown' | 'creating'
  cpus:         Number
  memory:       Number (MB)
  disk:         Number (GB)
  os:           String
  ip:           String
  password:     String
  timestamps:   createdAt, updatedAt
}
```
Unique index: `{ owner: 1, vmid: 1 }`.

### IpAllocation
```
{
  ip:           String (unique)
  instance:     ObjectId (ref: Instance, nullable)
  owner:        ObjectId (ref: User, nullable)
  timestamps:   createdAt, updatedAt
}
```

## Error Handling

- **Global error middleware** `errorHandler.js` — catches all unhandled errors, returns `{ error }` with appropriate status code
- **Winston logging** — errors logged with timestamp, stack trace, and sanitized request body
- **Frontend Error Boundary** — catches React component crashes with reload button
- **Axios interceptor** — 401 responses trigger automatic redirect to `/login`
- **Console WebSocket close codes** — 4004 (not running), 4005 (session failed)

## Directory Structure

```
cloud/
├── Dockerfile               # Multi-stage (backend + frontend build + nginx)
├── docker-compose.yml       # MongoDB + backend + frontend
├── backend/
│   ├── server.js            # Entry point (CORS, rate limit, routes, WS)
│   ├── console.js           # WebSocket SSH console proxy
│   ├── monitor.js           # WebSocket live metrics push
│   ├── config/db.js         # Mongoose connection (pool config)
│   ├── middleware/
│   │   ├── auth.js          # JWT auth + adminOnly
│   │   └── errorHandler.js  # Global error handler + logger
│   ├── models/              # User, Instance, IpAllocation
│   ├── routes/              # auth, profile, instances, templates
│   ├── services/            # proxmox, ipam, sshkeys
│   ├── utils/               # logger.js (Winston), validate.js (Joi)
│   └── tests/               # Jest + Supertest
├── frontend/
│   └── src/
│       ├── App.js           # Router + sidebar layout
│       ├── components/      # 12 React components
│       ├── context/         # AuthContext
│       └── api/             # Axios instance
├── docs/                    # All documentation
├── .gitignore
├── start.sh
└── README.md
```

## Future Considerations

- **Admin panel** — User management, resource quotas, usage analytics
- **VM support** — Re-enable QEMU/KVM VM creation (currently LXC-only)
- **Prometheus metrics** — Export instance metrics for monitoring
- **Backup automation** — Scheduled snapshots to remote storage
- **Network management** — VLAN assignment, firewall rules, floating IPs
- **SSO integration** — OAuth2 / LDAP authentication
- **CI/CD pipeline** — GitHub Actions with linting, testing, and security scanning
