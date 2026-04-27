const express = require('express');
const systemService = require('../services/systemService');
const pm2Service = require('../services/pm2Service');
const dockerService = require('../services/dockerService');
const logService = require('../services/logService');
const activityLog = require('../services/activityLog');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(apiLimiter);

router.get('/system', async (req, res) => {
  try {
    res.json(await systemService.getMetrics());
  } catch {
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

router.get('/pm2', async (req, res) => {
  try {
    res.json(await pm2Service.getProcesses());
  } catch {
    res.status(500).json({ available: false, processes: [], error: 'Internal error' });
  }
});

router.post('/pm2/all/restart', async (req, res) => {
  try {
    await pm2Service.restartAll();
    activityLog.add(req.session.username, 'restart-all', '*', true);
    res.json({ success: true, message: 'All processes restarted' });
  } catch (err) {
    activityLog.add(req.session.username, 'restart-all', '*', false);
    res.status(400).json({ error: err.message });
  }
});

router.post('/pm2/:name/restart', async (req, res) => {
  try {
    await pm2Service.restartProcess(req.params.name);
    activityLog.add(req.session.username, 'restart', req.params.name, true);
    res.json({ success: true, message: `Restarted ${req.params.name}` });
  } catch (err) {
    activityLog.add(req.session.username, 'restart', req.params.name, false);
    res.status(400).json({ error: err.message });
  }
});

router.post('/pm2/:name/stop', async (req, res) => {
  try {
    await pm2Service.stopProcess(req.params.name);
    activityLog.add(req.session.username, 'stop', req.params.name, true);
    res.json({ success: true, message: `Stopped ${req.params.name}` });
  } catch (err) {
    activityLog.add(req.session.username, 'stop', req.params.name, false);
    res.status(400).json({ error: err.message });
  }
});

router.post('/pm2/:name/reload', async (req, res) => {
  try {
    await pm2Service.reloadProcess(req.params.name);
    activityLog.add(req.session.username, 'reload', req.params.name, true);
    res.json({ success: true, message: `Reloaded ${req.params.name}` });
  } catch (err) {
    activityLog.add(req.session.username, 'reload', req.params.name, false);
    res.status(400).json({ error: err.message });
  }
});

router.get('/pm2/:name/logs', async (req, res) => {
  try {
    const logs = await logService.getProcessLogs(req.params.name);
    res.json({ logs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/docker', async (req, res) => {
  try {
    res.json(await dockerService.getContainers());
  } catch {
    res.json({ available: false, containers: [] });
  }
});

router.get('/activity', (req, res) => {
  res.json(activityLog.getEntries());
});

module.exports = router;
