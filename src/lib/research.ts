export type ResearchRelevance = "high" | "medium" | "low";
export type ResearchRunStatus = "completed" | "partial" | "failed";
export type ResearchStage = "plan" | "gather" | "report";
export type ResearchSourceType =
  | "report"
  | "company"
  | "documentation"
  | "news"
  | "community"
  | "analyst"
  | "academic"
  | "government"
  | "dataset"
  | "other";
export type ResearchAccessibilityStatus = "public" | "paywalled" | "login_required" | "restricted" | "unknown";
export type ResearchPublicationSignal = "official" | "third_party" | "community" | "analyst" | "unknown";
export type ResearchRecencySignal = "current" | "recent" | "dated" | "undated" | "unknown";
export type ResearchEvidenceStrength = "strong" | "moderate" | "weak";
export type ResearchFailureCode =
  | "invalid-input"
  | "invalid-plan"
  | "budget-exceeded"
  | "no-evidence"
  | "invalid-section"
  | "invalid-summary"
  | "provider-error";

export type ResearchCitation = {
  id: string;
  source: string;
  claim: string;
  relevance: ResearchRelevance;
  url?: string;
  sourceType?: ResearchSourceType;
  publicationDate?: string;
  publicationSignal?: ResearchPublicationSignal;
  recencySignal?: ResearchRecencySignal;
  accessibilityStatus?: ResearchAccessibilityStatus;
};

export type ResearchSection = {
  id: string;
  title: string;
  angle: string;
  findings: string;
  citations: ResearchCitation[];
};

export type ResearchKeyFinding = {
  id: string;
  statement: string;
  citationIds: string[];
  sectionIds?: string[];
  strength: ResearchEvidenceStrength;
};

export type ResearchCaveat = {
  id: string;
  statement: string;
  citationIds?: string[];
  sectionIds?: string[];
};

export type ResearchContradiction = {
  id: string;
  statement: string;
  citationIds: string[];
  sectionIds?: string[];
};

export type ResearchUnansweredQuestion = {
  id: string;
  question: string;
  citationIds?: string[];
  sectionIds?: string[];
};

export type ResearchReport = {
  sections: ResearchSection[];
  executiveSummary: string;
  researchQuestion: string;
  generatedAt: string;
  citations?: ResearchCitation[];
  sources?: ResearchSource[];
  keyFindings?: ResearchKeyFinding[];
  caveats?: ResearchCaveat[];
  contradictions?: ResearchContradiction[];
  unansweredQuestions?: ResearchUnansweredQuestion[];
};

export type ResearchAngle = {
  id: string;
  title: string;
  angle: string;
};

export type ResearchBudget = {
  maxAngles: number;
  maxSections: number;
  maxCitationsPerSection: number;
};

export type ResearchPlanItem = ResearchAngle & {
  query: string;
  rationale: string;
};

export type ResearchPlan = {
  projectName: string;
  projectDescription: string;
  researchQuestion: string;
  budget: ResearchBudget;
  steps: ResearchPlanItem[];
};

export type ResearchRejectedSource = {
  reason: "duplicate" | "budget" | "invalid";
  source: string;
  citationId?: string;
};

export type ResearchSource = {
  id: string;
  title: string;
  canonicalId: string;
  sourceType: ResearchSourceType;
  status: "selected" | "rejected";
  citationIds: string[];
  sectionIds: string[];
  url?: string;
  canonicalUrl?: string;
  domain?: string;
  publicationDate?: string;
  publicationSignal?: ResearchPublicationSignal;
  recencySignal?: ResearchRecencySignal;
  accessibilityStatus?: ResearchAccessibilityStatus;
  claimCount: number;
  rejectionReason?: ResearchRejectedSource["reason"];
};

export type ResearchSourceInventory = {
  selected: ResearchSource[];
  rejected: ResearchSource[];
};

export type ResearchMetrics = {
  attemptedAngles: number;
  completedSections: number;
  selectedSources: number;
  rejectedSources: number;
};

export type ResearchFailure = {
  stage: ResearchStage;
  code: ResearchFailureCode;
  message: string;
};

export type ResearchRunArtifact = {
  status: ResearchRunStatus;
  generatedAt: string;
  plan: ResearchPlan;
  report: ResearchReport;
  selectedSources: ResearchCitation[];
  rejectedSources: ResearchRejectedSource[];
  sourceInventory: ResearchSourceInventory;
  metrics: ResearchMetrics;
  failures: ResearchFailure[];
};

export type ResearchRunInput = {
  projectName: string;
  projectDescription: string;
  researchQuestion: string;
  memoryContextBlock?: string;
  budgets?: Partial<ResearchBudget>;
  generatedAt?: string;
};

export type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

export type ResearchOpenAIClient = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        temperature?: number;
        messages: OpenAIChatMessage[];
      }) => Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
};

const RELEVANCE_VALUES = ["high", "medium", "low"] as const;
const SOURCE_TYPE_VALUES = [
  "report",
  "company",
  "documentation",
  "news",
  "community",
  "analyst",
  "academic",
  "government",
  "dataset",
  "other",
] as const;
const ACCESSIBILITY_VALUES = ["public", "paywalled", "login_required", "restricted", "unknown"] as const;
const PUBLICATION_SIGNAL_VALUES = ["official", "third_party", "community", "analyst", "unknown"] as const;
const RECENCY_SIGNAL_VALUES = ["current", "recent", "dated", "undated", "unknown"] as const;
const EVIDENCE_STRENGTH_VALUES = ["strong", "moderate", "weak"] as const;
export const DEFAULT_RESEARCH_QUESTION = "What are the key opportunities and risks?";
const DEFAULT_EXECUTIVE_SUMMARY =
  "Evidence is limited. Treat this as a partial research run and validate the strongest assumptions with direct customer discovery.";

export const DEFAULT_RESEARCH_BUDGET: ResearchBudget = {
  maxAngles: 3,
  maxSections: 3,
  maxCitationsPerSection: 3,
};

