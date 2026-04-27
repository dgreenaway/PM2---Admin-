const { execFile } = require('child_process');
const config = require('../config/config');

const SAFE_NAME_RE = /^[a-zA-Z0-9_\-.]+$/;

function sanitizeName(name) {
  if (typeof name !== 'string') throw new Error('Invalid process name');
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new Error('Invalid process name length');
  if (!SAFE_NAME_RE.test(trimmed)) throw new Error('Process name contains invalid characters');
  return trimmed;
}

function getProcessLogs(name, lines = 100) {
  const safe = sanitizeName(name);
  const lineCount = String(Math.min(Math.max(1, lines), 500));

  return new Promise((resolve, reject) => {
    execFile(
      config.pm2Bin,
      ['logs', safe, '--lines', lineCount, '--nostream', '--no-color'],
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && !stdout && !stderr) {
          reject(new Error('Failed to retrieve logs'));
          return;
        }
        const combined = `${stdout || ''}${stderr || ''}`;
        const result = combined
          .split('\n')
          .filter(Boolean)
          .slice(-lines);
        resolve(result);
      }
    );
  });
}

module.exports = { getProcessLogs };
