"use client";

import { useEffect, useState } from "react";
import FrameworkTemplatePanel from "@/components/FrameworkTemplatePanel";
import type {
  ResearchCitation,
  ResearchReport as ResearchReportData,
  ResearchSource,
  ResearchTrustEvidenceSummary,
} from "@/lib/research";
import type { ProjectResearchArtifact } from "@/lib/types";

type ResearchReportProps = {
  status: "empty" | "loading" | "success" | "error";
  report?: ResearchReportData | null;
  artifact?: ProjectResearchArtifact;
  errorMessage?: string;
  lastUpdatedAt?: string;
  researchQuestion?: string;
  sourceContext?: string;
  onRunResearch?: () => void;
};

type ProgressStageId = "objective" | "scope" | "evidence" | "synthesis" | "actions";
type ProgressState = "complete" | "current" | "pending" | "failed";

type ResearchProgressStage = {
  id: ProgressStageId;
  label: string;
  state: ProgressState;
  detail: string;
};

function getRelevanceClasses(relevance: "high" | "medium" | "low") {
  if (relevance === "high") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (relevance === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-200 text-stone-600";
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSourceMeta(source: Pick<
  ResearchSource,
  "sourceType" | "publicationSignal" | "recencySignal" | "accessibilityStatus" | "publicationDate"
>) {
  return [
    source.sourceType !== "other" ? source.sourceType : null,
    source.publicationSignal && source.publicationSignal !== "unknown" ? source.publicationSignal.replace(/_/g, " ") : null,
    source.recencySignal && source.recencySignal !== "unknown" ? source.recencySignal : null,
    source.accessibilityStatus && source.accessibilityStatus !== "unknown"
      ? source.accessibilityStatus.replace(/_/g, " ")
      : null,
    source.publicationDate ? `published ${source.publicationDate}` : null,
  ].filter(Boolean);
}

function getCitationAnchor(citationId: string) {
  return `citation-${citationId}`;
}

function getSourceAnchor(sourceId: string) {
  return `source-${sourceId}`;
}

function getProgressStateClasses(state: ProgressState) {
  if (state === "complete") {
    return {
      badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
      card: "border-emerald-200 bg-emerald-50",
      label: "Complete",
    };
  }

  if (state === "current") {
    return {
      badge: "border-sky-200 bg-sky-100 text-sky-800",
      dot: "bg-sky-600",
      card: "border-sky-200 bg-sky-50",
      label: "In progress",
    };
  }

  if (state === "failed") {
    return {
      badge: "border-rose-200 bg-rose-100 text-rose-800",
      dot: "bg-rose-600",
      card: "border-rose-200 bg-rose-50",
      label: "Stopped here",
    };
  }

  return {
    badge: "border-stone-200 bg-white text-stone-500",
    dot: "bg-stone-300",
    card: "border-stone-200 bg-white",
    label: "Pending",
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  items.forEach((item) => {
    if (!item.id || seen.has(item.id)) {
      return;
    }

    seen.add(item.id);
    result.push(item);
  });

  return result;
}

function getReportCitations(report?: ResearchReportData | null) {
  if (report?.citations?.length) {
    return dedupeById(report.citations);
  }

  return dedupeById((report?.sections ?? []).flatMap((section) => section.citations));
}

function getOrderedSelectedSources(report?: ResearchReportData | null, artifact?: ProjectResearchArtifact) {
  const sourceInventory = getSourceInventory(report, artifact);
  const sourcesById = new Map(sourceInventory.selected.map((source) => [source.id, source] as const));
  const orderedSourceIds = report?.trust?.sourceIds ?? sourceInventory.selected.map((source) => source.id);

  return dedupeById([
    ...orderedSourceIds.map((sourceId) => sourcesById.get(sourceId)).filter((source): source is ResearchSource => Boolean(source)),
    ...sourceInventory.selected,
  ]);
}

function getFallbackEvidenceSummary(report: ResearchReportData | null | undefined, sourceCount: number, citationCount: number) {
  const claimCount = report?.keyFindings?.length ?? 0;
  const contradictionsCount = report?.contradictions?.length ?? 0;
  const unresolvedQuestionCount = report?.unansweredQuestions?.length ?? 0;
  const overall =
    claimCount === 0
      ? "weak"
      : contradictionsCount === 0 && unresolvedQuestionCount === 0 && (report?.keyFindings ?? []).every((finding) => finding.strength === "strong")
        ? "strong"
        : "moderate";

  return {
    overall,
    summary: `Evidence is ${overall}: ${claimCount} major claim${claimCount === 1 ? "" : "s"}, ${sourceCount} source${
      sourceCount === 1 ? "" : "s"
    }, and ${citationCount} citation${citationCount === 1 ? "" : "s"} retained.`,
    claimCount,
    sourceCount,
    citationCount,
    strongClaimCount: (report?.keyFindings ?? []).filter((finding) => finding.strength === "strong").length,
    moderateClaimCount: (report?.keyFindings ?? []).filter((finding) => finding.strength === "moderate").length,
    weakClaimCount: (report?.keyFindings ?? []).filter((finding) => finding.strength === "weak").length,
    contradictionsCount,
    unresolvedQuestionCount,
  } as const;
}

function getSourceInventory(report?: ResearchReportData | null, artifact?: ProjectResearchArtifact) {
  if (report?.sources?.length) {
    return {
      selected: report.sources,
      rejected: artifact?.sourceInventory?.rejected ?? [],
    };
  }

  if (artifact?.sourceInventory) {
    return artifact.sourceInventory;
  }

  const selected = (artifact?.selectedSources ?? []).map((citation) => ({
    id: `selected-${citation.id}`,
    title: citation.source,
    canonicalId: citation.url ?? citation.source,
    sourceType: citation.sourceType ?? "other",
    status: "selected" as const,
    citationIds: [citation.id],
    sectionIds: [],
    url: citation.url,
    publicationDate: citation.publicationDate,
    publicationSignal: citation.publicationSignal ?? "unknown",
    recencySignal: citation.recencySignal ?? "unknown",
    accessibilityStatus: citation.accessibilityStatus ?? "unknown",
    claimCount: 1,
  }));

  return {
    selected,
    rejected: [],
  };
}

function getLatestFailure(artifact?: ProjectResearchArtifact) {
  const failures = artifact?.failures ?? [];

  return failures.length > 0 ? failures[failures.length - 1] : undefined;
}

function getSourceQualityNextStep(evidenceSummary: ResearchTrustEvidenceSummary) {
  if (evidenceSummary.contradictionsCount > 0) {
    return `Resolve ${evidenceSummary.contradictionsCount} contradiction${
      evidenceSummary.contradictionsCount === 1 ? "" : "s"
    } before committing.`;
  }

  if (evidenceSummary.unresolvedQuestionCount > 0) {
    return `Answer ${evidenceSummary.unresolvedQuestionCount} unresolved question${
      evidenceSummary.unresolvedQuestionCount === 1 ? "" : "s"
    } to de-risk execution.`;
  }

  if (evidenceSummary.overall === "strong") {
    return "Evidence is strong enough to move into execution with light monitoring.";
  }

  if (evidenceSummary.overall === "moderate") {
    return "Proceed with a focused validation step while strengthening weaker claims.";
  }

  return "Gather more high-relevance evidence before making a high-impact decision.";
}

function getNextActionsSummary(report?: ResearchReportData | null, artifact?: ProjectResearchArtifact) {
  if (report?.unansweredQuestions?.length) {
    return `Recommended next actions surfaced ${report.unansweredQuestions.length} open question${
      report.unansweredQuestions.length === 1 ? "" : "s"
    } for follow-up research.`;
  }

  if (report?.caveats?.length) {
    return `Recommended next actions should validate ${report.caveats.length} caveat${
      report.caveats.length === 1 ? "" : "s"
    } before committing to a decision.`;
  }

  const latestFailure = getLatestFailure(artifact);

  if (latestFailure) {
    return `Recommended next actions are blocked until ${latestFailure.stage} issues are resolved.`;
  }

  if (report) {
    return "Recommended next actions are ready from the current memo and supporting evidence.";
  }

  return "Recommended next actions will appear after the memo is synthesized.";
}

function getResearchProgressStages({
  status,
  report,
  artifact,
  researchQuestion,
}: Pick<ResearchReportProps, "status" | "report" | "artifact" | "researchQuestion">): ResearchProgressStage[] {
  const sourceInventory = getSourceInventory(report, artifact);
  const metrics = artifact?.metrics;
  const latestFailure = getLatestFailure(artifact);
  const hasObjective = Boolean((researchQuestion ?? report?.researchQuestion)?.trim());
  const attemptedAngles = metrics?.attemptedAngles;
  const hasPlan = Boolean(artifact?.plan?.steps?.length) || (typeof attemptedAngles === "number" && attemptedAngles > 0);
  const hasEvidence =
    sourceInventory.selected.length > 0 ||
    sourceInventory.rejected.length > 0 ||
    (metrics?.selectedSources ?? 0) > 0 ||
    (metrics?.rejectedSources ?? 0) > 0 ||
    (metrics?.completedSections ?? 0) > 0;
  const hasSynthesis = Boolean(report?.sections?.length) || Boolean(report?.executiveSummary?.trim());
  const hasActions = Boolean(report) || Boolean(latestFailure);
  const scopeDetail = artifact?.plan?.steps?.length
    ? `${artifact.plan.steps.length} planned research angle${artifact.plan.steps.length === 1 ? "" : "s"} defined.`
    : typeof attemptedAngles === "number"
      ? `${attemptedAngles} research angle${attemptedAngles === 1 ? "" : "s"} attempted.`
      : "Source scope has not been defined yet.";
  const evidenceDetail = hasEvidence
    ? `${metrics?.selectedSources ?? sourceInventory.selected.length} selected source${
        (metrics?.selectedSources ?? sourceInventory.selected.length) === 1 ? "" : "s"
      } and ${metrics?.rejectedSources ?? sourceInventory.rejected.length} rejected.`
    : "Evidence gathering has not retained sources yet.";
  const synthesisDetail = hasSynthesis
    ? `${report?.sections?.length ?? metrics?.completedSections ?? 0} synthesized section${
        (report?.sections?.length ?? metrics?.completedSections ?? 0) === 1 ? "" : "s"
      } are available in the memo.`
    : "Synthesis has not produced a memo yet.";
  const actionsDetail = getNextActionsSummary(report, artifact);

  const stages: ResearchProgressStage[] = [
    {
      id: "objective",
      label: "Objective",
      state: hasObjective ? "complete" : status === "loading" ? "current" : "pending",
      detail: hasObjective
        ? researchQuestion ?? report?.researchQuestion ?? "Research objective captured."
        : "Waiting for a research objective.",
    },
    {
      id: "scope",
      label: "Source scope",
      state: "pending",
      detail: scopeDetail,
    },
    {
      id: "evidence",
      label: "Evidence gathering",
      state: "pending",
      detail: evidenceDetail,
    },
    {
      id: "synthesis",
      label: "Synthesis",
      state: "pending",
      detail: synthesisDetail,
    },
    {
      id: "actions",
      label: "Recommended next actions",
      state: "pending",
      detail: actionsDetail,
    },
  ];

  if (hasPlan) {
    stages[1].state = "complete";
  }

  if (hasEvidence) {
    stages[2].state = "complete";
  }

  if (hasSynthesis) {
    stages[3].state = "complete";
  }

  if (hasActions) {
    stages[4].state = hasSynthesis ? "complete" : "pending";
  }

  if (status === "loading") {
    const currentIndex = stages.findIndex((stage) => stage.state !== "complete");

    if (currentIndex >= 0) {
      stages[currentIndex] = {
        ...stages[currentIndex],
        state: "current",
      };
    }

    return stages;
  }

  if (latestFailure) {
    const failureIndex =
      latestFailure.stage === "plan" ? 1 : latestFailure.stage === "gather" ? 2 : latestFailure.stage === "report" ? 3 : -1;

    if (failureIndex >= 0) {
      const stoppedState = status === "error" || artifact?.status === "failed" ? "failed" : "current";

      stages[failureIndex] = {
        ...stages[failureIndex],
        state: stoppedState,
        detail: latestFailure.message,
      };

      for (let index = failureIndex + 1; index < stages.length; index += 1) {
        stages[index] = {
          ...stages[index],
          state: "pending",
        };
      }

      if (failureIndex < stages.length - 1) {
        stages[4] = {
          ...stages[4],
          state: "pending",
          detail: getNextActionsSummary(report, artifact),
        };
      }
    }
  }

  return stages;
}

function ResearchProgress({
  status,
  report,
  artifact,
  researchQuestion,
}: Pick<ResearchReportProps, "status" | "report" | "artifact" | "researchQuestion">) {
  const stages = getResearchProgressStages({ status, report, artifact, researchQuestion });
  const latestFailure = getLatestFailure(artifact);
  const stoppedAtStage = stages.find((stage) => stage.state === "failed" || stage.state === "current");
  const summary =
    status === "loading"
      ? "Research run in progress. Stage details will update as the memo is assembled."
      : latestFailure && (status === "error" || artifact?.status === "failed")
        ? `Run stopped during ${stoppedAtStage?.label.toLowerCase() ?? "research"}: ${latestFailure.message}`
        : latestFailure
          ? `Run completed with issues during ${stoppedAtStage?.label.toLowerCase() ?? "research"}: ${latestFailure.message}`
          : report
            ? "Research run completed across all five stages."
            : "Start a research run to track objective, scope, evidence, synthesis, and next actions.";

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Research progress</div>
          <p className="mt-2 text-sm leading-6 text-stone-600">{summary}</p>
        </div>
        <span className="rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-medium text-stone-600">5 stages</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const stageClasses = getProgressStateClasses(stage.state);

          return (
            <div key={stage.id} className={`rounded-3xl border p-4 ${stageClasses.card}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stageClasses.dot}`} aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Stage {index + 1}
                  </span>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${stageClasses.badge}`}>
                  {stageClasses.label}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-stone-900">{stage.label}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{stage.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CitationReferences({ citationIds, citationsById }: { citationIds: string[]; citationsById: Map<string, ResearchCitation> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citationIds.map((citationId) => {
        const citation = citationsById.get(citationId);

        return (
          <a
            key={citationId}
            href={`#${getCitationAnchor(citationId)}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 underline decoration-stone-300 underline-offset-4"
          >
            {citationId}
            {citation ? ` · ${citation.source}` : ""}
          </a>
        );
      })}
    </div>
  );
}