export const RESEARCH_ANGLES: ResearchAngle[] = [
  {
    id: "market",
    title: "Market Analysis",
    angle: "Investigate market size, category trends, demand signals, and the most promising user segments.",
  },
  {
    id: "technical",
    title: "Technical Feasibility",
    angle: "Investigate product feasibility, architecture options, likely tech stack choices, and scaling concerns.",
  },
  {
    id: "competitive",
    title: "Competitive Landscape",
    angle: "Investigate existing solutions, whitespace in the market, and differentiation opportunities.",
  },
];

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");

  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  return trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidCitation(value: unknown): value is ResearchCitation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.source) ||
    !isNonEmptyString(candidate.claim) ||
    !RELEVANCE_VALUES.includes(candidate.relevance as ResearchRelevance)
  ) {
    return false;
  }

  return (
    (typeof candidate.url === "undefined" || typeof candidate.url === "string") &&
    (typeof candidate.sourceType === "undefined" || SOURCE_TYPE_VALUES.includes(candidate.sourceType as ResearchSourceType)) &&
    (typeof candidate.publicationDate === "undefined" || typeof candidate.publicationDate === "string") &&
    (typeof candidate.publicationSignal === "undefined" ||
      PUBLICATION_SIGNAL_VALUES.includes(candidate.publicationSignal as ResearchPublicationSignal)) &&
    (typeof candidate.recencySignal === "undefined" ||
      RECENCY_SIGNAL_VALUES.includes(candidate.recencySignal as ResearchRecencySignal)) &&
    (typeof candidate.accessibilityStatus === "undefined" ||
      ACCESSIBILITY_VALUES.includes(candidate.accessibilityStatus as ResearchAccessibilityStatus))
  );
}

function isValidSection(value: unknown): value is ResearchSection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.angle) &&
    isNonEmptyString(candidate.findings) &&
    Array.isArray(candidate.citations) &&
    candidate.citations.every((citation) => isValidCitation(citation))
  );
}

function normalizeOptionalEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return allowed.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function isNormalizableCitationCandidate(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (typeof candidate.id === "undefined" || typeof candidate.id === "string") &&
    (typeof candidate.source === "undefined" || typeof candidate.source === "string") &&
    (typeof candidate.claim === "undefined" || typeof candidate.claim === "string") &&
    (typeof candidate.relevance === "undefined" || RELEVANCE_VALUES.includes(candidate.relevance as ResearchRelevance)) &&
    (typeof candidate.url === "undefined" || typeof candidate.url === "string") &&
    (typeof candidate.sourceType === "undefined" || SOURCE_TYPE_VALUES.includes(candidate.sourceType as ResearchSourceType)) &&
    (typeof candidate.publicationDate === "undefined" || typeof candidate.publicationDate === "string") &&
    (typeof candidate.publicationSignal === "undefined" ||
      PUBLICATION_SIGNAL_VALUES.includes(candidate.publicationSignal as ResearchPublicationSignal)) &&
    (typeof candidate.recencySignal === "undefined" ||
      RECENCY_SIGNAL_VALUES.includes(candidate.recencySignal as ResearchRecencySignal)) &&
    (typeof candidate.accessibilityStatus === "undefined" ||
      ACCESSIBILITY_VALUES.includes(candidate.accessibilityStatus as ResearchAccessibilityStatus))
  );
}

export function isValidPlan(value: unknown): value is ResearchPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const budget = candidate.budget as Record<string, unknown> | undefined;

  return (
    isNonEmptyString(candidate.projectName) &&
    isNonEmptyString(candidate.projectDescription) &&
    isNonEmptyString(candidate.researchQuestion) &&
    !!budget &&
    typeof budget.maxAngles === "number" &&
    typeof budget.maxSections === "number" &&
    typeof budget.maxCitationsPerSection === "number" &&
    Array.isArray(candidate.steps) &&
    candidate.steps.every((step) => {
      if (!step || typeof step !== "object") {
        return false;
      }

      const item = step as Record<string, unknown>;
      return (
        isNonEmptyString(item.id) &&
        isNonEmptyString(item.title) &&
        isNonEmptyString(item.angle) &&
        isNonEmptyString(item.query) &&
        isNonEmptyString(item.rationale)
      );
    })
  );
}

export function isValidReport(value: unknown): value is ResearchReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.sections) &&
    candidate.sections.every((section) => isValidSection(section)) &&
    isNonEmptyString(candidate.executiveSummary) &&
    isNonEmptyString(candidate.researchQuestion) &&
    isNonEmptyString(candidate.generatedAt) &&
    (typeof candidate.citations === "undefined" ||
      (Array.isArray(candidate.citations) && candidate.citations.every((citation) => isValidCitation(citation)))) &&
    (typeof candidate.sources === "undefined" ||
      (Array.isArray(candidate.sources) && candidate.sources.every((source) => isValidSource(source)))) &&
    (typeof candidate.keyFindings === "undefined" ||
      (Array.isArray(candidate.keyFindings) && candidate.keyFindings.every((item) => isValidKeyFinding(item)))) &&
    (typeof candidate.caveats === "undefined" ||
      (Array.isArray(candidate.caveats) && candidate.caveats.every((item) => isValidCaveat(item)))) &&
    (typeof candidate.contradictions === "undefined" ||
      (Array.isArray(candidate.contradictions) && candidate.contradictions.every((item) => isValidContradiction(item)))) &&
    (typeof candidate.unansweredQuestions === "undefined" ||
      (Array.isArray(candidate.unansweredQuestions) &&
        candidate.unansweredQuestions.every((item) => isValidUnansweredQuestion(item))))
  );
}

function isStringArray(value: unknown, requireNonEmpty = false): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && (!requireNonEmpty || item.trim().length > 0));
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return typeof value === "undefined" || isStringArray(value, true);
}

function isValidKeyFinding(value: unknown): value is ResearchKeyFinding {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.statement) &&
    isStringArray(candidate.citationIds, true) &&
    candidate.citationIds.length > 0 &&
    isOptionalStringArray(candidate.sectionIds) &&
    EVIDENCE_STRENGTH_VALUES.includes(candidate.strength as ResearchEvidenceStrength)
  );
}

