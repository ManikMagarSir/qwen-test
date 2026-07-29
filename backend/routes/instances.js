const fs = require('fs');
const path = require('path');
const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const Instance = require('../models/Instance');
const proxmox = require('../services/proxmox');
const { allocateIP, releaseIP, getIPByInstance } = require('../services/ipam');
const { validate } = require('../utils/validate');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    let instances = await Instance.find({ owner: req.user._id }).sort('-createdAt').lean();

    const results = await Promise.allSettled(
      instances.map(inst =>
        proxmox.getInstance(inst.node, inst.type, inst.vmid)
          .then(status => ({ _id: inst._id.toString(), status: status.status }))
          .catch(() => null)
      )
    );

    const bulkOps = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value && r.value.status && r.value.status !== instances[i].status) {
        bulkOps.push({
          updateOne: {
            filter: { _id: instances[i]._id },
            update: { $set: { status: r.value.status } },
          },
        });
        instances[i].status = r.value.status;
      }
    });

    if (bulkOps.length > 0) {
      await Instance.bulkWrite(bulkOps);
    }

    res.json({ instances });
  } catch (err) {
    next(err);
  }
});

router.get('/all', auth, adminOnly, async (req, res, next) => {
  try {
    const node = process.env.PROXMOX_NODE;
    const list = await proxmox.listInstances(node);
    res.json({ instances: list });
  } catch (err) {
    next(err);
  }
});

router.get('/cluster', auth, adminOnly, async (req, res, next) => {
  try {
    const resources = await proxmox.getClusterResources();
    res.json({ resources });
  } catch (err) {
    next(err);
  }
});

router.get('/node', auth, adminOnly, async (req, res, next) => {
  try {
    const node = process.env.PROXMOX_NODE;
    const status = await proxmox.getNodeStatus(node);
    res.json({ status });
  } catch (err) {
    next(err);
  }
});

