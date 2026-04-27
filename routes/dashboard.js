const express = require('express');
const os = require('os');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard — VPS Admin',
    hostname: os.hostname(),
    username: req.session.username,
    loginTime: req.session.loginTime,
  });
});

module.exports = router;
