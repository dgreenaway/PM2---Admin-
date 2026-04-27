const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  const extraError = req.query.err === 'session' ? 'Session error, please try again' : null;
  res.render('login', { title: 'Login — VPS Admin', extraError });
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
      // regenerate destroys the old session so flash won't survive — pass error via query
      return res.redirect('/login?err=session');
    }
    req.session.authenticated = true;
    req.session.username = config.admin.username;
    req.session.loginTime = new Date().toISOString();
    req.session.save((saveErr) => {
      if (saveErr) return res.redirect('/login?err=session');
      res.redirect('/');
    });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('vpsadmin.sid');
    res.redirect('/login');
  });
});

module.exports = router;
