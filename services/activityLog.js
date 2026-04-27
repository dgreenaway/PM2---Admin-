const MAX = 100;
const entries = [];

function add(user, action, target, success) {
  entries.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user || 'admin',
    action,
    target,
    success: Boolean(success),
  });
  if (entries.length > MAX) entries.pop();
}

function getEntries(limit = 50) {
  return entries.slice(0, Math.min(limit, MAX));
}

module.exports = { add, getEntries };
