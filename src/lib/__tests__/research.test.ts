import { describe, expect, it, vi } from "vitest";

import {
  buildResearchPrompt,
  buildSynthesisPrompt,
  createResearchPlan,
  DEFAULT_RESEARCH_BUDGET,
  DEFAULT_RESEARCH_QUESTION,
  isValidPlan,
  isValidReport,
  parseResearchResponse,
  validateResearchPlan,
  validateResearchReport,
  RESEARCH_ANGLES,
  runResearch,
  type ResearchOpenAIClient,
} from "@/lib/research";

function createMockClient(responses: Array<string | Error>): ResearchOpenAIClient {
  const create = vi.fn().mockImplementation(async () => {
    const next = responses.shift();

    if (next instanceof Error) {
      throw next;
    }

    return {
      choices: [{ message: { content: next ?? "" } }],
    };
  });

  return {
    chat: {
      completions: {
        create,
      },
    },
  };
}

describe("research helpers", () => {
  it("builds a prompt with project details and JSON instructions", () => {
    const prompt = buildResearchPrompt(
      RESEARCH_ANGLES[0].angle,
      "Orbit",
      "AI workspace for startup research",
      "Where is demand strongest?",
    );

    expect(prompt).toContain("Project name: Orbit.");
    expect(prompt).toContain("Project description: AI workspace for startup research.");
    expect(prompt).toContain("Research question: Where is demand strongest?.");
    expect(prompt).toContain(`Research angle: ${RESEARCH_ANGLES[0].angle}.`);
    expect(prompt).toContain("Return valid JSON only.");
    expect(prompt).toContain('"citations": ResearchCitation[]');
  });

  it("falls back to default project and question values when blank", () => {
    const prompt = buildResearchPrompt(RESEARCH_ANGLES[1].angle, "   ", "Technical review", "   ");

    expect(prompt).toContain("Project name: Untitled project.");
    expect(prompt).toContain(`Research question: ${DEFAULT_RESEARCH_QUESTION}.`);
  });

  it("includes memory context only when non-empty", () => {
    expect(
      buildResearchPrompt(
        RESEARCH_ANGLES[0].angle,
        "Orbit",
        "AI workspace for startup research",
        "Where is demand strongest?",
        "Relevant memory context:\nB",
      ),
    ).toContain("Relevant memory context:\nB");
    expect(
      buildResearchPrompt(
        RESEARCH_ANGLES[0].angle,
        "Orbit",
        "AI workspace for startup research",
        "Where is demand strongest?",
        "   ",
      ),
    ).not.toContain("Relevant memory context:");
  });

  it("parses a valid JSON response", () => {
    const result = parseResearchResponse(`{
      "id": "market-section",
      "title": "Market Analysis",
      "angle": "Demand validation",
      "findings": "Early teams show strong pull.",
      "citations": [
        {
          "id": "citation-1",
          "source": "TechCrunch analysis",
          "claim": "Startups are increasing spend on AI workflows.",
          "relevance": "high",
          "url": "https://example.com/report"
        }
      ]
    }`);

    expect(result?.citations).toHaveLength(1);
    expect(result?.citations[0]?.url).toBe("https://example.com/report");
  });

  it("parses JSON wrapped in a markdown code block", () => {
    const result = parseResearchResponse(`\`\`\`json
{
  "id": "technical-section",
  "title": "Technical Feasibility",
  "angle": "System design",
  "findings": "Retrieval and orchestration are tractable.",
  "citations": []
}
\`\`\``);

    expect(result?.id).toBe("technical-section");
  });

  it("parses JSON embedded in surrounding text", () => {
    const result = parseResearchResponse(`Result:
{
  "id": "competitive-section",
  "title": "Competitive Landscape",
  "angle": "Whitespace",
  "findings": "The field is crowded.",
  "citations": []
}
End`);

    expect(result).toEqual({
      id: "competitive-section",
      title: "Competitive Landscape",
      angle: "Whitespace",
      findings: "The field is crowded.",
      citations: [],
    });
  });

  it("returns null for invalid JSON or invalid citation shape", () => {
    expect(parseResearchResponse("not json")).toBeNull();
    expect(parseResearchResponse("[]")).toBeNull();
    expect(parseResearchResponse("null")).toBeNull();
    expect(
      parseResearchResponse(`{
        "id": "competitive-section",
        "title": "Competitive Landscape",
        "angle": "Whitespace",
        "findings": "Bad citations",
        "citations": [null]
      }`),
    ).toBeNull();
    expect(
      parseResearchResponse(`{
        "id": "competitive-section",
        "title": "Competitive Landscape",
        "angle": "Whitespace",
        "findings": "Bad citations",
        "citations": [
          {
            "id": "citation-1",
            "source": "Industry report",
            "claim": "Claim",
            "relevance": "critical"
          }
        ]
      }`),
    ).toBeNull();
    expect(
      parseResearchResponse(`{
        "id": "market-section",
        "title": "Market Analysis",
        "angle": "Demand validation",
        "findings": "Invalid section.",
        "citations": [
          {
            "id": "citation-2",
            "source": "Industry report",
            "claim": "Claim",
            "relevance": "low",
            "url": 123
          }
        ]
      }`),
    ).toBeNull();
  });

  it("builds a bounded plan with defaults", () => {
    const plan = createResearchPlan({
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
    });

    expect(plan.budget).toEqual(DEFAULT_RESEARCH_BUDGET);
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]?.query).toContain("Orbit: Where is demand strongest?");
  });

  it("applies budget overrides and trims inputs", () => {
    const plan = createResearchPlan({
      projectName: "  Orbit  ",
      projectDescription: "  AI workspace  ",
      researchQuestion: "   ",
      budgets: { maxAngles: 1, maxSections: 1, maxCitationsPerSection: 2 },
    });

    expect(plan.projectName).toBe("Orbit");
    expect(plan.researchQuestion).toBe("What are the key opportunities and risks?");
    expect(plan.steps).toHaveLength(1);
    expect(plan.budget.maxCitationsPerSection).toBe(2);
  });

  it("falls back to default budget values when overrides are non-finite", () => {
    const plan = createResearchPlan({
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Demand?",
      budgets: { maxAngles: Number.NaN, maxSections: Number.POSITIVE_INFINITY, maxCitationsPerSection: Number.NaN },
    });

    expect(plan.budget).toEqual(DEFAULT_RESEARCH_BUDGET);
  });

  it("throws when required plan fields are missing", () => {
    expect(() =>
      createResearchPlan({
        projectName: "   ",
        projectDescription: "AI workspace",
        researchQuestion: "Demand?",
      }),
    ).toThrow("Project name and project description are required");
  });

  it("validates plan and report shapes explicitly", () => {
    const validPlan = createResearchPlan({
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Demand?",
    });

    expect(isValidPlan(null)).toBe(false);
    expect(validateResearchPlan(validPlan)).toBe(true);
    expect(
      isValidPlan({
        projectName: "Orbit",
        projectDescription: "AI workspace",
        researchQuestion: "Demand?",
        budget: DEFAULT_RESEARCH_BUDGET,
        steps: [null],
      }),
    ).toBe(false);
    expect(
      validateResearchReport({
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      }),
    ).toBe(true);
    expect(isValidReport(null)).toBe(false);
    expect(
      isValidReport({
        sections: [],
        executiveSummary: "",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      }),
    ).toBe(false);
    expect(
      isValidReport({
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      }),
    ).toBe(true);
  });

  it("builds a synthesis prompt from sections", () => {
    const prompt = buildSynthesisPrompt(
      [
        {
          id: "market-section",
          title: "Market Analysis",
          angle: "Demand validation",
          findings: "Demand is concentrated among seed-stage operators.",
          citations: [
            {
              id: "citation-1",
              source: "Industry report",
              claim: "AI workflow budgets are expanding.",
              relevance: "high",
            },
          ],
        },
      ],
      "What are the key opportunities and risks?",
    );

    expect(prompt).toContain("Research question: What are the key opportunities and risks?.");
    expect(prompt).toContain("AI workflow budgets are expanding.");
    expect(prompt).toContain("Be honest about missing or weak evidence.");
  });
});

