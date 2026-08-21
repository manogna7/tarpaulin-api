function mapRole(role) {
  if (role === 'instructor') return 'project_lead';
  if (role === 'student') return 'contributor';
  return role;
}

function fallbackProjectCode(id) {
  return `PROJECT-${String(id).padStart(3, '0')}`;
}

function reviewDecisionFromEvidence(evidence) {
  if (!evidence) return null;
  return evidence.reviewDecision || 'submitted';
}

function sortEvidenceByNewest(evidence = []) {
  return [...evidence].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function requirementStatus(requirement, evidence = []) {
  const latestEvidence = sortEvidenceByNewest(evidence)[0];
  const decision = reviewDecisionFromEvidence(latestEvidence);

  if (decision === 'approved') return 'approved';
  if (decision === 'needs_changes') return 'needs_changes';
  if (decision === 'rejected') return 'rejected';
  if (decision === 'blocked') return 'blocked';
  if (decision === 'submitted' || decision === 'in_review') return 'in_review';

  if (requirement.due && new Date(requirement.due) < new Date()) {
    return 'overdue';
  }

  return 'not_started';
}

function mapProject(project, options = {}) {
  const code = project.projectCode || project.number || fallbackProjectCode(project.id);

  return {
    id: project.id,
    code,
    name: project.title,
    description: project.productDescription || 'Track required proof, review status, and sign-off progress.',
    dueDate: project.dueDate || '2026-09-01T17:00:00.000Z',
    status: options.status || project.status || 'active',
    leadId: project.leadId,
  };
}

function mapContributor(user, projectRole) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: projectRole || mapRole(user.role),
  };
}

function mapRequirement(requirement, evidence = []) {
  const sortedEvidence = sortEvidenceByNewest(evidence);
  const evidenceItems = sortedEvidence.map(mapEvidence);
  const latestEvidence = evidenceItems[0] || null;

  return {
    id: requirement.id,
    projectId: requirement.projectId,
    title: requirement.title,
    description: requirement.description || 'Required proof must be submitted before this item can be approved.',
    dueDate: requirement.due,
    status: requirementStatus(requirement, sortedEvidence),
    evidenceCount: sortedEvidence.length,
    latestEvidence,
    assignedContributorId: requirement.assignedUserId || null,
    assignedContributor: requirement.assignedContributor
      ? mapContributor(requirement.assignedContributor)
      : null,
  };
}

function mapEvidence(evidence) {
  return {
    id: evidence.id,
    requirementId: evidence.requirementId,
    contributorId: evidence.contributorId,
    fileName: evidence.filename,
    fileType: evidence.contentType || null,
    uploadedAt: evidence.timestamp,
    reviewDecision: reviewDecisionFromEvidence(evidence),
    reviewNotes: evidence.reviewNotes || '',
    reviewedAt: evidence.reviewedAt || null,
    reviewerId: evidence.reviewerId || null,
    downloadUrl: `/evidence/${evidence.id}/file`,
  };
}

function buildSummary(projects, requirements, evidence) {
  const requirementStatuses = requirements.map((requirement) => requirement.status);

  return {
    activeProjects: projects.filter((project) => project.status === 'active').length,
    openRequirements: requirementStatuses.filter((status) => status !== 'approved').length,
    evidenceWaitingForReview: evidence.filter((item) =>
      ['submitted', 'in_review'].includes(item.reviewDecision)
    ).length,
    blockedRequirements: requirementStatuses.filter((status) =>
      ['blocked', 'needs_changes', 'rejected'].includes(status)
    ).length,
    dueSoon: requirements.filter((requirement) => {
      const due = new Date(requirement.dueDate);
      const now = new Date();
      const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return due >= now && due <= inSevenDays && requirement.status !== 'approved';
    }).length,
    overdue: requirementStatuses.filter((status) => status === 'overdue').length,
  };
}

module.exports = {
  mapRole,
  mapProject,
  mapContributor,
  mapRequirement,
  mapEvidence,
  buildSummary,
};
