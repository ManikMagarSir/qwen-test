# Architecture Documentation

## System Overview

Cloud Manager is a multi-tenant orchestration layer that abstracts a single Proxmox VE cluster into an isolated per-user cloud platform. Users interact with a web UI to provision and manage LXC containers without ever touching the Proxmox interface directly.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│  React SPA (port 3000)                                         │
│  ├── Login / Register                                          │
│  ├── Dashboard (instance list)                                  │
│  ├── Create Instance (template picker + resource config)        │
│  ├── InstanceCard (power controls, snapshots, console)          │
│  └── TerminalConsole (xterm.js via WebSocket)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express Backend (port 5000)                  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Auth Routes │  │ Instance     │  │ Console WebSocket       │ │
│  │ /api/auth   │  │ Routes       │  │ /api/console/:id        │ │
│  │ JWT签发     │  │ /api/instances│  │ ws ↔ backend ↔ proxmox │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │               │                       │              │
│         ▼               ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Services                                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ││
│  │  │ proxmox │  │  ipam    │  │ sshkeys  │  │ console.js │  ││
│  │  │ .js     │  │  .js     │  │  .js     │  │ (ws proxy) │  ││
│  │  └────┬─────┘  └────┬─────┘  └──────────┘  └────────────┘  ││
│  └───────┼──────────────┼─────────────────────────────────────┘│
│          │              │                                       │
└──────────┼──────────────┼───────────────────────────────────────┘
           │              │
           ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Stores                                   │
│                                                                  │
│  MongoDB                        Proxmox VE                      │
│  ├── users                     ├── API (port 8006)              │
│  ├── instances                 │   └── LXC containers           │
│  └── ipallocations             ├── SSH (port 22)                │
│                                │   └── lxc-attach (console)     │
│                                └── Storage (templates, disks)   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Multi-Tenant Isolation

Each MongoDB `Instance` document stores an `owner` field (ObjectId ref to `User`). Every API endpoint filters by `owner: req.user._id`:

```javascript
// routes/instances.js
router.get('/', auth, async (req, res) => {
  const instances = await Instance.find({ owner: req.user._id });
  res.json({ instances });
});
```

Authentication uses JWT (7-day expiry). The `auth` middleware decodes the token, loads the user, and attaches it to `req.user`. All subsequent queries are scoped.

### 2. Static IP Allocation

Instead of DHCP, containers receive statically assigned IPs from `192.168.55.0/24`. The IP Address Management (IPAM) service handles allocation:

- **Pre-seeded pool** — On first startup, all 253 usable IPs are inserted into the `ipallocations` collection with `instance: null`
- **Atomic claim** — `findOneAndUpdate` with `{ ip, instance: null }` ensures no two containers get the same IP, even under concurrent requests
- **Release on delete** — When a container is deleted, its IP is freed back to the pool
- **Gateway** — `192.168.55.1` is reserved; containers use static routes `/24`

```javascript
// services/ipam.js
async function allocateIP(instanceId, userId) {
  for (let i = START; i <= END; i++) {
    if (RESERVED.includes(i)) continue;
    const ip = ipToString(i);
    const doc = await IpAllocation.findOneAndUpdate(
      { ip, instance: null },
      { $set: { instance: instanceId, owner: userId } },
      { new: true },
    );
    if (doc) return { ip: doc.ip, gateway: GATEWAY };
  }
  throw new Error('No free IPs');
}
```

### 3. Web Console

The browser-based terminal uses a three-hop path:

```
Browser WebSocket ──> Backend SSH ──> Proxmox Host ──lxc-attach──> Container Shell
```

1. Frontend opens a WebSocket to `ws://backend:5000/api/console/:id?token=`
2. Backend verifies JWT and instance ownership
3. Backend SSHes into the Proxmox host (using credentials from `.env`)
4. Runs `lxc-attach -n {vmid}` which enters the container's root shell
5. Bidirectional streaming: WebSocket ↔ SSH ↔ container

This approach was chosen over alternatives:

| Approach | Why rejected |
|----------|--------------|
| SSH directly to container | Container may not have SSH installed or configured |
| Proxmox termproxy WebSocket | Port is bound to localhost only on Proxmox host |
| Proxmox VNC/SPICE | Not available for LXC containers |

### 4. Proxmox API Integration

The `proxmox.js` service wraps the Proxmox VE API:

- **Authentication** — POST to `/access/ticket` with username/password; stores `PVEAuthCookie` and `CSRFPreventionToken`
- **Automatic re-auth** — If a 401 response is received, the token is cleared and re-authenticated
- **Self-signed certs** — All HTTPS requests use `rejectUnauthorized: false`
- **Key endpoints used:**
  - `/cluster/nextid` — Get the next available VMID
  - `/nodes/{node}/lxc` — LXC container CRUD
  - `/nodes/{node}/storage/{storage}/content` — List OS templates
  - `/nodes/{node}/lxc/{vmid}/snapshot` — Snapshot management
  - `/nodes/{node}/lxc/{vmid}/status/current` — Container status

### 5. OS Template Browser

Templates are fetched from Proxmox storage via `GET /nodes/{node}/storage/{storage}/content` and filtered to `vztmpl` type. Users select from available templates — they cannot upload new ones.

## Data Models

### User
```
{
  email:        String (unique, lowercase)
  password:     String (bcrypt-hashed)
  name:         String
  role:         'user' | 'admin'
  timestamps:   createdAt, updatedAt
}
```

### Instance
```
{
  owner:        ObjectId (ref: User)
  type:         'lxc' | 'qemu'
  vmid:         Number (Proxmox VMID)
  node:         String
  name:         String
  status:       'running' | 'stopped' | 'paused' | 'unknown' | 'creating'
  cpus:         Number
  memory:       Number (MB)
  disk:         Number (GB)
  ip:           String
  password:     String (root password, stored for reference)
  timestamps:   createdAt, updatedAt
}
```

Unique index on `{ owner, vmid }`.

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

- **Backend** — All route handlers are wrapped in try/catch; errors return `{ error: message }` with appropriate HTTP status codes
- **Frontend** — Axios interceptor handles 401 (redirect to login); per-component error state displays inline error messages
- **Console** — WebSocket close codes (4004, 4005) distinguish "instance not ready" from "session failed"

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- API routes require authentication (except `/auth/login`, `/auth/register`)
- Instance ownership verified on every operation
- `.env` files excluded from version control (`.gitignore`)
- SSH to Proxmox host uses root credentials (from `.env`)
- Containers are entered via `lxc-attach` — no SSH daemon needed inside containers

## Future Considerations

- **Admin panel** — User management, resource quotas, usage analytics
- **VM support** — Re-enable QEMU/KVM VM creation (currently LXC-only)
- **Prometheus metrics** — Export instance metrics for monitoring
- **Backup automation** — Scheduled snapshots to remote storage
- **Network management** — VLAN assignment, firewall rules, floating IPs
- **SSO integration** — OAuth2 / LDAP authentication
