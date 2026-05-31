const express = require('express');
const { Requirement, Project, ProjectMembership, Evidence } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const { mapEvidence } = require('../utils/product-mapping');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const evidence = await Evidence.findAll({
      include: [
        {
          model: Requirement,
          as: 'requirement',
          include: [{ model: Project, as: 'project' }],
        },
      ],
      order: [['timestamp', 'DESC']],
    });

    const reviewMemberships = await ProjectMembership.findAll({
      where: {
        userId: req.user.id,
        projectRole: 'reviewer',
      },
    });
    const reviewProjectIds = new Set(reviewMemberships.map((membership) => membership.projectId));

    const visibleEvidence = evidence.filter((item) => {
      const project = item.requirement && item.requirement.project;
      return project && (
        req.user.role === 'admin' ||
        req.user.id === project.leadId ||
        reviewProjectIds.has(project.id)
      );
    });

    res.json({
      reviews: visibleEvidence.map(mapEvidence),
    });
  } catch (err) {
    console.error('Error loading review queue:', err);
    res.status(500).json({ error: 'Unable to load review queue.' });
  }
});

module.exports = router;
