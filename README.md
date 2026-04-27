# VPS Admin Dashboard

A lightweight admin dashboard I built to monitor my VPS without paying for something like Datadog or relying on a third party service. It shows PM2 process status, system health (CPU, RAM, disk), Docker containers if you have them, and gives you basic controls like restart and stop without having to SSH in every time.

Still learning a lot of this stuff so if something looks weird, it probably is. PRs welcome.

![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Why I built this

I was tired of SSHing into my server just to check if a process had crashed or how much memory was being used. I looked at a few existing tools but they were either too heavy, required Docker to run the monitoring tool itself, or needed an account somewhere. I wanted something that just runs as a PM2 process alongside my other apps with no external dependancies.

The main things I wanted:

- See all my PM2 processes at a glance
- Restart or stop a process without opening a terminal
- Know when memory is getting high before things break
- Keep it simple enough that I can actually maintain it

---

## Screenshots

> TODO: add screenshots once I get the UI polished a bit more

---

## Features

- Real-time dashboard that updates every 5 seconds over WebSocket (no refreshing)
- PM2 process table with restart, stop, reload, and log viewer
- System metrics: CPU usage, memory, disk, uptime, load average
- System info panel (hostname, OS, kernel, Node version)
- Docker container status if Docker is installed (hidden if not)
- Activity log so you can see what actions were taken
- Login protected with rate limiting on the login form
- Works fine on a 1GB VPS, pretty low resource usage at idle

---

## Tech stack

I tried to keep the dependancies minimal and avoid anything overly complicated:

- **Node.js + Express** for the backend
- **EJS** for templating, no frontend framework, no build step
- **Socket.IO** for the real-time updates
- **systeminformation** package for CPU/RAM/disk stats
- **express-session + bcryptjs** for auth
- **Helmet + express-rate-limit** for basic security headers and brute force protection

No React, no TypeScript, no Webpack. Just Node and a browser.

---

## Getting started

### Requriements

- Node.js 18 or higher
- PM2 installed globally (`npm install -g pm2`)
- A Linux VPS (tested on Ubuntu 22.04)

### Install

```bash
git clone https://github.com/yourname/vps-admin.git
cd vps-admin
npm install
```

### Configure

```bash
cp .env.example .env
nano .env
```

The main things to set:

```env
SESSION_SECRET=    # generate a long random string, see below
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password-here
PORT=3000
NODE_ENV=production
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run it

```bash
# Development (auto-restarts on changes)
npm run dev

# Production via PM2
pm2 start app.js --name vps-admin
pm2 save
```

Then open `http://localhost:3000` and log in.

---

## Deploying on a VPS with Nginx

I run this behind Nginx with a subdomain like `admin.myserver.com`. Here is the Nginx config I use:

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Then get HTTPS sorted with Certbot:

```bash
sudo certbot --nginx -d admin.yourdomain.com
```

Full setup instructions are in [SETUP.md](SETUP.md).

---

## Security notes

This thing runs shell commands to control PM2 so I tried to be careful about it. A few things I implemented:

- Process names are validated against a strict regex before being passed to any shell command (`/^[a-zA-Z0-9_\-.]+$/`)
- All shell calls use `execFile` rather than `exec` so there is no shell interpolation
- Sessions use `HttpOnly`, `SameSite=strict` cookies
- Login is rate limited to 10 attempts per 15 minutes
- All routes and WebSocket connections require authentication

I am not a security expert so if you spot something that looks wrong, please open an issue.

---

## Project structure

```
app.js                  main entry point
config/config.js        loads env vars, hashes password on startup
middleware/             auth guard, rate limiting
routes/                 login/logout, dashboard page, API endpoints
services/               system stats, PM2 control, Docker, logs, activity log
views/                  EJS templates (login, dashboard, error)
public/                 CSS and client-side JS
```

---

## Limitations and known issues

- The activity log resets when the server restarts (its just in memory for now)
- Docker polling is every 30 seconds, not real-time like the system stats
- Only supports a single admin user, no multi-user support
- Log viewer just shows the last 100 lines, no live tailing yet
- Hasn't been tested much on anything other than Ubuntu

---

## Roadmap / things I want to add

- [ ] Persistent activity log (write to a file or SQLite)
- [ ] Live log tailing in the log viewer
- [ ] Email or webhook alert when a PM2 process crashes
- [ ] CPU and memory history graphs
- [ ] Dark/light mode toggle

---

## Contributing

This is mostly a personal project but feel free to fork it or open a PR. I am still learning so I am sure there is plenty to improve. Just keep things simple and avoid adding a load of new dependancies if you can help it.

---

## License

MIT
