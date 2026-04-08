import { buildSystemPrompt } from "@/lib/prompts";

describe("buildSystemPrompt", () => {
  it("returns a string containing the base persona text for any phase", () => {
    const prompt = buildSystemPrompt("plan");

    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("You are an AI cofounder");
    expect(prompt).toContain("You challenge assumptions ruthlessly but constructively.");
    expect(prompt).toContain("Keep responses focused and actionable");
  });

  it.each([
    ["getting-started", "problem validation"],
    ["understand-project", "Reddit threads"],
    ["plan", "feature creep"],
    ["build", "build vs buy"],
    ["launch", "distribution channels"],
  ])("includes phase-specific guidance for %s", (phase, keyword) => {
    expect(buildSystemPrompt(phase)).toContain(keyword);
  });

  it("returns the base prompt only for an unknown phase", () => {
    const basePrompt = buildSystemPrompt("unknown-phase");

    expect(basePrompt).toContain("You are an AI cofounder");
    expect(basePrompt).not.toContain("problem validation");
    expect(basePrompt).not.toContain("Reddit threads");
    expect(basePrompt).not.toContain("feature creep");
    expect(basePrompt).not.toContain("build vs buy");
    expect(basePrompt).not.toContain("distribution channels");
  });

  it("returns the base prompt only for an empty phase", () => {
    const emptyPrompt = buildSystemPrompt("");

    expect(emptyPrompt).toContain("You are an AI cofounder");
    expect(emptyPrompt).not.toContain("problem validation");
    expect(emptyPrompt).not.toContain("Reddit threads");
    expect(emptyPrompt).not.toContain("feature creep");
    expect(emptyPrompt).not.toContain("build vs buy");
    expect(emptyPrompt).not.toContain("distribution channels");
  });

  it("includes the project name when provided", () => {
    expect(buildSystemPrompt("build", "Orbit")).toContain("Reference Orbit naturally");
  });

  it("includes memory context only when provided", () => {
    expect(buildSystemPrompt("build", "Orbit", "Relevant memory context:\nKey facts")).toContain(
      "Relevant memory context:\nKey facts",
    );
    expect(buildSystemPrompt("build", "Orbit", "   ")).not.toContain("Relevant memory context:");
  });

  it("omits the project name guidance when not provided", () => {
    expect(buildSystemPrompt("build")).not.toContain("Reference ");
  });

  it.each(["getting-started", "understand-project", "plan", "build", "launch", "", "other"])(
    "always returns a string for %s",
    (phase) => {
      expect(typeof buildSystemPrompt(phase)).toBe("string");
    },
  );
});
