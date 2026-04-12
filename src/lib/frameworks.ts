export const FRAMEWORK_TEMPLATE_TYPES = [
  "swot",
  "five-forces",
  "problem-solution-fit",
  "validation-experiment-planning",
] as const;

export type FrameworkTemplateType = (typeof FRAMEWORK_TEMPLATE_TYPES)[number];
export type FrameworkArtifactType = "validation-scorecard" | "customer-research-memo";
export type FrameworkIntensity = "low" | "medium" | "high";

export type FrameworkEvidence =
  | {
      type: "citation";
      citationId: string;
      label: string;
    }
  | {
      type: "source";
      sourceId: string;
      label: string;
    }
  | {
      type: "note";
      label: string;
    };

export type FrameworkPoint = {
  id: string;
  title: string;
  detail?: string;
  evidence?: FrameworkEvidence[];
};

export type SwotFramework = {
  type: "swot";
  strengths: FrameworkPoint[];
  weaknesses: FrameworkPoint[];
  opportunities: FrameworkPoint[];
  threats: FrameworkPoint[];
};

export type FiveForcesForceKey =
  | "competitive-rivalry"
  | "threat-of-new-entrants"
  | "supplier-power"
  | "buyer-power"
  | "threat-of-substitutes";

export type FiveForcesEntry = {
  id: string;
  force: FiveForcesForceKey;
  label: string;
  intensity?: FrameworkIntensity;
  summary?: string;
  evidence?: FrameworkEvidence[];
};

export type FiveForcesFramework = {
  type: "five-forces";
  forces: FiveForcesEntry[];
};

export type ProblemSolutionFitFramework = {
  type: "problem-solution-fit";
  customerSegments: FrameworkPoint[];
  problems: FrameworkPoint[];
  existingAlternatives: FrameworkPoint[];
  solutionFitSignals: FrameworkPoint[];
  adoptionRisks: FrameworkPoint[];
};

export type ValidationExperiment = {
  id: string;
  name: string;
  hypothesis: string;
  method: string;
  successMetric: string;
  signal?: string;
  effort?: string;
  timeframe?: string;
  evidence?: FrameworkEvidence[];
  risks?: string[];
};

export type ValidationExperimentPlanningFramework = {
  type: "validation-experiment-planning";
  experiments: ValidationExperiment[];
};

export type ArtifactFramework =
  | SwotFramework
  | FiveForcesFramework
  | ProblemSolutionFitFramework
  | ValidationExperimentPlanningFramework;

const APPLICABLE_FRAMEWORKS: Record<FrameworkArtifactType, FrameworkTemplateType[]> = {
  "customer-research-memo": ["swot", "five-forces"],
  "validation-scorecard": ["problem-solution-fit", "validation-experiment-planning"],
};

