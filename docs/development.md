# Development Guide

---

## Project Structure

```
cloud/
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # MongoDB + backend + frontend
├── backend/                      # Express API server
│   ├── server.js                 # Entry point — CORS, rate limit, routes, WS
│   ├── console.js                # WebSocket SSH proxy for container terminal
│   ├── monitor.js                # WebSocket live metrics push (5s interval)
│   ├── config/
│   │   └── db.js                 # Mongoose connection (pool: 10-2 connections)
│   ├── middleware/
│   │   ├── auth.js               # JWT auth + adminOnly guards
│   │   └── errorHandler.js       # Global error handler (Winston logging)
│   ├── models/
│   │   ├── User.js               # User schema (email, password, name, role)
│   │   ├── Instance.js           # Instance schema (owner, type, vmid, resources, status)
│   │   └── IpAllocation.js       # IP pool schema (ip, instance, owner)
│   ├── routes/
│   │   ├── auth.js               # Register, login, me (rate-limited, Joi-validated)
│   │   ├── profile.js            # Get/update profile (Joi-validated)
│   │   ├── instances.js          # CRUD, power actions, snapshots, resize (Joi-validated)
│   │   └── templates.js          # List OS templates from Proxmox
│   ├── services/
│   │   ├── proxmox.js            # Proxmox VE API wrapper (auth, LXC, snapshots, resize)
│   │   ├── ipam.js               # Static IP allocation/release (atomic claims)
│   │   └── sshkeys.js            # RSA keypair generation
│   ├── utils/
│   │   ├── logger.js             # Winston logger with timestamps
│   │   └── validate.js           # Joi schemas + validation middleware
│   └── tests/
│       ├── setup.js              # Test env setup
│       ├── auth.test.js          # Auth route + validation tests
│       └── errorHandler.test.js  # Error middleware tests
│
├── frontend/                     # React SPA
│   ├── public/
│   │   └── index.html            # HTML shell with Google Fonts
│   ├── nginx.conf                # Nginx config for Docker deployment
│   └── src/
│       ├── index.js              # React entry point
│       ├── App.js                # Router + sidebar layout + protected routes
│       ├── styles.css            # CSS variables, animations, resets, responsive
│       ├── api/
│       │   └── axios.js          # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.js    # Auth state (login, logout, register)
│       └── components/
│           ├── Navbar.js          # Top bar (user name + logout)
│           ├── Sidebar.js         # Collapsible nav (Dashboard, Create, Monitor, Profile)
│           ├── Login.js           # Login page with sidebar feature list
│           ├── Register.js        # Register page
│           ├── Dashboard.js       # Instance grid (auto-polls every 15s)
│           ├── CreateInstance.js  # Container creation form with validation
│           ├── InstanceCard.js    # Card with power/snapshot/resize controls
│           ├── ResizeModal.js     # Modal for CPU/memory/disk adjustment
│           ├── Monitoring.js      # Live per-container metrics via WebSocket
│           ├── Profile.js         # Account info + edit name + change password
│           ├── TerminalConsole.js # xterm.js terminal overlay via WebSocket
│           └── ErrorBoundary.js   # Catches React crashes with reload button
│
├── docs/                         # Documentation (6 files)
├── .ssh/                         # SSH keys (auto-generated, gitignored)
├── start.sh                      # One-command dev launcher
├── .gitignore
└── README.md
```

---

## Coding Conventions

### JavaScript

- **ES6+** — `const`/`let`, arrow functions, template literals, destructuring
- **Async** — `async/await` for all asynchronous operations
- **Naming** — `camelCase` for variables/functions, `PascalCase` for components/models
- **Error handling** — All route handlers use `next(err)` to forward errors to the global error handler
- **Logging** — Use the Winston `logger` module instead of `console.log`

### Backend

