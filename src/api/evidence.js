const express = require('express');
const fs = require('fs/promises');
const { Requirement, Project, ProjectMembership, Evidence } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const { mapEvidence } = require('../utils/product-mapping');

const router = express.Router();

const decisions = new Set(['approved', 'needs_changes', 'rejected', 'blocked', 'in_review']);

async function canAccessEvidence(user, evidence) {
  const requirement = await Requirement.findByPk(evidence.requirementId);
  if (!requirement) return false;

  const project = await Project.findByPk(requirement.projectId);
  if (!project) return false;

  if (user.role === 'admin' || user.id === project.leadId || user.id === evidence.contributorId) {
    return true;
  }

  const membership = await ProjectMembership.findOne({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });

  return membership?.projectRole === 'reviewer';
}

async function canReviewEvidence(user, evidence) {
  const requirement = await Requirement.findByPk(evidence.requirementId);
  if (!requirement) return false;

  const project = await Project.findByPk(requirement.projectId);
  if (!project) return false;

  if (user.role === 'admin' || user.id === project.leadId) {
    return true;
  }

  const membership = await ProjectMembership.findOne({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });

  return membership?.projectRole === 'reviewer';
}

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const evidence = await Evidence.findByPk(req.params.id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    if (!(await canAccessEvidence(req.user, evidence))) {
      return res.status(403).json({ error: 'You do not have access to this evidence.' });
    }

    res.json(mapEvidence(evidence));
  } catch (err) {
    console.error('Error loading evidence:', err);
    res.status(500).json({ error: 'Unable to load evidence.' });
  }
});

router.patch('/:id/review', authenticateToken, async (req, res) => {
  const { decision, notes } = req.body;

  if (!decisions.has(decision)) {
    return res.status(400).json({ error: 'A valid review decision is required.' });
  }

  if (notes && String(notes).length > 1000) {
    return res.status(400).json({ error: 'Review notes must be 1000 characters or fewer.' });
  }

  try {
    const evidence = await Evidence.findByPk(req.params.id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    if (!(await canReviewEvidence(req.user, evidence))) {
      return res.status(403).json({ error: 'You do not have permission to review this evidence.' });
    }

    evidence.reviewDecision = decision;
    evidence.reviewNotes = notes ? String(notes).trim() : '';
    evidence.reviewedAt = new Date();
    evidence.reviewerId = req.user.id;

    await evidence.save();
    res.json(mapEvidence(evidence));
  } catch (err) {
    console.error('Error reviewing evidence:', err);
    res.status(500).json({ error: 'Unable to review evidence.' });
  }
});

router.get('/:id/file', authenticateToken, async (req, res) => {
  try {
    const evidence = await Evidence.findByPk(req.params.id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    if (!(await canAccessEvidence(req.user, evidence))) {
      return res.status(403).json({ error: 'You do not have access to this file.' });
    }

    try {
      await fs.access(evidence.path);
    } catch {
      return res.status(404).json({ error: 'Evidence file was not found on the server.' });
    }

    res.download(evidence.path, evidence.filename);
  } catch (err) {
    console.error('Error downloading evidence:', err);
    res.status(500).json({ error: 'Unable to download evidence file.' });
  }
});

module.exports = router;
