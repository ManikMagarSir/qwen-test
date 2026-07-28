# API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `/auth/register` and `/auth/login` require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Standard Response Format

```json
// Success
{ "user": { ... }, "instances": [ ... ] }

// Error
{ "error": "Description of what went wrong" }
```

HTTP status codes:
- `200` — OK
- `201` — Created
- `400` — Bad request (validation)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (admin-only)
- `404` — Not found
- `500` — Server error

---

## Auth

### POST /auth/register

Create a new account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "Alice"
}
```

**Response** (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "679a1b2c3d4e5f6a7b8c9d0e",
    "email": "user@example.com",
    "name": "Alice",
    "role": "user"
  }
}
```

**Errors:**
- `400` — Email already registered
- `400` — Password must be at least 6 characters
- `400` — Name is required

---

### POST /auth/login

Authenticate and get a token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "679a1b2c3d4e5f6a7b8c9d0e",
    "email": "user@example.com",
    "name": "Alice",
    "role": "user"
  }
}
```

**Errors:**
- `401` — Invalid email or password

---

### GET /auth/me

Get the currently authenticated user from the token.

**Headers:** `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "user": {
    "_id": "679a1b2c3d4e5f6a7b8c9d0e",
    "email": "user@example.com",
    "name": "Alice",
    "role": "user"
  }
}
```

**Errors:**
- `401` — Token invalid or expired

---

## Instances

All instance endpoints are scoped to the authenticated user. Users cannot see or modify each other's instances.

### GET /instances

List all instances owned by the authenticated user.

**Response** (200):
```json
{
  "instances": [
    {
      "_id": "679a1b2c3d4e5f6a7b8c9d0f",
      "owner": "679a1b2c3d4e5f6a7b8c9d0e",
      "type": "lxc",
      "vmid": 101,
      "node": "pve",
      "name": "web-server",
      "status": "running",
      "cpus": 2,
      "memory": 2048,
      "disk": 20,
      "os": "ubuntu-22.04-standard",
      "ip": "192.168.55.2",
      "password": "rootpass123",
      "createdAt": "2025-01-28T12:00:00.000Z",
      "updatedAt": "2025-01-28T12:05:00.000Z"
    }
  ]
}
```

---

### POST /instances/create

Create a new LXC container. This allocates an IP from the pool, calls Proxmox to create the container, waits briefly for it to appear, and records it in MongoDB.

**Request:**
```json
{
  "name": "web-server",
  "type": "lxc",
  "cpus": 2,
  "memory": 2048,
  "disk": 20,
  "ostemplate": "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst",
  "storage": "local-zfs",
  "bridge": "vmbr0",
  "password": "rootpass123"
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | yes | — | Container hostname (alphanumeric + hyphens) |
| `type` | yes | — | Must be `"lxc"` |
| `cpus` | no | `1` | CPU cores (1–32) |
| `memory` | no | `1024` | Memory in MB (128–131072) |
| `disk` | no | `8` | Disk size in GB (1–1000) |
| `ostemplate` | yes | — | Full Proxmox template path (e.g. `local:vztmpl/ubuntu...`) |
| `storage` | no | `"local-zfs"` | Proxmox storage name |
| `bridge` | no | `"vmbr0"` | Network bridge |
| `password` | yes | — | Root password for the container |

**Response** (201):
```json
{
  "instance": {
    "_id": "679a1b2c3d4e5f6a7b8c9d0f",
    "owner": "679a1b2c3d4e5f6a7b8c9d0e",
    "type": "lxc",
    "vmid": 102,
    "node": "pve",
    "name": "web-server",
    "status": "stopped",
    "cpus": 2,
    "memory": 2048,
    "disk": 20,
    "os": "ubuntu-22.04-standard",
    "ip": "192.168.55.3",
    "password": "rootpass123",
    "createdAt": "2025-01-28T12:10:00.000Z",
    "updatedAt": "2025-01-28T12:10:00.000Z"
  }
}
```

**Errors:**
- `400` — Validation errors (missing fields, out of range)
- `400` — No free IPs available
- `500` — Proxmox creation failed

---

### GET /instances/:id

Get detailed instance info including Proxmox status and network interfaces.

**Response** (200):
```json
{
  "instance": {
    "_id": "679a1b2c3d4e5f6a7b8c9d0f",
    "type": "lxc",
    "vmid": 101,
    "node": "pve",
    "name": "web-server",
    "status": "running",
    "cpus": 2,
    "memory": 2048,
    "disk": 20,
    "ip": "192.168.55.2",
    "os": "ubuntu-22.04-standard",
    "proxmox": {
      "status": "running",
      "uptime": 3600,
      "cpu": 0.05,
      "mem": { "used": 512000000, "total": 2147483648 },
      "swap": { "used": 0, "total": 1073741824 },
      "disk": { "used": 2147483648, "total": 21474836480 }
    },
    "interfaces": [ ... ]
  }
}
```

---

### DELETE /instances/:id

Delete the instance from Proxmox, release its IP, and remove from MongoDB.

**Response** (200):
```json
{ "message": "Instance deleted" }
```

---

### POST /instances/:id/start

Start a stopped instance.

**Response** (200):
```json
{ "message": "Instance started" }
```

---

### POST /instances/:id/stop

Stop a running instance.

**Response** (200):
```json
{ "message": "Instance stopped" }
```

---

### POST /instances/:id/reboot

Reboot a running instance.

**Response** (200):
```json
{ "message": "Instance rebooting" }
```

---

### POST /instances/:id/suspend

Suspend (pause) a running instance.

**Response** (200):
```json
{ "message": "Instance suspended" }
```

---

### POST /instances/:id/resume

Resume a suspended instance.

**Response** (200):
```json
{ "message": "Instance resumed" }
```

---

## Snapshots

### GET /instances/:id/snapshots

List snapshots for an instance.

**Response** (200):
```json
{
  "snapshots": [
    {
      "name": "pre-update",
      "description": "Before nginx upgrade",
      "snaptime": 1738051200,
      "parent": "",
      "running": true
    }
  ]
}
```

`snaptime` is a Unix timestamp.

---

### POST /instances/:id/snapshots

Create a new snapshot.

**Request:**
```json
{
  "snapname": "pre-update",
  "description": "Before nginx upgrade"
}
```

**Response** (201):
```json
{ "message": "Snapshot created" }
```

---

### DELETE /instances/:id/snapshots/:snapname

Delete a specific snapshot.

**Response** (200):
```json
{ "message": "Snapshot deleted" }
```

---

### POST /instances/:id/snapshots/:snapname/rollback

Rollback the instance to a specific snapshot. The instance must be stopped.

**Response** (200):
```json
{ "message": "Rolled back to snapshot" }
```

---

## Templates

### GET /templates?storage=local

List available OS templates from Proxmox storage.

**Query params:**
- `storage` (optional) — Storage ID to list from (default: `"local"`)

**Response** (200):
```json
{
  "templates": [
    {
      "volid": "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst",
      "content": "vztmpl",
      "size": 268435456,
      "name": "ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
    }
  ]
}
```

---

## Console (WebSocket)

### ws://localhost:5000/api/console/:id?token=<jwt>

Opens an interactive terminal session inside the container.

**Path params:**
- `id` — MongoDB `_id` of the instance

**Query params:**
- `token` — JWT authentication token

**Protocol:**

Messages are JSON with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"output"`, `"input"`, `"resize"`, or `"error"` |
| `data` | string | Base64-encoded terminal data (for `output`/`input`) |
| `cols` | number | Terminal width in columns (for `resize`) |
| `rows` | number | Terminal height in rows (for `resize`) |
| `message` | string | Error description (for `error`) |

**Client → Server:**
```json
{ "type": "input", "data": "bHMgLWxhCg==" }
{ "type": "resize", "cols": 80, "rows": 24 }
```

**Server → Client:**
```json
{ "type": "output", "data": "dG90YWwgMTI4Cg==" }
{ "type": "error", "message": "Instance is not running" }
```

**Close codes:**
- `4004` — Instance is not running
- `4005` — Console session failed
- `4001` — Authentication failed
- `4002` — Instance not found
- `4003` — Not authorized

---

## Admin Endpoints

These require `role: "admin"` on the user account.

### GET /instances/all

List ALL instances on the Proxmox node (no user filter).

### GET /instances/cluster

Get Proxmox cluster resource usage.

### GET /instances/node

Get Proxmox node status.