- Routes in `routes/` — thin controllers, parse input → call services → return JSON
- Business logic in `services/` — Proxmox API calls, IP allocation, SSH key management
- Models in `models/` — Mongoose schemas with validation, hooks, and methods
- All POST/PUT routes use Joi validation middleware from `utils/validate.js`
- The `errorHandler` middleware catches all unhandled errors

### Frontend

- Functional components with hooks
- State management via `AuthContext.js` (React Context)
- API calls via `api/axios.js` (Axios with JWT interceptor)
- Styling via inline `style` objects + global CSS variables from `styles.css`
- Icons from `lucide-react`
- Each page wrapped in `ErrorBoundary`

### CSS

- Design tokens as CSS custom properties in `:root` (`styles.css`)
- Inline styles for component-specific rules
- Responsive breakpoints via className-based media queries in `styles.css`

---

## Development Workflow

### 1. Set up development environment

```bash
cd backend
cp .env-example .env
# Edit .env with your Proxmox details
npm install
cd ../frontend
npm install
cd ..
```

### 2. Start backend with auto-reload

```bash
cd backend
npx nodemon server.js
```

The server restarts automatically when you change any `.js` file. Uses Winston for logging.

### 3. Start frontend dev server

```bash
cd frontend
npm start
```

The `package.json` `proxy` field forwards `/api/*` requests to the backend at `localhost:5000`.

### 4. Run tests

```bash
cd backend
npm test
```

The test suite uses Jest + Supertest with mocked models. 12 tests covering auth routes, validation schemas, and error handling.

### 5. Add a new feature

Typical end-to-end flow:

1. Define/modify a Mongoose model in `backend/models/`
2. Add business logic in `backend/services/`
3. Add Joi validation schema in `backend/utils/validate.js`
4. Add routes in `backend/routes/` with `validate('schema')` middleware
5. Mount the router in `backend/server.js`
6. Add/update frontend component in `frontend/src/components/`
7. Add route in `frontend/src/App.js`
8. Add tests in `backend/tests/`
9. Verify: `npm test` (backend) + `npm run build` (frontend)

---

## Testing

### Automated tests

```bash
cd backend
npm test
```

| Test file | Tests | Description |
|-----------|-------|-------------|
| `tests/auth.test.js` | 8 | Register/login validation, success, and failure cases |
| `tests/errorHandler.test.js` | 2 | 400/500 error responses, message format |

### Manual testing

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Tester"}'

# Login (save the token)
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | \
  node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

# List instances
curl http://localhost:5000/api/instances \
  -H "Authorization: Bearer $TOKEN"

