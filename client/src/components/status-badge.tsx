import type { ReviewStatus } from "@/lib/api";

type StatusBadgeProps = {
  status: ReviewStatus | "active" | "not_started" | "overdue" | string;
};

const statusStyles: Record<string, string> = {
  active: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  in_review: "border-amber-200 bg-amber-50 text-amber-700",
  needs_changes: "border-orange-200 bg-orange-50 text-orange-700",
  not_started: "border-zinc-200 bg-zinc-50 text-zinc-600",
  overdue: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  submitted: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex h-7 w-fit items-center rounded-full border px-2.5 text-xs font-semibold capitalize",
        statusStyles[status] || "border-zinc-200 bg-zinc-50 text-zinc-600",
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}
