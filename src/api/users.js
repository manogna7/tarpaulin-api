const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Course, CourseEnrollments } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const authorizeRole = require('../middleware/authorization');
require('dotenv').config();

const router = express.Router();

/*
 * POST /users - Route to create a new user.
 * Only an authenticated user with 'admin' role can create users with 'admin' or 'instructor' or 'student' roles.
 */
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if the user has admin role to create users with admin or instructor roles
  if (req.user.role !== 'admin' && (role === 'admin' || role === 'instructor')) {
    return res.status(403).json({ error: 'Forbidden. Only admins can create users with admin or instructor roles.' });
  }

  try {
    // Check if a user with the provided email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role });
    res.status(201).json({ id: user.id });
  } catch (err) {
    res.status(400).json({ error: 'Invalid User object.' });
  }
});

/*
 * POST /users/login - Route to log in a user.
 * Authenticates a user with their email address and password.
 */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  const { id } = req.params;

  if (req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Forbidden. You can only access your own user data.' });
  }

  try {
    const user = await User.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'enrolledCourses',
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: Course,
          as: 'taughtCourses',
          attributes: ['id']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student') {
      userData.enrolledCourses = user.enrolledCourses.map(course => course.id);
    } else if (user.role === 'instructor') {
      userData.taughtCourses = user.taughtCourses.map(course => course.id);
    }

    res.json(userData);
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


/*
 * POST /users/initial - Route to create the initial admin user.
 * This route should only be used once to create the initial admin user.
 */
router.post('/users/initial', async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (role !== 'admin') {
    return res.status(400).json({ error: 'Initial user must have admin role.' });
  }

  try {
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.status(403).json({ error: 'Initial admin user already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role });
    res.status(201).json({ id: user.id });
  } catch (err) {
    res.status(400).json({ error: 'Invalid User object.' });
  }
});

module.exports = router;