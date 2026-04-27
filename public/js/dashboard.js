'use strict';

/* ─── Utilities ──────────────────────────────────────────────────────────── */

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(ms) {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function progressClass(pct) {
  if (pct >= 85) return 'progress-fill--danger';
  if (pct >= 65) return 'progress-fill--warning';
  return 'progress-fill--ok';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function toast(msg, type = 'info', ms = 3500) {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast--show')));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

/* ─── Modals ─────────────────────────────────────────────────────────────── */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('modal--open'); el.setAttribute('aria-hidden', 'false'); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('modal--open'); el.setAttribute('aria-hidden', 'true'); }
}

function showConfirm(title, message, onOk) {
  setText('confirm-title', title);
  setText('confirm-message', message);
  document.getElementById('confirm-ok').onclick = () => { closeModal('confirm-modal'); onOk(); };
  openModal('confirm-modal');
}

// Delegate close buttons and overlays
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-close]');
  if (target) closeModal(target.dataset.close);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal('logs-modal');
    closeModal('confirm-modal');
  }
});

/* ─── PM2 Actions ────────────────────────────────────────────────────────── */

async function pm2Action(name, action) {
  try {
    const res = await fetch(`/api/pm2/${encodeURIComponent(name)}/${action}`, { method: 'POST' });
    const data = await res.json();
    toast(res.ok ? data.message : (data.error || 'Action failed'), res.ok ? 'success' : 'error');
    if (res.ok) refreshActivity();
  } catch {
    toast('Network error', 'error');
  }
}

function confirmRestartAll() {
  showConfirm(
    'Restart All Processes',
    'Restart every PM2 process? This causes brief downtime for all running apps.',
    async () => {
      try {
        const res = await fetch('/api/pm2/all/restart', { method: 'POST' });
        const data = await res.json();
        toast(res.ok ? data.message : (data.error || 'Failed'), res.ok ? 'success' : 'error');
        if (res.ok) refreshActivity();
      } catch {
        toast('Network error', 'error');
      }
    }
  );
}

async function viewLogs(name) {
  setText('logs-modal-title', `Logs — ${name}`);
  const output = document.getElementById('logs-output');
  output.textContent = 'Loading…';
  openModal('logs-modal');

  try {
    const res = await fetch(`/api/pm2/${encodeURIComponent(name)}/logs`);
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    output.textContent = data.logs.join('\n') || '(no output)';
    output.scrollTop = output.scrollHeight;
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
}

/* ─── PM2 Table Delegation ───────────────────────────────────────────────── */

document.getElementById('pm2-container').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pm2-action]');
  if (!btn || btn.disabled) return;

  const row = btn.closest('tr');
  if (!row) return;

  const name = row.dataset.name;
  const action = btn.dataset.pm2Action;

  if (action === 'logs') {
    viewLogs(name);
    return;
  }

  if (action === 'stop') {
    showConfirm('Stop Process', `Stop "${name}"?`, () => pm2Action(name, 'stop'));
    return;
  }

  pm2Action(name, action);
});

document.getElementById('btn-restart-all').addEventListener('click', confirmRestartAll);

/* ─── Activity Log ───────────────────────────────────────────────────────── */

async function refreshActivity() {
  try {
    const res = await fetch('/api/activity');
    if (!res.ok) return;
    const entries = await res.json();
    const el = document.getElementById('activity-log');

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state">No activity yet.</div>';
      return;
    }

    el.innerHTML = entries.slice(0, 30).map((e) => `
      <div class="activity-entry${e.success ? '' : ' activity-entry--error'}">
        <span class="activity-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
        <span class="activity-action">${esc(e.action)}</span>
        <span class="activity-target">${esc(e.target)}</span>
        <span class="activity-status ${e.success ? 'activity-status--ok' : 'activity-status--err'}">${e.success ? '✓' : '✗'}</span>
      </div>
    `).join('');
  } catch {
    // fail silently
  }
}

document.getElementById('btn-toggle-log').addEventListener('click', function () {
  const log = document.getElementById('activity-log');
  const hidden = log.classList.toggle('activity-log--hidden');
  this.textContent = hidden ? 'Show' : 'Hide';
});

/* ─── Docker Polling ─────────────────────────────────────────────────────── */

async function pollDocker() {
  try {
    const res = await fetch('/api/docker');
    if (!res.ok) return;
    renderDocker(await res.json());
  } catch {
    // fail silently
  }
}

