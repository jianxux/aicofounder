import { buildSystemPrompt } from "@/lib/prompts";

describe("buildSystemPrompt", () => {
  it("returns a string containing the base persona text for any phase", () => {
    const prompt = buildSystemPrompt("plan");

    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("You are an AI cofounder");
    expect(prompt).toContain("You challenge assumptions ruthlessly but constructively.");
    expect(prompt).toContain("Keep responses focused and actionable");
    expect(prompt).toContain("Frameworks are optional.");
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

  it("includes active artifact guidance when artifact context is provided", () => {
    expect(
      buildSystemPrompt("build", "Orbit", "", {
        id: "artifact-validation-scorecard",
        type: "validation-scorecard",
        label: "Validation scorecard",
        status: "completed",
        mode: "artifact-follow-up",
        hasMeaningfulOutput: true,
        revision: {
          id: "revision-2",
          number: 2,
          createdAt: "2025-01-12T00:00:00.000Z",
          status: "completed",
        },
        evidenceSnapshot: {
          artifactType: "validation-scorecard",
          summary: "Strong pain signal",
          criteriaCount: 1,
          scoredCriteriaCount: 1,
          criteria: [{ label: "Problem urgency", score: 4 }],
        },
      }),
    ).toContain("Stay grounded in revision 2 with status completed");
  });

  it("adds artifact-specific optional framework guidance", () => {
    const validationPrompt = buildSystemPrompt("build", "Orbit", "", {
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
      label: "Validation scorecard",
      status: "completed",
      mode: "artifact-follow-up",
      hasMeaningfulOutput: true,
      revision: {
        id: "revision-2",
        number: 2,
        createdAt: "2025-01-12T00:00:00.000Z",
        status: "completed",
      },
      evidenceSnapshot: {
        artifactType: "validation-scorecard",
        criteriaCount: 0,
        scoredCriteriaCount: 0,
        criteria: [],
      },
    });
    const memoPrompt = buildSystemPrompt("build", "Orbit", "", {
      id: "artifact-customer-research-memo",
      type: "customer-research-memo",
      label: "Customer research memo",
      status: "completed",
      mode: "artifact-follow-up",
      hasMeaningfulOutput: true,
      revision: {
        id: "revision-3",
        number: 3,
        createdAt: "2025-01-13T00:00:00.000Z",
        status: "completed",
      },
      evidenceSnapshot: {
        artifactType: "customer-research-memo",
        researchStatus: "success",
        keyFindings: [],
        contradictions: [],
        unansweredQuestions: [],
        sourceCount: 0,
        sectionCount: 0,
      },
    });

    expect(validationPrompt).toContain("problem-solution fit or validation experiment planning");
    expect(memoPrompt).toContain("SWOT or Five Forces");
  });

  it("includes the artifact snapshot when artifact context is provided", () => {
    expect(
      buildSystemPrompt("build", "Orbit", "", {
        id: "artifact-customer-research-memo",
        type: "customer-research-memo",
        label: "Customer research memo",
        status: "partial",
        mode: "artifact-follow-up",
        hasMeaningfulOutput: true,
        revision: {
          id: "revision-1",
          number: 1,
          createdAt: "2025-01-12T00:00:00.000Z",
          status: "partial",
        },
        evidenceSnapshot: {
          artifactType: "customer-research-memo",
          researchStatus: "success",
          artifactStatus: "partial",
          executiveSummary: "Ops teams feel workflow pain.",
          keyFindings: ["Manual follow-up is costly."],
          contradictions: [],
          unansweredQuestions: ["Who owns budget?"],
          sourceCount: 2,
          sectionCount: 1,
        },
      }),
    ).toContain('Artifact snapshot: {"artifactType":"customer-research-memo"');
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
