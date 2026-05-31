const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export type LoginResponse = {
  token: string;
  user: Contributor;
};

export type DashboardSummary = {
  activeProjects: number;
  openRequirements: number;
  evidenceWaitingForReview: number;
  blockedRequirements: number;
  dueSoon: number;
  overdue: number;
};

export type Project = {
  id: number;
  code: string;
  name: string;
  description: string;
  dueDate: string;
  status: string;
  leadId: number;
  lead?: Contributor | null;
  requirementCount?: number;
  approvedRequirements?: number;
  blockedRequirements?: number;
};

export type Contributor = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

export type Requirement = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  dueDate: string;
  status: ReviewStatus | "not_started" | "overdue";
  evidenceCount: number;
  latestEvidence: Evidence | null;
  assignedContributorId?: number | null;
  assignedContributor?: Contributor | null;
};

export type ProjectTeam = {
  lead: Contributor | null;
  contributors: Contributor[];
};

export type ReviewStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "needs_changes"
  | "rejected"
  | "blocked";

export type Evidence = {
  id: number;
  requirementId: number;
  contributorId: number;
  fileName: string;
  fileType: string | null;
  uploadedAt: string;
  reviewDecision: ReviewStatus;
  reviewNotes: string;
  reviewedAt: string | null;
  reviewerId: number | null;
  downloadUrl: string;
};

type ApiResponse = Record<string, unknown> & {
  error?: string;
};

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
  });
  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }

  return data as T;
}

async function readResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function getDashboardSummary(token: string) {
  return request<DashboardSummary>("/projects/summary", {
    headers: authHeaders(token),
  });
}

export async function getProjects(token: string) {
  const data = await request<{ projects: Project[] }>("/projects", {
    headers: authHeaders(token),
  });

  return data.projects;
}

export async function getProject(token: string, projectId: string) {
  return request<Project>(`/projects/${projectId}`, {
    headers: authHeaders(token),
  });
}

export async function getProjectTeam(token: string, projectId: string) {
  return request<ProjectTeam>(
    `/projects/${projectId}/team`,
    {
      headers: authHeaders(token),
    },
  );
}

export async function getProjectRequirements(token: string, projectId: string) {
  const data = await request<{ requirements: Requirement[] }>(
    `/projects/${projectId}/requirements`,
    {
      headers: authHeaders(token),
    },
  );

  return data.requirements;
}

export async function getRequirement(token: string, requirementId: string) {
  return request<Requirement>(`/requirements/${requirementId}`, {
    headers: authHeaders(token),
  });
}

export async function getRequirementEvidence(token: string, requirementId: string) {
  const data = await request<{ evidence: Evidence[] }>(
    `/requirements/${requirementId}/evidence`,
    {
      headers: authHeaders(token),
    },
  );

  return data.evidence;
}

export async function getUsers(token: string) {
  const data = await request<{ users: Contributor[] }>("/auth/users", {
    headers: authHeaders(token),
  });

  return data.users;
}

export async function createProject(
  token: string,
  payload: {
    name: string;
    code: string;
    description: string;
    dueDate: string;
    leadId?: number;
  },
) {
  const data = await request<{ project: Project }>("/projects", {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return data.project;
}

export async function updateProject(
  token: string,
  projectId: string,
  payload: Partial<{
    name: string;
    code: string;
    description: string;
    dueDate: string;
    status: string;
    leadId: number;
  }>,
) {
  const data = await request<{ project: Project }>(`/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return data.project;
}

export async function deleteProject(token: string, projectId: string) {
  await request<Record<string, never>>(`/projects/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function addProjectMember(
  token: string,
  projectId: string,
  payload: {
    userId: number;
    role: "contributor" | "reviewer";
  },
) {
  const data = await request<{ contributor: Contributor }>(
    `/projects/${projectId}/team`,
    {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return data.contributor;
}

export async function removeProjectMember(
  token: string,
  projectId: string,
  userId: number,
) {
  await request<Record<string, never>>(`/projects/${projectId}/team/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function createRequirement(
  token: string,
  projectId: string,
  payload: {
    title: string;
    description: string;
    dueDate: string;
    assignedContributorId?: number | null;
  },
) {
  const data = await request<{ requirement: Requirement }>(
    `/projects/${projectId}/requirements`,
    {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return data.requirement;
}

export async function updateRequirement(
  token: string,
  requirementId: string,
  payload: Partial<{
    title: string;
    description: string;
    dueDate: string;
    assignedContributorId: number | null;
  }>,
) {
  return request<Requirement>(`/requirements/${requirementId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteRequirement(token: string, requirementId: string) {
  await request<Record<string, never>>(`/requirements/${requirementId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function uploadEvidence(
  token: string,
  requirementId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/requirements/${requirementId}/evidence`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    },
  );
  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Unable to upload evidence.");
  }

  return data as Evidence;
}

export async function getReviewQueue(token: string) {
  const data = await request<{ reviews: Evidence[] }>("/reviews", {
    headers: authHeaders(token),
  });

  return data.reviews;
}

export async function reviewEvidence(
  token: string,
  evidenceId: number,
  decision: ReviewStatus,
  notes: string,
) {
  return request<Evidence>(`/evidence/${evidenceId}/review`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ decision, notes }),
  });
}

export async function downloadEvidenceFile(token: string, evidence: Evidence) {
  const response = await fetch(`${API_BASE_URL}${evidence.downloadUrl}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const data = await readResponse(response);
    throw new Error(data.error || "Unable to download evidence file.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = evidence.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
