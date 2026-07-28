# API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `/auth/register` and `/auth/login` require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global `/api/*` | 100 requests | 15 minutes |
| Auth endpoints | 20 requests | 15 minutes |

Exceeding the limit returns `429 Too Many Requests`:
```json
{ "error": "Too many requests, please try again later" }
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
- `401` — Unauthorized (missing/invalid/expired token)
- `403` — Forbidden (admin-only)
- `404` — Not found
- `409` — Conflict (email already registered)
- `429` — Too many requests (rate limit)
- `500` — Server error
- `507` — IP allocation failed (pool exhausted)

**JWT error codes** (all 401 responses include a `code` field):
| Code | Meaning |
|------|---------|
| `TOKEN_EXPIRED` | Token has expired (frontend auto-refreshes) |
| `TOKEN_INVALID` | Token is malformed or tampered |
| `TOKEN_NOT_ACTIVE` | Token is not yet valid (`nbf` claim) |
| `TOKEN_ERROR` | Unknown authentication failure |

---

## Auth

### POST /auth/register

Create a new account. Rate-limited to 20 req/15min.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "Alice"
}
```

**Validation:**
- `email` — valid email format
- `password` — 6–128 characters
- `name` — 1–100 characters, trimmed

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
- `400` — Validation error
- `409` — Email already registered

---

### POST /auth/login

Authenticate and get a token. Rate-limited to 20 req/15min.

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

### POST /auth/refresh

Issue a new JWT token. Requires a valid (not expired) token in the `Authorization` header.

