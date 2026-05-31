

const express = require('express');

const authRoutes = require('./auth');
const evidenceRoutes = require('./evidence');
const projectsRoutes = require('./projects');
const requirementsRoutes = require('./requirements');
const reviewsRoutes = require('./reviews');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/projects', projectsRoutes);
router.use('/requirements', requirementsRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/reviews', reviewsRoutes);

module.exports = router;

