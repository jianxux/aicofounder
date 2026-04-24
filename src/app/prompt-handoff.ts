import type { OnboardingIntake } from "@/components/OnboardingModal";

export type LandingPromptHandoff = {
  primaryIdea: string;
  focus?: string;
  targetUser?: string;
  mainUncertainty?: string;
  firstOutputs?: string[];
};

const LABEL_TO_FIELD = new Map<string, keyof OnboardingIntake>([
  ["primary idea", "primaryIdea"],
  ["idea", "primaryIdea"],
  ["existing url or homepage", "url"],
  ["homepage", "url"],
  ["reference url", "url"],
  ["who the customer is", "targetUser"],
  ["who this is for", "targetUser"],
  ["target user", "targetUser"],
  ["biggest uncertainty", "mainUncertainty"],
  ["main uncertainty", "mainUncertainty"],
]);

function parseLabeledDraft(draft: string) {
  const trimmedDraft = draft.trim();

  if (!trimmedDraft) {
    return {
      unlabeledLines: [] as string[],
      onboardingFields: {} as Partial<OnboardingIntake>,
      focus: "",
      firstOutputs: [] as string[],
      foundRecognizedLabel: false,
    };
  }

  let foundRecognizedLabel = false;
  const onboardingFields: Partial<OnboardingIntake> = {};
  const unlabeledLines: string[] = [];
  let focus = "";
  let firstOutputs: string[] = [];

  for (const line of trimmedDraft.split("\n")) {
    const match = line.match(/^([^:]+):\s*(.*)$/);

    if (!match) {
      unlabeledLines.push(line);
      continue;
    }

    const [, rawLabel, rawValue] = match;
    const normalizedLabel = rawLabel.trim().toLowerCase();
    const value = rawValue.trim();
    const field = LABEL_TO_FIELD.get(normalizedLabel);

    if (field) {
      foundRecognizedLabel = true;
      if (value) {
        onboardingFields[field] = value;
      }
      continue;
    }

    if (normalizedLabel === "focus") {
      foundRecognizedLabel = true;
      focus = value;
      continue;
    }

    if (normalizedLabel === "first outputs") {
      foundRecognizedLabel = true;
      firstOutputs = value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    unlabeledLines.push(line);
  }

  return {
    unlabeledLines,
    onboardingFields,
    focus,
    firstOutputs,
    foundRecognizedLabel,
  };
}

export function serializeLandingPromptHandoff(handoff: LandingPromptHandoff): string {
  const lines = [`Primary idea: ${handoff.primaryIdea.trim()}`];

  if (handoff.focus?.trim()) {
    lines.push(`Focus: ${handoff.focus.trim()}`);
  }

  if (handoff.targetUser?.trim()) {
    lines.push(`Target user: ${handoff.targetUser.trim()}`);
  }

  if (handoff.mainUncertainty?.trim()) {
    lines.push(`Main uncertainty: ${handoff.mainUncertainty.trim()}`);
  }

  if (handoff.firstOutputs?.length) {
    lines.push(`First outputs: ${handoff.firstOutputs.map((item) => item.trim()).filter(Boolean).join("; ")}`);
  }

  return lines.join("\n");
}

export function parseLandingPromptDraft(draft: string): Partial<OnboardingIntake> {
  const trimmedDraft = draft.trim();

  if (!trimmedDraft) {
    return {};
  }

  const parsed = parseLabeledDraft(trimmedDraft);

  if (!parsed.foundRecognizedLabel) {
    return { primaryIdea: trimmedDraft };
  }

  const unlabeledPrimaryIdea = parsed.unlabeledLines.join("\n").trim();
  const primaryIdea = parsed.onboardingFields.primaryIdea?.trim() || unlabeledPrimaryIdea;

  return primaryIdea
    ? { ...parsed.onboardingFields, primaryIdea }
    : parsed.onboardingFields;
}

export function parseLandingPromptHandoff(draft: string): LandingPromptHandoff {
  const trimmedDraft = draft.trim();

  if (!trimmedDraft) {
    return {
      primaryIdea: "",
      firstOutputs: [],
    };
  }

  const parsed = parseLabeledDraft(trimmedDraft);
  const primaryIdea =
    parsed.onboardingFields.primaryIdea?.trim() || parsed.unlabeledLines.join("\n").trim() || trimmedDraft;

  return {
    primaryIdea,
    focus: parsed.focus,
    targetUser: parsed.onboardingFields.targetUser?.trim(),
    mainUncertainty: parsed.onboardingFields.mainUncertainty?.trim(),
    firstOutputs: parsed.firstOutputs,
  };
}
