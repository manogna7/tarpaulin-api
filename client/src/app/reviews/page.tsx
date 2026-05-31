"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, FileSearch } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  downloadEvidenceFile,
  getReviewQueue,
  reviewEvidence,
  type Evidence,
  type ReviewStatus,
} from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tarpaulin_token");

    if (!token) {
      router.push("/");
      return;
    }

    getReviewQueue(token)
      .then(setReviews)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load reviews."),
      );
  }, [router]);

  async function handleReview(event: FormEvent<HTMLFormElement>, evidenceId: number) {
    event.preventDefault();
    const token = localStorage.getItem("tarpaulin_token");
    const formData = new FormData(event.currentTarget);
    const notes = String(formData.get("notes") || "");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = (submitter?.value || "approved") as ReviewStatus;

    if (!token) {
      router.push("/");
      return;
    }

    setError("");
    setStatus("");

    try {
      const updatedReview = await reviewEvidence(token, evidenceId, decision, notes);
      setReviews((current) =>
        current.map((item) => (item.id === evidenceId ? updatedReview : item)),
      );
      setStatus("Review saved.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review.");
    }
  }

  async function handleDownload(item: Evidence) {
    const token = localStorage.getItem("tarpaulin_token");

    if (!token) {
      router.push("/");
      return;
    }

    setError("");
    setStatus("");

    try {
      await downloadEvidenceFile(token, item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download evidence.");
    }
  }

  return (
    <AppShell
      active="reviews"
      eyebrow="Reviews"
      title="Evidence review queue"
      description="Approve submitted proof, reject it, or ask the contributor for changes."
    >
      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-zinc-950">Review queue</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Evidence visible to project leads and admins.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
            {reviews.length} files
          </span>
        </div>

        {error ? (
          <p className="m-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {status ? (
          <p className="m-5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            {status}
          </p>
        ) : null}

        <div className="divide-y divide-zinc-100">
          {reviews.map((item) => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <Link
                  href={`/requirements/${item.requirementId}`}
                  className="flex min-w-0 items-start gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <FileSearch size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-950">{item.fileName}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Requirement #{item.requirementId} - Uploaded{" "}
                      {formatDate(item.uploadedAt)}
                    </p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.reviewDecision} />
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <Link
                    href={`/requirements/${item.requirementId}`}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    Open
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <form
                onSubmit={(event) => handleReview(event, item.id)}
                className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]"
              >
                <input
                  name="notes"
                  placeholder="Review note"
                  maxLength={1000}
                  className="h-10 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
                <button
                  name="decision"
                  value="approved"
                  className="h-10 rounded-lg bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Approve
                </button>
                <button
                  name="decision"
                  value="needs_changes"
                  className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Needs changes
                </button>
                <button
                  name="decision"
                  value="rejected"
                  className="h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Reject
                </button>
              </form>

              {item.reviewNotes ? (
                <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-600">
                  {item.reviewNotes}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {!error && reviews.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">No evidence is waiting right now</p>
            <p className="mt-1 text-sm text-zinc-500">
              Submitted evidence will appear here for review.
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
