const express = require('express');
const { Op } = require('sequelize');
const { Requirement, Project, ProjectMembership, Evidence } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const { mapEvidence } = require('../utils/product-mapping');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let requirementWhere = {};

    if (req.user.role !== 'admin') {
      const [reviewMemberships, ledProjects] = await Promise.all([
        ProjectMembership.findAll({
          where: {
            userId: req.user.id,
            projectRole: 'reviewer',
          },
          attributes: ['projectId'],
        }),
        Project.findAll({
          where: { leadId: req.user.id },
          attributes: ['id'],
        }),
      ]);
      const projectIds = [...new Set([
        ...reviewMemberships.map((membership) => membership.projectId),
        ...ledProjects.map((project) => project.id),
      ])];

      if (!projectIds.length) {
        return res.json({ reviews: [] });
      }

      requirementWhere = { projectId: { [Op.in]: projectIds } };
    }

    const evidence = await Evidence.findAll({
      include: [
        {
          model: Requirement,
          as: 'requirement',
          where: requirementWhere,
          required: true,
        },
      ],
      order: [['timestamp', 'DESC']],
    });

    res.json({
      reviews: evidence.map(mapEvidence),
    });
  } catch (err) {
    console.error('Error loading review queue:', err);
    res.status(500).json({ error: 'Unable to load review queue.' });
  }
});

module.exports = router;