**Headers:** `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `401` — Missing, expired, or invalid token (with `code` field)

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

---

## Profile

### GET /profile

Get the authenticated user's profile.

**Response** (200):
```json
{
  "user": { "_id": "...", "email": "...", "name": "...", "role": "user" }
}
```

### PUT /profile

Update profile name or change password.

**Request** (name only):
```json
{ "name": "New Name" }
```

**Request** (password change):
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

**Response** (200):
```json
{ "user": { ... }, "message": "Profile updated" }
```

**Errors:**
- `400` — Current password required, incorrect, or new password too short

---

## Instances

All instance endpoints are scoped to the authenticated user. Users cannot see or modify each other's instances.

### GET /instances

List all instances owned by the authenticated user. Automatically syncs actual Proxmox status.

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

The `status` field reflects the actual Proxmox state, not the cached MongoDB value. Backend detects changes and updates MongoDB via `bulkWrite`.

---

### POST /instances/create

Create a new LXC container. Allocates an IP from the pool and records the instance in MongoDB.

**Request:**
```json
{
  "name": "web-server",
  "cpus": 2,
  "memory": 2048,
  "disk": 20,
  "ostemplate": "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst",
  "storage": "local-zfs",
  "bridge": "vmbr0",
  "password": "rootpass123"
}
```

| Field | Required | Default | Validation |
|-------|----------|---------|------------|
| `type` | yes | — | Must be `"lxc"` |
| `name` | yes | — | 1–64 chars, alphanumeric + `_-` |
| `cpus` | no | `1` | 1–32 |
| `memory` | no | `1024` | 128–131072 MB |
| `disk` | no | `8` | 1–1000 GB |
| `ostemplate` | yes | — | Full Proxmox template path |
| `storage` | no | `"local-lvm"` | Storage identifier |
| `bridge` | no | `"vmbr0"` | Network bridge |
| `password` | no | `"changeme"` | Root password |

**Response** (201):
```json
{
  "instance": { ... }
}
```

**Errors:**
- `400` — Validation errors
- `507` — No free IPs available

---

### GET /instances/:id

Get detailed instance info including Proxmox status and network interfaces.

**Response** (200):
```json
{
  "instance": { ... },
  "status": {
    "status": "running",
    "uptime": 3600,
    "cpu": 0.05,
    "memory": { "used": 512000000, "total": 2147483648 },
    "swap": { "used": 0, "total": 1073741824 },
    "disk": { "used": 2147483648, "total": 21474836480 }
  },
  "interfaces": [ ... ]
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
### POST /instances/:id/stop
### POST /instances/:id/reboot
### POST /instances/:id/suspend
### POST /instances/:id/resume

Power actions for the instance. Status is updated in MongoDB after the Proxmox API call succeeds.

**Response** (200):
```json
{ "message": "Instance started", "instance": { ... } }
```

---

### PUT /instances/:id/resize

Adjust CPU cores, memory, and/or disk on a running or stopped container. Changes are applied via Proxmox hot-plug.

**Request:**
```json
{
  "cpus": 4,
  "memory": 4096,
  "disk": 40
}
```

All fields are optional; at least one must be provided.

| Field | Validation |
|-------|------------|
| `cpus` | 1–32 |
| `memory` | 128–131072 MB |
| `disk` | 1–1000 GB, cannot be shrunk |

**Response** (200):
```json
{ "message": "Instance resized", "instance": { ... } }
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

### POST /instances/:id/snapshots

Create a new snapshot.

**Request:**
```json
{
  "snapname": "pre-update",
  "description": "Before nginx upgrade"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| `snapname` | yes | 1–64 chars, trimmed |
| `description` | no | Max 256 chars |

**Response** (201):
```json
{ "message": "Snapshot created" }
```

### DELETE /instances/:id/snapshots/:snapname

Delete a specific snapshot.

### POST /instances/:id/snapshots/:snapname/rollback

Rollback the instance to a specific snapshot. The instance must be stopped.

---

## Templates

### GET /templates?storage=local

List available OS templates from Proxmox storage.

**Query params:**
- `storage` (optional) — Storage ID (default: `"local"`)

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

## Health

### GET /api/health

Returns system health status including MongoDB connection and Proxmox reachability.

**Response** (200):
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2025-01-28T12:00:00.000Z",
  "mongodb": "connected",
  "proxmox": "reachable"
}
```

**Response** (503):
```json
{
  "status": "ok",
  "mongodb": "disconnected",
  "proxmox": "unreachable",
  "uptime": 12345,
  "timestamp": "..."
}
```

---

## Console (WebSocket)

### ws://localhost:5000/api/console/:id?token=<jwt>

Opens an interactive terminal session inside the container via SSH → Proxmox host → `lxc-attach`.

**Path params:**
- `id` — MongoDB `_id` of the instance

**Query params:**
- `token` — JWT authentication token

**Protocol:**

Messages are JSON with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"output"`, `"input"`, `"resize"`, `"connected"`, or `"error"` |
| `data` | string | Base64-encoded terminal data |
| `cols` | number | Terminal width in columns |
| `rows` | number | Terminal height in rows |
| `message` | string | Error description |

**Client → Server:**
```json
{ "type": "input", "data": "bHMgLWxhCg==" }
{ "type": "resize", "cols": 80, "rows": 24 }
```

**Server → Client:**
```json
{ "type": "connected" }
{ "type": "output", "data": "dG90YWwgMTI4Cg==" }
{ "type": "error", "message": "Instance is not running" }
```

**Close codes:**
- `4001` — Authentication failed
- `4002` — Instance not found
- `4003` — Not authorized
- `4004` — Instance not running
- `4005` — Console session failed

---

## Monitor (WebSocket)

### ws://localhost:5000/api/monitor/ws?token=<jwt>

Receives live instance metrics pushed every 5 seconds.

**Query params:**
- `token` — JWT authentication token

**Server → Client:**
```json
{
  "type": "update",
  "instances": [ ... ],
  "details": {
    "instance_id_1": {
      "status": "running",
      "cpu": 0.12,
      "memory": { "used": 524288000, "total": 2147483648 },
      "swap": { "used": 0, "total": 1073741824 },
      "disk": { "used": 3221225472, "total": 21474836480 },
      "uptime": 7200
    }
  }
}
```

**Error:**
```json
{ "type": "error", "message": "..." }
```

The client auto-reconnects with a 3-second delay on disconnect.

---

## Admin Endpoints

These require `role: "admin"` on the user account (`adminOnly` middleware).

### GET /instances/all

List ALL instances on the Proxmox node (no user filter).

### GET /instances/cluster

Get Proxmox cluster resource usage.

### GET /instances/node

Get Proxmox node status.
