require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const instanceRoutes = require('./routes/instances');
const templateRoutes = require('./routes/templates');
const { initPool } = require('./services/ipam');
const { setupConsole } = require('./console');
const { setupMonitor } = require('./monitor');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: false,
}));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/templates', templateRoutes);

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const checks = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    proxmox: null,
  };

  try {
    const proxmox = require('./services/proxmox');
    await proxmox.authenticate();
    checks.proxmox = 'reachable';
  } catch {
    checks.proxmox = 'unreachable';
  }

  const httpCode = checks.mongodb === 'connected' ? 200 : 503;
  res.status(httpCode).json(checks);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await initPool();
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on 0.0.0.0:${PORT}`);
  });
  setupConsole(server);
  setupMonitor(server);
  logger.info('Console WebSocket ready');
  logger.info('Monitor WebSocket ready');
});