function SourceReferences({
  sourceIds,
  sourceIndexById,
}: {
  sourceIds: string[];
  sourceIndexById: Map<string, number>;
}) {
  if (sourceIds.length === 0) {
    return <p className="mt-3 text-xs leading-5 text-stone-500">No linked sources.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sourceIds.map((sourceId) => {
        const sourceIndex = sourceIndexById.get(sourceId);

        return (
          <a
            key={sourceId}
            href={`#${getSourceAnchor(sourceId)}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 underline decoration-stone-300 underline-offset-4"
          >
            {sourceIndex ? `S${sourceIndex}` : sourceId}
          </a>
        );
      })}
    </div>
  );
}

function ResearchSummary({
  status,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: Omit<ResearchReportProps, "report">) {
  const buttonLabel =
    status === "loading"
      ? "Updating memo..."
      : status === "success"
        ? "Refresh customer research memo"
        : status === "error"
          ? "Retry customer research memo"
          : "Create customer research memo";

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Workspace artifact
            </div>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">Customer research memo</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Run deep research to create or update the memo attached to this project with evidence, risks, and open questions.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunResearch}
            disabled={status === "loading" || !onRunResearch}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {buttonLabel}
          </button>
        </div>

        {status === "empty" ? (
          <p className="rounded-3xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm leading-6 text-stone-600">
            No customer research memo yet. Run deep research to create one with opportunities, risks, and supporting evidence.
          </p>
        ) : null}

        {status === "loading" ? (
          <div
            className="rounded-3xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900"
            aria-live="polite"
          >
            Updating the customer research memo for this project.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {errorMessage ?? "Deep research failed. Please try again."}
          </div>
        ) : null}

        {researchQuestion || sourceContext || lastUpdatedAt ? (
          <div className="rounded-3xl bg-white px-4 py-4">
            {researchQuestion ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Research question</div>
                <p className="mt-2 text-sm leading-6 text-stone-700">{researchQuestion}</p>
              </>
            ) : null}
            {sourceContext ? (
              <>
                <div className={`${researchQuestion ? "mt-4 " : ""}text-xs font-semibold uppercase tracking-[0.2em] text-stone-500`}>
                  Research context
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-stone-600">{sourceContext}</p>
              </>
            ) : null}
            {lastUpdatedAt ? (
              <p className="mt-4 text-xs leading-5 text-stone-500">Last updated {formatTimestamp(lastUpdatedAt)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ResearchReport({
  status,
  report,
  artifact,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: ResearchReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const selectedSources = artifact?.selectedSources ?? [];
  const rejectedSources = artifact?.rejectedSources ?? [];
  const sourceInventory = getSourceInventory(report, artifact);
  const orderedSelectedSources = getOrderedSelectedSources(report, artifact);
  const failures = artifact?.failures ?? [];
  const metrics = artifact?.metrics;
  const reportCitations = getReportCitations(report);
  const citationsById = new Map(reportCitations.map((citation) => [citation.id, citation] as const));
  const sourceIndexById = new Map(orderedSelectedSources.map((source, index) => [source.id, index + 1] as const));
  const citationSourceIds = new Map<string, string[]>();

  orderedSelectedSources.forEach((source) => {
    source.citationIds.forEach((citationId) => {
      citationSourceIds.set(citationId, [...(citationSourceIds.get(citationId) ?? []), source.id]);
    });
  });

  const evidenceSummary =
    report?.trust?.evidenceStrength ?? getFallbackEvidenceSummary(report, orderedSelectedSources.length, reportCitations.length);
  const retainedCitations = reportCitations.length > 0 ? reportCitations : dedupeById(selectedSources);
  const citationRelevanceCounts = retainedCitations.reduce(
    (counts, citation) => ({
      ...counts,
      [citation.relevance]: counts[citation.relevance] + 1,
    }),
    { high: 0, medium: 0, low: 0 } as Record<"high" | "medium" | "low", number>,
  );
  const rejectedSourceCount = sourceInventory.rejected.length > 0 ? sourceInventory.rejected.length : rejectedSources.length;
  const hasNormalizedArtifactSourceInventory = Boolean(artifact?.sourceInventory);
  const hasLegacyArtifactSourceData = selectedSources.length > 0 || rejectedSources.length > 0;
  const shouldRenderSourceQualitySnapshot =
    status !== "empty" && (Boolean(report) || hasNormalizedArtifactSourceInventory || hasLegacyArtifactSourceData);
  const sourceQualityNextStep = getSourceQualityNextStep(evidenceSummary);
  const hasArtifactDetails =
    Boolean(artifact?.status) ||
    Boolean(artifact?.generatedAt) ||
    Boolean(artifact?.plan) ||
    selectedSources.length > 0 ||
    rejectedSources.length > 0 ||
    sourceInventory.selected.length > 0 ||
    sourceInventory.rejected.length > 0 ||
    failures.length > 0 ||
    Boolean(metrics);

  useEffect(() => {
    if (!report) {
      setExpandedSections({});
      return;
    }

    setExpandedSections((current) => ({
      ...Object.fromEntries(report.sections.map((section) => [section.id, true])),
      ...current,
    }));
  }, [report]);

  return (
    <div className="space-y-4">
      <ResearchSummary
        status={status}
        errorMessage={errorMessage}
        lastUpdatedAt={lastUpdatedAt}
        researchQuestion={researchQuestion ?? report?.researchQuestion}
        sourceContext={sourceContext}
        onRunResearch={onRunResearch}
      />

      <ResearchProgress
        status={status}
        report={report}
        artifact={artifact}
        researchQuestion={researchQuestion ?? report?.researchQuestion}
      />

      {shouldRenderSourceQualitySnapshot ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-4" aria-labelledby="source-quality-snapshot-heading">
          <h2 id="source-quality-snapshot-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Source quality snapshot
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Retained sources</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{sourceInventory.selected.length}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">High relevance citations</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{citationRelevanceCounts.high}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Medium relevance citations</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{citationRelevanceCounts.medium}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Low relevance citations</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{citationRelevanceCounts.low}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Strong major claims</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{evidenceSummary.strongClaimCount}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Moderate major claims</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{evidenceSummary.moderateClaimCount}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Weak major claims</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{evidenceSummary.weakClaimCount}</dd>
            </div>
            <div className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Rejected sources</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{rejectedSourceCount}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-stone-700">{sourceQualityNextStep}</p>
        </section>
      ) : null}

      {(status === "success" || status === "error") && report ? (
        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Deep research</div>
            <p className="mt-2 text-sm font-medium text-stone-600">{report.researchQuestion}</p>
            <div className="mt-4 rounded-3xl bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Executive summary</div>
              <div className="mt-3 space-y-3">
                {report.executiveSummary.split(/\n+/).map((paragraph, index) =>
                  paragraph.trim() ? (
                    <p key={`summary-${index + 1}`} className="text-sm leading-6 text-stone-700">
                      {paragraph.trim()}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Research conducted {formatTimestamp(report.generatedAt)}
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <section className="grid gap-4 lg:grid-cols-[1.35fr,1fr]">
              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Trust scaffolding</div>
                <div className="mt-3 rounded-2xl bg-[#fcfaf6] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                        evidenceSummary.overall === "strong"
                          ? "high"
                          : evidenceSummary.overall === "moderate"
                            ? "medium"
                            : "low",
                      )}`}
                    >
                      {evidenceSummary.overall} evidence
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {evidenceSummary.claimCount} major claims
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {evidenceSummary.sourceCount} sources
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {evidenceSummary.citationCount} citations
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-700">{evidenceSummary.summary}</p>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Major claims</div>
                  {(report.keyFindings ?? []).length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {report.keyFindings?.map((finding) => {
                        const linkedSourceIds = dedupeById(
                          finding.citationIds
                            .flatMap((citationId) => citationSourceIds.get(citationId) ?? [])
                            .map((sourceId) => ({ id: sourceId })),
                        ).map((source) => source.id);

                        return (
                          <div key={finding.id} className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-stone-800">{finding.statement}</span>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                                  finding.strength === "strong"
                                    ? "high"
                                    : finding.strength === "moderate"
                                      ? "medium"
                                      : "low",
                                )}`}
                              >
                                {finding.strength}
                              </span>
                            </div>
                            <SourceReferences sourceIds={linkedSourceIds} sourceIndexById={sourceIndexById} />
                            <CitationReferences citationIds={finding.citationIds} citationsById={citationsById} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      No supported major claims were retained for this run.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Caveats</div>
                  {(report.caveats ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {report.caveats?.map((caveat) => (
                        <div key={caveat.id} className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-sm leading-6 text-amber-900">{caveat.statement}</p>
                          {caveat.citationIds?.length ? (
                            <CitationReferences citationIds={caveat.citationIds} citationsById={citationsById} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-amber-900">
                      No caveats were captured from the retained evidence.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">Contradictions</div>
                  {(report.contradictions ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {report.contradictions?.map((contradiction) => {
                        const linkedSourceIds = dedupeById(
                          contradiction.citationIds
                            .flatMap((citationId) => citationSourceIds.get(citationId) ?? [])
                            .map((sourceId) => ({ id: sourceId })),
                        ).map((source) => source.id);

                        return (
                          <div key={contradiction.id} className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-sm leading-6 text-rose-900">{contradiction.statement}</p>
                            <SourceReferences sourceIds={linkedSourceIds} sourceIndexById={sourceIndexById} />
                            <CitationReferences citationIds={contradiction.citationIds} citationsById={citationsById} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-rose-900">
                      No contradictions surfaced in the retained evidence.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Unresolved questions
                  </div>
                  {(report.unansweredQuestions ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {report.unansweredQuestions?.map((question) => {
                        const linkedSourceIds = dedupeById(
                          (question.citationIds ?? [])
                            .flatMap((citationId) => citationSourceIds.get(citationId) ?? [])
                            .map((sourceId) => ({ id: sourceId })),
                        ).map((source) => source.id);

                        return (
                          <div key={question.id} className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-sm leading-6 text-stone-700">{question.question}</p>
                            <SourceReferences sourceIds={linkedSourceIds} sourceIndexById={sourceIndexById} />
                            {question.citationIds?.length ? (
                              <CitationReferences citationIds={question.citationIds} citationsById={citationsById} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      No unresolved questions were captured for this run.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <FrameworkTemplatePanel
              framework={artifact?.framework}
              heading="Framework template"
              citationsById={citationsById}
              sourceIndexById={sourceIndexById}
            />

            {hasArtifactDetails ? (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Run details</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {artifact?.status ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-stone-700">
                        {artifact.status}
                      </span>
                    ) : null}
                    {typeof metrics?.attemptedAngles === "number" ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                        {metrics.attemptedAngles} angles
                      </span>
                    ) : null}
                    {typeof metrics?.completedSections === "number" ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                        {metrics.completedSections} sections
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {metrics?.selectedSources ?? selectedSources.length} selected sources
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {metrics?.rejectedSources ?? rejectedSources.length} rejected
                    </span>
                  </div>
                  {artifact?.plan?.steps?.length ? (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      Scope: {artifact.plan.steps.length} planned research angles.
                    </p>
                  ) : null}
                </div>

                {orderedSelectedSources.length > 0 ? (
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Evidence inventory
                    </div>
                    <div className="mt-3 space-y-2">
                      {orderedSelectedSources.slice(0, 4).map((source) => (
                        <div key={source.id} className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-stone-800">{source.title}</p>
                            {formatSourceMeta(source).map((meta) => (
                              <span key={`${source.id}-${meta}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                                {meta}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-stone-600">
                            {source.claimCount} supporting claim{source.claimCount === 1 ? "" : "s"}
                          </p>
                          {source.citationIds.length ? (
                            <CitationReferences citationIds={source.citationIds} citationsById={citationsById} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {sourceInventory.rejected.length > 0 || rejectedSources.length > 0 ? (
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Rejected sources
                    </div>
                    <div className="mt-3 space-y-2">
                      {(sourceInventory.rejected.length > 0 ? sourceInventory.rejected : rejectedSources).slice(0, 4).map((source, index) =>
                        "title" in source ? (
                          <p key={`${source.title}-${index + 1}`} className="text-sm leading-6 text-stone-600">
                            <span className="font-medium text-stone-800">{source.title}</span>
                            {" - "}
                            {source.rejectionReason ?? "rejected"}
                          </p>
                        ) : (
                          <p key={`${source.source}-${index + 1}`} className="text-sm leading-6 text-stone-600">
                            <span className="font-medium text-stone-800">{source.source}</span>
                            {" - "}
                            {source.reason}
                          </p>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {failures.length > 0 ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Run notes</div>
                    <div className="mt-3 space-y-2">
                      {failures.slice(0, 4).map((failure, index) => (
                        <p key={`${failure.stage}-${failure.code}-${index + 1}`} className="text-sm leading-6 text-amber-900">
                          <span className="font-medium capitalize">{failure.stage}</span>
                          {" - "}
                          {failure.message}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Source list</div>
                {orderedSelectedSources.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {orderedSelectedSources.map((source) => (
                      <div key={source.id} id={getSourceAnchor(source.id)} className="rounded-2xl bg-[#fcfaf6] px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-800">{source.title}</p>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                            S{sourceIndexById.get(source.id)}
                          </span>
                          {formatSourceMeta(source).map((meta) => (
                            <span key={`${source.id}-${meta}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                              {meta}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-600">
                          {source.claimCount} supporting claim{source.claimCount === 1 ? "" : "s"}
                        </p>
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                          >
                            {source.url}
                          </a>
                        ) : null}
                        {source.citationIds.length ? (
                          <CitationReferences citationIds={source.citationIds} citationsById={citationsById} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    No normalized sources were retained for this run.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Citation index</div>
                {reportCitations.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {reportCitations.map((citation) => (
                      <div key={citation.id} className="rounded-2xl bg-[#fcfaf6] px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-800">{citation.source}</p>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                            {citation.id}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-stone-600">{citation.claim}</p>
                        {citation.url ? (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                          >
                            {citation.url}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    No citations were retained for this run.
                  </p>
                )}
              </div>
            </section>

            {report.sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? true;

              return (
                <article key={section.id} className="rounded-3xl border border-stone-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((current) => ({
                        ...current,
                        [section.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-stone-950">{section.title}</h3>
                      <div className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        {section.angle}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-stone-500">{isExpanded ? "Hide" : "Show"}</span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4">
                      <div className="space-y-3">
                        {section.findings.split(/\n+/).map((paragraph, index) =>
                          paragraph.trim() ? (
                            <p key={`${section.id}-finding-${index + 1}`} className="text-sm leading-6 text-stone-700">
                              {paragraph.trim()}
                            </p>
                          ) : null,
                        )}
                      </div>

                      <div className="mt-5 border-t border-stone-200 pt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Citations</div>
                        {section.citations.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {section.citations.map((citation) => (
                              <div key={citation.id} id={getCitationAnchor(citation.id)} className="rounded-3xl bg-[#fcfaf6] px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-stone-800">{citation.source}</p>
                                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                                        {citation.id}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-stone-600">{citation.claim}</p>
                                    {citation.sourceType || citation.publicationDate || citation.publicationSignal || citation.recencySignal || citation.accessibilityStatus ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {formatSourceMeta({
                                          sourceType: citation.sourceType ?? "other",
                                          publicationSignal: citation.publicationSignal ?? "unknown",
                                          recencySignal: citation.recencySignal ?? "unknown",
                                          accessibilityStatus: citation.accessibilityStatus ?? "unknown",
                                          publicationDate: citation.publicationDate,
                                        }).map((meta) => (
                                          <span
                                            key={`${citation.id}-${meta}`}
                                            className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600"
                                          >
                                            {meta}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    {citation.url ? (
                                      <a
                                        href={citation.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                                      >
                                        {citation.url}
                                      </a>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                                      citation.relevance,
                                    )}`}
                                  >
                                    {citation.relevance} relevance
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-stone-600">
                            No citations were retained for this section.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
