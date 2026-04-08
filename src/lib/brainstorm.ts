export type BrainstormPainPoint = {
  id: string;
  title: string;
  description: string;
  source: string;
  severity: 1 | 2 | 3 | 4 | 5;
  frequency: string;
  quotes: string[];
};

export type BrainstormResult = {
  painPoints: BrainstormPainPoint[];
  summary: string;
  searchContext: string;
};

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

function isValidPainPoint(value: unknown): value is BrainstormPainPoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.source === "string" &&
    [1, 2, 3, 4, 5].includes(candidate.severity as number) &&
    typeof candidate.frequency === "string" &&
    Array.isArray(candidate.quotes) &&
    candidate.quotes.every((quote) => typeof quote === "string")
  );
}

function isValidBrainstormResult(value: unknown): value is BrainstormResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.painPoints) &&
    candidate.painPoints.every((painPoint) => isValidPainPoint(painPoint)) &&
    typeof candidate.summary === "string" &&
    typeof candidate.searchContext === "string"
  );
}

export function buildBrainstormPrompt(
  projectName: string,
  projectDescription: string,
  focusArea?: string,
  memoryContextBlock?: string,
): string {
  const promptSections = [
    "You are a market researcher helping an AI cofounder identify real customer pain points.",
    "Act like you have analyzed Reddit threads, Hacker News discussions, Product Hunt comments, Twitter/X posts, and niche forums relevant to this project.",
    `Project name: ${projectName.trim() || "Untitled project"}.`,
    `Project description: ${projectDescription.trim()}.`,
    focusArea?.trim() ? `Focus area: ${focusArea.trim()}.` : "Focus area: broad market pain point discovery.",
    "Return valid JSON only. Do not include markdown, commentary, or any text before or after the JSON.",
    'The JSON must match this TypeScript shape exactly: { "painPoints": BrainstormPainPoint[], "summary": string, "searchContext": string }.',
    'Each pain point must match: { "id": string, "title": string, "description": string, "source": string, "severity": 1|2|3|4|5, "frequency": string, "quotes": string[] }.',
    "Generate 5 to 7 realistic pain points grounded in communities where founders, operators, and builders complain publicly.",
    "Use specific sources such as r/startups, r/SaaS, r/webdev, r/Entrepreneur, Hacker News, Product Hunt, Indie Hackers, or niche forums that fit the project.",
    "Make the pain points concrete, plausible, and specific to the project instead of generic startup advice.",
    "Use realistic severity scores where 1 is minor annoyance and 5 is urgent, repeated pain.",
    "Use realistic frequency wording such as daily, weekly, monthly, or seasonally recurring.",
    "Include 2 or 3 short complaint quotes per pain point that sound like authentic user frustration, but do not attribute them to named individuals.",
    "The summary should synthesize the strongest patterns across the pain points.",
    "The searchContext should briefly describe which communities, themes, and user segments were investigated.",
  ];

  if (memoryContextBlock?.trim()) {
    promptSections.push(memoryContextBlock.trim());
  }

  return promptSections.join(" ");
}

export function parseBrainstormResponse(text: string): BrainstormResult | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));
    return isValidBrainstormResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