function renderDocker(data) {
  const section = document.getElementById('docker-section');
  const container = document.getElementById('docker-container');

  if (!data?.available) { section.style.display = 'none'; return; }

  section.style.display = '';
  const running = data.containers.filter((c) => c.state === 'running').length;
  setText('docker-badge', `${running}/${data.containers.length} running`);

  if (!data.containers.length) {
    container.innerHTML = '<div class="empty-state">No containers found.</div>';
    return;
  }

  const rows = data.containers.map((c) => `
    <tr>
      <td>${esc(c.name)}</td>
      <td class="td-mono">${esc((c.image || '').substring(0, 45))}</td>
      <td><span class="badge badge-${c.state === 'running' ? 'success' : 'neutral'}">${esc(c.state)}</span></td>
      <td class="td-mono">${esc((c.status || '').substring(0, 30))}</td>
      <td class="td-mono">${esc((c.ports || '—').substring(0, 35))}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Name</th><th>Image</th><th>State</th><th>Status</th><th>Ports</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ─── Metrics Update ─────────────────────────────────────────────────────── */

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  const p = Math.min(100, Math.max(0, pct || 0));
  el.style.width = `${p}%`;
  el.className = `progress-fill ${progressClass(p)}`;
}

function updateMetrics(system) {
  if (!system) return;
  const { cpu, memory, disk, uptime, system: sys } = system;

  if (cpu) {
    setText('cpu-usage', `${cpu.usage}%`);
    setText('cpu-cores', `${cpu.cores} cores`);
    setBar('cpu-bar', cpu.usage);
    setText('cpu-load', `Load: ${cpu.loadAvg.join('  ')}  (1m 5m 15m)`);
    setText('load-1',  cpu.loadAvg[0]);
    setText('load-5',  cpu.loadAvg[1]);
    setText('load-15', cpu.loadAvg[2]);
  }

  if (memory) {
    setText('ram-usage',  `${memory.usagePercent}%`);
    setText('ram-total',  formatBytes(memory.total));
    setBar('ram-bar', memory.usagePercent);
    setText('ram-detail', `${formatBytes(memory.used)} / ${formatBytes(memory.total)} used`);
  }

  if (disk) {
    setText('disk-usage',  `${disk.usagePercent}%`);
    setText('disk-mount',  disk.mount || '/');
    setBar('disk-bar', disk.usagePercent);
    setText('disk-detail', `${formatBytes(disk.used)} / ${formatBytes(disk.total)} used`);
  }

  if (uptime) setText('uptime', uptime.formatted);

  if (sys) {
    setText('info-hostname', sys.hostname);
    setText('info-os',       `${sys.distro} ${sys.release}`);
    setText('info-kernel',   sys.kernel);
    setText('info-arch',     sys.arch);
    setText('info-node',     sys.nodeVersion);
    setText('info-time',     new Date(sys.serverTime).toLocaleString());
    setText('uptime-hostname', sys.hostname);
    document.title = `${sys.hostname} — VPS Admin`;
  }
}

/* ─── PM2 Table Render ───────────────────────────────────────────────────── */

function statusBadge(status) {
  const map = { online: 'success', stopped: 'neutral', errored: 'danger', stopping: 'warning', launching: 'primary' };
  return `<span class="badge badge-${map[status] || 'neutral'}">${esc(status)}</span>`;
}

function renderPM2(pm2) {
  const container = document.getElementById('pm2-container');
  const restartAllBtn = document.getElementById('btn-restart-all');

  if (!pm2?.available) {
    restartAllBtn.style.display = 'none';
    container.innerHTML = `<div class="empty-state">${esc(pm2?.error || 'PM2 is not available on this server.')}</div>`;
    return;
  }

  restartAllBtn.style.display = '';

  if (!pm2.processes?.length) {
    container.innerHTML = '<div class="empty-state">No PM2 processes running.</div>';
    return;
  }

  const rows = pm2.processes.map((p) => `
    <tr data-name="${esc(p.name)}">
      <td><span class="process-name">${esc(p.name)}</span><span class="process-id">#${esc(String(p.id))}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td class="td-num">${esc(String(p.cpu))}%</td>
      <td class="td-num">${formatBytes(p.memory)}</td>
      <td class="td-num">${p.status === 'online' ? formatUptime(p.uptime) : '—'}</td>
      <td class="td-num">${esc(String(p.restarts))}</td>
      <td class="td-actions">
        <button class="btn btn-xs btn-primary"   data-pm2-action="restart">Restart</button>
        <button class="btn btn-xs btn-danger"    data-pm2-action="stop">Stop</button>
        <button class="btn btn-xs btn-secondary" data-pm2-action="reload">Reload</button>
        <button class="btn btn-xs btn-ghost"     data-pm2-action="logs">Logs</button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Process</th><th>Status</th><th>CPU</th>
            <th>Memory</th><th>Uptime</th><th>Restarts</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ─── Socket.IO ──────────────────────────────────────────────────────────── */

const socket = io({ transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  const el = document.getElementById('connection-status');
  el.textContent = 'Live';
  el.className = 'badge badge-success';
});

socket.on('disconnect', () => {
  const el = document.getElementById('connection-status');
  el.textContent = 'Disconnected';
  el.className = 'badge badge-danger';
});

socket.on('connect_error', () => {
  const el = document.getElementById('connection-status');
  el.textContent = 'Error';
  el.className = 'badge badge-danger';
});

socket.on('update', (data) => {
  if (data.system) updateMetrics(data.system);
  if (data.pm2)    renderPM2(data.pm2);
  if (data.timestamp) {
    const t = document.getElementById('header-time');
    if (t) t.textContent = new Date(data.timestamp).toLocaleTimeString();
  }
});

/* ─── Init ───────────────────────────────────────────────────────────────── */

pollDocker();
setInterval(pollDocker, 30000);

refreshActivity();
setInterval(refreshActivity, 15000);
