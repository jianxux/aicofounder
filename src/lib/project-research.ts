import { validateResearchReport, type ResearchReport as ResearchReportData } from "@/lib/research";
import { normalizeArtifactFramework, summarizeFramework } from "@/lib/frameworks";
import {
  isProjectResearchArtifact,
  type CustomerResearchMemoEvidenceSnapshot,
  type Project,
  type ProjectResearch,
  type ProjectResearchArtifact,
} from "@/lib/types";

export type ResearchApiSuccess = ResearchReportData & { artifact?: unknown };
export type ResearchApiFailure = { error?: string; artifact?: unknown };
export type ResearchApiResponse = ResearchApiSuccess | ResearchApiFailure;

function summarizeList(values: string[] | undefined, limit = 3) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean).slice(0, limit);
}

function getResearchReport(value: unknown): ResearchReportData | undefined {
  if (!validateResearchReport(value)) {
    return undefined;
  }

  return {
    sections: value.sections,
    executiveSummary: value.executiveSummary,
    researchQuestion: value.researchQuestion,
    generatedAt: value.generatedAt,
    citations: value.citations,
    sources: value.sources,
    keyFindings: value.keyFindings,
    caveats: value.caveats,
    contradictions: value.contradictions,
    unansweredQuestions: value.unansweredQuestions,
    trust: value.trust,
  };
}

function getPartialResearchArtifact(value: unknown): Partial<ProjectResearchArtifact> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const artifact = value as Record<string, unknown>;
  const partial: Partial<ProjectResearchArtifact> = {};

  if (artifact.status === "completed" || artifact.status === "partial" || artifact.status === "failed") {
    partial.status = artifact.status;
  }

  if (typeof artifact.generatedAt === "string") {
    partial.generatedAt = artifact.generatedAt;
  }

  const sanitizeArtifactField = <K extends keyof ProjectResearchArtifact>(
    key: K,
    fieldValue: unknown,
  ): ProjectResearchArtifact[K] | undefined => {
    const candidate = { [key]: fieldValue } as Pick<ProjectResearchArtifact, K>;
    return isProjectResearchArtifact(candidate) ? candidate[key] : undefined;
  };

  const sanitizedPlan = sanitizeArtifactField("plan", artifact.plan);
  if (sanitizedPlan !== undefined) {
    partial.plan = sanitizedPlan;
  }

  const sanitizedReport = sanitizeArtifactField("report", artifact.report);
  if (sanitizedReport !== undefined) {
    partial.report = sanitizedReport;
  }

  const sanitizedSelectedSources = sanitizeArtifactField("selectedSources", artifact.selectedSources);
  if (sanitizedSelectedSources !== undefined) {
    partial.selectedSources = sanitizedSelectedSources;
  }

  const sanitizedRejectedSources = sanitizeArtifactField("rejectedSources", artifact.rejectedSources);
  if (sanitizedRejectedSources !== undefined) {
    partial.rejectedSources = sanitizedRejectedSources;
  }

  const sanitizedSourceInventory = sanitizeArtifactField("sourceInventory", artifact.sourceInventory);
  if (sanitizedSourceInventory !== undefined) {
    partial.sourceInventory = sanitizedSourceInventory;
  }

  const sanitizedMetrics = sanitizeArtifactField("metrics", artifact.metrics);
  if (sanitizedMetrics !== undefined) {
    partial.metrics = sanitizedMetrics;
  }

  const sanitizedFailures = sanitizeArtifactField("failures", artifact.failures);
  if (sanitizedFailures !== undefined) {
    partial.failures = sanitizedFailures;
  }

  const sanitizedFramework = normalizeArtifactFramework(artifact.framework, "customer-research-memo");
  if (sanitizedFramework) {
    partial.framework = sanitizedFramework;
  }

  return Object.keys(partial).length > 0 ? partial : undefined;
}

function mergeResearchPlan(
  existingPlan: ProjectResearchArtifact["plan"] | undefined,
  nextPlan: ProjectResearchArtifact["plan"] | undefined,
): ProjectResearchArtifact["plan"] | undefined {
  if (!existingPlan && !nextPlan) {
    return undefined;
  }

  const mergedBudget =
    existingPlan?.budget || nextPlan?.budget
      ? ({
          ...existingPlan?.budget,
          ...nextPlan?.budget,
        } as NonNullable<ProjectResearchArtifact["plan"]>["budget"])
      : undefined;

  return {
    ...existingPlan,
    ...nextPlan,
    budget: mergedBudget,
    steps: nextPlan?.steps ?? existingPlan?.steps,
  };
}

