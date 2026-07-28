const fetch = require('node-fetch');
const { URL } = require('url');

let ticket = null;
let csrfToken = null;

const baseUrl = () => {
  const host = process.env.PROXMOX_HOST;
  const port = process.env.PROXMOX_PORT || '8006';
  return `https://${host}:${port}/api2/json`;
};

const rejectUnauthorized = process.env.PROXMOX_SSL_VERIFY === 'true';
const agent = new (require('https').Agent)({
  rejectUnauthorized,
});

async function authenticate() {
  const url = `${baseUrl()}/access/ticket`;
  const body = new URLSearchParams({
    username: process.env.PROXMOX_USER,
    password: process.env.PROXMOX_PASSWORD,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    agent,
  });

  if (!res.ok) {
    throw new Error(`Proxmox auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  ticket = data.data.ticket;
  csrfToken = data.data.CSRFPreventionToken;
}

async function ensureAuth() {
  if (!ticket) await authenticate();
}

async function api(path, options = {}) {
  await ensureAuth();

  const url = `${baseUrl()}${path}`;
  const headers = {
    Cookie: `PVEAuthCookie=${ticket}`,
    ...options.headers,
  };

  if (options.method && options.method !== 'GET') {
    headers['CSRFPreventionToken'] = csrfToken;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    agent,
  });

  if (res.status === 401) {
    ticket = null;
    return await api(path, options);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Proxmox API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.data;
}

async function getNextVmid() {
  return await api('/cluster/nextid');
}

async function listInstances(node) {
  const [qemu, lxc] = await Promise.all([
    api(`/nodes/${node}/qemu`).catch(() => []),
    api(`/nodes/${node}/lxc`).catch(() => []),
  ]);

  return [
    ...qemu.map(v => ({ ...v, type: 'qemu' })),
    ...lxc.map(v => ({ ...v, type: 'lxc' })),
  ];
}

async function getInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/current`);
}

async function createQemu(node, params) {
  const body = new URLSearchParams();
  body.append('vmid', params.vmid);
  body.append('name', params.name);
  body.append('cores', params.cores || 1);
  body.append('memory', params.memory || 1024);
  body.append('sockets', params.sockets || 1);
  body.append('ostype', params.ostype || 'l26');
  body.append('storage', params.storage || 'local-lvm');
  if (params.disk) {
    body.append('virtio0', `${params.disk},storage=${params.storage || 'local-lvm'}`);
  }
  if (params.bridge) {
    body.append('net0', `model=${params.net || 'e1000'},bridge=${params.bridge}`);
  } else if (params.net) {
    body.append('net0', `model=${params.net},bridge=vmbr0`);
  }
  if (params.ide2) {
    body.append('ide2', params.ide2);
  }
  if (params.cdrom) {
    body.append('cdrom', params.cdrom);
  }
  if (params.ciuser) body.append('ciuser', params.ciuser);
  if (params.sshkeys) body.append('sshkeys', params.sshkeys);
  if (params.ipconfig) body.append('ipconfig', params.ipconfig);

  return await api(`/nodes/${node}/qemu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function createLxc(node, params) {
  const body = new URLSearchParams();
  body.append('vmid', params.vmid);
  body.append('hostname', params.name);
  body.append('ostemplate', params.ostemplate);
  body.append('cores', params.cores || 1);
  body.append('memory', params.memory || 1024);
  body.append('storage', params.storage || 'local-lvm');
  body.append('password', params.password || 'changeme');
  if (params.disk) {
    body.append('rootfs', `${params.disk}G,storage=${params.storage || 'local-lvm'}`);
  }
  if (params.ip && params.gateway) {
    body.append('net0', `name=eth0,bridge=${params.bridge || 'vmbr0'},ip=${params.ip}/${params.prefix || 24},gw=${params.gateway}`);
    if (params.nameserver) body.append('nameserver', params.nameserver);
  } else if (params.bridge) {
    body.append('net0', `name=eth0,bridge=${params.bridge},ip=dhcp`);
  } else if (params.net) {
    body.append('net0', `name=eth0,bridge=vmbr0,ip=dhcp`);
  }

  return await api(`/nodes/${node}/lxc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function deleteInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}`, { method: 'DELETE' });
}

async function startInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/start`, { method: 'POST' });
}

async function stopInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/stop`, { method: 'POST' });
}

async function rebootInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/reboot`, { method: 'POST' });
}

async function suspendInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/suspend`, { method: 'POST' });
}

async function resumeInstance(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/status/resume`, { method: 'POST' });
}

async function createSnapshot(node, type, vmid, snapname, description) {
  const params = { snapname };
  if (description) params.description = description;
  return await api(`/nodes/${node}/${type}/${vmid}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
}

async function listSnapshots(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/snapshot`);
}

async function deleteSnapshot(node, type, vmid, snapname) {
  return await api(`/nodes/${node}/${type}/${vmid}/snapshot/${snapname}`, {
    method: 'DELETE',
  });
}

async function rollbackSnapshot(node, type, vmid, snapname) {
  return await api(`/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/rollback`, {
    method: 'POST',
  });
}

async function getInstanceConfig(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/config`);
}

async function getNodeStatus(node) {
  return await api(`/nodes/${node}/status`);
}

async function getClusterResources() {
  return await api('/cluster/resources');
}

async function listTemplates(node, storage) {
  const content = await api(`/nodes/${node}/storage/${storage}/content`);
  return content.filter((item) => item.content === 'vztmpl' || item.volid?.includes('vztmpl'));
}

async function getInterfaces(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/interfaces`);
}

async function updateLxc(node, vmid, params) {
  const body = new URLSearchParams();
  if (params.cores != null) body.append('cores', params.cores);
  if (params.memory != null) body.append('memory', params.memory);
  if (params.hostname) body.append('hostname', params.hostname);
  if (params.nameserver) body.append('nameserver', params.nameserver);
  if (params.searchdomain) body.append('searchdomain', params.searchdomain);
  return await api(`/nodes/${node}/lxc/${vmid}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function resizeLxcDisk(node, vmid, diskG) {
  const body = new URLSearchParams();
  body.append('disk', 'rootfs');
  body.append('size', `${diskG}G`);
  return await api(`/nodes/${node}/lxc/${vmid}/resize`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function termProxy(node, type, vmid) {
  return await api(`/nodes/${node}/${type}/${vmid}/termproxy`, {
    method: 'POST',
  });
}

module.exports = {
  authenticate,
  get ticket() { return ticket; },
  getNextVmid,
  listInstances,
  getInstance,
  createQemu,
  createLxc,
  deleteInstance,
  startInstance,
  stopInstance,
  rebootInstance,
  suspendInstance,
  resumeInstance,
  createSnapshot,
  listSnapshots,
  deleteSnapshot,
  rollbackSnapshot,
  getInstanceConfig,
  updateLxc,
  resizeLxcDisk,
  getNodeStatus,
  getClusterResources,
  listTemplates,
  getInterfaces,
  termProxy,
};
