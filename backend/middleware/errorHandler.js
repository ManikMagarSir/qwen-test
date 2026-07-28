const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  const isProduction = process.env.NODE_ENV === 'production';
  const message = (status >= 500 && isProduction)
    ? 'Internal server error'
    : err.message || 'Internal server error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
      requestId: req.id,
      stack: err.stack,
      body: sanitize(req.body),
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${err.message}`, { requestId: req.id });
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
