const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const { mapContributor } = require('../utils/product-mapping');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: mapContributor(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json(mapContributor(user));
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role'],
      order: [['name', 'ASC']],
    });

    res.json({
      users: users.map((user) => mapContributor(user)),
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).json({ error: 'Unable to load users.' });
  }
});

module.exports = router;
