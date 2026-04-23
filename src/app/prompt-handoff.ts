import type { OnboardingIntake } from "@/components/OnboardingModal";

export const LANDING_PROMPT_DRAFT_KEY = "landingPromptDraft";
export const LANDING_FOCUS_CONTEXT_KEY = "landingFocusContext";

export type LandingFocusContext = {
  presetId: string;
  label: string;
  angle: string;
  output: string;
};

type LandingHandoffPayload = {
  draft: string;
  focusContext?: LandingFocusContext;
};

const LABEL_TO_FIELD = new Map<string, keyof OnboardingIntake>([
  ["primary idea", "primaryIdea"],
  ["idea", "primaryIdea"],
  ["existing url or homepage", "url"],
  ["homepage", "url"],
  ["reference url", "url"],
  ["who the customer is", "targetUser"],
  ["target user", "targetUser"],
  ["biggest uncertainty", "mainUncertainty"],
  ["main uncertainty", "mainUncertainty"],
]);

export function parseLandingPromptDraft(draft: string): Partial<OnboardingIntake> {
  const trimmedDraft = draft.trim();

  if (!trimmedDraft) {
    return {};
  }

  let foundRecognizedLabel = false;
  const parsedFields: Partial<OnboardingIntake> = {};
  const primaryIdeaLines: string[] = [];

  for (const line of trimmedDraft.split("\n")) {
    const match = line.match(/^([^:]+):\s*(.*)$/);

    if (!match) {
      primaryIdeaLines.push(line);
      continue;
    }

    const [, rawLabel, rawValue] = match;
    const field = LABEL_TO_FIELD.get(rawLabel.trim().toLowerCase());

    if (!field) {
      primaryIdeaLines.push(line);
      continue;
    }

    foundRecognizedLabel = true;
    const value = rawValue.trim();

    if (value) {
      parsedFields[field] = value;
    }
  }

  if (!foundRecognizedLabel) {
    return { primaryIdea: trimmedDraft };
  }

  const primaryIdea = primaryIdeaLines.join("\n").trim();

  return primaryIdea ? { ...parsedFields, primaryIdea } : parsedFields;
}

export function persistLandingHandoff({ draft, focusContext }: LandingHandoffPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(LANDING_PROMPT_DRAFT_KEY, draft);

  if (focusContext) {
    window.sessionStorage.setItem(LANDING_FOCUS_CONTEXT_KEY, JSON.stringify(focusContext));
  } else {
    window.sessionStorage.removeItem(LANDING_FOCUS_CONTEXT_KEY);
  }
}

export function clearLandingHandoff() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(LANDING_PROMPT_DRAFT_KEY);
  window.sessionStorage.removeItem(LANDING_FOCUS_CONTEXT_KEY);
}

export function consumeLandingHandoff(): {
  draft: string;
  intake: Partial<OnboardingIntake>;
  focusContext?: LandingFocusContext;
} {
  if (typeof window === "undefined") {
    return { draft: "", intake: {} };
  }

  const draft = window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)?.trim() ?? "";
  const rawFocusContext = window.sessionStorage.getItem(LANDING_FOCUS_CONTEXT_KEY);
  let focusContext: LandingFocusContext | undefined;

  if (rawFocusContext) {
    try {
      const parsedFocusContext = JSON.parse(rawFocusContext) as Partial<LandingFocusContext>;

      if (
        typeof parsedFocusContext.presetId === "string" &&
        typeof parsedFocusContext.label === "string" &&
        typeof parsedFocusContext.angle === "string" &&
        typeof parsedFocusContext.output === "string"
      ) {
        focusContext = {
          presetId: parsedFocusContext.presetId,
          label: parsedFocusContext.label,
          angle: parsedFocusContext.angle,
          output: parsedFocusContext.output,
        };
      }
    } catch {
      focusContext = undefined;
    }
  }

  clearLandingHandoff();

  return {
    draft,
    intake: draft ? parseLandingPromptDraft(draft) : {},
    focusContext,
  };
}
