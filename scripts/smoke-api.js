const http = require('http');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

function request(path, options = {}) {
  const url = new URL(path, baseUrl);
  const method = options.method || 'GET';
  let payload = null;
  const headers = { ...(options.headers || {}) };

  if (options.body) {
    payload = Buffer.from(JSON.stringify(options.body));
    headers['Content-Type'] = 'application/json';
  }

  if (options.rawBody) {
    payload = Buffer.isBuffer(options.rawBody)
      ? options.rawBody
      : Buffer.from(options.rawBody);
  }

  if (payload) {
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const text = raw.toString('utf8');
          const contentType = res.headers['content-type'] || '';
          const expectedStatus = options.expectedStatus;
          const statusOk = expectedStatus
            ? res.statusCode === expectedStatus
            : res.statusCode >= 200 && res.statusCode < 300;

          let data = text;

          if (contentType.includes('application/json') && text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }

          if (!statusOk) {
            reject(new Error(`${method} ${path} failed with ${res.statusCode}: ${text}`));
            return;
          }

          resolve({
            data,
            headers: res.headers,
            raw,
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function multipartFile(fieldName, filename, contentType, content) {
  const boundary = `----tarpaulin-smoke-${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    ),
    Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function login(email, password) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (!response.data.token) {
    throw new Error(`Login did not return a token for ${email}.`);
  }

  return response.data.token;
}

async function main() {
  const health = await request('/health');
  if (health.data.status !== 'ok') {
    throw new Error('Health check did not return ok.');
  }

  await request('/projects', { expectedStatus: 401 });

  const adminToken = await login('admin@tarpaulin.local', 'adminpass');
  const contributorToken = await login('contributor@tarpaulin.local', 'contributorpass');
  const secondContributorToken = await login('contributor2@tarpaulin.local', 'contributorpass');
  const reviewerToken = await login('reviewer@tarpaulin.local', 'reviewerpass');

  await request('/auth/users', {
    headers: authHeaders(contributorToken),
    expectedStatus: 403,
  });

  const contributorProjects = await request('/projects', {
    headers: authHeaders(contributorToken),
  });

  if (contributorProjects.data.projects.some((item) => item.id === 3)) {
    throw new Error('Project list privacy check failed: contributor can see a project they do not belong to.');
  }

  const reviewerRequirement = await request('/requirements/7', {
    headers: authHeaders(reviewerToken),
  });
  const reviewerQueue = await request('/reviews', {
    headers: authHeaders(reviewerToken),
  });

  if (
    reviewerRequirement.data.permissions?.canReview !== true ||
    !reviewerQueue.data.reviews.some((item) => item.requirementId === 7)
  ) {
    throw new Error('Reviewer access check failed.');
  }

  const summary = await request('/projects/summary', { headers: authHeaders(adminToken) });
  const projects = await request('/projects', { headers: authHeaders(adminToken) });
  const project = await request('/projects/1', { headers: authHeaders(adminToken) });
  const requirements = await request('/projects/1/requirements', { headers: authHeaders(adminToken) });
  const users = await request('/auth/users', { headers: authHeaders(adminToken) });

  if (
    !summary.data.activeProjects ||
    !Array.isArray(projects.data.projects) ||
    !project.data.name ||
    !Array.isArray(requirements.data.requirements) ||
    !Array.isArray(users.data.users)
  ) {
    throw new Error('Project API returned an unexpected response.');
  }

  const uniqueCode = `SMOKE-${Date.now()}`;

  await request('/projects', {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      name: 'Invalid Smoke Project',
      code: `${uniqueCode}-INVALID`,
      description: 'This project must be rejected because its due date is null.',
      dueDate: null,
      leadId: 2,
    },
    expectedStatus: 400,
  });

  const createdProject = await request('/projects', {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      name: 'Smoke Test Sign-Off',
      code: uniqueCode,
      description: 'Temporary project created by the API smoke test.',
      dueDate: '2026-12-31',
      leadId: 2,
    },
    expectedStatus: 201,
  });

  const createdProjectId = createdProject.data.project.id;

  await request(`/projects/${createdProjectId}/team`, {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      userId: 3,
      role: 'contributor',
    },
    expectedStatus: 201,
  });

  await request(`/projects/${createdProjectId}/team`, {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      userId: 4,
      role: 'contributor',
    },
    expectedStatus: 201,
  });

  const createdRequirement = await request(`/projects/${createdProjectId}/requirements`, {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      title: 'Upload smoke test proof',
      description: 'Attach proof so the smoke test can verify creation flow.',
      dueDate: '2026-12-15',
      assignedContributorId: 3,
    },
    expectedStatus: 201,
  });

  if (!createdRequirement.data.requirement.id) {
    throw new Error('Requirement creation did not return an ID.');
  }

  const createdRequirementId = createdRequirement.data.requirement.id;

  const file = multipartFile(
    'file',
    'smoke-evidence.txt',
    'text/plain',
    `Smoke test evidence created at ${new Date().toISOString()}`
  );

  await request(`/requirements/${createdRequirementId}/evidence`, {
    method: 'POST',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': file.contentType,
    },
    rawBody: file.body,
    expectedStatus: 403,
  });

  await request(`/requirements/${createdRequirementId}/evidence`, {
    method: 'POST',
    headers: {
      ...authHeaders(secondContributorToken),
      'Content-Type': file.contentType,
    },
    rawBody: file.body,
    expectedStatus: 403,
  });

  const upload = await request(`/requirements/${createdRequirementId}/evidence`, {
    method: 'POST',
    headers: {
      ...authHeaders(contributorToken),
      'Content-Type': file.contentType,
    },
    rawBody: file.body,
    expectedStatus: 201,
  });

  if (!upload.data.id || upload.data.reviewDecision !== 'submitted') {
    throw new Error('Evidence upload did not return the expected submitted evidence.');
  }

  const privateEvidence = await request(`/requirements/${createdRequirementId}/evidence`, {
    headers: authHeaders(secondContributorToken),
  });

  if (privateEvidence.data.evidence.some((item) => item.id === upload.data.id)) {
    throw new Error('Evidence privacy check failed: another contributor can see the uploaded file.');
  }

  const privateRequirementList = await request(
    `/projects/${createdProjectId}/requirements`,
    { headers: authHeaders(secondContributorToken) }
  );
  const privateRequirement = privateRequirementList.data.requirements.find(
    (item) => item.id === createdRequirementId
  );

  if (!privateRequirement || privateRequirement.evidenceCount !== 0 || privateRequirement.latestEvidence) {
    throw new Error('Requirement list privacy check failed: another contributor can see evidence metadata.');
  }

  await request(`/projects/${createdProjectId}/team/3`, {
    method: 'DELETE',
    headers: authHeaders(adminToken),
    expectedStatus: 409,
  });

  await request(`/evidence/${upload.data.id}/review`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(contributorToken),
      'Content-Type': 'application/json',
    },
    body: {
      decision: 'approved',
      notes: 'Contributor should not be able to approve evidence.',
    },
    expectedStatus: 403,
  });

  const review = await request(`/evidence/${upload.data.id}/review`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(adminToken),
      'Content-Type': 'application/json',
    },
    body: {
      decision: 'approved',
      notes: 'Smoke test approved.',
    },
  });

  if (review.data.reviewDecision !== 'approved') {
    throw new Error('Admin review did not update the evidence decision.');
  }

  const download = await request(`/evidence/${upload.data.id}/file`, {
    headers: authHeaders(adminToken),
  });

  if (!download.raw.length) {
    throw new Error('Evidence download returned an empty file.');
  }

  await request(`/projects/${createdProjectId}`, {
    method: 'DELETE',
    headers: authHeaders(adminToken),
    expectedStatus: 204,
  });

  await request(`/evidence/${upload.data.id}`, {
    headers: authHeaders(adminToken),
    expectedStatus: 404,
  });

  console.log('API smoke test passed.');
  console.log(`Projects: ${summary.data.activeProjects}`);
  console.log(`First project: ${project.data.name}`);
  console.log(`Requirements on first project: ${requirements.data.requirements.length}`);
  console.log(`Created project: ${createdProject.data.project.name}`);
  console.log(`Uploaded and reviewed evidence ID: ${upload.data.id}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