function isValidCaveat(value: unknown): value is ResearchCaveat {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.statement) &&
    isOptionalStringArray(candidate.citationIds) &&
    isOptionalStringArray(candidate.sectionIds)
  );
}

function isValidContradiction(value: unknown): value is ResearchContradiction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.statement) &&
    isStringArray(candidate.citationIds, true) &&
    candidate.citationIds.length > 0 &&
    isOptionalStringArray(candidate.sectionIds)
  );
}

function isValidUnansweredQuestion(value: unknown): value is ResearchUnansweredQuestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.question) &&
    isOptionalStringArray(candidate.citationIds) &&
    isOptionalStringArray(candidate.sectionIds)
  );
}

function isValidSource(value: unknown): value is ResearchSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.canonicalId) &&
    (candidate.status === "selected" || candidate.status === "rejected") &&
    SOURCE_TYPE_VALUES.includes(candidate.sourceType as ResearchSourceType) &&
    Array.isArray(candidate.citationIds) &&
    candidate.citationIds.every((citationId) => typeof citationId === "string") &&
    Array.isArray(candidate.sectionIds) &&
    candidate.sectionIds.every((sectionId) => typeof sectionId === "string") &&
    (typeof candidate.url === "undefined" || typeof candidate.url === "string") &&
    (typeof candidate.canonicalUrl === "undefined" || typeof candidate.canonicalUrl === "string") &&
    (typeof candidate.domain === "undefined" || typeof candidate.domain === "string") &&
    (typeof candidate.publicationDate === "undefined" || typeof candidate.publicationDate === "string") &&
    (typeof candidate.publicationSignal === "undefined" ||
      PUBLICATION_SIGNAL_VALUES.includes(candidate.publicationSignal as ResearchPublicationSignal)) &&
    (typeof candidate.recencySignal === "undefined" ||
      RECENCY_SIGNAL_VALUES.includes(candidate.recencySignal as ResearchRecencySignal)) &&
    (typeof candidate.accessibilityStatus === "undefined" ||
      ACCESSIBILITY_VALUES.includes(candidate.accessibilityStatus as ResearchAccessibilityStatus)) &&
    typeof candidate.claimCount === "number" &&
    (typeof candidate.rejectionReason === "undefined" ||
      candidate.rejectionReason === "duplicate" ||
      candidate.rejectionReason === "budget" ||
      candidate.rejectionReason === "invalid")
  );
}

function parseOptionalUrl(value?: string): { canonicalUrl?: string; domain?: string } {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = new URL(value);
    parsed.hash = "";
    const params = parsed.searchParams;

    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"].forEach((param) => {
      params.delete(param);
    });

    parsed.search = params.toString() ? `?${params.toString()}` : "";
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const canonicalUrl = `${parsed.protocol}//${domain}${pathname}${parsed.search}`;

    return { canonicalUrl, domain };
  } catch {
    return {};
  }
}

function toCanonicalSourceId(source: Pick<ResearchCitation, "source" | "url">): string {
  const { canonicalUrl, domain } = parseOptionalUrl(source.url);

  if (canonicalUrl) {
    return canonicalUrl.toLowerCase();
  }

  return (domain ?? source.source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyId(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function dedupeStringList(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

type StructuredSummary = Pick<
  ResearchReport,
  "executiveSummary" | "keyFindings" | "caveats" | "contradictions" | "unansweredQuestions"
>;

type NormalizedStructuredSummary = StructuredSummary & {
  normalizationIssues: string[];
};

type RejectedSourceRecord = ResearchRejectedSource & {
  citation?: ResearchCitation;
  sectionId: string;
};

export function validateResearchPlan(value: unknown): value is ResearchPlan {
  return isValidPlan(value);
}

export function validateResearchReport(value: unknown): value is ResearchReport {
  return isValidReport(value);
}

function normalizeBudget(overrides?: Partial<ResearchBudget>): ResearchBudget {
  const budget = {
    ...DEFAULT_RESEARCH_BUDGET,
    ...overrides,
  };

  const safeNumber = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.floor(value) : fallback;

  return {
    maxAngles: Math.max(1, Math.min(RESEARCH_ANGLES.length, safeNumber(budget.maxAngles, DEFAULT_RESEARCH_BUDGET.maxAngles))),
    maxSections: Math.max(1, Math.min(RESEARCH_ANGLES.length, safeNumber(budget.maxSections, DEFAULT_RESEARCH_BUDGET.maxSections))),
    maxCitationsPerSection: Math.max(
      1,
      Math.min(5, safeNumber(budget.maxCitationsPerSection, DEFAULT_RESEARCH_BUDGET.maxCitationsPerSection)),
    ),
  };
}

export function createResearchPlan(input: ResearchRunInput): ResearchPlan {
  const projectName = input.projectName.trim();
  const projectDescription = input.projectDescription.trim();
  const researchQuestion = input.researchQuestion.trim() || DEFAULT_RESEARCH_QUESTION;

  if (!projectName || !projectDescription) {
    throw new Error("Project name and project description are required");
  }

  const budget = normalizeBudget(input.budgets);
  const steps = RESEARCH_ANGLES.slice(0, budget.maxAngles).map((angle) => ({
    ...angle,
    query: `${projectName}: ${researchQuestion} (${angle.title})`,
    rationale: `Research ${angle.title.toLowerCase()} for ${projectName} to answer: ${researchQuestion}`,
  }));

  const plan: ResearchPlan = {
    projectName,
    projectDescription,
    researchQuestion,
    budget,
    steps,
  };

  return plan;
}

export function buildResearchPrompt(
  angle: string,
  projectName: string,
  projectDescription: string,
  researchQuestion: string,
  memoryContextBlock?: string,
): string {
  const promptSections = [
    "You are a deep research agent helping an AI cofounder produce a cited report section.",
    `Project name: ${projectName.trim() || "Untitled project"}.`,
    `Project description: ${projectDescription.trim()}.`,
    `Research question: ${(researchQuestion.trim() || DEFAULT_RESEARCH_QUESTION).trim()}.`,
    `Research angle: ${angle.trim()}.`,
    "Act as if you reviewed credible primary and secondary sources, including market reports, product pages, developer docs, community discussions, and analyst commentary where relevant.",
    "Return valid JSON only. Do not include markdown, commentary, or any text before or after the JSON.",
    'The JSON must match this TypeScript shape exactly: { "id": string, "title": string, "angle": string, "findings": string, "citations": ResearchCitation[] }.',
    'Each citation must match: { "id": string, "source": string, "claim": string, "relevance": "high" | "medium" | "low", "url"?: string, "sourceType"?: "report" | "company" | "documentation" | "news" | "community" | "analyst" | "academic" | "government" | "dataset" | "other", "publicationDate"?: string, "publicationSignal"?: "official" | "third_party" | "community" | "analyst" | "unknown", "recencySignal"?: "current" | "recent" | "dated" | "undated" | "unknown", "accessibilityStatus"?: "public" | "paywalled" | "login_required" | "restricted" | "unknown" }.',
    "Write findings as concise markdown-formatted prose with short paragraphs or bullets represented as plain markdown text.",
    "Ground the section in evidence tied directly to the project and this research angle instead of generic startup advice.",
    "Include 2 to 5 citations. Each citation should capture one concrete claim from the findings and name the source clearly.",
    "Use URLs only when they are helpful and plausible. Omit the url field if no direct reference is available.",
    "Preserve source quality signals when available. If you know whether the source is official, recent, public, paywalled, or undated, include those optional citation fields.",
  ];

  if (memoryContextBlock?.trim()) {
    promptSections.push(memoryContextBlock.trim());
  }

  return promptSections.join(" ");
}

export function parseResearchResponse(text: string): ResearchSection | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));
    return normalizeSectionCandidate(parsed);
  } catch {
    return null;
  }
}

