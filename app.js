const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const flash = require('connect-flash');

const config = require('./config/config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const { requireAuth } = require('./middleware/auth');
const { setupSocketIO } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false },
  transports: ['websocket', 'polling'],
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'"],
    },
  },
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.env === 'production' ? '1h' : 0,
}));

// Session middleware stored in a variable so it can be shared with Socket.IO
const sessionMiddleware = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'vpsadmin.sid',
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'strict',
  },
});

app.use(sessionMiddleware);
app.use(flash());

// Skip logging for high-frequency polling endpoints
app.use(morgan('combined', {
  skip: (req) => req.path === '/api/system' || req.path === '/api/pm2',
}));

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use('/', authRoutes);
app.use('/', requireAuth, dashboardRoutes);
app.use('/api', requireAuth, apiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found', code: 404 });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('error', { title: 'Error', message: 'Internal server error', code: 500 });
});

setupSocketIO(io, sessionMiddleware);

server.listen(config.port, () => {
  console.log('┌─────────────────────────────────────┐');
  console.log(`│  VPS Admin Dashboard                │`);
  console.log(`│  Port : ${String(config.port).padEnd(28)}│`);
  console.log(`│  Env  : ${config.env.padEnd(28)}│`);
  console.log('└─────────────────────────────────────┘');
});

module.exports = { app, server };