describe("runResearch", () => {
  it("returns a completed artifact for successful research", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [
          { id: "c1", source: "Source A", claim: "Claim A", relevance: "high" },
          { id: "c2", source: "Source B", claim: "Claim B", relevance: "medium" },
        ],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Feasible.",
        citations: [{ id: "c3", source: "Source C", claim: "Claim C", relevance: "high" }],
      }),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c4", source: "Source D", claim: "Claim D", relevance: "low" }],
      }),
      "Opportunities outweigh immediate risks.",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("completed");
    expect(artifact.report.sections).toHaveLength(3);
    expect(artifact.report.executiveSummary).toBe("Opportunities outweigh immediate risks.");
    expect(artifact.metrics.selectedSources).toBe(4);
    expect(artifact.failures).toEqual([]);
  });

  it("dedupes sources and enforces citation budgets", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [
          { id: "c1", source: "Source A", claim: "Claim A", relevance: "high" },
          { id: "c2", source: "Source B", claim: "Claim B", relevance: "medium" },
          { id: "c3", source: "Source C", claim: "Claim C", relevance: "medium" },
        ],
      }),
      "Summary",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 1, maxSections: 1, maxCitationsPerSection: 2 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.report.sections[0]?.citations).toHaveLength(2);
    expect(artifact.rejectedSources).toEqual([{ reason: "budget", source: "Source C", citationId: "c3" }]);
  });

  it("returns partial when one section fails validation but others succeed", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      }),
      "not json",
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c2", source: "Source B", claim: "Claim B", relevance: "low" }],
      }),
      "Evidence is mixed.",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.report.sections).toHaveLength(2);
    expect(artifact.failures).toContainEqual({
      stage: "gather",
      code: "invalid-section",
      message: "Failed to parse section for Technical Feasibility",
    });
  });

  it("returns failed when no sections pass validation", async () => {
    const client = createMockClient(["bad", "also bad", "still bad"]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("failed");
    expect(artifact.report.sections).toEqual([]);
    expect(artifact.failures.at(-1)).toEqual({
      stage: "gather",
      code: "no-evidence",
      message: "No research sections passed validation",
    });
  });

  it("returns failed when planning input is invalid", async () => {
    const artifact = await runResearch(createMockClient([]), {
      projectName: "   ",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("failed");
    expect(artifact.failures).toEqual([
      {
        stage: "plan",
        code: "invalid-input",
        message: "Project name and project description are required",
      },
    ]);
  });

  it("returns partial with a fallback summary when synthesis fails", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Feasible.",
        citations: [{ id: "c2", source: "Source B", claim: "Claim B", relevance: "medium" }],
      }),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c3", source: "Source C", claim: "Claim C", relevance: "low" }],
      }),
      new Error("summary timeout"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.report.executiveSummary).toContain("Evidence is limited.");
    expect(artifact.failures).toContainEqual({
      stage: "report",
      code: "provider-error",
      message: "summary timeout",
    });
    expect(artifact.failures).toContainEqual({
      stage: "report",
      code: "invalid-summary",
      message: "Failed to synthesize report",
    });
  });

  it("records a generic gather provider error for non-Error throws", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: "not json" } }] })
      .mockRejectedValueOnce("boom")
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          id: "competitive",
          title: "Competitive",
          angle: "Landscape",
          findings: "Crowded.",
          citations: [{ id: "c3", source: "Source C", claim: "Claim C", relevance: "low" }],
        }) } }],
      })
      .mockResolvedValueOnce({ choices: [{ message: { content: "Summary" } }] });

    const customClient: ResearchOpenAIClient = { chat: { completions: { create } } };
    const artifact = await runResearch(customClient, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.failures).toContainEqual({
      stage: "gather",
      code: "provider-error",
      message: "Provider error while gathering Technical Feasibility",
    });
  });

  it("preserves gather provider error messages for Error throws", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      }),
      new Error("provider timeout"),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c2", source: "Source B", claim: "Claim B", relevance: "low" }],
      }),
      "Summary",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.failures).toContainEqual({
      stage: "gather",
      code: "provider-error",
      message: "provider timeout",
    });
  });

  it("normalizes a blank generatedAt value", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Feasible.",
        citations: [{ id: "c2", source: "Source B", claim: "Claim B", relevance: "medium" }],
      }),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c3", source: "Source C", claim: "Claim C", relevance: "low" }],
      }),
      "Summary",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "",
    });

    expect(artifact.generatedAt).toBeTruthy();
    expect(artifact.status).toBe("completed");
    expect(artifact.failures).toEqual([]);
  });

  it("tracks only the steps actually attempted when maxSections is smaller than maxAngles", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      }),
      "Summary",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 3, maxSections: 1, maxCitationsPerSection: 3 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.metrics.attemptedAngles).toBe(1);
    expect(artifact.metrics.completedSections).toBe(1);
  });

  it("returns partial when duplicate sources are rejected across sections", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [{ id: "c1", source: "Shared Source", claim: "Claim A", relevance: "high" }],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Feasible.",
        citations: [{ id: "c2", source: "Shared Source", claim: "Claim B", relevance: "medium" }],
      }),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Crowded.",
        citations: [{ id: "c3", source: "Unique Source", claim: "Claim C", relevance: "low" }],
      }),
      "Summary",
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.selectedSources.map((source) => source.source)).toEqual(["Shared Source", "Unique Source"]);
    expect(artifact.rejectedSources).toContainEqual({
      reason: "duplicate",
      source: "Shared Source",
      citationId: "c2",
    });
  });
});
