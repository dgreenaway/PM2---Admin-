const { execFile } = require('child_process');
const config = require('../config/config');

const SAFE_NAME_RE = /^[a-zA-Z0-9_\-.]+$/;

function sanitizeName(name) {
  if (typeof name !== 'string') throw new Error('Invalid process name type');
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new Error('Invalid process name length');
  if (!SAFE_NAME_RE.test(trimmed)) throw new Error('Process name contains invalid characters');
  return trimmed;
}

function runPM2(args, timeout = 10000) {
  return new Promise((resolve, reject) => {
    execFile(
      config.pm2Bin,
      args,
      { timeout, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr?.trim() || err.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

async function getProcesses() {
  try {
    const stdout = await runPM2(['jlist']);
    const raw = JSON.parse(stdout);
    return {
      available: true,
      processes: raw.map((p) => ({
        id: p.pm_id,
        name: p.name,
        status: p.pm2_env?.status || 'unknown',
        cpu: p.monit?.cpu ?? 0,
        memory: p.monit?.memory ?? 0,
        uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
        restarts: p.pm2_env?.restart_time ?? 0,
        pid: p.pid || null,
        mode: p.pm2_env?.exec_mode || 'fork',
        instances: p.pm2_env?.instances || 1,
        script: p.pm2_env?.pm_exec_path || '',
      })),
    };
  } catch (err) {
    if (err.code === 'ENOENT' || err.message.includes('not found')) {
      return { available: false, processes: [], error: 'PM2 is not installed' };
    }
    return { available: false, processes: [], error: err.message };
  }
}

async function restartProcess(name) {
  await runPM2(['restart', sanitizeName(name)]);
}

async function stopProcess(name) {
  await runPM2(['stop', sanitizeName(name)]);
}

async function reloadProcess(name) {
  await runPM2(['reload', sanitizeName(name)]);
}

async function restartAll() {
  await runPM2(['restart', 'all']);
}

module.exports = { getProcesses, restartProcess, stopProcess, reloadProcess, restartAll };
