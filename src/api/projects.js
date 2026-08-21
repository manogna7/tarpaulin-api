const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Project, User, Requirement, Evidence, ProjectMembership } = require('../models');
const authenticateToken = require('../middleware/authenticator');
const {
  getProjectAccess,
  getRequirementAccess,
  visibleEvidenceFor,
} = require('../utils/access-control');
const { asDate, asText } = require('../utils/input-validation');
const {
  buildSummary,
  mapContributor,
  mapEvidence,
  mapProject,
  mapRequirement,
} = require('../utils/product-mapping');
const { removeUploadedFiles } = require('../utils/uploads');

const router = express.Router();

const projectStatuses = new Set(['active', 'completed', 'blocked', 'archived']);
const projectRoles = new Set(['contributor', 'reviewer']);

function isProjectCreator(user) {
  return user.role === 'admin' || user.role === 'instructor';
}

function canManageProject(user, project) {
  return getProjectAccess(user, project).canManage;
}

async function resolveProjectAccess(user, project) {
  const membership = await ProjectMembership.findOne({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });

  return getProjectAccess(user, project, membership);
}

async function visibleProjectWhere(user) {
  if (user.role === 'admin') return {};

  const memberships = await ProjectMembership.findAll({
    where: { userId: user.id },
    attributes: ['projectId'],
  });
  const projectIds = memberships.map((membership) => membership.projectId);

  if (user.role === 'instructor') {
    return {
      [Op.or]: [
        { leadId: user.id },
        { id: { [Op.in]: projectIds } },
      ],
    };
  }

  return { id: { [Op.in]: projectIds } };
}

async function ensureProjectManager(req, res) {
  const project = await Project.findByPk(req.params.id);

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return null;
  }

  if (!canManageProject(req.user, project)) {
    res.status(403).json({ error: 'Only the project lead or an admin can change this project.' });
    return null;
  }

  return project;
}

function parseProjectBody(body, partial = false) {
  const name = asText(body.name);
  const code = asText(body.code).toUpperCase();
  const description = asText(body.description);
  const status = asText(body.status) || 'active';
  const dueDate = body.dueDate === undefined ? undefined : asDate(body.dueDate);
  const errors = [];
  const values = {};

  if (!partial || body.name !== undefined) {
    if (!name) errors.push('Project name is required.');
    else values.name = name;
  }

  if (!partial || body.code !== undefined) {
    if (!code) errors.push('Project code is required.');
    else values.code = code;
  }

  if (!partial || body.description !== undefined) {
    if (!description) errors.push('Project description is required.');
    else values.description = description;
  }

  if (!partial || body.dueDate !== undefined) {
    if (!dueDate) errors.push('A valid due date is required.');
    else values.dueDate = dueDate;
  }

  if (body.status !== undefined || !partial) {
    if (!projectStatuses.has(status)) errors.push('Project status is invalid.');
    else values.status = status;
  }

  if (body.leadId !== undefined) {
    const leadId = Number(body.leadId);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      errors.push('A valid project lead is required.');
    } else {
      values.leadId = leadId;
    }
  }

  return { errors, values };
}

function parseRequirementBody(body, partial = false) {
  const title = asText(body.title);
  const description = asText(body.description);
  const dueDate = body.dueDate === undefined ? undefined : asDate(body.dueDate);
  const assignedContributorId = body.assignedContributorId
    ? Number(body.assignedContributorId)
    : null;
  const errors = [];
  const values = {};

  if (!partial || body.title !== undefined) {
    if (!title) errors.push('Requirement title is required.');
    else values.title = title;
  }

  if (!partial || body.description !== undefined) {
    if (!description) errors.push('Requirement description is required.');
    else values.description = description;
  }

  if (!partial || body.dueDate !== undefined) {
    if (!dueDate) errors.push('A valid requirement due date is required.');
    else values.dueDate = dueDate;
  }

  if (body.assignedContributorId !== undefined) {
    if (
      body.assignedContributorId !== null &&
      (!Number.isInteger(assignedContributorId) || assignedContributorId <= 0)
    ) {
      errors.push('Assigned contributor must be a valid user.');
    } else {
      values.assignedContributorId = assignedContributorId;
    }
  }

  return { errors, values };
}

