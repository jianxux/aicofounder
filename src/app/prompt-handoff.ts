import type { OnboardingIntake } from "@/components/OnboardingModal";

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
  ["problem solved", "problemSolved"],
  ["problem", "problemSolved"],
  ["what problem does it solve", "problemSolved"],
  ["what problem does it solve?", "problemSolved"],
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
