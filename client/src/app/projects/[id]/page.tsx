"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import {
  addProjectMember,
  createRequirement,
  getProject,
  getProjectRequirements,
  getProjectTeam,
  getUsers,
  removeProjectMember,
  type Contributor,
  type Project,
  type Requirement,
} from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const rawProjectId = params?.id;
  const projectId = typeof rawProjectId === "string" ? rawProjectId : "";
  const [project, setProject] = useState<Project | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [users, setUsers] = useState<Contributor[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isCreatingRequirement, setIsCreatingRequirement] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tarpaulin_token");
    const storedRole = localStorage.getItem("tarpaulin_role") || "";
    const storedUserId = Number(localStorage.getItem("tarpaulin_user_id") || "");

    if (!token) {
      router.push("/");
      return;
    }

    if (!projectId) {
      return;
    }

    const accessToken = token;

    async function loadProjectDetail() {
      setIsLoading(true);
      setError("");

      try {
        const [loadedProject, loadedTeam, loadedRequirements, loadedUsers] =
          await Promise.all([
            getProject(accessToken, projectId),
            getProjectTeam(accessToken, projectId),
            getProjectRequirements(accessToken, projectId),
            getUsers(accessToken),
          ]);

        setProject(loadedProject);
        setContributors(loadedTeam.contributors);
        setRequirements(loadedRequirements);
        setUsers(loadedUsers);
        setCurrentRole(storedRole);
        setCurrentUserId(storedUserId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load project.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectDetail();
  }, [projectId, router]);

  const approvedCount = useMemo(
    () => requirements.filter((requirement) => requirement.status === "approved").length,
    [requirements],
  );
  const blockedCount = useMemo(
    () =>
      requirements.filter((requirement) =>
        ["blocked", "needs_changes", "overdue", "rejected"].includes(requirement.status),
      ).length,
    [requirements],
  );
  const completion =
    requirements.length > 0
      ? Math.round((approvedCount / requirements.length) * 100)
      : 0;
  const canManageProject = Boolean(
    project && (currentRole === "admin" || currentUserId === project.leadId),
  );
  const availableTeamUsers = users.filter(
    (user) =>
      user.id !== project?.leadId &&
      !contributors.some((contributor) => contributor.id === user.id),
  );

  async function reloadProjectDetail(token: string) {
    const [loadedProject, loadedTeam, loadedRequirements] = await Promise.all([
      getProject(token, projectId),
      getProjectTeam(token, projectId),
      getProjectRequirements(token, projectId),
    ]);

    setProject(loadedProject);
    setContributors(loadedTeam.contributors);
    setRequirements(loadedRequirements);
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("tarpaulin_token");
    const formData = new FormData(event.currentTarget);
    const userId = Number(formData.get("userId") || "");
    const role = String(formData.get("role") || "contributor") as
      | "contributor"
      | "reviewer";

    if (!token) {
      router.push("/");
      return;
    }

    setIsSavingTeam(true);
    setError("");
    setStatus("");

    try {
      await addProjectMember(token, projectId, { userId, role });
      await reloadProjectDetail(token);
      setStatus("Team member added.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add team member.");
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    const token = localStorage.getItem("tarpaulin_token");

    if (!token) {
      router.push("/");
      return;
    }

    setError("");
    setStatus("");

    try {
      await removeProjectMember(token, projectId, userId);
      setContributors((current) =>
        current.filter((contributor) => contributor.id !== userId),
      );
      setStatus("Team member removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove team member.");
    }
  }

  async function handleCreateRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("tarpaulin_token");
    const formData = new FormData(event.currentTarget);
    const assignedContributorId = Number(formData.get("assignedContributorId") || "");

    if (!token) {
      router.push("/");
      return;
    }

    setIsCreatingRequirement(true);
    setError("");
    setStatus("");

    try {
      const requirement = await createRequirement(token, projectId, {
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        dueDate: String(formData.get("dueDate") || ""),
        assignedContributorId: assignedContributorId || null,
      });

      setRequirements((current) => [...current, requirement]);
      setStatus("Requirement added.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add requirement.");
    } finally {
      setIsCreatingRequirement(false);
    }
  }

  return (
    <AppShell
      active="projects"
      eyebrow="Project"
      title={project ? project.name : "Project"}
      description="Check the team, required proof, and sign-off status for this project."
    >
      <Link
        href="/projects"
        className="mb-5 inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <ArrowLeft size={15} />
        Back to projects
      </Link>

      {isLoading ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          Loading project...
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status}
        </p>
      ) : null}

      {!isLoading && project && !error ? (
        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                    {project.code}
                  </span>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
                  {project.description}
                </p>
                <div className="mt-5 h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-cyan-600"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {approvedCount} of {requirements.length} requirements approved
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <DetailStat
                  icon={CalendarDays}
                  label="Due"
                  value={formatDate(project.dueDate)}
                  tone="text-sky-700"
                />
                <DetailStat
                  icon={ShieldCheck}
                  label="Project lead"
                  value={project.lead?.name || `Lead #${project.leadId}`}
                  tone="text-cyan-700"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <DetailStat
              icon={UsersRound}
              label="Contributors"
              value={contributors.length || "--"}
              tone="text-amber-700"
            />
            <DetailStat
              icon={FileCheck2}
              label="Requirements"
              value={requirements.length || "--"}
              tone="text-zinc-700"
            />
            <DetailStat
              icon={CheckCircle2}
              label="Needs attention"
              value={blockedCount}
              tone="text-rose-700"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-4">
                <h3 className="font-semibold text-zinc-950">Project team</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  People expected to submit or review proof.
                </p>
              </div>

              {canManageProject ? (
                <form
                  onSubmit={handleAddMember}
                  className="grid gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-4"
                >
                  <label className="text-sm font-medium text-zinc-700">
                    Add person
                  </label>
                  <select
                    name="userId"
                    required
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Choose a user</option>
                    {availableTeamUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      name="role"
                      className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="contributor">Contributor</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSavingTeam || availableTeamUsers.length === 0}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:bg-zinc-400"
                    >
                      <UserPlus size={16} />
                      Add
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="divide-y divide-zinc-100">
                {contributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-950">
                        {contributor.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {contributor.email || `User #${contributor.id}`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold capitalize text-zinc-600">
                      {statusLabel(contributor.role)}
                    </span>
                    {canManageProject ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(contributor.id)}
                        className="shrink-0 rounded-lg border border-red-200 p-2 text-red-700 transition hover:bg-red-50"
                        aria-label={`Remove ${contributor.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-4">
                <h3 className="font-semibold text-zinc-950">Requirements</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Each item needs proof before it can be signed off.
                </p>
              </div>

              {canManageProject ? (
                <form
                  onSubmit={handleCreateRequirement}
                  className="grid gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4 lg:grid-cols-2"
                >
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Requirement title
                    </span>
                    <input
                      name="title"
                      required
                      placeholder="Attach rollback plan"
                      className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Due date
                    </span>
                    <input
                      name="dueDate"
                      required
                      type="date"
                      className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="text-sm font-medium text-zinc-700">
                      Description
                    </span>
                    <textarea
                      name="description"
                      required
                      placeholder="Explain what proof the contributor needs to upload."
                      className="mt-2 min-h-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Assigned contributor
                    </span>
                    <select
                      name="assignedContributorId"
                      className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Unassigned</option>
                      {contributors
                        .filter((contributor) => contributor.role === "contributor")
                        .map((contributor) => (
                          <option key={contributor.id} value={contributor.id}>
                            {contributor.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isCreatingRequirement}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-zinc-400"
                    >
                      <Plus size={16} />
                      {isCreatingRequirement ? "Adding" : "Add requirement"}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="divide-y divide-zinc-100">
                {requirements.map((requirement) => (
                  <Link
                    key={requirement.id}
                    href={`/requirements/${requirement.id}`}
                    className="grid gap-4 px-5 py-4 transition hover:bg-zinc-50 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-950">
                        {requirement.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {requirement.description}
                      </p>
                      <p className="mt-3 text-sm text-zinc-500">
                        Due {formatDate(requirement.dueDate)} -{" "}
                        {requirement.evidenceCount} evidence file
                        {requirement.evidenceCount === 1 ? "" : "s"}
                      </p>
                      {requirement.assignedContributor ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          Assigned to {requirement.assignedContributor.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={requirement.status} />
                      <ArrowRight className="text-zinc-400" size={16} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <Icon className={tone} size={19} />
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
    </section>
  );
}
