

// src/api/index.js
const express = require('express');

const assignmentRoutes = require('./assignments');
const usersRouter = require('./users');
const coursesRouter = require('./courses');
const submissionsRouter = require('./submissions');

const router = express.Router();

router.use('/users', usersRouter);
router.use('/courses', coursesRouter);
router.use('/submissions', submissionsRouter);
router.use('/assignments', assignmentRoutes);
module.exports = router;