router.post('/create', auth, validate('createInstance'), async (req, res, next) => {
  const mongoose = require('mongoose');
  const { type, name, cpus, memory, disk, storage, ostemplate, password, net, bridge } = req.body;

  const node = process.env.PROXMOX_NODE;
  const vmid = await proxmox.getNextVmid();

  let ipInfo = null;
  let instanceId = null;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (type === 'lxc') {
      const [tempInstance] = await Instance.create([{
        owner: req.user._id, type, vmid: Number(vmid), node, name,
        cpus, memory, disk, status: 'creating',
      }], { session });
      instanceId = tempInstance._id;

      ipInfo = await allocateIP(tempInstance._id, req.user._id);
      tempInstance.ip = ipInfo.ip;
      await tempInstance.save({ session });
    }

    await session.commitTransaction();
  } catch (ipErr) {
    await session.abortTransaction();
    session.endSession();
    return res.status(507).json({ error: 'IP allocation failed' });
  }
  session.endSession();

  const params = { vmid, name, cores: cpus, memory };

  let result;
  try {
    params.ostemplate = ostemplate;
    params.storage = storage;
    try {
      const pubKey = fs.readFileSync(path.join(__dirname, '../../.ssh/cloud.pub'), 'utf8').trim();
      params['ssh-public-keys'] = pubKey;
    } catch (_) {}
    params.password = password;
    params.bridge = bridge;
    if (ipInfo) {
      params.ip = ipInfo.ip;
      params.gateway = ipInfo.gateway;
      params.prefix = 24;
      params.nameserver = '8.8.8.8';
    }
    result = await proxmox.createLxc(node, params);
  } catch (proxErr) {
    if (ipInfo) {
      await releaseIP(ipInfo.ip).catch(() => {});
    }
    if (instanceId) {
      await Instance.deleteOne({ _id: instanceId }).catch(() => {});
    }
    logger.error(`Instance creation failed: ${proxErr.message}`);
    return res.status(500).json({ error: 'Failed to create instance' });
  }

  const instance = await Instance.findOneAndUpdate(
    { _id: instanceId },
    { $set: { status: 'stopped' } },
    { new: true },
  );

  logger.info(`Instance created: ${name} (VMID ${vmid}) by ${req.user.email}`);
  res.status(201).json({ instance, task: result });
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const status = await proxmox.getInstance(instance.node, instance.type, instance.vmid).catch(() => null);
    const interfaces = await proxmox.getInterfaces(instance.node, instance.type, instance.vmid).catch(() => []);

    res.json({ instance, status, interfaces });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.deleteInstance(instance.node, instance.type, instance.vmid);
    await releaseIP(instance.ip).catch(() => {});
    await Instance.deleteOne({ _id: instance._id });

    res.json({ message: 'Instance deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.startInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'running';
    await instance.save();

    res.json({ message: 'Instance started', instance });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/stop', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.stopInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'stopped';
    await instance.save();

    res.json({ message: 'Instance stopped', instance });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reboot', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.rebootInstance(instance.node, instance.type, instance.vmid);
    res.json({ message: 'Instance rebooting' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/suspend', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.suspendInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'paused';
    await instance.save();

    res.json({ message: 'Instance suspended', instance });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resume', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.resumeInstance(instance.node, instance.type, instance.vmid);
    instance.status = 'running';
    await instance.save();

    res.json({ message: 'Instance resumed', instance });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/snapshots', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const snapshots = await proxmox.listSnapshots(instance.node, instance.type, instance.vmid);
    res.json({ snapshots });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/snapshots', auth, validate('createSnapshot'), async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { snapname, description } = req.body;
    if (!snapname) return res.status(400).json({ error: 'snapname is required' });

    await proxmox.createSnapshot(instance.node, instance.type, instance.vmid, snapname, description);
    res.status(201).json({ message: 'Snapshot created' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/snapshots/:snapname', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.deleteSnapshot(instance.node, instance.type, instance.vmid, req.params.snapname);
    res.json({ message: 'Snapshot deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/snapshots/:snapname/rollback', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    await proxmox.rollbackSnapshot(instance.node, instance.type, instance.vmid, req.params.snapname);
    res.json({ message: 'Snapshot rolled back' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/resize', auth, validate('resizeInstance'), async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { cpus, memory, disk } = req.body;

    if (instance.status === 'running') {
      const proxmoxStatus = await proxmox.getInstance(instance.node, instance.type, instance.vmid).catch(() => null);
      if (proxmoxStatus && proxmoxStatus.status === 'running') {
        if (disk != null && disk !== instance.disk) {
          return res.status(409).json({ error: 'Cannot resize disk on a running instance. Stop the instance first or set force: true to attempt live resize (may cause data corruption).', code: 'DISK_RESIZE_RUNNING' });
        }
        return res.status(409).json({ error: 'Resource changes (CPU/RAM) may require instance restart.', code: 'INSTANCE_RUNNING' });
      }
    }

    let changed = false;

    if (cpus != null && cpus !== instance.cpus) {
      await proxmox.updateLxc(instance.node, instance.vmid, { cores: cpus });
      instance.cpus = cpus;
      changed = true;
    }

    if (memory != null && memory !== instance.memory) {
      await proxmox.updateLxc(instance.node, instance.vmid, { memory });
      instance.memory = memory;
      changed = true;
    }

    if (disk != null) {
      if (disk < instance.disk) {
        return res.status(400).json({ error: 'Disk cannot be shrunk' });
      }
      if (disk !== instance.disk) {
        await proxmox.resizeLxcDisk(instance.node, instance.vmid, disk);
        instance.disk = disk;
        changed = true;
      }
    }

    if (!changed) {
      return res.status(400).json({ error: 'No changes detected' });
    }

    await instance.save();

    logger.info(`Instance resized: ${instance.name} (VMID ${instance.vmid})`);
    res.json({ message: 'Instance resized', instance });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/interfaces', auth, async (req, res, next) => {
  try {
    const instance = await Instance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const interfaces = await proxmox.getInterfaces(instance.node, instance.type, instance.vmid);
    res.json({ interfaces });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
