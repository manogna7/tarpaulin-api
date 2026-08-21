const express = require('express');
const { sequelize, Requirement, Project, ProjectMembership, Evidence, User } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const {
  getRequirementAccess: calculateRequirementAccess,
  visibleEvidenceFor,
} = require('../utils/access-control');
const { asDate } = require('../utils/input-validation');
const { evidenceUpload, removeUploadedFiles } = require('../utils/uploads');
const { mapEvidence, mapRequirement } = require('../utils/product-mapping');

const router = express.Router();

function mapRequirementWithPermissions(requirement, evidence, access) {
  return {
    ...mapRequirement(requirement, evidence),
    permissions: {
      canManage: access.canManage,
      canReview: access.canReview,
      canSubmit: access.canSubmit,
    },
  };
}

async function getRequirementAccess(user, requirement) {
  const project = await Project.findByPk(requirement.projectId);

  if (!project) {
    return { canView: false, canReview: false, canSubmit: false, canManage: false };
  }

  const membership = await ProjectMembership.findOne({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });
  return calculateRequirementAccess(user, requirement, project, membership);
}

function runEvidenceUpload(req, res, next) {
  evidenceUpload.single('file')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    res.status(400).json({ error: err.message || 'Unable to upload evidence.' });
  });
}

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const requirement = await Requirement.findByPk(req.params.id, {
      include: [
        { model: Evidence, as: 'evidence' },
        { model: User, as: 'assignedContributor', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found.' });
    }

    const access = await getRequirementAccess(req.user, requirement);

    if (!access.canView) {
      return res.status(403).json({ error: 'You do not have access to this requirement.' });
    }

    res.json(mapRequirementWithPermissions(
      requirement,
      visibleEvidenceFor(req.user, requirement.evidence || [], access),
      access
    ));
  } catch (err) {
    console.error('Error loading requirement:', err);
    res.status(500).json({ error: 'Unable to load requirement.' });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const requirement = await Requirement.findByPk(req.params.id);

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found.' });
    }

    const access = await getRequirementAccess(req.user, requirement);

    if (!access.canManage) {
      return res.status(403).json({ error: 'Only the project lead or an admin can update this requirement.' });
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : undefined;
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;
    const dueDate = req.body.dueDate === undefined ? undefined : asDate(req.body.dueDate);
    const assignedContributorId = req.body.assignedContributorId === undefined
      ? undefined
      : req.body.assignedContributorId === null
        ? null
        : Number(req.body.assignedContributorId);
    const updates = {};

    if (req.body.title !== undefined) {
      if (!title) return res.status(400).json({ error: 'Requirement title is required.' });
      updates.title = title;
    }

    if (req.body.description !== undefined) {
      if (!description) return res.status(400).json({ error: 'Requirement description is required.' });
      updates.description = description;
    }

    if (req.body.dueDate !== undefined) {
      if (!dueDate) {
        return res.status(400).json({ error: 'A valid due date is required.' });
      }
      updates.due = dueDate;
    }

    if (req.body.assignedContributorId !== undefined) {
      if (assignedContributorId !== null) {
        if (!Number.isInteger(assignedContributorId) || assignedContributorId <= 0) {
          return res.status(400).json({ error: 'Assigned contributor must be a valid user.' });
        }

        const membership = await ProjectMembership.findOne({
          where: {
            projectId: requirement.projectId,
            userId: assignedContributorId,
          },
        });

        const contributor = await User.findByPk(assignedContributorId);

        if (membership?.projectRole !== 'contributor' || contributor?.role !== 'student') {
          return res.status(400).json({
            error: 'Assigned contributor must have the contributor role on the project team.',
          });
        }
      }

      updates.assignedUserId = assignedContributorId;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid requirement fields were provided.' });
    }

    await requirement.update(updates);

    const updatedRequirement = await Requirement.findByPk(requirement.id, {
      include: [
        { model: Evidence, as: 'evidence' },
        { model: User, as: 'assignedContributor', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    const updatedAccess = await getRequirementAccess(req.user, updatedRequirement);
    res.json(mapRequirementWithPermissions(
      updatedRequirement,
      updatedRequirement.evidence || [],
      updatedAccess
    ));
  } catch (err) {
    console.error('Error updating requirement:', err);
    res.status(500).json({ error: 'Unable to update requirement.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const requirement = await Requirement.findByPk(req.params.id);

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found.' });
    }

    const access = await getRequirementAccess(req.user, requirement);

    if (!access.canManage) {
      return res.status(403).json({ error: 'Only the project lead or an admin can delete this requirement.' });
    }

    const evidence = await Evidence.findAll({
      where: { requirementId: requirement.id },
      attributes: ['path'],
    });

    await sequelize.transaction(async (transaction) => {
      await Evidence.destroy({ where: { requirementId: requirement.id }, transaction });
      await requirement.destroy({ transaction });
    });

    await removeUploadedFiles(evidence);

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting requirement:', err);
    res.status(500).json({ error: 'Unable to delete requirement.' });
  }
});

router.get('/:id/evidence', authenticateToken, async (req, res) => {
  try {
    const requirement = await Requirement.findByPk(req.params.id);

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found.' });
    }

    const access = await getRequirementAccess(req.user, requirement);

    if (!access.canView) {
      return res.status(403).json({ error: 'You do not have access to this evidence.' });
    }

    const evidence = await Evidence.findAll({
      where: {
        requirementId: requirement.id,
        ...(access.canReview ? {} : { contributorId: req.user.id }),
      },
      order: [['timestamp', 'DESC']],
    });

    res.json({
      evidence: evidence.map(mapEvidence),
    });
  } catch (err) {
    console.error('Error loading evidence:', err);
    res.status(500).json({ error: 'Unable to load evidence.' });
  }
});

router.post(
  '/:id/evidence',
  authenticateToken,
  async (req, res, next) => {
    try {
      const requirement = await Requirement.findByPk(req.params.id);

      if (!requirement) {
        return res.status(404).json({ error: 'Requirement not found.' });
      }

      const access = await getRequirementAccess(req.user, requirement);

      if (!access.canView) {
        return res.status(403).json({ error: 'You do not have access to this requirement.' });
      }

      if (!access.canSubmit) {
        return res.status(403).json({ error: 'Only assigned contributors can submit evidence for this requirement.' });
      }

      req.requirement = requirement;
      next();
    } catch (err) {
      console.error('Error checking evidence upload access:', err);
      res.status(500).json({ error: 'Unable to check upload access.' });
    }
  },
  runEvidenceUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Evidence file is required.' });
      }

      const evidence = await Evidence.create({
        requirementId: req.requirement.id,
        contributorId: req.user.id,
        timestamp: new Date(),
        filename: req.file.filename,
        contentType: req.file.mimetype,
        path: req.file.path,
        reviewDecision: 'submitted',
      });

      res.status(201).json(mapEvidence(evidence));
    } catch (err) {
      console.error('Error uploading evidence:', err);

      if (req.file?.path) {
        await removeUploadedFiles([{ path: req.file.path }]);
      }

      res.status(500).json({ error: 'Unable to upload evidence.' });
    }
  }
);

module.exports = router;