function normalizeSectionCandidate(value: unknown): ResearchSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const angle = typeof candidate.angle === "string" ? candidate.angle.trim() : "";
  const findings = typeof candidate.findings === "string" ? candidate.findings.trim() : "";

  if (!title || !angle || !findings) {
    return null;
  }

  const sectionId = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : slugifyId(title, "research-section");
  const fallbackClaim =
    findings
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .find(Boolean) ?? `Supporting evidence collected for ${title}.`;

  if (Array.isArray(candidate.citations) && !candidate.citations.every((citation) => isNormalizableCitationCandidate(citation))) {
    return null;
  }

  const citations = Array.isArray(candidate.citations)
    ? candidate.citations
        .map((citation, index) => normalizeCitationCandidate(citation, sectionId, fallbackClaim, index))
        .filter((citation): citation is ResearchCitation => Boolean(citation))
    : [];

  return {
    id: sectionId,
    title,
    angle,
    findings,
    citations,
  };
}

function normalizeCitationCandidate(
  value: unknown,
  sectionId: string,
  fallbackClaim: string,
  index: number,
): ResearchCitation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const url = typeof candidate.url === "string" && candidate.url.trim() ? candidate.url.trim() : undefined;
  const { domain } = parseOptionalUrl(url);
  const source =
    typeof candidate.source === "string" && candidate.source.trim()
      ? candidate.source.trim()
      : domain ?? `Untitled source ${index + 1}`;
  const claim =
    typeof candidate.claim === "string" && candidate.claim.trim()
      ? candidate.claim.trim()
      : fallbackClaim;

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim()
        : `${sectionId}-citation-${index + 1}`,
    source,
    claim,
    relevance: RELEVANCE_VALUES.includes(candidate.relevance as ResearchRelevance)
      ? (candidate.relevance as ResearchRelevance)
      : "low",
    ...(url ? { url } : {}),
    ...(normalizeOptionalEnum(candidate.sourceType, SOURCE_TYPE_VALUES)
      ? { sourceType: normalizeOptionalEnum(candidate.sourceType, SOURCE_TYPE_VALUES) }
      : {}),
    ...(typeof candidate.publicationDate === "string" && candidate.publicationDate.trim()
      ? { publicationDate: candidate.publicationDate.trim() }
      : {}),
    ...(normalizeOptionalEnum(candidate.publicationSignal, PUBLICATION_SIGNAL_VALUES)
      ? { publicationSignal: normalizeOptionalEnum(candidate.publicationSignal, PUBLICATION_SIGNAL_VALUES) }
      : {}),
    ...(normalizeOptionalEnum(candidate.recencySignal, RECENCY_SIGNAL_VALUES)
      ? { recencySignal: normalizeOptionalEnum(candidate.recencySignal, RECENCY_SIGNAL_VALUES) }
      : {}),
    ...(normalizeOptionalEnum(candidate.accessibilityStatus, ACCESSIBILITY_VALUES)
      ? { accessibilityStatus: normalizeOptionalEnum(candidate.accessibilityStatus, ACCESSIBILITY_VALUES) }
      : {}),
  };
}

