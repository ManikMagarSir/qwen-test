const mongoose = require('mongoose');

const ipAllocationSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
  },
  instance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instance',
    default: null,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('IpAllocation', ipAllocationSchema);
