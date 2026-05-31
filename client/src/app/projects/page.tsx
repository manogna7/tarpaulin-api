"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FolderKanban,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  createProject,
  getProjects,
  getUsers,
  type Contributor,
  type Project,
} from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Contributor[]>([]);
  const [query, setQuery] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tarpaulin_token");
    const storedRole = localStorage.getItem("tarpaulin_role") || "";

    if (!token) {
      window.location.href = "/";
      return;
    }

    Promise.all([getProjects(token), getUsers(token)])
      .then(([loadedProjects, loadedUsers]) => {
        setProjects(loadedProjects);
        setUsers(loadedUsers);
        setCurrentRole(storedRole);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load projects."),
      );
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) =>
      [project.name, project.code, project.description, String(project.leadId)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [projects, query]);
  const canCreateProject = ["admin", "project_lead"].includes(currentRole);
  const projectLeads = users.filter((user) =>
    ["admin", "project_lead"].includes(user.role),
  );

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("tarpaulin_token");
    const formData = new FormData(event.currentTarget);

    if (!token) {
      router.push("/");
      return;
    }

    setIsCreating(true);
    setError("");
    setStatus("");

    try {
      const createdProject = await createProject(token, {
        name: String(formData.get("name") || ""),
        code: String(formData.get("code") || ""),
        description: String(formData.get("description") || ""),
        dueDate: String(formData.get("dueDate") || ""),
        leadId: Number(formData.get("leadId") || "") || undefined,
      });

      setProjects((current) => [createdProject, ...current]);
      setStatus("Project created.");
      setShowCreateForm(false);
      event.currentTarget.reset();
      router.push(`/projects/${createdProject.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create project.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AppShell
      active="projects"
      eyebrow="Projects"
      title="Project list"
      description="Open a project to check its team, requirements, evidence, and review status."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile icon={FolderKanban} label="Projects" value={projects.length || "--"} />
        <SummaryTile icon={CalendarDays} label="Planning" value="Due dates" />
        <SummaryTile icon={ShieldCheck} label="Access" value="Role-based" />
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-zinc-200 px-5 py-4 xl:grid-cols-[1fr_auto_22rem] xl:items-center">
          <div>
            <h3 className="font-semibold text-zinc-950">All projects</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {filteredProjects.length} of {projects.length} shown
            </p>
          </div>

          {canCreateProject ? (
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((current) => !current);
                setError("");
                setStatus("");
              }}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {showCreateForm ? <X size={16} /> : <Plus size={16} />}
              {showCreateForm ? "Close" : "New project"}
            </button>
          ) : null}

          <label className="relative block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              suppressHydrationWarning
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by project, code, lead"
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        {error ? (
          <p className="m-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {status ? (
          <p className="m-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {status}
          </p>
        ) : null}

        {showCreateForm ? (
          <form
            onSubmit={handleCreateProject}
            className="grid gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-5 lg:grid-cols-2"
          >
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Project name</span>
              <input
                name="name"
                required
                placeholder="Mobile App Launch Checklist"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Project code</span>
              <input
                name="code"
                required
                placeholder="LAUNCH-001"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm uppercase outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Description</span>
              <textarea
                name="description"
                required
                placeholder="Track the proof needed before this project can move forward."
                className="mt-2 min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Due date</span>
              <input
                name="dueDate"
                required
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            {currentRole === "admin" ? (
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Project lead</span>
                <select
                  name="leadId"
                  className="mt-2 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {projectLeads.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex items-center gap-2 lg:col-span-2">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-zinc-400"
              >
                <Plus size={16} />
                {isCreating ? "Creating" : "Create project"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <th className="px-5 py-3 font-semibold">Project</th>
                <th className="px-5 py-3 font-semibold">Due</th>
                <th className="px-5 py-3 font-semibold">Lead</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="cursor-pointer transition hover:bg-zinc-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                        <FolderKanban size={17} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-950">
                            {project.name}
                          </p>
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                            {project.code}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-zinc-700">
                    {formatDate(project.dueDate)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">Lead #{project.leadId}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    <ArrowRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!error && filteredProjects.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">No matching projects</p>
            <p className="mt-1 text-sm text-zinc-500">
              Adjust your search and try again.
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string | number;
}) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <p className="mt-1 font-semibold text-zinc-950">{value}</p>
      </div>
      <span className="rounded-lg bg-zinc-100 p-2 text-zinc-600">
        <Icon size={18} />
      </span>
    </section>
  );
}
