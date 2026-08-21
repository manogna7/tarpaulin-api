const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getProjectAccess,
  getRequirementAccess,
  visibleEvidenceFor,
} = require('../src/utils/access-control');

const project = { id: 10, leadId: 2 };
const requirement = { id: 20, assignedUserId: 3 };

test('only the assigned contributor can submit evidence', () => {
  const assigned = getRequirementAccess(
    { id: 3, role: 'student' },
    requirement,
    project,
    { projectRole: 'contributor' }
  );
  const otherContributor = getRequirementAccess(
    { id: 4, role: 'student' },
    requirement,
    project,
    { projectRole: 'contributor' }
  );
  const reviewer = getRequirementAccess(
    { id: 5, role: 'student' },
    requirement,
    project,
    { projectRole: 'reviewer' }
  );

  assert.equal(assigned.canSubmit, true);
  assert.equal(otherContributor.canSubmit, false);
  assert.equal(reviewer.canSubmit, false);
});

test('project leads and reviewers can review evidence', () => {
  const lead = getProjectAccess({ id: 2, role: 'instructor' }, project);
  const reviewer = getProjectAccess(
    { id: 5, role: 'student' },
    project,
    { projectRole: 'reviewer' }
  );

  assert.equal(lead.canManage, true);
  assert.equal(lead.canReview, true);
  assert.equal(reviewer.canManage, false);
  assert.equal(reviewer.canReview, true);
});

test('contributors only see their own evidence', () => {
  const evidence = [
    { id: 1, contributorId: 3 },
    { id: 2, contributorId: 4 },
  ];
  const contributorAccess = getProjectAccess(
    { id: 3, role: 'student' },
    project,
    { projectRole: 'contributor' }
  );
  const reviewerAccess = getProjectAccess(
    { id: 5, role: 'student' },
    project,
    { projectRole: 'reviewer' }
  );

  assert.deepEqual(
    visibleEvidenceFor({ id: 3 }, evidence, contributorAccess).map((item) => item.id),
    [1]
  );
  assert.equal(visibleEvidenceFor({ id: 5 }, evidence, reviewerAccess).length, 2);
});
