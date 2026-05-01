export type UltraplanBlocker = {
  id: string;
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  category: "technical" | "market" | "team" | "resource" | "strategic";
};

export type UltraplanAction = {
  id: string;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timelineHours: number;
};

export type UltraplanResult = {
  blocker: UltraplanBlocker;
  actions: UltraplanAction[];
  rationale: string;
  nextStep: string;
};

export function extractJsonPayload(text: string): string {
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

export function isValidBlocker(value: unknown): value is UltraplanBlocker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    [1, 2, 3, 4, 5].includes(candidate.severity as number) &&
    ["technical", "market", "team", "resource", "strategic"].includes(candidate.category as string)
  );
}

export function isValidAction(value: unknown): value is UltraplanAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    ["low", "medium", "high"].includes(candidate.effort as string) &&
    ["low", "medium", "high"].includes(candidate.impact as string) &&
    typeof candidate.timelineHours === "number" &&
    Number.isFinite(candidate.timelineHours) &&
    candidate.timelineHours > 0
  );
}

export function isValidUltraplanResult(value: unknown): value is UltraplanResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isValidBlocker(candidate.blocker) &&
    Array.isArray(candidate.actions) &&
    candidate.actions.length >= 3 &&
    candidate.actions.length <= 5 &&
    candidate.actions.every((action) => isValidAction(action)) &&
    typeof candidate.rationale === "string" &&
    typeof candidate.nextStep === "string"
  );
}

export function buildUltraplanPrompt(
  projectName: string,
  projectDescription: string,
  currentPhase: string,
  completedTasks: number,
  totalTasks: number,
  recentMessages?: string[],
): string {
  const trimmedMessages =
    recentMessages?.map((message) => message.trim()).filter(Boolean) ?? [];

  const promptSections = [
    "You are a strategic execution advisor helping an AI cofounder identify the single biggest blocker to project progress.",
    `Project name: ${projectName.trim() || "Untitled project"}.`,
    `Project description: ${projectDescription.trim()}.`,
    `Current phase: ${currentPhase.trim() || "Unknown phase"}.`,
    `Completed tasks: ${completedTasks}.`,
    `Total tasks: ${totalTasks}.`,
    trimmedMessages.length > 0
      ? `Recent messages: ${trimmedMessages.join(" | ")}.`
      : "Recent messages: none provided.",
    "Return valid JSON only. Do not include markdown, commentary, or any text before or after the JSON.",
    'The JSON must match this TypeScript shape exactly: { "blocker": UltraplanBlocker, "actions": UltraplanAction[], "rationale": string, "nextStep": string }.',
    'The blocker must match: { "id": string, "title": string, "description": string, "severity": 1|2|3|4|5, "category": "technical"|"market"|"team"|"resource"|"strategic" }.',
    'Each action must match: { "id": string, "title": string, "description": string, "effort": "low"|"medium"|"high", "impact": "low"|"medium"|"high", "timelineHours": number }.',
    "Identify the single biggest blocker that is most likely preventing meaningful progress right now.",
    "Create 3 to 5 concrete, actionable steps that would reduce or remove that blocker.",
    "Make the blocker and actions specific to the project state, current phase, task progress, and recent messages instead of giving generic startup advice.",
    "Use realistic severity where 1 is minor friction and 5 is a critical blocker.",
    "Use realistic effort, impact, and positive timelineHours (> 0) estimates for each action.",
    "The rationale should explain why this blocker matters most right now.",
    "The nextStep should be the single highest-leverage action to take immediately.",
  ];

  return promptSections.join(" ");
}

export function parseUltraplanResponse(text: string): UltraplanResult | null {
  try {
    const parsed = JSON.parse(extractJsonPayload(text));
    return isValidUltraplanResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
