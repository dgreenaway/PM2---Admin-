require('dotenv').config();
const bcrypt = require('bcryptjs');

let passwordHash = process.env.ADMIN_PASSWORD_HASH || null;

if (!passwordHash && process.env.ADMIN_PASSWORD) {
  passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
}

if (!passwordHash) {
  console.error('ERROR: Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH in .env');
  process.exit(1);
}

const sessionSecret = process.env.SESSION_SECRET || '';
if (!sessionSecret || sessionSecret.length < 32) {
  console.warn('WARNING: SESSION_SECRET is missing or too short. Set a strong secret in .env');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: sessionSecret || 'dev-fallback-secret-do-not-use-in-production',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash,
  },
  pm2Bin: process.env.PM2_BIN || (process.platform === 'win32' ? 'pm2.cmd' : 'pm2'),
  updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS, 10) || 5000,
};
