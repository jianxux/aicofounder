import { describe, expect, it } from "vitest";

import { parseLandingPromptDraft } from "@/app/prompt-handoff";

describe("parseLandingPromptDraft", () => {
  it("returns primaryIdea for unlabeled drafts", () => {
    expect(parseLandingPromptDraft("Pressure-test an onboarding workflow idea.")).toEqual({
      primaryIdea: "Pressure-test an onboarding workflow idea.",
    });
  });

  it("parses problemSolved from supported labels", () => {
    expect(
      parseLandingPromptDraft(
        [
          "Primary idea: An AI copilot for founder research.",
          "Problem solved: Founders cannot turn scattered evidence into one decision.",
          "Reference URL: https://example.com",
        ].join("\n"),
      ),
    ).toEqual({
      primaryIdea: "An AI copilot for founder research.",
      problemSolved: "Founders cannot turn scattered evidence into one decision.",
      url: "https://example.com",
    });

    expect(
      parseLandingPromptDraft(
        [
          "Idea: An AI copilot for founder research.",
          "Problem: Founders cannot turn scattered evidence into one decision.",
        ].join("\n"),
      ),
    ).toEqual({
      primaryIdea: "An AI copilot for founder research.",
      problemSolved: "Founders cannot turn scattered evidence into one decision.",
    });

    expect(
      parseLandingPromptDraft(
        [
          "Primary idea: An AI copilot for founder research.",
          "What problem does it solve: Founders cannot turn scattered evidence into one decision.",
        ].join("\n"),
      ),
    ).toEqual({
      primaryIdea: "An AI copilot for founder research.",
      problemSolved: "Founders cannot turn scattered evidence into one decision.",
    });

    expect(
      parseLandingPromptDraft(
        [
          "Primary idea: An AI copilot for founder research.",
          "What problem does it solve?: Founders cannot turn scattered evidence into one decision.",
        ].join("\n"),
      ),
    ).toEqual({
      primaryIdea: "An AI copilot for founder research.",
      problemSolved: "Founders cannot turn scattered evidence into one decision.",
    });
  });

  it("keeps unrecognized labels inside primaryIdea when other labels are recognized", () => {
    expect(
      parseLandingPromptDraft(
        [
          "Pressure-test this founder workflow.",
          "Unknown label: keep this line",
          "Target user: Seed-stage founders",
        ].join("\n"),
      ),
    ).toEqual({
      primaryIdea: "Pressure-test this founder workflow.\nUnknown label: keep this line",
      targetUser: "Seed-stage founders",
    });
  });
});