const FIVE_FORCE_KEYS: FiveForcesForceKey[] = [
  "competitive-rivalry",
  "threat-of-new-entrants",
  "supplier-power",
  "buyer-power",
  "threat-of-substitutes",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.map(normalizeText).filter((entry): entry is string => Boolean(entry));
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeFrameworkEvidenceEntry(value: unknown): FrameworkEvidence | null {
  if (typeof value === "string") {
    const label = normalizeText(value);

    return label ? { type: "note", label } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const citationId = normalizeText(value.citationId ?? (value.type === "citation" ? value.id : undefined));

  if (citationId) {
    return {
      type: "citation",
      citationId,
      label: normalizeText(value.label) ?? citationId,
    };
  }

  const sourceId = normalizeText(value.sourceId ?? (value.type === "source" ? value.id : undefined));

  if (sourceId) {
    return {
      type: "source",
      sourceId,
      label: normalizeText(value.label) ?? sourceId,
    };
  }

  const label = normalizeText(value.note ?? value.text ?? value.label ?? value.value);

  return label ? { type: "note", label } : null;
}

function normalizeFrameworkEvidenceList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const normalized: FrameworkEvidence[] = [];

  value.forEach((entry) => {
    const evidence = normalizeFrameworkEvidenceEntry(entry);

    if (!evidence) {
      return;
    }

    const key =
      evidence.type === "citation"
        ? `citation:${evidence.citationId}`
        : evidence.type === "source"
          ? `source:${evidence.sourceId}`
          : `note:${evidence.label.toLowerCase()}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(evidence);
  });

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeFrameworkPoint(value: unknown): FrameworkPoint | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const title = normalizeText(value.title);

  if (!title) {
    return null;
  }

  return {
    id: value.id,
    title,
    detail: normalizeText(value.detail),
    evidence: normalizeFrameworkEvidenceList(value.evidence),
  };
}

function normalizeFrameworkPointList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeFrameworkPoint).filter((entry): entry is FrameworkPoint => entry !== null);
}

function normalizeSwotFramework(value: Record<string, unknown>): SwotFramework | undefined {
  const strengths = normalizeFrameworkPointList(value.strengths);
  const weaknesses = normalizeFrameworkPointList(value.weaknesses);
  const opportunities = normalizeFrameworkPointList(value.opportunities);
  const threats = normalizeFrameworkPointList(value.threats);

  if (strengths.length + weaknesses.length + opportunities.length + threats.length === 0) {
    return undefined;
  }

  return {
    type: "swot",
    strengths,
    weaknesses,
    opportunities,
    threats,
  };
}

function normalizeFiveForcesEntry(value: unknown): FiveForcesEntry | null {
  if (!isRecord(value) || typeof value.id !== "string" || !FIVE_FORCE_KEYS.includes(value.force as FiveForcesForceKey)) {
    return null;
  }

  const force = value.force as FiveForcesForceKey;
  const label = normalizeText(value.label);
  const summary = normalizeText(value.summary);
  const evidence = normalizeFrameworkEvidenceList(value.evidence);

  if (!label && !summary && !evidence?.length) {
    return null;
  }

  return {
    id: value.id,
    force,
    label: label ?? force.replace(/-/g, " "),
    intensity:
      value.intensity === "low" || value.intensity === "medium" || value.intensity === "high"
        ? value.intensity
        : undefined,
    summary,
    evidence,
  };
}

function normalizeFiveForcesFramework(value: Record<string, unknown>): FiveForcesFramework | undefined {
  if (!Array.isArray(value.forces)) {
    return undefined;
  }

  const forces = value.forces.map(normalizeFiveForcesEntry).filter((entry): entry is FiveForcesEntry => entry !== null);
  return forces.length > 0 ? { type: "five-forces", forces } : undefined;
}

function normalizeProblemSolutionFitFramework(value: Record<string, unknown>): ProblemSolutionFitFramework | undefined {
  const customerSegments = normalizeFrameworkPointList(value.customerSegments);
  const problems = normalizeFrameworkPointList(value.problems);
  const existingAlternatives = normalizeFrameworkPointList(value.existingAlternatives);
  const solutionFitSignals = normalizeFrameworkPointList(value.solutionFitSignals);
  const adoptionRisks = normalizeFrameworkPointList(value.adoptionRisks);

  if (
    customerSegments.length +
      problems.length +
      existingAlternatives.length +
      solutionFitSignals.length +
      adoptionRisks.length ===
    0
  ) {
    return undefined;
  }

  return {
    type: "problem-solution-fit",
    customerSegments,
    problems,
    existingAlternatives,
    solutionFitSignals,
    adoptionRisks,
  };
}

function normalizeValidationExperiment(value: unknown): ValidationExperiment | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const name = normalizeText(value.name);
  const hypothesis = normalizeText(value.hypothesis);
  const method = normalizeText(value.method);
  const successMetric = normalizeText(value.successMetric);

  if (!name || !hypothesis || !method || !successMetric) {
    return null;
  }

  return {
    id: value.id,
    name,
    hypothesis,
    method,
    successMetric,
    signal: normalizeText(value.signal),
    effort: normalizeText(value.effort),
    timeframe: normalizeText(value.timeframe),
    evidence: normalizeFrameworkEvidenceList(value.evidence),
    risks: normalizeStringArray(value.risks),
  };
}

function normalizeValidationExperimentPlanningFramework(
  value: Record<string, unknown>,
): ValidationExperimentPlanningFramework | undefined {
  if (!Array.isArray(value.experiments)) {
    return undefined;
  }

  const experiments = value.experiments
    .map(normalizeValidationExperiment)
    .filter((entry): entry is ValidationExperiment => entry !== null);

  return experiments.length > 0 ? { type: "validation-experiment-planning", experiments } : undefined;
}

export function normalizeArtifactFramework(
  value: unknown,
  artifactType: FrameworkArtifactType,
): ArtifactFramework | undefined {
  if (!isRecord(value) || !FRAMEWORK_TEMPLATE_TYPES.includes(value.type as FrameworkTemplateType)) {
    return undefined;
  }

  const type = value.type as FrameworkTemplateType;

  if (!APPLICABLE_FRAMEWORKS[artifactType].includes(type)) {
    return undefined;
  }

  if (type === "swot") {
    return normalizeSwotFramework(value);
  }

  if (type === "five-forces") {
    return normalizeFiveForcesFramework(value);
  }

  if (type === "problem-solution-fit") {
    return normalizeProblemSolutionFitFramework(value);
  }

  return normalizeValidationExperimentPlanningFramework(value);
}

export function isArtifactFramework(
  value: unknown,
  artifactType?: FrameworkArtifactType,
): value is ArtifactFramework {
  if (artifactType) {
    return Boolean(normalizeArtifactFramework(value, artifactType));
  }

  return (
    Boolean(normalizeArtifactFramework(value, "customer-research-memo")) ||
    Boolean(normalizeArtifactFramework(value, "validation-scorecard"))
  );
}

export function frameworkHasRenderableContent(
  framework: ArtifactFramework | null | undefined,
): framework is ArtifactFramework {
  if (!framework) {
    return false;
  }

  if (framework.type === "swot") {
    return (
      framework.strengths.length +
        framework.weaknesses.length +
        framework.opportunities.length +
        framework.threats.length >
      0
    );
  }

  if (framework.type === "five-forces") {
    return framework.forces.length > 0;
  }

  if (framework.type === "problem-solution-fit") {
    return (
      framework.customerSegments.length +
        framework.problems.length +
        framework.existingAlternatives.length +
        framework.solutionFitSignals.length +
        framework.adoptionRisks.length >
      0
    );
  }

  return framework.experiments.length > 0;
}

export function getFrameworkTemplateLabel(type: FrameworkTemplateType) {
  if (type === "swot") {
    return "SWOT";
  }

  if (type === "five-forces") {
    return "Five Forces";
  }

  if (type === "problem-solution-fit") {
    return "Problem-solution fit";
  }

  return "Validation experiment plan";
}

export function summarizeFramework(framework: ArtifactFramework | null | undefined) {
  if (!framework || !frameworkHasRenderableContent(framework)) {
    return undefined;
  }

  if (framework.type === "five-forces") {
    return {
      type: framework.type,
      label: getFrameworkTemplateLabel(framework.type),
      itemCount: framework.forces.length,
    };
  }

  if (framework.type === "validation-experiment-planning") {
    return {
      type: framework.type,
      label: getFrameworkTemplateLabel(framework.type),
      itemCount: framework.experiments.length,
    };
  }

  const itemCount =
    framework.type === "swot"
      ? framework.strengths.length + framework.weaknesses.length + framework.opportunities.length + framework.threats.length
      : framework.customerSegments.length +
        framework.problems.length +
        framework.existingAlternatives.length +
        framework.solutionFitSignals.length +
        framework.adoptionRisks.length;

  return {
    type: framework.type,
    label: getFrameworkTemplateLabel(framework.type),
    itemCount,
  };
}
