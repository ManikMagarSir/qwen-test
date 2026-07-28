const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['qemu', 'lxc'],
    required: true,
  },
  vmid: {
    type: Number,
    required: true,
  },
  node: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['running', 'stopped', 'paused', 'unknown', 'creating'],
    default: 'unknown',
  },
  cpus: {
    type: Number,
    default: 1,
  },
  memory: {
    type: Number,
    default: 1024,
  },
  disk: {
    type: Number,
    default: 8,
  },
  os: {
    type: String,
    default: '',
  },
  ip: {
    type: String,
    default: '',
  },
}, { timestamps: true });

instanceSchema.index({ owner: 1, vmid: 1 }, { unique: true });

module.exports = mongoose.model('Instance', instanceSchema);
