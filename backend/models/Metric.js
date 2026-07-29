const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  instance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instance',
    required: true,
  },
  cpu: { type: Number, default: 0 },
  memory_used: { type: Number, default: 0 },
  memory_total: { type: Number, default: 0 },
  swap_used: { type: Number, default: 0 },
  swap_total: { type: Number, default: 0 },
  disk_used: { type: Number, default: 0 },
  disk_total: { type: Number, default: 0 },
  uptime: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

metricSchema.index({ instance: 1, timestamp: -1 });

const Metric = mongoose.model('Metric', metricSchema);

async function saveMetrics(instanceId, data) {
  const mem = data.memory || {};
  const swap = data.swap || {};
  const disk = data.disk || {};
  try {
    await Metric.create({
      instance: instanceId,
      cpu: data.cpu || 0,
      memory_used: mem.used || 0,
      memory_total: mem.total || 0,
      swap_used: swap.used || 0,
      swap_total: swap.total || 0,
      disk_used: disk.used || 0,
      disk_total: disk.total || 0,
      uptime: data.uptime || 0,
      timestamp: new Date(),
    });
  } catch (_) {}
}

async function getMetrics(instanceId, rangeMs) {
  const since = new Date(Date.now() - rangeMs);
  return await Metric.find({ instance: instanceId, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .lean();
}

module.exports = { Metric, saveMetrics, getMetrics };
