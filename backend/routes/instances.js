const fs = require('fs');
const path = require('path');
const express = require('express');
const { auth } = require('../middleware/auth');
const Instance = require('../models/Instance');
const proxmox = require('../services/proxmox');
const { allocateIP, releaseIP, getIPByInstance } = require('../services/ipam');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const instances = await Instance.find({ owner: req.user._id }).sort('-createdAt');
    res.json({ instances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    const node = process.env.PROXMOX_NODE;
    const list = await proxmox.listInstances(node);
    res.json({ instances: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cluster', auth, async (req, res) => {
  try {
    const resources = await proxmox.getClusterResources();
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/node', auth, async (req, res) => {
  try {
    const node = process.env.PROXMOX_NODE;
    const status = await proxmox.getNodeStatus(node);
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', auth, async (req, res) => {
  try {
    const { type, name, cpus, memory, disk, storage, ostemplate, password, net, bridge } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'type and name are required' });
    }
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'type must be qemu or lxc' });
    }

    const node = process.env.PROXMOX_NODE;
    const vmid = await proxmox.getNextVmid();

    // Allocate IP first
    let ipInfo = null;
    if (type === 'lxc') {
      try {
        const tempInstance = await Instance.create({
          owner: req.user._id, type, vmid: Number(vmid), node, name,
          cpus: cpus || 1, memory: memory || 1024, disk: disk || 8, status: 'creating',
        });
        ipInfo = await allocateIP(tempInstance._id, req.user._id);
        tempInstance.ip = ipInfo.ip;
        await tempInstance.save();
      } catch (ipErr) {
        return res.status(507).json({ error: `IP allocation failed: ${ipErr.message}` });
      }
    }

    const rootPassword = password || 'changeme';
    const params = {
      vmid,
      name,
      cores: cpus || 1,
      memory: memory || 1024,
    };

    let result;
    try {
      if (type === 'qemu') {
        params.ostype = req.body.ostype || 'l26';
        params.sockets = 1;
        params.disk = disk || 8;
        params.storage = storage || 'local-lvm';
        params.net = net || 'e1000';
        params.bridge = bridge || 'vmbr0';
        params.cdrom = req.body.cdrom || 'none';
        params.ide2 = req.body.ide2 || 'none';
        result = await proxmox.createQemu(node, params);
      } else {
        params.ostemplate = ostemplate || 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst';
        params.storage = storage || 'local-lvm';
        try {
          const pubKey = fs.readFileSync(path.join(__dirname, '../../.ssh/cloud.pub'), 'utf8').trim();
          params['ssh-public-keys'] = pubKey;
        } catch (_) {}
        params.password = rootPassword;
        params.bridge = bridge || 'vmbr0';
        if (ipInfo) {
          params.ip = ipInfo.ip;
          params.gateway = ipInfo.gateway;
          params.prefix = 24;
          params.nameserver = '8.8.8.8';
        }
        result = await proxmox.createLxc(node, params);
      }
    } catch (proxErr) {
      // Proxmox failed — clean up IP and temp instance
      if (ipInfo) {
        await releaseIP(ipInfo.ip).catch(() => {});
        await Instance.deleteOne({ vmid: Number(vmid) }).catch(() => {});
      }
      return res.status(500).json({ error: proxErr.message });
    }

    const instance = await Instance.findOneAndUpdate(
      { vmid: Number(vmid) },
      { $set: { status: 'stopped', name, password: rootPassword || '' } },
      { new: true },
    );

    res.status(201).json({ instance, task: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const status = await proxmox.getInstance(instance.node, instance.type, instance.vmid).catch(() => null);
    const interfaces = await proxmox.getInterfaces(instance.node, instance.type, instance.vmid).catch(() => []);

    res.json({ instance, status, interfaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.deleteInstance(instance.node, instance.type, instance.vmid);
    await releaseIP(instance.ip).catch(() => {});
    await Instance.deleteOne({ _id: instance._id });

    res.json({ message: 'Instance deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/start', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.startInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'running';
    await instance.save();

    res.json({ message: 'Instance started', instance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.stopInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'stopped';
    await instance.save();

    res.json({ message: 'Instance stopped', instance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reboot', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.rebootInstance(instance.node, instance.type, instance.vmid);
    res.json({ message: 'Instance rebooting' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/suspend', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.suspendInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'paused';
    await instance.save();

    res.json({ message: 'Instance suspended', instance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.resumeInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'running';
    await instance.save();

    res.json({ message: 'Instance resumed', instance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/snapshots', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const snapshots = await proxmox.listSnapshots(instance.node, instance.type, instance.vmid);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/snapshots', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { snapname, description } = req.body;
    if (!snapname) return res.status(400).json({ error: 'snapname is required' });

    await proxmox.createSnapshot(instance.node, instance.type, instance.vmid, snapname, description);
    res.status(201).json({ message: 'Snapshot created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/snapshots/:snapname', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.deleteSnapshot(instance.node, instance.type, instance.vmid, req.params.snapname);
    res.json({ message: 'Snapshot deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/snapshots/:snapname/rollback', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.rollbackSnapshot(instance.node, instance.type, instance.vmid, req.params.snapname);
    res.json({ message: 'Snapshot rolled back' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/interfaces', auth, async (req, res) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const interfaces = await proxmox.getInterfaces(instance.node, instance.type, instance.vmid);
    res.json({ interfaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
