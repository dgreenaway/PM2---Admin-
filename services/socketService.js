const systemService = require('./systemService');
const pm2Service = require('./pm2Service');
const config = require('../config/config');

function setupSocketIO(io, sessionMiddleware) {
  // Share express-session with Socket.IO so we can authenticate connections
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  io.use((socket, next) => {
    if (socket.request.session?.authenticated) {
      return next();
    }
    next(new Error('Unauthorized'));
  });

  io.on('connection', async (socket) => {
    // Push current state immediately on connect so the UI populates without waiting
    try {
      socket.emit('update', await gatherUpdate());
    } catch (err) {
      socket.emit('update_error', { message: 'Failed to load initial data' });
    }

    socket.on('disconnect', () => {});
  });

  // Broadcast to all authenticated clients on each tick
  setInterval(async () => {
    if (io.engine.clientsCount === 0) return;
    try {
      io.emit('update', await gatherUpdate());
    } catch {
      // Silently skip failed broadcasts
    }
  }, config.updateIntervalMs);
}

async function gatherUpdate() {
  const [system, pm2] = await Promise.all([
    systemService.getMetrics(),
    pm2Service.getProcesses(),
  ]);
  return { system, pm2, timestamp: new Date().toISOString() };
}

module.exports = { setupSocketIO };
