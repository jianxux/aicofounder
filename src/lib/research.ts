export type ResearchCitation = {
  id: string;
  source: string;
  claim: string;
  relevance: "high" | "medium" | "low";
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

type ResearchAngle = {
  id: string;
  title: string;
  angle: string;
};

const RELEVANCE_VALUES = ["high", "medium", "low"] as const;

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

function isValidCitation(value: unknown): value is ResearchCitation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.source !== "string" ||
    typeof candidate.claim !== "string" ||
    !RELEVANCE_VALUES.includes(candidate.relevance as (typeof RELEVANCE_VALUES)[number])
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
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.angle === "string" &&
    typeof candidate.findings === "string" &&
    Array.isArray(candidate.citations) &&
    candidate.citations.every((citation) => isValidCitation(citation))
  );
}

export function buildResearchPrompt(
  angle: string,
  projectName: string,
  projectDescription: string,
  researchQuestion: string,
): string {
  const promptSections = [
    "You are a deep research agent helping an AI cofounder produce a cited report section.",
    `Project name: ${projectName.trim() || "Untitled project"}.`,
    `Project description: ${projectDescription.trim()}.`,
    `Research question: ${(researchQuestion.trim() || "What are the key opportunities and risks?").trim()}.`,
    `Research angle: ${angle.trim()}.`,
    "Act as if you reviewed credible primary and secondary sources, including market reports, product pages, developer docs, community discussions, and analyst commentary where relevant.",
    "Return valid JSON only. Do not include markdown, commentary, or any text before or after the JSON.",
    'The JSON must match this TypeScript shape exactly: { "id": string, "title": string, "angle": string, "findings": string, "citations": ResearchCitation[] }.',
    'Each citation must match: { "id": string, "source": string, "claim": string, "relevance": "high" | "medium" | "low", "url"?: string }.',
    "Write findings as concise markdown-formatted prose with short paragraphs or bullets represented as plain markdown text.",
    "Ground the section in evidence tied directly to the project and this research angle instead of generic startup advice.",
    "Include 3 to 5 citations. Each citation should capture one concrete claim from the findings and name the source clearly.",
    "Use URLs only when they are helpful and plausible. Omit the url field if no direct reference is available.",
  ];

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
  const normalizedQuestion = researchQuestion.trim() || "What are the key opportunities and risks?";
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
    "Do not return JSON. Return plain text in 2 to 4 short paragraphs.",
    sectionContext,
  ].join("\n\n");
}