export function buildSynthesisPrompt(sections: ResearchSection[], researchQuestion: string): string {
  const normalizedQuestion = researchQuestion.trim() || DEFAULT_RESEARCH_QUESTION;
  const sectionContext = sections
    .map(
      (section) =>
        `${section.title} (${section.angle})\nFindings:\n${section.findings}\nCitations:\n${section.citations
          .map(
            (citation) =>
              `- ${citation.id} | ${citation.source}: ${citation.claim} [${citation.relevance}]${citation.publicationDate ? ` | published ${citation.publicationDate}` : ""}${citation.publicationSignal ? ` | ${citation.publicationSignal}` : ""}${citation.recencySignal ? ` | ${citation.recencySignal}` : ""}${citation.accessibilityStatus ? ` | ${citation.accessibilityStatus}` : ""}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");

  return [
    "You are synthesizing multiple research sections into a concise executive summary with structured evidence tracking.",
    `Research question: ${normalizedQuestion}.`,
    "Use only the findings and citations provided below.",
    "Return valid JSON only with this exact shape:",
    '{ "executiveSummary": string, "keyFindings": [{ "id": string, "statement": string, "citationIds": string[], "sectionIds"?: string[], "strength": "strong" | "moderate" | "weak" }], "caveats": [{ "id": string, "statement": string, "citationIds"?: string[], "sectionIds"?: string[] }], "contradictions": [{ "id": string, "statement": string, "citationIds": string[], "sectionIds"?: string[] }], "unansweredQuestions": [{ "id": string, "question": string, "citationIds"?: string[], "sectionIds"?: string[] }] }.',
    "Each key finding must cite one or more citation IDs from the input. If there is not enough evidence, do not invent support; put the issue in caveats or unansweredQuestions instead.",
    "Executive summary should be plain text in 2 to 4 short paragraphs.",
    "List contradictions only when the evidence genuinely conflicts. If none, return an empty array.",
    "Be explicit about weak evidence, dated evidence, missing publication dates, and partial runs when relevant.",
    sectionContext,
  ].join("\n\n");
}

function parseStructuredSummary(text: string): StructuredSummary | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const structured: StructuredSummary = {
      executiveSummary: typeof candidate.executiveSummary === "string" ? candidate.executiveSummary.trim() : "",
      keyFindings: Array.isArray(candidate.keyFindings)
        ? candidate.keyFindings.filter((item) => isValidKeyFinding(item))
        : [],
      caveats: Array.isArray(candidate.caveats) ? candidate.caveats.filter((item) => isValidCaveat(item)) : [],
      contradictions: Array.isArray(candidate.contradictions)
        ? candidate.contradictions.filter((item) => isValidContradiction(item))
        : [],
      unansweredQuestions: Array.isArray(candidate.unansweredQuestions)
        ? candidate.unansweredQuestions.filter((item) => isValidUnansweredQuestion(item))
        : [],
    };

    return structured.executiveSummary ? structured : null;
  } catch {
    return null;
  }
}