function mergeResearchMetrics(
  existingMetrics: ProjectResearchArtifact["metrics"] | undefined,
  nextMetrics: ProjectResearchArtifact["metrics"] | undefined,
): ProjectResearchArtifact["metrics"] | undefined {
  if (!existingMetrics && !nextMetrics) {
    return undefined;
  }

  return {
    ...existingMetrics,
    ...nextMetrics,
  };
}

function mergeSourceInventory(
  existingInventory: ProjectResearchArtifact["sourceInventory"] | undefined,
  nextInventory: ProjectResearchArtifact["sourceInventory"] | undefined,
): ProjectResearchArtifact["sourceInventory"] | undefined {
  if (!existingInventory && !nextInventory) {
    return undefined;
  }

  return {
    selected: nextInventory?.selected ?? existingInventory?.selected ?? [],
    rejected: nextInventory?.rejected ?? existingInventory?.rejected ?? [],
  };
}

function mergeResearchArtifact(
  existingResearch: Project["research"] | null | undefined,
  nextArtifact: unknown,
  fallbackReport?: ResearchReportData,
): ProjectResearchArtifact | undefined {
  const partialArtifact = getPartialResearchArtifact(nextArtifact);

  if (!partialArtifact) {
    if (!existingResearch?.artifact && !fallbackReport) {
      return undefined;
    }

    return {
      ...existingResearch?.artifact,
      ...(fallbackReport ? { report: fallbackReport } : {}),
    };
  }

  const existingArtifactReport = getResearchReport(existingResearch?.artifact?.report);
  const nextArtifactReport = getResearchReport((nextArtifact as { report?: unknown }).report);

  return {
    ...existingResearch?.artifact,
    ...partialArtifact,
    plan: mergeResearchPlan(existingResearch?.artifact?.plan, partialArtifact.plan),
    metrics: mergeResearchMetrics(existingResearch?.artifact?.metrics, partialArtifact.metrics),
    sourceInventory: mergeSourceInventory(existingResearch?.artifact?.sourceInventory, partialArtifact.sourceInventory),
    selectedSources: partialArtifact.selectedSources ?? existingResearch?.artifact?.selectedSources,
    rejectedSources: partialArtifact.rejectedSources ?? existingResearch?.artifact?.rejectedSources,
    failures: partialArtifact.failures ?? existingResearch?.artifact?.failures,
    report: nextArtifactReport ?? fallbackReport ?? existingArtifactReport ?? existingResearch?.report,
  };
}

export function resolveProjectResearchResponse(
  existingResearch: Project["research"] | null | undefined,
  payload: ResearchApiResponse,
  requestSucceeded: boolean,
) {
  const flattenedReport = getResearchReport(payload);
  const artifact = mergeResearchArtifact(existingResearch, payload.artifact, flattenedReport);
  const artifactReport = getResearchReport(artifact?.report);
  const failedRequest = !requestSucceeded || ("error" in payload && typeof payload.error === "string");

  return {
    ok: !failedRequest,
    artifact,
    report: artifactReport ?? flattenedReport ?? existingResearch?.report,
    errorMessage:
      failedRequest && "error" in payload && typeof payload.error === "string" && payload.error
        ? payload.error
        : failedRequest
          ? "Failed to run deep research"
          : undefined,
  };
}

export function buildResearchMemoEvidenceSnapshot(research: ProjectResearch | null): CustomerResearchMemoEvidenceSnapshot {
  const framework = summarizeFramework(research?.artifact?.framework);

  return {
    artifactType: "customer-research-memo",
    researchStatus: research?.status ?? "empty",
    artifactStatus: research?.artifact?.status,
    executiveSummary: research?.report?.executiveSummary?.trim() || undefined,
    ...(framework ? { framework } : {}),
    keyFindings: summarizeList(research?.report?.keyFindings?.map((item) => item.statement)),
    contradictions: summarizeList(research?.report?.contradictions?.map((item) => item.statement)),
    unansweredQuestions: summarizeList(research?.report?.unansweredQuestions?.map((item) => item.question)),
    sourceCount: research?.report?.sources?.length ?? 0,
    sectionCount: research?.report?.sections?.length ?? 0,
  };
}
