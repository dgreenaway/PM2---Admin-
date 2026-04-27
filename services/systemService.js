const si = require('systeminformation');
const os = require('os');

async function getMetrics() {
  const [load, mem, disk, osInfo, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.osInfo(),
    si.time(),
  ]);

  // Prefer root mount; fall back to first entry
  const primaryDisk = disk.find((d) => d.mount === '/') || disk[0] || {};

  return {
    cpu: {
      usage: Math.round(load.currentLoad * 10) / 10,
      cores: os.cpus().length,
      loadAvg: os.loadavg().map((v) => Math.round(v * 100) / 100),
    },
    memory: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      usagePercent: Math.round((mem.used / mem.total) * 1000) / 10,
    },
    disk: {
      total: primaryDisk.size || 0,
      used: primaryDisk.used || 0,
      free: (primaryDisk.size || 0) - (primaryDisk.used || 0),
      usagePercent: primaryDisk.use ? Math.round(primaryDisk.use * 10) / 10 : 0,
      mount: primaryDisk.mount || '/',
    },
    uptime: {
      seconds: Math.floor(time.uptime),
      formatted: formatUptime(Math.floor(time.uptime)),
    },
    system: {
      hostname: os.hostname(),
      platform: osInfo.platform,
      distro: osInfo.distro || osInfo.platform,
      release: osInfo.release || '',
      kernel: osInfo.kernel || '',
      arch: osInfo.arch || os.arch(),
      nodeVersion: process.version,
      serverTime: new Date().toISOString(),
    },
  };
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

module.exports = { getMetrics, formatUptime, formatBytes };
