const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${message}`, {
      stack: err.stack,
      body: sanitize(req.body),
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(status).json({ error: message });
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  if (clone.password) clone.password = '***';
  if (clone.currentPassword) clone.currentPassword = '***';
  if (clone.newPassword) clone.newPassword = '***';
  if (clone.token) clone.token = '***';
  return clone;
}

module.exports = errorHandler;
