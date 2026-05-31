const express = require('express');
const fs = require('fs/promises');
const { Requirement, Project, ProjectMembership, Evidence, User } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const { evidenceUpload } = require('../utils/uploads');
const { mapEvidence, mapRequirement } = require('../utils/product-mapping');

const router = express.Router();

async function getRequirementAccess(user, requirement) {
  const project = await Project.findByPk(requirement.projectId);

  if (!project) {
    return { canView: false, canReview: false, canSubmit: false, canManage: false };
  }

  const isAdmin = user.role === 'admin';
  const isLead = user.id === project.leadId;
  const membership = await ProjectMembership.findOne({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });
  const projectRole = membership?.projectRole || null;

  return {
    canView: isAdmin || isLead || Boolean(membership),
    canReview: isAdmin || isLead || projectRole === 'reviewer',
    canSubmit: user.role === 'student' && projectRole !== 'reviewer' && Boolean(membership),
    canManage: isAdmin || isLead,
  };
}

function visibleEvidenceFor(user, evidence, access) {
  if (access.canReview) {
    return evidence;
  }

  return evidence.filter((item) => item.contributorId === user.id);
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

    res.json(mapRequirement(
      requirement,
      visibleEvidenceFor(req.user, requirement.evidence || [], access)
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
    const dueDate = req.body.dueDate === undefined ? undefined : new Date(req.body.dueDate);
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
      if (Number.isNaN(dueDate.getTime())) {
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

        if (!membership) {
          return res.status(400).json({ error: 'Assigned contributor must be on the project team.' });
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

    res.json(mapRequirement(updatedRequirement, updatedRequirement.evidence || []));
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

    await Evidence.destroy({ where: { requirementId: requirement.id } });
    await requirement.destroy();

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
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({ error: 'Unable to upload evidence.' });
    }
  }
);

module.exports = router;