async function ensureUniqueProjectCode(code, currentProjectId = null) {
  if (!code) return true;

  const existing = await Project.findOne({
    where: {
      projectCode: code,
      ...(currentProjectId ? { id: { [Op.ne]: currentProjectId } } : {}),
    },
  });

  return !existing;
}

async function assertAssignableProjectUser(userId, projectId) {
  if (!userId) return true;

  const [membership, user] = await Promise.all([
    ProjectMembership.findOne({
      where: { projectId: projectId, userId },
    }),
    User.findByPk(userId),
  ]);

  return membership?.projectRole === 'contributor' && user?.role === 'student';
}

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const projectRecords = await Project.findAll({
      where: await visibleProjectWhere(req.user),
    });
    const projectIds = projectRecords.map((project) => project.id);

    if (!projectIds.length) {
      return res.json(buildSummary([], [], []));
    }

    const [requirementRecords, memberships] = await Promise.all([
      Requirement.findAll({
        where: { projectId: { [Op.in]: projectIds } },
        include: [{ model: Evidence, as: 'evidence' }],
      }),
      ProjectMembership.findAll({
        where: { userId: req.user.id, projectId: { [Op.in]: projectIds } },
      }),
    ]);
    const projectsById = new Map(projectRecords.map((project) => [project.id, project]));
    const membershipsByProjectId = new Map(
      memberships.map((membership) => [membership.projectId, membership])
    );
    const visibleEvidence = [];

    const projects = projectRecords.map(mapProject);
    const requirements = requirementRecords.map((requirement) => {
      const project = projectsById.get(requirement.projectId);
      const access = getRequirementAccess(
        req.user,
        requirement,
        project,
        membershipsByProjectId.get(requirement.projectId)
      );
      const requirementEvidence = visibleEvidenceFor(
        req.user,
        requirement.evidence || [],
        access
      );
      visibleEvidence.push(...requirementEvidence);
      return mapRequirement(requirement, requirementEvidence);
    });
    const evidence = visibleEvidence.map(mapEvidence);

    res.json(buildSummary(projects, requirements, evidence));
  } catch (err) {
    console.error('Error loading project summary:', err);
    res.status(500).json({ error: 'Unable to load project summary.' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: await visibleProjectWhere(req.user),
      order: [['id', 'ASC']],
    });

    res.json({
      projects: projects.map(mapProject),
    });
  } catch (err) {
    console.error('Error loading projects:', err);
    res.status(500).json({ error: 'Unable to load projects.' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (!isProjectCreator(req.user)) {
    return res.status(403).json({ error: 'Only admins and project leads can create projects.' });
  }

  const { errors, values } = parseProjectBody(req.body);

  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const leadId = req.user.role === 'admin' && values.leadId ? values.leadId : req.user.id;
    const lead = await User.findByPk(leadId);

    if (!lead || !['admin', 'instructor'].includes(lead.role)) {
      return res.status(400).json({ error: 'Project lead must be an admin or project lead user.' });
    }

    if (!(await ensureUniqueProjectCode(values.code))) {
      return res.status(409).json({ error: 'A project with this code already exists.' });
    }

    const project = await Project.create({
      subject: 'PROJECT',
      number: values.code,
      title: values.name,
      term: 'active',
      leadId: leadId,
      projectCode: values.code,
      productDescription: values.description,
      dueDate: values.dueDate,
      status: values.status,
    });

    res.status(201).json({
      project: {
        ...mapProject(project),
        lead: mapContributor(lead, 'project_lead'),
      },
    });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Unable to create project.' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'lead', attributes: ['id', 'name', 'email', 'role'] },
        {
          model: Requirement,
          as: 'requirements',
          include: [{ model: Evidence, as: 'evidence' }],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const access = await resolveProjectAccess(req.user, project);

    if (!access.canView) {
      return res.status(403).json({ error: 'You do not have access to this project.' });
    }

    const requirements = (project.requirements || []).map((requirement) => {
      const requirementAccess = getRequirementAccess(req.user, requirement, project, {
        projectRole: access.projectRole,
      });
      return mapRequirement(
        requirement,
        visibleEvidenceFor(req.user, requirement.evidence || [], requirementAccess)
      );
    });

    res.json({
      ...mapProject(project),
      lead: project.lead ? mapContributor(project.lead, 'project_lead') : null,
      requirementCount: requirements.length,
      approvedRequirements: requirements.filter((requirement) => requirement.status === 'approved').length,
      blockedRequirements: requirements.filter((requirement) =>
        ['blocked', 'needs_changes', 'rejected', 'overdue'].includes(requirement.status)
      ).length,
    });
  } catch (err) {
    console.error('Error loading project:', err);
    res.status(500).json({ error: 'Unable to load project.' });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await ensureProjectManager(req, res);
    if (!project) return;

    const { errors, values } = parseProjectBody(req.body, true);

    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    if (values.code && !(await ensureUniqueProjectCode(values.code, project.id))) {
      return res.status(409).json({ error: 'A project with this code already exists.' });
    }

    if (values.leadId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can change the project lead.' });
    }

    if (values.leadId) {
      const lead = await User.findByPk(values.leadId);
      if (!lead || !['admin', 'instructor'].includes(lead.role)) {
        return res.status(400).json({ error: 'Project lead must be an admin or project lead user.' });
      }
    }

    await project.update({
      ...(values.name ? { title: values.name } : {}),
      ...(values.code ? { projectCode: values.code, number: values.code } : {}),
      ...(values.description ? { productDescription: values.description } : {}),
      ...(values.dueDate ? { dueDate: values.dueDate } : {}),
      ...(values.status ? { status: values.status } : {}),
      ...(values.leadId ? { leadId: values.leadId } : {}),
    });

    const lead = await User.findByPk(project.leadId);

    res.json({
      project: {
        ...mapProject(project),
        lead: lead ? mapContributor(lead, 'project_lead') : null,
      },
    });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Unable to update project.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await ensureProjectManager(req, res);
    if (!project) return;

    const requirements = await Requirement.findAll({
      where: { projectId: project.id },
      attributes: ['id'],
    });
    const requirementIds = requirements.map((requirement) => requirement.id);
    const evidence = requirementIds.length
      ? await Evidence.findAll({
        where: { requirementId: { [Op.in]: requirementIds } },
        attributes: ['path'],
      })
      : [];

    await sequelize.transaction(async (transaction) => {
      if (requirementIds.length) {
        await Evidence.destroy({
          where: { requirementId: { [Op.in]: requirementIds } },
          transaction,
        });
      }
      await Requirement.destroy({ where: { projectId: project.id }, transaction });
      await ProjectMembership.destroy({ where: { projectId: project.id }, transaction });
      await project.destroy({ transaction });
    });

    await removeUploadedFiles(evidence);

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Unable to delete project.' });
  }
});

router.get('/:id/team', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'lead', attributes: ['id', 'name', 'email', 'role'] },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'email', 'role'],
          through: { attributes: ['projectRole'] },
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const access = await resolveProjectAccess(req.user, project);

    if (!access.canView) {
      return res.status(403).json({ error: 'You do not have access to this project team.' });
    }

    res.json({
      lead: project.lead ? mapContributor(project.lead, 'project_lead') : null,
      contributors: (project.members || []).map((user) =>
        mapContributor(user, user.ProjectMembership?.projectRole || 'contributor')
      ),
    });
  } catch (err) {
    console.error('Error loading project team:', err);
    res.status(500).json({ error: 'Unable to load project team.' });
  }
});

