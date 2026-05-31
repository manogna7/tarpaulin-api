"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { login } from "@/lib/api";

type LoginState = {
  email: string;
  password: string;
};

type DecodedToken = {
  id?: number;
  role?: string;
};

const demoUsers = [
  {
    label: "Admin",
    email: "admin@tarpaulin.local",
    password: "adminpass",
    description: "Manage every project",
  },
  {
    label: "Contributor",
    email: "contributor@tarpaulin.local",
    password: "contributorpass",
    description: "Submit required proof",
  },
  {
    label: "Project Lead",
    email: "lead@tarpaulin.local",
    password: "leadpass",
    description: "Create and review work",
  },
];

const workflowItems = [
  {
    icon: ClipboardCheck,
    label: "Project sign-offs",
    detail: "Track required proof",
  },
  {
    icon: FileCheck2,
    label: "Requirements",
    detail: "Know what is missing",
  },
  {
    icon: ShieldCheck,
    label: "Reviews",
    detail: "Approve or request changes",
  },
];

function decodeToken(token: string): DecodedToken {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload)) as DecodedToken;
  } catch {
    return {};
  }
}

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState<LoginState>({
    email: "admin@tarpaulin.local",
    password: "adminpass",
  });
  const [selectedDemo, setSelectedDemo] = useState("Admin");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const data = await login(form.email, form.password);
      const decoded = decodeToken(data.token);
      const role = data.user.role || decoded.role || "";
      const userId = data.user.id || decoded.id || "";

      localStorage.setItem("tarpaulin_token", data.token);
      localStorage.setItem("tarpaulin_role", role);
      localStorage.setItem("tarpaulin_user_id", String(userId));

      setStatus(`Signed in as ${role.replace("_", " ") || "user"}. Opening workspace.`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectDemoUser(user: (typeof demoUsers)[number]) {
    setSelectedDemo(user.label);
    setForm({ email: user.email, password: user.password });
    setError("");
    setStatus("");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex min-h-[46rem] flex-col justify-between bg-zinc-950 px-6 py-6 text-white md:px-10 lg:min-h-screen lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-zinc-950 shadow-sm">
                <Building2 size={23} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  Tarpaulin
                </p>
                <h1 className="text-lg font-semibold">Project Sign-Offs</h1>
              </div>
            </div>

            <span className="hidden rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200 sm:inline-flex">
              Demo workspace
            </span>
          </div>

          <div className="max-w-3xl py-16 lg:py-20">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Project sign-offs without the spreadsheet chase
            </p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl">
              See what is done, waiting for review, or blocking a deadline.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300">
              Tarpaulin helps teams collect proof for project requirements.
              Leads assign the work, contributors upload evidence, and reviewers
              approve it or ask for changes.
            </p>

            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {workflowItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
                  >
                    <Icon className="text-cyan-300" size={20} />
                    <p className="mt-4 text-sm font-semibold text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 text-sm text-zinc-300 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold text-white">RBAC</p>
              <p className="mt-1">Lead, reviewer, contributor, admin access</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">Docker</p>
              <p className="mt-1">API, MySQL, Redis, and file uploads</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">REST</p>
              <p className="mt-1">Projects, requirements, evidence, reviews</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 lg:px-8">
          <div className="w-full max-w-[28rem]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-700">
                  Secure workspace
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Sign in
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                <LockKeyhole size={18} />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_rgba(24,24,27,0.10)]">
              <div className="mb-5 grid gap-2 sm:grid-cols-3">
                {demoUsers.map((user) => (
                  <button
                    key={user.label}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => selectDemoUser(user)}
                    className={[
                      "rounded-lg border px-3 py-3 text-left transition",
                      selectedDemo === user.label
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">
                      {user.label}
                    </span>
                    <span className="mt-1 block text-xs opacity-75">
                      {user.description}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Email
                  </span>
                  <input
                    suppressHydrationWarning
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Password
                  </span>
                  <input
                    suppressHydrationWarning
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    type="password"
                    autoComplete="current-password"
                  />
                </label>

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                {status ? (
                  <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                    {status}
                  </p>
                ) : null}

                <button
                  type="submit"
                  suppressHydrationWarning
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {isSubmitting ? "Signing in" : "Open projects"}
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <CheckCircle2 size={15} className="text-cyan-700" />
                Demo accounts are included so the workflow is easy to review.
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <UsersRound className="text-zinc-500" size={18} />
                <p className="mt-3 font-semibold">Role-aware</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Session state drives access.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <ShieldCheck className="text-zinc-500" size={18} />
                <p className="mt-3 font-semibold">API-backed</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Data comes from Express.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
