"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  ListChecks,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  getDashboardSummary,
  getProjects,
  type DashboardSummary,
  type Project,
} from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tarpaulin_token");
    const storedRole = localStorage.getItem("tarpaulin_role") || "user";

    if (!token) {
      window.location.href = "/";
      return;
    }

    Promise.all([getProjects(token), getDashboardSummary(token)])
      .then(([loadedProjects, loadedSummary]) => {
        setProjects(loadedProjects);
        setSummary(loadedSummary);
        setCurrentRole(storedRole);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load dashboard."),
      );
  }, []);

  const highlightedProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const openRequirements = summary?.openRequirements ?? 0;
  const blockedRequirements = summary?.blockedRequirements ?? 0;
  const waitingReview = summary?.evidenceWaitingForReview ?? 0;
  const needsAttention = blockedRequirements + waitingReview + (summary?.overdue ?? 0);
  const flowHealth =
    openRequirements > 0
      ? Math.max(0, Math.round(((openRequirements - needsAttention) / openRequirements) * 100))
      : 100;

  return (
    <AppShell
      active="dashboard"
      eyebrow="Dashboard"
      title="Project sign-offs"
      description="See which requirements are complete, waiting for review, or blocking a deadline."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ListChecks}
          label="Active projects"
          value={summary?.activeProjects ?? "--"}
          detail="Tracked checklists"
          tone="cyan"
        />
        <MetricCard
          icon={FileWarning}
          label="Open requirements"
          value={summary?.openRequirements ?? "--"}
          detail="Still need sign-off"
          tone="sky"
        />
        <MetricCard
          icon={UploadCloud}
          label="Waiting review"
          value={summary?.evidenceWaitingForReview ?? "--"}
          detail="Evidence submitted"
          tone="amber"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Blocked"
          value={summary?.blockedRequirements ?? "--"}
          detail="Needs action"
          tone="rose"
        />
      </div>

      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-zinc-950">Projects needing attention</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Open a project to check missing proof, review status, and deadline risk.
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100">
            {highlightedProjects.map((project) => (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-zinc-50 md:grid-cols-[1fr_8rem_8rem]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-950">{project.name}</p>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                      {project.code}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {project.description}
                  </p>
                </div>
                <div className="text-sm text-zinc-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Due
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {formatDate(project.dueDate)}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
          </div>

          {!error && highlightedProjects.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              No projects found. Seed the database to load the demo workflow.
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Flow health</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                  {flowHealth}%
                </p>
              </div>
              <CheckCircle2 className="text-cyan-600" size={28} />
            </div>
            <div className="mt-5 h-2 rounded-full bg-zinc-100">
              <div
                className="h-2 rounded-full bg-cyan-600"
                style={{ width: `${flowHealth}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Based on open work minus blocked, overdue, and waiting-review items.
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-950">Today</h3>
            <div className="mt-4 space-y-3 text-sm">
              <ActionRow
                icon={Clock3}
                label="Due soon"
                value={summary?.dueSoon ?? "--"}
              />
              <ActionRow
                icon={FileWarning}
                label="Overdue"
                value={summary?.overdue ?? "--"}
              />
              <ActionRow
                icon={ShieldCheck}
                label="Signed in as"
                value={currentRole.replace("_", " ") || "user"}
              />
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

const toneStyles = {
  amber: "bg-amber-50 text-amber-700",
  cyan: "bg-cyan-50 text-cyan-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-sky-700",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string | number;
  detail: string;
  tone: keyof typeof toneStyles;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className={["rounded-lg p-2", toneStyles[tone]].join(" ")}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 capitalize">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </section>
  );
}

function ActionRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="flex items-center gap-2 text-zinc-600">
        <Icon size={15} />
        {label}
      </span>
      <span className="font-semibold capitalize text-zinc-950">{value}</span>
    </div>
  );
}