router.post('/:id/team', authenticateToken, async (req, res) => {
  const userId = Number(req.body.userId);
  const projectRole = asText(req.body.role) || 'contributor';

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'A valid user is required.' });
  }

  if (!projectRoles.has(projectRole)) {
    return res.status(400).json({ error: 'Project role must be contributor or reviewer.' });
  }

  try {
    const project = await ensureProjectManager(req, res);
    if (!project) return;

    if (project.leadId === userId) {
      return res.status(400).json({ error: 'The project lead is already on this project.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ error: 'Project contributors and reviewers must be contributor users.' });
    }

    const [membership] = await ProjectMembership.findOrCreate({
      where: { projectId: project.id, userId },
      defaults: { projectId: project.id, userId, projectRole },
    });

    if (membership.projectRole !== projectRole) {
      await membership.update({ projectRole });
    }

    res.status(201).json({
      contributor: mapContributor(user, projectRole),
    });
  } catch (err) {
    console.error('Error updating project team:', err);
    res.status(500).json({ error: 'Unable to update project team.' });
  }
});

router.delete('/:id/team/:userId', authenticateToken, async (req, res) => {
  try {
    const project = await ensureProjectManager(req, res);
    if (!project) return;

    const userId = Number(req.params.userId);
    if (project.leadId === userId) {
      return res.status(400).json({ error: 'The project lead cannot be removed from the team.' });
    }

    const assignedRequirementCount = await Requirement.count({
      where: { projectId: project.id, assignedUserId: userId },
    });

    if (assignedRequirementCount > 0) {
      return res.status(409).json({
        error: 'Reassign this team member\'s requirements before removing them from the project.',
      });
    }

    const removed = await ProjectMembership.destroy({
      where: { projectId: project.id, userId },
    });

    if (!removed) {
      return res.status(404).json({ error: 'Team member not found.' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error removing project team member:', err);
    res.status(500).json({ error: 'Unable to remove project team member.' });
  }
});

router.get('/:id/requirements', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: Requirement,
          as: 'requirements',
          include: [
            { model: Evidence, as: 'evidence' },
            { model: User, as: 'assignedContributor', attributes: ['id', 'name', 'email', 'role'] },
          ],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const access = await resolveProjectAccess(req.user, project);

    if (!access.canView) {
      return res.status(403).json({ error: 'You do not have access to these requirements.' });
    }

    res.json({
      requirements: (project.requirements || []).map((requirement) => {
        const requirementAccess = getRequirementAccess(req.user, requirement, project, {
          projectRole: access.projectRole,
        });
        return mapRequirement(
          requirement,
          visibleEvidenceFor(req.user, requirement.evidence || [], requirementAccess)
        );
      }),
    });
  } catch (err) {
    console.error('Error loading requirements:', err);
    res.status(500).json({ error: 'Unable to load requirements.' });
  }
});

router.post('/:id/requirements', authenticateToken, async (req, res) => {
  try {
    const project = await ensureProjectManager(req, res);
    if (!project) return;

    const { errors, values } = parseRequirementBody(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    if (
      values.assignedContributorId &&
      !(await assertAssignableProjectUser(values.assignedContributorId, project.id))
    ) {
      return res.status(400).json({
        error: 'Assigned contributor must have the contributor role on the project team.',
      });
    }

    const requirement = await Requirement.create({
      projectId: project.id,
      title: values.title,
      description: values.description,
      points: 0,
      due: values.dueDate,
      assignedUserId: values.assignedContributorId,
    });

    const loadedRequirement = await Requirement.findByPk(requirement.id, {
      include: [{ model: User, as: 'assignedContributor', attributes: ['id', 'name', 'email', 'role'] }],
    });

    res.status(201).json({
      requirement: mapRequirement(loadedRequirement, []),
    });
  } catch (err) {
    console.error('Error creating requirement:', err);
    res.status(500).json({ error: 'Unable to create requirement.' });
  }
});

module.exports = router;
