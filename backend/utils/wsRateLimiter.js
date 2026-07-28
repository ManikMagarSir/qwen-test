class WsRateLimiter {
  constructor(windowSeconds = 60, maxConnections = 10) {
    this.windowMs = windowSeconds * 1000;
    this.maxConnections = maxConnections;
    this.clients = new Map();
  }

  isRateLimited(key) {
    const now = Date.now();
    const record = this.clients.get(key);

    if (!record) {
      this.clients.set(key, { count: 1, start: now });
      return false;
    }

    if (now - record.start > this.windowMs) {
      this.clients.set(key, { count: 1, start: now });
      return false;
    }

    record.count += 1;
    if (record.count > this.maxConnections) {
      return true;
    }

    return false;
  }

  reset(key) {
    this.clients.delete(key);
  }
}

module.exports = WsRateLimiter;