function fallbackStructuredSummary(
  sections: ResearchSection[],
  failures: ResearchFailure[],
  generatedAt: string,
): StructuredSummary {
  const keyFindings: ResearchKeyFinding[] = [];
  const promotedCaveats: ResearchCaveat[] = [];
  const caveats: ResearchCaveat[] = [];
  const unansweredQuestions: ResearchUnansweredQuestion[] = [];

  sections.forEach((section, index) => {
    const sectionCitations = section.citations.map((citation) => citation.id);

    if (sectionCitations.length > 0) {
      const statement =
        section.findings
          .split(/\n+/)
          .map((paragraph) => paragraph.trim())
          .find(Boolean) ?? `${section.title} contains evidence relevant to the research question.`;

      keyFindings.push({
        id: `${slugifyId(section.id, `finding-${index + 1}`)}-finding`,
        statement,
        citationIds: sectionCitations,
        sectionIds: [section.id],
        strength: sectionCitations.length >= 2 ? "moderate" : "weak",
      });
      return;
    }

    caveats.push({
      id: `${slugifyId(section.id, `caveat-${index + 1}`)}-caveat`,
      statement: `${section.title} did not retain enough usable citations to support a key finding.`,
      sectionIds: [section.id],
    });
  });

  failures.forEach((failure, index) => {
    caveats.push({
      id: `${failure.stage}-${index + 1}`,
      statement: failure.message,
    });
  });

  if (sections.some((section) => section.citations.some((citation) => !citation.publicationDate))) {
    caveats.push({
      id: `undated-evidence-${generatedAt}`,
      statement: "Some supporting sources are undated, which limits confidence in recency-sensitive claims.",
    });
  }

  if (keyFindings.length === 0) {
    unansweredQuestions.push({
      id: "evidence-gap-1",
      question: "Which claims can be verified with stronger primary evidence before acting on this report?",
    });
  }

  return {
    executiveSummary: DEFAULT_EXECUTIVE_SUMMARY,
    keyFindings,
    caveats: dedupeById(caveats),
    contradictions: [],
    unansweredQuestions: dedupeById(unansweredQuestions),
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function dedupeByValue(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeQuestionsByValue(items: ResearchUnansweredQuestion[]): ResearchUnansweredQuestion[] {
  const seen = new Set<string>();
  const result: ResearchUnansweredQuestion[] = [];

  for (const item of items) {
    const key = item.question.trim().toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function createStableId(baseId: string, seenIds: Set<string>, fallbackPrefix: string): string {
  const normalizedBase = baseId.trim() || fallbackPrefix;
  let nextId = normalizedBase;
  let index = 2;

  while (seenIds.has(nextId)) {
    nextId = `${normalizedBase}-${index}`;
    index += 1;
  }

  seenIds.add(nextId);
  return nextId;
}

function normalizeLinkedSectionIds(sectionIds: string[] | undefined, citationIds: string[], citationSectionMap: Map<string, string>): string[] | undefined {
  const linkedSectionIds = dedupeByValue([
    ...(sectionIds ?? []).filter((sectionId) => citationIds.some((citationId) => citationSectionMap.get(citationId) === sectionId)),
    ...citationIds.map((citationId) => citationSectionMap.get(citationId)).filter((value): value is string => Boolean(value)),
  ]);

  return linkedSectionIds.length > 0 ? linkedSectionIds : undefined;
}

function normalizeStructuredSummary(summary: StructuredSummary, sections: ResearchSection[]): NormalizedStructuredSummary {
  const validCitationIds = new Set<string>();
  const citationSectionMap = new Map<string, string>();
  const seenIds = new Set<string>();
  const normalizationIssues: string[] = [];

  sections.forEach((section) => {
    section.citations.forEach((citation) => {
      validCitationIds.add(citation.id);
      citationSectionMap.set(citation.id, section.id);
    });
  });

  const caveats: ResearchCaveat[] = [];
  const keyFindings: ResearchKeyFinding[] = [];
  const contradictions: ResearchContradiction[] = [];
  const unansweredQuestions: ResearchUnansweredQuestion[] = [];

  (summary.keyFindings ?? []).forEach((item) => {
    const citationIds = dedupeStringList(item.citationIds.filter((citationId) => validCitationIds.has(citationId)));
    const sectionIds = normalizeLinkedSectionIds(item.sectionIds, citationIds, citationSectionMap);

    if (citationIds.length === 0) {
      normalizationIssues.push(`unsupported-key-finding:${item.id}`);
      caveats.push({
        id: createStableId(`${item.id}-unsupported`, seenIds, "unsupported-finding"),
        statement: item.statement,
        ...(sectionIds ? { sectionIds } : {}),
      });
      return;
    }

    keyFindings.push({
      ...item,
      id: createStableId(item.id, seenIds, "finding"),
      citationIds,
      sectionIds,
    });
  });

  (summary.caveats ?? []).forEach((item) => {
    const citationIds = dedupeStringList((item.citationIds ?? []).filter((citationId) => validCitationIds.has(citationId)));
    const sectionIds = normalizeLinkedSectionIds(item.sectionIds, citationIds, citationSectionMap);

    caveats.push({
      id: createStableId(item.id, seenIds, "caveat"),
      statement: item.statement,
      ...(citationIds.length > 0 ? { citationIds } : {}),
      ...(sectionIds ? { sectionIds } : {}),
    });
  });

  (summary.contradictions ?? []).forEach((item) => {
    const citationIds = dedupeStringList(item.citationIds.filter((citationId) => validCitationIds.has(citationId)));
    const sectionIds = normalizeLinkedSectionIds(item.sectionIds, citationIds, citationSectionMap);

    if (citationIds.length === 0) {
      caveats.push({
        id: createStableId(`${item.id}-unsupported`, seenIds, "unsupported-contradiction"),
        statement: item.statement,
        ...(sectionIds ? { sectionIds } : {}),
      });
      return;
    }

    contradictions.push({
      ...item,
      id: createStableId(item.id, seenIds, "contradiction"),
      citationIds,
      sectionIds,
    });
  });

  (summary.unansweredQuestions ?? []).forEach((item) => {
    const citationIds = dedupeStringList((item.citationIds ?? []).filter((citationId) => validCitationIds.has(citationId)));
    const sectionIds = normalizeLinkedSectionIds(item.sectionIds, citationIds, citationSectionMap);

    unansweredQuestions.push({
      id: createStableId(item.id, seenIds, "question"),
      question: item.question,
      ...(citationIds.length > 0 ? { citationIds } : {}),
      ...(sectionIds ? { sectionIds } : {}),
    });
  });

  return {
    executiveSummary: summary.executiveSummary.trim(),
    keyFindings,
    caveats: sortById(dedupeById(caveats)),
    contradictions,
    unansweredQuestions: dedupeQuestionsByValue(dedupeById(unansweredQuestions)),
    normalizationIssues,
  };
}

function sanitizeSectionCitations(
  section: ResearchSection,
  budget: ResearchBudget,
  rejectedSources: ResearchRejectedSource[],
  rejectedSourceRecords: RejectedSourceRecord[],
): ResearchSection {
  const seen = new Set<string>();
  const citations: ResearchCitation[] = [];

  for (const citation of section.citations) {
    const citationKey = `${toCanonicalSourceId(citation)}::${citation.claim.trim().toLowerCase()}`;

    if (seen.has(citationKey)) {
      rejectedSources.push({ reason: "duplicate", source: citation.source, citationId: citation.id });
      rejectedSourceRecords.push({
        reason: "duplicate",
        source: citation.source,
        citationId: citation.id,
        citation,
        sectionId: section.id,
      });
      continue;
    }

    if (citations.length >= budget.maxCitationsPerSection) {
      rejectedSources.push({ reason: "budget", source: citation.source, citationId: citation.id });
      rejectedSourceRecords.push({
        reason: "budget",
        source: citation.source,
        citationId: citation.id,
        citation,
        sectionId: section.id,
      });
      continue;
    }

    citations.push(citation);
    seen.add(citationKey);
  }

  return {
    ...section,
    citations,
  };
}

function dedupeCitationsAcrossSections(
  sections: ResearchSection[],
  rejectedSources: ResearchRejectedSource[],
  rejectedSourceRecords: RejectedSourceRecord[],
): ResearchSection[] {
  const seen = new Set<string>();

  return sections.map((section) => ({
    ...section,
    citations: section.citations.filter((citation) => {
      const citationKey = `${toCanonicalSourceId(citation)}::${citation.claim.trim().toLowerCase()}`;

      if (seen.has(citationKey)) {
        rejectedSources.push({ reason: "duplicate", source: citation.source, citationId: citation.id });
        rejectedSourceRecords.push({
          reason: "duplicate",
          source: citation.source,
          citationId: citation.id,
          citation,
          sectionId: section.id,
        });
        return false;
      }

      seen.add(citationKey);
      return true;
    }),
  }));
}

function createSourceFromCitation(
  citation: ResearchCitation,
  sectionId: string,
  status: ResearchSource["status"],
  rejectionReason?: ResearchSource["rejectionReason"],
): ResearchSource {
  const canonicalId = toCanonicalSourceId(citation);
  const { canonicalUrl, domain } = parseOptionalUrl(citation.url);

  return {
    id: `${status}-${slugifyId(canonicalId || citation.source, citation.id)}`,
    title: citation.source,
    canonicalId,
    sourceType: citation.sourceType ?? "other",
    status,
    citationIds: [citation.id],
    sectionIds: [sectionId],
    url: citation.url,
    canonicalUrl,
    domain,
    publicationDate: citation.publicationDate,
    publicationSignal: citation.publicationSignal ?? "unknown",
    recencySignal: getDefaultRecencySignal(citation),
    accessibilityStatus: citation.accessibilityStatus ?? "unknown",
    claimCount: 1,
    rejectionReason,
  };
}

function getDefaultRecencySignal(citation: Pick<ResearchCitation, "publicationDate" | "recencySignal">): ResearchSource["recencySignal"] {
  if (citation.recencySignal) {
    return citation.recencySignal;
  }

  return citation.publicationDate ? "unknown" : "undated";
}

function shouldUpgradeRecencySignal(
  current: ResearchSource["recencySignal"],
  next: ResearchSource["recencySignal"],
): boolean {
  if (current === next) {
    return false;
  }

  if (current === "unknown" || current === "undated") {
    return next !== "unknown" || (current === "undated" && next === "unknown");
  }

  return false;
}

function getSourceLookupKeys(citation: ResearchCitation): string[] {
  return dedupeStringList([toCanonicalSourceId(citation), slugifyId(citation.source, citation.id).toLowerCase()]);
}

function registerSourceAliases(aliasMap: Map<string, string>, source: ResearchSource, citation: ResearchCitation) {
  aliasMap.set(source.canonicalId, source.canonicalId);

  getSourceLookupKeys(citation).forEach((key) => {
    aliasMap.set(key, source.canonicalId);
  });
}

function mergeSourceMetadata(existing: ResearchSource, citation: ResearchCitation, sectionId: string) {
  const { canonicalUrl, domain } = parseOptionalUrl(citation.url);
  const nextRecencySignal = getDefaultRecencySignal(citation);

  existing.citationIds = dedupeStringList([...existing.citationIds, citation.id]);
  existing.sectionIds = dedupeStringList([...existing.sectionIds, sectionId]);
  existing.claimCount += 1;
  existing.url = existing.url ?? citation.url;
  existing.canonicalUrl = existing.canonicalUrl ?? canonicalUrl;
  existing.domain = existing.domain ?? domain;
  existing.publicationDate = existing.publicationDate ?? citation.publicationDate;
  existing.publicationSignal = existing.publicationSignal === "unknown"
    ? (citation.publicationSignal ?? existing.publicationSignal)
    : existing.publicationSignal;
  if (shouldUpgradeRecencySignal(existing.recencySignal, nextRecencySignal)) {
    existing.recencySignal = nextRecencySignal;
  }
  existing.accessibilityStatus = existing.accessibilityStatus === "unknown"
    ? (citation.accessibilityStatus ?? existing.accessibilityStatus)
    : existing.accessibilityStatus;
  existing.sourceType = existing.sourceType === "other" ? (citation.sourceType ?? existing.sourceType) : existing.sourceType;
}

function collectSourceInventory(
  sections: ResearchSection[],
  rejectedSources: RejectedSourceRecord[],
): ResearchSourceInventory {
  const selectedMap = new Map<string, ResearchSource>();
  const selectedAliases = new Map<string, string>();

  sections.forEach((section) => {
    section.citations.forEach((citation) => {
      const existingCanonicalId = getSourceLookupKeys(citation)
        .map((key) => selectedAliases.get(key) ?? (selectedMap.has(key) ? key : undefined))
        .find((value): value is string => Boolean(value));
      const existing = existingCanonicalId ? selectedMap.get(existingCanonicalId) : undefined;

      if (!existing) {
        const created = createSourceFromCitation(citation, section.id, "selected");
        selectedMap.set(created.canonicalId, created);
        registerSourceAliases(selectedAliases, created, citation);
        return;
      }

      mergeSourceMetadata(existing, citation, section.id);
      registerSourceAliases(selectedAliases, existing, citation);
    });
  });

  const rejectedMap = new Map<string, ResearchSource>();

  rejectedSources.forEach((rejected, index) => {
    const canonicalId = rejected.citation ? toCanonicalSourceId(rejected.citation) : slugifyId(rejected.source, `rejected-${index + 1}`);
    const existing = rejectedMap.get(canonicalId);

    if (!existing) {
      rejectedMap.set(
        canonicalId,
        rejected.citation
          ? createSourceFromCitation(rejected.citation, rejected.sectionId, "rejected", rejected.reason)
          : {
              id: `rejected-${canonicalId}`,
              title: rejected.source,
              canonicalId,
              sourceType: "other",
              status: "rejected",
              citationIds: rejected.citationId ? [rejected.citationId] : [],
              sectionIds: [rejected.sectionId],
              publicationSignal: "unknown",
              recencySignal: "unknown",
              accessibilityStatus: "unknown",
              claimCount: rejected.citationId ? 1 : 0,
              rejectionReason: rejected.reason,
            },
      );
      return;
    }

    existing.citationIds = dedupeStringList([...existing.citationIds, ...(rejected.citationId ? [rejected.citationId] : [])]);
    existing.sectionIds = dedupeStringList([...existing.sectionIds, rejected.sectionId]);
    existing.claimCount += rejected.citationId ? 1 : 0;
  });

  const sortSources = (sources: ResearchSource[]) =>
    [...sources].sort((left, right) => {
      const titleComparison = left.title.localeCompare(right.title);

      if (titleComparison !== 0) {
        return titleComparison;
      }

      return left.id.localeCompare(right.id);
    });

  return {
    selected: sortSources([...selectedMap.values()]),
    rejected: sortSources([...rejectedMap.values()]),
  };
}

async function requestSection(
  client: ResearchOpenAIClient,
  planItem: ResearchPlanItem,
  plan: ResearchPlan,
  memoryContextBlock?: string,
): Promise<ResearchSection | null> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: buildResearchPrompt(
          planItem.angle,
          plan.projectName,
          plan.projectDescription,
          plan.researchQuestion,
          memoryContextBlock,
        ),
      },
      {
        role: "user",
        content: `Generate the research section as valid JSON. Query: ${planItem.query}`,
      },
    ],
  });

  return parseResearchResponse(completion.choices?.[0]?.message?.content ?? "");
}