# Health check
curl http://localhost:5000/api/health
```

---

## Proxmox API Development

The `proxmox.js` service is the most complex piece.

### Auth flow

```javascript
async authenticate() {
  const res = await api('/access/ticket', {
    method: 'POST',
    body: { username: PROXMOX_USER, password: PROXMOX_PASSWORD },
  });
  ticket_ = { cookie: res.data.ticket, csrf: res.data.CSRFPreventionToken };
}
```

The ticket is cached. `ensureAuth()` re-authenticates on 401 responses.

### Available service functions

| Function | Proxmox API |
|----------|-------------|
| `authenticate()` | `POST /access/ticket` |
| `getNextVmid()` | `GET /cluster/nextid` |
| `createLxc(node, params)` | `POST /nodes/{node}/lxc` |
| `updateLxc(node, vmid, params)` | `PUT /nodes/{node}/lxc/{vmid}/config` |
| `resizeLxcDisk(node, vmid, diskG)` | `PUT /nodes/{node}/lxc/{vmid}/resize` |
| `startInstance(node, type, vmid)` | `POST .../status/start` |
| `stopInstance(node, type, vmid)` | `POST .../status/stop` |
| `getInstance(node, type, vmid)` | `GET .../status/current` |
| `listSnapshots(node, type, vmid)` | `GET .../snapshot` |
| `createSnapshot(node, type, vmid, ...)` | `POST .../snapshot` |
| `termProxy(node, type, vmid)` | `POST .../termproxy` |
| `getNodeStatus(node)` | `GET /nodes/{node}/status` |
| `getClusterResources()` | `GET /cluster/resources` |
| `listTemplates(node, storage)` | `GET /nodes/{node}/storage/{storage}/content` |

### Container resize flow

1. Frontend sends `PUT /api/instances/:id/resize` with `{ cpus, memory, disk }`
2. Joi validation checks ranges (`cpus: 1–32`, `memory: 128–131072`, `disk: ≥ current`)
3. Running instance check — if the container is running, disk resize is rejected with `409 DISK_RESIZE_RUNNING` (stop the container first, or use `force: true` for live resize at your own risk)
4. `proxmox.updateLxc()` calls `PUT /nodes/{node}/lxc/{vmid}/config` for CPU/memory
5. `proxmox.resizeLxcDisk()` calls `PUT /nodes/{node}/lxc/{vmid}/resize` for disk
6. MongoDB record updated after successful API calls

---

## IPAM Internals

The IP pool is a MongoDB collection of 253 documents (`.2` through `.254`, excluding `.1` and `.255`).

### Seeding (`initPool()`)

1. **Deduplication** — aggregate finds IPs with multiple claims, keeps the first, frees the rest
2. **Seed missing** — checks which IPs are not in the collection and inserts them

### Allocation (`allocateIP()`)

```javascript
for (let i = START; i <= END; i++) {
  if (RESERVED.includes(i)) continue;
  const ip = `${SUBNET}.${i}`;
  const doc = await IpAllocation.findOneAndUpdate(
    { ip, instance: null },
    { $set: { instance: instanceId, owner: userId } },
    { new: true },
  );
  if (doc) return { ip: doc.ip, gateway: GATEWAY };
}
throw new Error('No free IPs');
```

The `findOneAndUpdate` with the filter `{ ip, instance: null }` ensures atomic claims — no two containers can get the same IP even under concurrent requests. If a duplicate claim attempt occurs (MongoDB write conflict caught by try/catch), the loop advances to the next IP.

---

## WebSocket Architecture

### Console WebSocket (`/api/console/:id`)

1. Client connects with `?token=<jwt>`
2. Backend verifies JWT + instance ownership
3. SSH connection to Proxmox host
4. `lxc-attach -n {vmid}` enters the container
5. Bidirectional base64 streaming
6. Frontend auto-reconnects on drop (up to 5 attempts, 3s interval)

### Monitor WebSocket (`/api/monitor/ws`)

1. Client connects with `?token=<jwt>`
2. Backend verifies JWT and loads user's instances
3. Every 5 seconds:
   - Fetches all instances from MongoDB
   - Calls `proxmox.getInstance()` for running instances (Promise.allSettled)
   - Sends `{ type: 'update', instances, details }`
4. Auto-reconnects on close with 3s delay

---

## Middleware Chain

For a typical protected route request:

```
Request
  → CORS (whitelist check)
  → Rate Limiter (global 100/15min)
  → Express JSON parser
  → auth (JWT verification)
  → validate (Joi schema)
  → Route handler
  → Response
  ↓ (on error)
  → errorHandler (Winston log + JSON error response)
```

---

## Adding a New Feature: End-to-End Checklist

- [ ] Model defined/updated in `backend/models/`
- [ ] Service functions in `backend/services/`
- [ ] Joi schema in `backend/utils/validate.js`
- [ ] Routes in `backend/routes/` with `validate()` middleware
- [ ] Router mounted in `backend/server.js`
- [ ] Frontend component in `frontend/src/components/`
- [ ] Route in `frontend/src/App.js`
- [ ] API integration in frontend component
- [ ] Error states handled (loading, empty, error)
- [ ] ErrorBoundary wrapping
- [ ] Tests in `backend/tests/`
- [ ] Build passes: `npm test` (backend) + `npm run build` (frontend)
- [ ] Manual test end-to-end
