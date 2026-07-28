const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KEY_DIR = path.join(__dirname, '../../.ssh');
const PUB_KEY_PATH = path.join(KEY_DIR, 'cloud.pub');
const PRIV_KEY_PATH = path.join(KEY_DIR, 'cloud');

function ensureKeys() {
  if (fs.existsSync(PRIV_KEY_PATH) && fs.existsSync(PUB_KEY_PATH)) {
    return {
      publicKey: fs.readFileSync(PUB_KEY_PATH, 'utf8').trim(),
      privateKey: fs.readFileSync(PRIV_KEY_PATH, 'utf8'),
    };
  }

  fs.mkdirSync(KEY_DIR, { recursive: true });
  execSync(`ssh-keygen -t rsa -b 4096 -f ${PRIV_KEY_PATH} -N "" -C "cloud@manager"`, { stdio: 'pipe' });

  const publicKey = fs.readFileSync(PUB_KEY_PATH, 'utf8').trim();
  const privateKey = fs.readFileSync(PRIV_KEY_PATH, 'utf8');

  console.log('[sshkeys] Generated new SSH keypair');
  return { publicKey, privateKey };
}

module.exports = { ensureKeys };