async function requestSummary(
  client: ResearchOpenAIClient,
  sections: ResearchSection[],
  researchQuestion: string,
): Promise<StructuredSummary | null> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: buildSynthesisPrompt(sections, researchQuestion),
      },
      {
        role: "user",
        content: "Generate the structured synthesis JSON.",
      },
    ],
  });

  return parseStructuredSummary(completion.choices?.[0]?.message?.content ?? "");
}

function collectReportCitations(sections: ResearchSection[]): ResearchCitation[] {
  return sections.flatMap((section) => section.citations);
}

export async function runResearch(
  client: ResearchOpenAIClient,
  input: ResearchRunInput,
): Promise<ResearchRunArtifact> {
  const generatedAt = input.generatedAt?.trim() || new Date().toISOString();
  const failures: ResearchFailure[] = [];

  let plan: ResearchPlan;
  try {
    plan = createResearchPlan(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid research input";
    const fallbackPlan: ResearchPlan = {
      projectName: input.projectName?.trim() || "Untitled project",
      projectDescription: input.projectDescription?.trim() || "",
      researchQuestion: input.researchQuestion?.trim() || DEFAULT_RESEARCH_QUESTION,
      budget: normalizeBudget(input.budgets),
      steps: [],
    };

    return {
      status: "failed",
      generatedAt,
      plan: fallbackPlan,
      report: {
        sections: [],
        executiveSummary: DEFAULT_EXECUTIVE_SUMMARY,
        researchQuestion: fallbackPlan.researchQuestion,
        generatedAt,
        keyFindings: [],
        caveats: [
          {
            id: "invalid-input",
            statement: message,
          },
        ],
        contradictions: [],
        unansweredQuestions: [],
      },
      selectedSources: [],
      rejectedSources: [],
      sourceInventory: { selected: [], rejected: [] },
      metrics: {
        attemptedAngles: 0,
        completedSections: 0,
        selectedSources: 0,
        rejectedSources: 0,
      },
      failures: [{ stage: "plan", code: "invalid-input", message }],
    };
  }

  const selectedSources: ResearchCitation[] = [];
  const rejectedSources: ResearchRejectedSource[] = [];
  const rejectedSourceRecords: RejectedSourceRecord[] = [];
  const sections: ResearchSection[] = [];
  const attemptedSteps = plan.steps.slice(0, plan.budget.maxSections);

  for (const step of attemptedSteps) {
    try {
      const section = await requestSection(client, step, plan, input.memoryContextBlock);

      if (!section) {
        failures.push({
          stage: "gather",
          code: "invalid-section",
          message: `Failed to parse section for ${step.title}`,
        });
        continue;
      }

      const sanitizedSection = sanitizeSectionCitations(section, plan.budget, rejectedSources, rejectedSourceRecords);
      sections.push(sanitizedSection);
    } catch (error) {
      failures.push({
        stage: "gather",
        code: "provider-error",
        message: error instanceof Error ? error.message : `Provider error while gathering ${step.title}`,
      });
    }
  }

  if (sections.length === 0) {
    failures.push({
      stage: "gather",
      code: "no-evidence",
      message: "No research sections passed validation",
    });

    return {
      status: "failed",
      generatedAt,
      plan,
      report: {
        sections: [],
        executiveSummary: DEFAULT_EXECUTIVE_SUMMARY,
        researchQuestion: plan.researchQuestion,
        generatedAt,
        keyFindings: [],
        caveats: failures.map((failure, index) => ({
          id: `failure-${index + 1}`,
          statement: failure.message,
        })),
        contradictions: [],
        unansweredQuestions: [
          {
            id: "no-evidence",
            question: "Which sources or customer interviews are still needed to answer the research question credibly?",
          },
        ],
      },
      selectedSources,
      rejectedSources,
      sourceInventory: { selected: [], rejected: [] },
      metrics: {
        attemptedAngles: attemptedSteps.length,
        completedSections: 0,
        selectedSources: selectedSources.length,
        rejectedSources: rejectedSources.length,
      },
      failures,
    };
  }

  const normalizedSections = dedupeCitationsAcrossSections(sections, rejectedSources, rejectedSourceRecords);

  normalizedSections.forEach((section) => {
    selectedSources.push(...section.citations);
  });

  const sourceInventory = collectSourceInventory(normalizedSections, rejectedSourceRecords);

  let structuredSummary: StructuredSummary | null = null;
  try {
    structuredSummary = await requestSummary(client, normalizedSections, plan.researchQuestion);
  } catch (error) {
    failures.push({
      stage: "report",
      code: "provider-error",
      message: error instanceof Error ? error.message : "Provider error while synthesizing report",
    });
  }

  if (!structuredSummary?.executiveSummary) {
    failures.push({
      stage: "report",
      code: "invalid-summary",
      message: "Failed to synthesize report",
    });
    structuredSummary = fallbackStructuredSummary(normalizedSections, failures, generatedAt);
  }

  const normalizedSummary = normalizeStructuredSummary(structuredSummary, normalizedSections);
  structuredSummary = normalizedSummary;

  if ((structuredSummary.keyFindings ?? []).length === 0) {
    structuredSummary.caveats = sortById(dedupeById([
      ...(structuredSummary.caveats ?? []),
      {
        id: "missing-supported-findings",
        statement: "No key findings met the citation threshold, so evidence gaps remain visible instead of inferred.",
      },
    ]));
  }

  const report: ResearchReport = {
    sections: normalizedSections,
    executiveSummary: structuredSummary.executiveSummary,
    researchQuestion: plan.researchQuestion,
    generatedAt,
    citations: collectReportCitations(normalizedSections),
    sources: sourceInventory.selected,
    keyFindings: structuredSummary.keyFindings ?? [],
    caveats: structuredSummary.caveats ?? [],
    contradictions: structuredSummary.contradictions ?? [],
    unansweredQuestions: structuredSummary.unansweredQuestions ?? [],
  };

  if (!isValidReport(report)) {
    failures.push({
      stage: "report",
      code: "invalid-summary",
      message: "Generated report did not pass validation",
    });
  }

  return {
    status: failures.length === 0 && normalizedSummary.normalizationIssues.length === 0 ? "completed" : "partial",
    generatedAt,
    plan,
    report,
    selectedSources,
    rejectedSources,
    sourceInventory,
    metrics: {
      attemptedAngles: attemptedSteps.length,
      completedSections: sections.length,
      selectedSources: sourceInventory.selected.length,
      rejectedSources: sourceInventory.rejected.length,
    },
    failures,
  };
}
