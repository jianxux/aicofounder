export type ResearchRelevance = "high" | "medium" | "low";
export type ResearchRunStatus = "completed" | "partial" | "failed";
export type ResearchStage = "plan" | "gather" | "report";
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
};

export type ResearchSection = {
  id: string;
  title: string;
  angle: string;
  findings: string;
  citations: ResearchCitation[];
};

export type ResearchReport = {
  sections: ResearchSection[];
  executiveSummary: string;
  researchQuestion: string;
  generatedAt: string;
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

  return typeof candidate.url === "undefined" || typeof candidate.url === "string";
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
    isNonEmptyString(candidate.generatedAt)
  );
}

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
    'Each citation must match: { "id": string, "source": string, "claim": string, "relevance": "high" | "medium" | "low", "url"?: string }.',
    "Write findings as concise markdown-formatted prose with short paragraphs or bullets represented as plain markdown text.",
    "Ground the section in evidence tied directly to the project and this research angle instead of generic startup advice.",
    "Include 2 to 5 citations. Each citation should capture one concrete claim from the findings and name the source clearly.",
    "Use URLs only when they are helpful and plausible. Omit the url field if no direct reference is available.",
  ];

  if (memoryContextBlock?.trim()) {
    promptSections.push(memoryContextBlock.trim());
  }

  return promptSections.join(" ");
}

export function parseResearchResponse(text: string): ResearchSection | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));
    return isValidSection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildSynthesisPrompt(sections: ResearchSection[], researchQuestion: string): string {
  const normalizedQuestion = researchQuestion.trim() || DEFAULT_RESEARCH_QUESTION;
  const sectionContext = sections
    .map(
      (section) =>
        `${section.title} (${section.angle})\nFindings:\n${section.findings}\nCitations:\n${section.citations
          .map((citation) => `- ${citation.source}: ${citation.claim} [${citation.relevance}]`)
          .join("\n")}`,
    )
    .join("\n\n");

  return [
    "You are synthesizing multiple research sections into a concise executive summary.",
    `Research question: ${normalizedQuestion}.`,
    "Use the section findings below to produce a short executive summary that highlights the biggest opportunities, risks, and strategic implications.",
    "Be honest about missing or weak evidence. If the evidence is thin, say so clearly.",
    "Do not return JSON. Return plain text in 2 to 4 short paragraphs.",
    sectionContext,
  ].join("\n\n");
}

function clipSectionCitations(
  section: ResearchSection,
  budget: ResearchBudget,
  selectedSources: ResearchCitation[],
  rejectedSources: ResearchRejectedSource[],
): ResearchSection {
  const seen = new Set(selectedSources.map((citation) => citation.source.toLowerCase()));
  const citations: ResearchCitation[] = [];

  for (const citation of section.citations) {
    const sourceKey = citation.source.trim().toLowerCase();

    if (seen.has(sourceKey)) {
      rejectedSources.push({ reason: "duplicate", source: citation.source, citationId: citation.id });
      continue;
    }

    if (citations.length >= budget.maxCitationsPerSection) {
      rejectedSources.push({ reason: "budget", source: citation.source, citationId: citation.id });
      continue;
    }

    citations.push(citation);
    selectedSources.push(citation);
    seen.add(sourceKey);
  }

  return {
    ...section,
    citations,
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
): Promise<string> {
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
        content: "Generate the executive summary.",
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() ?? "";
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
      },
      selectedSources: [],
      rejectedSources: [],
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

      const clippedSection = clipSectionCitations(section, plan.budget, selectedSources, rejectedSources);
      sections.push(clippedSection);
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
      },
      selectedSources,
      rejectedSources,
      metrics: {
        attemptedAngles: attemptedSteps.length,
        completedSections: 0,
        selectedSources: selectedSources.length,
        rejectedSources: rejectedSources.length,
      },
      failures,
    };
  }

  let executiveSummary = "";
  try {
    executiveSummary = await requestSummary(client, sections, plan.researchQuestion);
  } catch (error) {
    failures.push({
      stage: "report",
      code: "provider-error",
      message: error instanceof Error ? error.message : "Provider error while synthesizing report",
    });
  }

  if (!executiveSummary) {
    failures.push({
      stage: "report",
      code: "invalid-summary",
      message: "Failed to synthesize report",
    });
    executiveSummary = DEFAULT_EXECUTIVE_SUMMARY;
  }

  const report: ResearchReport = {
    sections,
    executiveSummary,
    researchQuestion: plan.researchQuestion,
    generatedAt,
  };

  if (!isValidReport(report)) {
    failures.push({
      stage: "report",
      code: "invalid-summary",
      message: "Generated report did not pass validation",
    });
  }

  return {
    status: failures.length === 0 ? "completed" : "partial",
    generatedAt,
    plan,
    report,
    selectedSources,
    rejectedSources,
    metrics: {
      attemptedAngles: attemptedSteps.length,
      completedSections: sections.length,
      selectedSources: selectedSources.length,
      rejectedSources: rejectedSources.length,
    },
    failures,
  };
}
