# VPS Admin Dashboard — Setup Guide

## Prerequisites

- Ubuntu 20.04+ (or any Debian-based Linux)
- Node.js 18+
- PM2 (optional, but needed for PM2 monitoring)
- Docker (optional, for container monitoring)

---

## 1. Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x.x
```

---

## 2. Install PM2

```bash
sudo npm install -g pm2
pm2 --version
```

---

## 3. Clone / Upload the App

```bash
# Example using scp from your local machine
scp -r ./vps-admin user@your-server:/home/user/vps-admin

# Or clone from git
git clone https://your-repo-url.git /home/user/vps-admin
```

---

## 4. Install Dependencies

```bash
cd /home/user/vps-admin
npm install --omit=dev
```

---

## 5. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=   # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
```

**Generate a strong session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Start with PM2

```bash
cd /home/user/vps-admin
pm2 start app.js --name vps-admin
pm2 save
pm2 startup    # follow the printed command to enable autostart
```

---

## 7. Nginx Reverse Proxy (recommended)

Install Nginx:
```bash
sudo apt install nginx -y
```

Create a config file:
```bash
sudo nano /etc/nginx/sites-available/vps-admin
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your server IP

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/vps-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS with Let's Encrypt (recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

After obtaining a cert, set `cookie.secure` to work automatically via the `NODE_ENV=production` flag.

---

## 9. Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

If not using Nginx, open the app port directly:
```bash
sudo ufw allow 3000
```

---

## Useful PM2 Commands

```bash
pm2 status           # list all processes
pm2 logs vps-admin   # view dashboard logs
pm2 restart vps-admin
pm2 monit            # built-in process monitor
```

---

## Resource Usage

The dashboard is designed for low-spec VPS (512 MB – 2 GB RAM):

- Node.js process: ~40–80 MB RAM at idle
- Socket.IO polling every 5 seconds (configurable via `UPDATE_INTERVAL_MS`)
- Docker polling every 30 seconds (client-side)

---

## Security Notes

- Change `ADMIN_PASSWORD` to something strong before exposing to the internet
- Always run behind Nginx with HTTPS in production
- The session cookie uses `SameSite=Strict` and `HttpOnly` — no CSRF tokens needed for same-origin requests
- All PM2 process names are validated against `/^[a-zA-Z0-9_\-.]+$/` before any shell execution
- Shell commands use `execFile` (not `exec`) — no shell injection possible
- Rate limiting: 10 login attempts per 15 min; 120 API requests per minute
