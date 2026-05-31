"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  UploadCloud,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  downloadEvidenceFile,
  getRequirement,
  getRequirementEvidence,
  reviewEvidence,
  uploadEvidence,
  type Evidence,
  type Requirement,
  type ReviewStatus,
} from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function RequirementDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const requirementId = typeof params?.id === "string" ? params.id : "";
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tarpaulin_token");
    const storedRole = localStorage.getItem("tarpaulin_role") || "user";

    if (!token) {
      router.push("/");
      return;
    }

    if (!requirementId) {
      return;
    }

    const accessToken = token;

    async function loadRequirement() {
      setIsLoading(true);
      setError("");

      try {
        const [loadedRequirement, loadedEvidence] = await Promise.all([
          getRequirement(accessToken, requirementId),
          getRequirementEvidence(accessToken, requirementId),
        ]);

        setRequirement(loadedRequirement);
        setEvidence(loadedEvidence);
        setCurrentRole(storedRole);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load requirement.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRequirement();
  }, [requirementId, router]);

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
      const updatedEvidence = await reviewEvidence(token, evidenceId, decision, notes);
      setEvidence((current) =>
        current.map((item) => (item.id === evidenceId ? updatedEvidence : item)),
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

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("tarpaulin_token");
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!token) {
      router.push("/");
      return;
    }

    if (!requirementId || !(file instanceof File) || file.size === 0) {
      setError("Choose a file before uploading evidence.");
      return;
    }

    setIsUploading(true);
    setError("");
    setStatus("");

    try {
      const uploadedEvidence = await uploadEvidence(token, requirementId, file);
      const refreshedRequirement = await getRequirement(token, requirementId);
      setEvidence((current) => [uploadedEvidence, ...current]);
      setRequirement(refreshedRequirement);
      setStatus("Evidence uploaded and marked as waiting for review.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload evidence.");
    } finally {
      setIsUploading(false);
    }
  }

  const canReview = ["admin", "project_lead"].includes(currentRole);
  const canSubmit = currentRole === "contributor";

  return (
    <AppShell
      active="projects"
      eyebrow="Requirement"
      title={requirement ? requirement.title : "Requirement"}
      description="Review the requested proof, evidence files, and latest approval decision."
    >
      <Link
        href={requirement ? `/projects/${requirement.projectId}` : "/projects"}
        className="mb-5 inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <ArrowLeft size={15} />
        Back to project
      </Link>

      {isLoading ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          Loading requirement...
        </section>
      ) : null}

      {error ? (
        <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          {status}
        </p>
      ) : null}

      {!isLoading && requirement && !error ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <FileText className="text-cyan-700" size={24} />
                  <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                    {requirement.title}
                  </h3>
                </div>
                <StatusBadge status={requirement.status} />
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {requirement.description}
              </p>

              <div className="mt-5 grid gap-3 text-sm">
                <InfoRow
                  icon={Clock3}
                  label="Due"
                  value={formatDate(requirement.dueDate)}
                />
                <InfoRow
                  icon={CheckCircle2}
                  label="Evidence files"
                  value={String(requirement.evidenceCount)}
                />
                <InfoRow
                  icon={FileText}
                  label="Assigned to"
                  value={requirement.assignedContributor?.name || "Unassigned"}
                />
              </div>
            </div>

            {canSubmit ? (
              <form
                onSubmit={handleUpload}
                className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 shadow-sm"
              >
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-900">
                    Upload evidence
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500">
                    PDF, image, text, CSV, or Word files up to 10 MB.
                  </span>
                  <input
                    name="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,application/pdf,image/png,image/jpeg,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="mt-4 block w-full text-sm text-zinc-600 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-3 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-600 px-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  <UploadCloud size={16} />
                  {isUploading ? "Uploading" : "Submit evidence"}
                </button>
              </form>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm">
                Contributors submit evidence here. Leads and admins review the
                files from the evidence list.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h3 className="font-semibold text-zinc-950">Evidence</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Files uploaded by contributors for this requirement.
              </p>
            </div>

            <div className="divide-y divide-zinc-100">
              {evidence.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-950">{item.fileName}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Uploaded {formatDate(item.uploadedAt)} by contributor #
                        {item.contributorId}
                      </p>
                    </div>
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
                    </div>
                  </div>

                  {item.reviewNotes ? (
                    <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-600">
                      {item.reviewNotes}
                    </p>
                  ) : null}

                  {canReview ? (
                    <form
                      onSubmit={(event) => handleReview(event, item.id)}
                      className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]"
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
                    </form>
                  ) : null}
                </div>
              ))}
            </div>

            {evidence.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-zinc-500">
                No evidence has been submitted yet.
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="flex items-center gap-2 text-zinc-600">
        <Icon size={15} />
        {label}
      </span>
      <span className="font-semibold capitalize text-zinc-900">{value}</span>
    </div>
  );
}
