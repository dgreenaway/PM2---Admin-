const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.render('login', { title: 'Login — VPS Admin' });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    req.flash('error', 'Invalid credentials');
    return res.redirect('/login');
  }

  const usernameMatch = username.trim() === config.admin.username;
  const passwordMatch = await bcrypt.compare(password, config.admin.passwordHash);

  // Compare both regardless to prevent timing attacks
  if (!usernameMatch || !passwordMatch) {
    req.flash('error', 'Invalid username or password');
    return res.redirect('/login');
  }

  req.session.regenerate((err) => {
    if (err) {
      req.flash('error', 'Session error, please try again');
      return res.redirect('/login');
    }
    req.session.authenticated = true;
    req.session.username = config.admin.username;
    req.session.loginTime = new Date().toISOString();
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('vpsadmin.sid');
    res.redirect('/login');
  });
});

module.exports = router;
