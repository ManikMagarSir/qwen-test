# Development Guide

---

## Project Structure

```
cloud/
├── backend/                    # Express API server
│   ├── server.js               # Entry point — mounts routes, starts console WS
│   ├── console.js              # WebSocket SSH proxy for container terminal
│   ├── config/
│   │   └── db.js               # Mongoose connection
│   ├── middleware/
│   │   └── auth.js             # JWT auth + adminOnly guards
│   ├── models/
│   │   ├── User.js             # User schema (email, password, name, role)
│   │   ├── Instance.js         # Instance schema (owner, type, vmid, resources, status)
│   │   └── IpAllocation.js     # IP pool schema (ip, instance, owner)
│   ├── routes/
│   │   ├── auth.js             # Register, login, me
│   │   ├── instances.js        # CRUD, power actions, snapshots
│   │   └── templates.js        # List OS templates from Proxmox
│   └── services/
│       ├── proxmox.js          # Proxmox VE API wrapper
│       ├── ipam.js             # Static IP allocation/release
│       └── sshkeys.js          # RSA keypair generation
│
├── frontend/                   # React SPA
│   ├── public/
│   │   └── index.html          # HTML shell with Google Fonts
│   └── src/
│       ├── index.js            # React entry point
│       ├── App.js              # Router + route definitions
│       ├── styles.css          # CSS variables, animations, resets
│       ├── api/
│       │   └── axios.js        # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.js  # Auth state (login, logout, register)
│       └── components/
│           ├── Navbar.js        # Top navigation bar
│           ├── Login.js         # Login page
│           ├── Register.js      # Register page
│           ├── Dashboard.js     # Instance list grid
│           ├── CreateInstance.js# Container creation form
│           ├── InstanceCard.js  # Single instance card with controls
│           └── TerminalConsole.js # xterm.js terminal overlay
│
├── docs/                       # Documentation
│   ├── architecture.md
│   ├── api.md
│   ├── setup.md
│   ├── development.md
│   └── deployment.md
│
├── .ssh/                       # SSH keys (auto-generated)
│   ├── cloud
│   └── cloud.pub
│
├── start.sh                    # One-command launcher
└── .gitignore
```

---

## Coding Conventions

### JavaScript

- **ES6+** — Use `const`/`let` (no `var`), arrow functions, template literals, destructuring
- **Async** — Use `async/await` for all asynchronous operations; avoid raw promises/callbacks
- **Naming** — `camelCase` for variables/functions, `PascalCase` for components/models, `UPPER_SNAKE` for constants
- **Error handling** — All route handlers wrapped in try/catch; errors propagate to Express error middleware

### Backend

- Routes defined in `routes/` — thin controllers that parse input, call services, return JSON
- Business logic in `services/` — Proxmox API calls, IP allocation, SSH key management
- Models in `models/` — Mongoose schemas with validation, hooks, and methods
- Services are stateless (except `proxmox.js` which caches auth tickets)

### Frontend

- Components in `components/` — functional components with hooks
- State management via `AuthContext.js` — React Context for auth state
- API calls via `api/axios.js` — Axios instance with interceptor for JWT
- Styling via inline `style` objects + global CSS variables from `styles.css`
- Icons from `lucide-react` — import by name, no icon font files

### CSS

- Design tokens as CSS custom properties in `:root` (`styles.css`)
- No CSS-in-JS library — inline styles for component-specific rules
- Global resets and animations in `styles.css`
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

The server restarts automatically when you change any `.js` file.

### 3. Start frontend dev server

```bash
cd frontend
npm start
```

The `package.json` `proxy` field forwards `/api/*` requests to the backend at `localhost:5000`.

### 4. Add a new feature

Typical flow:

1. Define/modify a Mongoose model in `backend/models/`
2. Add business logic in `backend/services/`
3. Add routes in `backend/routes/`
4. Mount the router in `backend/server.js`
5. Add/update frontend component in `frontend/src/components/`
6. Add route in `frontend/src/App.js`

---

## Testing

### Manual testing

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000/api/<endpoint>`

Use `curl` for quick backend tests:

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
```

### Automated testing (future)

The project does not currently have automated tests. When adding them:

- Backend: Use Jest + Supertest for route tests, mock Proxmox API calls
- Frontend: Use React Testing Library for component tests

---

## Proxmox API Development

The `proxmox.js` service is the most complex piece. Key details for contributors:

### Auth

```javascript
async authenticate() {
  const res = await api('/access/ticket', {
    method: 'POST',
    body: { username: PROXMOX_USER, password: PROXMOX_PASSWORD },
  });
  ticket_ = { cookie: res.data.ticket, csrf: res.data.CSRFPreventionToken };
}
```

The ticket is cached. If any API call returns 401, `ensureAuth()` clears the cached ticket and re-authenticates.

### API helper

```javascript
async api(path, options = {}) {
  await ensureAuth();
  const headers = { Cookie: `PVEAuthCookie=${ticket_.cookie}` };
  if (options.body && !options.method?.startsWith?.('GET')) {
    headers['CSRFPreventionToken'] = ticket_.csrf;
  }
  // ...
}
```

### Container creation flow

1. `getNextVmid()` — fetch next available VMID from cluster
2. `createLxc(node, params)` — POST to Proxmox API
3. Poll status until container appears
4. Record in MongoDB with IP allocation

---

## IPAM Internals

The IP pool is a MongoDB collection of 253 documents (`.2` through `.254`, excluding `.1` and `.255`).

### Seeding (`initPool()`)

```javascript
async function initPool() {
  // 1. Deduplicate: if an IP is allocated to multiple instances, free the extras
  const duplicates = await IpAllocation.aggregate([
    { $match: { instance: { $ne: null } } },
    { $group: { _id: '$ip', count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  // Release duplicates...

  // 2. Seed missing IPs
  const existing = await IpAllocation.find().select('ip');
  const existingSet = new Set(existing.map(d => d.ip));
  for (let i = START; i <= END; i++) {
    if (RESERVED.includes(i)) continue;
    const ip = `${SUBNET}.${i}`;
    if (!existingSet.has(ip)) {
      await IpAllocation.create({ ip });
    }
  }
}
```

### Allocation (`allocateIP()`)

```javascript
// Atomically claims the first free IP
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

---

## Adding a New Feature: End-to-End Checklist

- [ ] Model defined/updated in `backend/models/`
- [ ] Service functions in `backend/services/`
- [ ] Routes in `backend/routes/` with auth middleware
- [ ] Router mounted in `backend/server.js`
- [ ] Frontend component in `frontend/src/components/`
- [ ] Route in `frontend/src/App.js`
- [ ] API integration in frontend component (useEffect + axios)
- [ ] Error states handled (loading, empty, error)
- [ ] Build passes: `npm run build` (frontend)
- [ ] Manual test end-to-end
