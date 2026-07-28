process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.PROXMOX_HOST = '127.0.0.1';
process.env.PROXMOX_PORT = '8006';
process.env.PROXMOX_USER = 'root@pam';
process.env.PROXMOX_PASSWORD = 'test';
process.env.PROXMOX_NODE = 'pve';

process.env.JWT_SECRET = 'test-secret';
process.env.PROXMOX_HOST = '127.0.0.1';
process.env.PROXMOX_PORT = '8006';
process.env.PROXMOX_USER = 'root@pam';
process.env.PROXMOX_PASSWORD = 'test';
process.env.PROXMOX_NODE = 'pve';
process.env.LOG_LEVEL = 'silent';

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
