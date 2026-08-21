function getProjectAccess(user, project, membership = null) {
  const isAdmin = user.role === 'admin';
  const isLead = user.id === project.leadId;
  const projectRole = membership?.projectRole || null;

  return {
    canView: isAdmin || isLead || Boolean(membership),
    canManage: isAdmin || isLead,
    canReview: isAdmin || isLead || projectRole === 'reviewer',
    projectRole,
  };
}

function getRequirementAccess(user, requirement, project, membership = null) {
  const projectAccess = getProjectAccess(user, project, membership);

  return {
    ...projectAccess,
    canSubmit:
      user.role === 'student' &&
      projectAccess.projectRole === 'contributor' &&
      requirement.assignedUserId === user.id,
  };
}

function visibleEvidenceFor(user, evidence, access) {
  if (access.canReview) {
    return evidence;
  }

  return evidence.filter((item) => item.contributorId === user.id);
}

module.exports = {
  getProjectAccess,
  getRequirementAccess,
  visibleEvidenceFor,
};
