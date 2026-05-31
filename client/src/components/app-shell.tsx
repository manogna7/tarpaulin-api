"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";

type AppShellProps = {
  active: "dashboard" | "projects" | "reviews";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    icon: ClipboardList,
  },
  {
    key: "reviews",
    label: "Reviews",
    href: "/reviews",
    icon: ShieldCheck,
  },
] as const;

function clearSession() {
  localStorage.removeItem("tarpaulin_token");
  localStorage.removeItem("tarpaulin_role");
  localStorage.removeItem("tarpaulin_user_id");
  window.location.href = "/";
}

export function AppShell({
  active,
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f7f9] text-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white px-4 py-5 lg:flex lg:flex-col">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-2 py-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-white shadow-sm">
              <Building2 size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Tarpaulin
              </p>
              <h1 className="truncate text-sm font-semibold text-zinc-950">
                Project Sign-Offs
              </h1>
            </div>
          </Link>

          <nav className="mt-7 space-y-1 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={[
                    "flex h-10 items-center gap-3 rounded-lg px-3 font-medium transition",
                    isActive
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <p className="text-sm font-semibold text-zinc-900">
                Sign-off flow
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Protected evidence uploads, review decisions, and role-based
              access are wired into the live API.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={clearSession}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>

            <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto text-sm lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={[
                      "flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 font-medium",
                      isActive
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600",
                    ].join(" ")}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-5 lg:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
