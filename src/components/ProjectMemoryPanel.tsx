"use client";

import type { Project, ProjectArtifactType, ProjectMemoryEntry, ProjectMemoryField, ProjectMemorySource } from "@/lib/types";

const MEMORY_BUCKETS: Array<{
  field: ProjectMemoryField;
  title: string;
  description: string;
}> = [
  {
    field: "icp",
    title: "Ideal customer profile",
    description: "Who the project appears to serve best.",
  },
  {
    field: "constraints",
    title: "Constraints",
    description: "Limits or friction the system should keep in view.",
  },
  {
    field: "hypotheses",
    title: "Hypotheses",
    description: "Claims that still need evidence or resolution.",
  },
  {
    field: "experiments",
    title: "Experiments",
    description: "Validation moves the team should remember and revisit.",
  },
  {
    field: "validatedFindings",
    title: "Validated findings",
    description: "Evidence the system is confident carrying forward.",
  },
];

function getArtifactTypeLabel(type: ProjectArtifactType) {
  return type === "customer-research-memo" ? "Customer research memo" : "Validation scorecard";
}

function getConfidenceClasses(confidence: ProjectMemoryEntry["confidence"]) {
  if (confidence === "validated") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (confidence === "supported") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-200 text-stone-700";
}

function formatRevisionLabel(revisionId: string, revisionNumber?: number) {
  if (typeof revisionNumber === "number" && Number.isFinite(revisionNumber)) {
    return `Revision ${revisionNumber}`;
  }

  const fallbackNumber = revisionId.match(/revision-(\d+)/i)?.[1];
  return fallbackNumber ? `Revision ${fallbackNumber}` : "Saved revision";
}

function formatUpdatedLabel(timestamp: string) {
  const parsed = Date.parse(timestamp);

  if (Number.isNaN(parsed)) {
    return "Updated date unavailable";
  }

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)}`;
}

function buildArtifactReference(source: ProjectMemorySource, project: Project) {
  const matchingArtifact = project.artifacts?.find((artifact) => artifact.id === source.artifactId);
  const matchingRevision =
    matchingArtifact?.revisionHistory?.find((revision) => revision.id === source.revisionId) ??
    (matchingArtifact?.currentRevision?.id === source.revisionId ? matchingArtifact.currentRevision : undefined);

  return {
    id: `${source.artifactId}:${source.revisionId}`,
    title: matchingArtifact?.title ?? getArtifactTypeLabel(source.artifactType),
    typeLabel: matchingArtifact ? getArtifactTypeLabel(matchingArtifact.type) : getArtifactTypeLabel(source.artifactType),
    revisionLabel: formatRevisionLabel(source.revisionId, matchingRevision?.number),
    updatedLabel: formatUpdatedLabel(source.updatedAt),
  };
}

function MemoryEntryCard({ entry, project }: { entry: ProjectMemoryEntry; project: Project }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4" data-testid={`memory-entry-${entry.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-stone-900">{entry.label}</h4>
          <p className="mt-2 text-sm leading-6 text-stone-700">{entry.content}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getConfidenceClasses(entry.confidence)}`}
        >
          {entry.confidence}
        </span>
      </div>
      <div className="mt-4 border-t border-stone-200 pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Artifact references</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {entry.sources.map((source) => {
            const reference = buildArtifactReference(source, project);

            return (
              <div
                key={reference.id}
                className="rounded-2xl border border-stone-200 bg-[#fcfaf6] px-3 py-2"
                data-testid={`memory-source-${source.artifactId}`}
              >
                <div className="text-xs font-medium text-stone-800">{reference.title}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-stone-500">{reference.typeLabel}</div>
                <div className="mt-2 text-xs text-stone-600">{reference.revisionLabel}</div>
                <div className="mt-1 text-xs text-stone-500">{reference.updatedLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function ProjectMemoryPanel({ project }: { project: Project }) {
  const memory = project.projectMemory;
  const hasAnyMemory = MEMORY_BUCKETS.some((bucket) => (memory?.[bucket.field] ?? []).length > 0);

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm" data-testid="project-memory-panel">
      <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Project memory</div>
        <h2 className="mt-2 text-xl font-semibold text-stone-950">What the workspace is carrying forward</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          This is workspace-level memory promoted from saved artifacts, so you can inspect what carries across runs
          instead of only what belongs to the active artifact.
        </p>
      </div>

      {!hasAnyMemory ? (
        <div className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-[#fcfaf6] p-5 text-sm leading-6 text-stone-600">
          No workspace memory has been promoted yet. Generate or refine artifacts like the validation scorecard and
          customer research memo, and reusable facts will appear here with their source references across future runs.
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {MEMORY_BUCKETS.map((bucket) => {
          const entries = memory?.[bucket.field] ?? [];

          return (
            <section
              key={bucket.field}
              className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4"
              data-testid={`memory-bucket-${bucket.field}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">{bucket.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{bucket.description}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                  {entries.length} item{entries.length === 1 ? "" : "s"}
                </span>
              </div>

              {entries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {entries.map((entry) => (
                    <MemoryEntryCard key={entry.id} entry={entry} project={project} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                  Nothing saved here yet. This bucket fills when reusable workspace memory is promoted from artifact
                  output.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
