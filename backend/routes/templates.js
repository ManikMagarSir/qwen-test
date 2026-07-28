const express = require('express');
const { auth } = require('../middleware/auth');
const proxmox = require('../services/proxmox');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const node = process.env.PROXMOX_NODE;
    const storage = req.query.storage || 'local';
    const templates = await proxmox.listTemplates(node, storage);
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
