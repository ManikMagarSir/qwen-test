const IpAllocation = require('../models/IpAllocation');

const SUBNET = '192.168.55';
const GATEWAY = `${SUBNET}.1`;
const RESERVED = [1, 255];
const START = 2;
const END = 254;

function ipToString(octet) {
  return `${SUBNET}.${octet}`;
}

async function allocateIP(instanceId, userId) {
  for (let i = START; i <= END; i++) {
    if (RESERVED.includes(i)) continue;
    const ip = ipToString(i);
    try {
      const doc = await IpAllocation.findOneAndUpdate(
        { ip, instance: null },
        { $set: { instance: instanceId, owner: userId } },
        { new: true },
      );
      if (doc) {
        return { ip: doc.ip, gateway: GATEWAY };
      }
    } catch (_) {
      // race — someone else claimed it, try next
    }
  }
  throw new Error('No free IPs available in 192.168.55.0/24');
}

async function releaseIP(ip) {
  await IpAllocation.findOneAndUpdate(
    { ip },
    { $set: { instance: null, owner: null } },
  );
}

async function getIPByInstance(instanceId) {
  const alloc = await IpAllocation.findOne({ instance: instanceId });
  return alloc ? alloc.ip : null;
}

async function getFreeIPs() {
  const free = await IpAllocation.find({ instance: null, owner: null }).sort({ ip: 1 }).lean();
  return free.map((a) => a.ip);
}

async function initPool() {
  // Deduplicate — if an IP is claimed by multiple instances, release the extras
  const dups = await IpAllocation.aggregate([
    { $match: { instance: { $ne: null } } },
    { $group: { _id: '$ip', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  for (const dup of dups) {
    // Keep the first, release the rest
    const [, ...rest] = dup.ids;
    await IpAllocation.updateMany({ _id: { $in: rest } }, { $set: { instance: null, owner: null } });
    console.log(`[ipam] Deduplicated IP ${dup._id}`);
  }

  const existing = await IpAllocation.countDocuments();
  if (existing > 0) return;
  const bulk = [];
  for (let i = START; i <= END; i++) {
    if (RESERVED.includes(i)) continue;
    bulk.push({
      insertOne: {
        document: { ip: ipToString(i), instance: null, owner: null },
      },
    });
  }
  if (bulk.length > 0) {
    await IpAllocation.bulkWrite(bulk);
  }
  console.log(`IP pool initialized: ${bulk.length} IPs available (${SUBNET}.${START}-${END})`);
}

module.exports = { allocateIP, releaseIP, getIPByInstance, getFreeIPs, initPool, GATEWAY, SUBNET };
