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

function createSummaryResponse(executiveSummary: string) {
  return JSON.stringify({
    executiveSummary,
    keyFindings: [],
    caveats: [],
    contradictions: [],
    unansweredQuestions: [],
  });
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

  it("normalizes incomplete citations with stable fallback values", () => {
    const result = parseResearchResponse(`{
      "title": "Market Analysis",
      "angle": "Demand validation",
      "findings": "Customers keep asking for this workflow.",
      "citations": [
        {
          "url": "https://www.example.com/report?utm_source=test"
        }
      ]
    }`);

    expect(result).toEqual({
      id: "market-analysis",
      title: "Market Analysis",
      angle: "Demand validation",
      findings: "Customers keep asking for this workflow.",
      citations: [
        {
          id: "market-analysis-citation-1",
          source: "example.com",
          claim: "Customers keep asking for this workflow.",
          relevance: "low",
          url: "https://www.example.com/report?utm_source=test",
        },
      ],
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
    expect(
      parseResearchResponse(`{
        "id": "market-section",
        "title": "Market Analysis",
        "angle": "Demand validation",
        "findings": "Invalid source metadata.",
        "citations": [
          {
            "id": "citation-3",
            "source": "Industry report",
            "claim": "Claim",
            "relevance": "medium",
            "sourceType": "podcast",
            "publicationSignal": "first_party",
            "recencySignal": "fresh",
            "accessibilityStatus": "members_only"
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
    expect(
      validateResearchReport({
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
        citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
        sources: [
          {
            id: "selected-source-a",
            title: "Source A",
            canonicalId: "source-a",
            sourceType: "report",
            status: "selected",
            citationIds: ["c1"],
            sectionIds: ["section-1"],
            publicationSignal: "unknown",
            recencySignal: "unknown",
            accessibilityStatus: "unknown",
            claimCount: 1,
          },
        ],
        keyFindings: [
          {
            id: "finding-1",
            statement: "Supported finding",
            citationIds: ["c1"],
            sectionIds: ["section-1"],
            strength: "moderate",
          },
        ],
        caveats: [
          {
            id: "caveat-1",
            statement: "Watch recency",
            citationIds: ["c1"],
            sectionIds: ["section-1"],
          },
        ],
        contradictions: [
          {
            id: "contradiction-1",
            statement: "Signals conflict",
            citationIds: ["c1"],
            sectionIds: ["section-1"],
          },
        ],
        unansweredQuestions: [
          {
            id: "question-1",
            question: "What is still unknown?",
            citationIds: ["c1"],
            sectionIds: ["section-1"],
          },
        ],
      }),
    ).toBe(true);
    expect(
      validateResearchReport({
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
        keyFindings: [
          {
            id: "finding-1",
            statement: "Unsupported finding",
            citationIds: [],
            strength: "strong",
          },
        ],
      }),
    ).toBe(false);
    expect(
      validateResearchReport({
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Demand?",
        generatedAt: "2026-04-08T16:12:00.000Z",
        caveats: [
          {
            id: "caveat-1",
            statement: "Bad section id",
            sectionIds: [""],
          },
        ],
      }),
    ).toBe(false);
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
    expect(prompt).toContain("Be explicit about weak evidence, dated evidence, missing publication dates, and partial runs when relevant.");
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
      JSON.stringify({
        executiveSummary: "Opportunities outweigh immediate risks.",
        keyFindings: [
          {
            id: "market-proof",
            statement: "Demand evidence is strongest in the market section.",
            citationIds: ["c1", "missing-citation"],
            sectionIds: ["wrong-section"],
            strength: "strong",
          },
        ],
        caveats: [
          {
            id: "missing-recency",
            statement: "Some evidence is undated.",
            citationIds: ["missing-citation"],
            sectionIds: ["wrong-section"],
          },
        ],
        contradictions: [
          {
            id: "bad-linkage",
            statement: "This contradiction does not have valid support.",
            citationIds: ["missing-citation"],
            sectionIds: ["wrong-section"],
          },
        ],
        unansweredQuestions: [
          {
            id: "follow-up",
            question: "What do customers prioritize first?",
            citationIds: ["c2", "missing-citation"],
            sectionIds: ["wrong-section"],
          },
        ],
      }),
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
    expect(artifact.report.citations).toHaveLength(4);
    expect(artifact.report.sources).toEqual(artifact.sourceInventory.selected);
    expect(artifact.report.keyFindings).toEqual([
      {
        id: "market-proof",
        statement: "Demand evidence is strongest in the market section.",
        citationIds: ["c1"],
        sectionIds: ["market"],
        strength: "strong",
      },
    ]);
    expect(artifact.report.caveats).toHaveLength(2);
    expect(artifact.report.caveats).toEqual(
      expect.arrayContaining([
        {
          id: "missing-recency",
          statement: "Some evidence is undated.",
        },
        {
          id: "bad-linkage-unsupported",
          statement: "This contradiction does not have valid support.",
        },
      ]),
    );
    expect(artifact.report.unansweredQuestions).toEqual([
      {
        id: "follow-up",
        question: "What do customers prioritize first?",
        citationIds: ["c2"],
        sectionIds: ["market"],
      },
    ]);
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
      createSummaryResponse("Summary"),
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
    expect(artifact.sourceInventory.selected).toEqual([
      expect.objectContaining({
        title: "Source A",
        sectionIds: ["market"],
        citationIds: ["c1"],
      }),
      expect.objectContaining({
        title: "Source B",
        sectionIds: ["market"],
        citationIds: ["c2"],
      }),
    ]);
    expect(artifact.sourceInventory.rejected).toEqual([
      expect.objectContaining({
        title: "Source C",
        sectionIds: ["market"],
        citationIds: ["c3"],
        rejectionReason: "budget",
      }),
    ]);
  });

  it("normalizes duplicate source inventory across sections while preserving citation linkage", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Found demand.",
        citations: [
          {
            id: "c1",
            source: "Source A",
            claim: "Claim A",
            relevance: "high",
            url: "https://example.com/report?utm_source=test",
            sourceType: "report",
          },
        ],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Feasible.",
        citations: [
          {
            id: "c2",
            source: "Source A",
            claim: "Claim B",
            relevance: "medium",
            url: "https://www.example.com/report",
            publicationSignal: "official",
          },
        ],
      }),
      createSummaryResponse("Summary"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 2, maxSections: 2, maxCitationsPerSection: 2 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.sourceInventory.selected).toEqual([
      {
        id: "selected-https-example-com-report",
        title: "Source A",
        canonicalId: "https://example.com/report",
        sourceType: "report",
        status: "selected",
        citationIds: ["c1", "c2"],
        sectionIds: ["market", "technical"],
        url: "https://example.com/report?utm_source=test",
        canonicalUrl: "https://example.com/report",
        domain: "example.com",
        publicationDate: undefined,
        publicationSignal: "official",
        recencySignal: "undated",
        accessibilityStatus: "unknown",
        claimCount: 2,
        rejectionReason: undefined,
      },
    ]);
    expect(artifact.report.sources).toEqual(artifact.sourceInventory.selected);
    expect(artifact.report.citations?.map((citation) => citation.id)).toEqual(["c1", "c2"]);
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
      createSummaryResponse("Evidence is mixed."),
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
    expect(artifact.report.keyFindings).toEqual([
      {
        id: "market-finding",
        statement: "Found demand.",
        citationIds: ["c1"],
        sectionIds: ["market"],
        strength: "weak",
      },
      {
        id: "technical-finding",
        statement: "Feasible.",
        citationIds: ["c2"],
        sectionIds: ["technical"],
        strength: "weak",
      },
      {
        id: "competitive-finding",
        statement: "Crowded.",
        citationIds: ["c3"],
        sectionIds: ["competitive"],
        strength: "weak",
      },
    ]);
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
      .mockResolvedValueOnce({ choices: [{ message: { content: createSummaryResponse("Summary") } }] });

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
      createSummaryResponse("Summary"),
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
      createSummaryResponse("Summary"),
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
      createSummaryResponse("Summary"),
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

  it("drops duplicate citations across sections and keeps later sections stable when citations are empty", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Demand exists.",
        citations: [{ id: "c1", source: "Shared Source", claim: "Claim A", relevance: "high" }],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Implementation is feasible.",
        citations: [{ id: "c2", source: "Shared Source", claim: "Claim A", relevance: "medium" }],
      }),
      createSummaryResponse("Summary"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 2, maxSections: 2, maxCitationsPerSection: 2 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.report.sections).toEqual([
      expect.objectContaining({
        id: "market",
        citations: [{ id: "c1", source: "Shared Source", claim: "Claim A", relevance: "high" }],
      }),
      expect.objectContaining({
        id: "technical",
        citations: [],
      }),
    ]);
    expect(artifact.report.citations).toEqual([{ id: "c1", source: "Shared Source", claim: "Claim A", relevance: "high" }]);
    expect(artifact.rejectedSources).toContainEqual({
      reason: "duplicate",
      source: "Shared Source",
      citationId: "c2",
    });
  });

  it("dedupes selected sources across sections without rejecting distinct claims", async () => {
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
      createSummaryResponse("Summary"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.selectedSources.map((source) => source.source)).toEqual([
      "Shared Source",
      "Shared Source",
      "Unique Source",
    ]);
    expect(artifact.rejectedSources).toEqual([]);
    expect(artifact.sourceInventory.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Shared Source",
          citationIds: ["c1", "c2"],
          sectionIds: ["market", "technical"],
          claimCount: 2,
        }),
      ]),
    );
  });

  it("normalizes duplicate summary ids, unsupported findings, and missing supported findings", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Signals exist but the citations were dropped.",
        citations: [],
      }),
      JSON.stringify({
        executiveSummary: "Summary with unsupported evidence.",
        keyFindings: [
          {
            id: "duplicate",
            statement: "Unsupported finding should become a caveat.",
            citationIds: ["missing"],
            sectionIds: ["market"],
            strength: "weak",
          },
        ],
        caveats: [
          {
            id: "duplicate",
            statement: "Existing caveat keeps the base id.",
          },
        ],
        contradictions: [],
        unansweredQuestions: [
          {
            id: "duplicate",
            question: "What evidence is still needed?",
          },
          {
            id: "duplicate",
            question: "What evidence is still needed?",
          },
        ],
      }),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 1, maxSections: 1, maxCitationsPerSection: 1 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.status).toBe("partial");
    expect(artifact.report.keyFindings).toEqual([]);
    expect(artifact.report.caveats).toEqual(
      expect.arrayContaining([
        {
          id: "duplicate",
          statement: "Existing caveat keeps the base id.",
        },
        {
          id: "duplicate-unsupported",
          statement: "Unsupported finding should become a caveat.",
        },
        {
          id: "missing-supported-findings",
          statement: "No key findings met the citation threshold, so evidence gaps remain visible instead of inferred.",
        },
      ]),
    );
    expect(artifact.report.unansweredQuestions).toEqual([
      {
        id: "duplicate-2",
        question: "What evidence is still needed?",
      },
    ]);
  });

  it("updates selected source metadata from later citations when the initial source is unknown", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Initial source metadata is weak.",
        citations: [
          {
            id: "c1",
            source: "Shared Source",
            claim: "Claim A",
            relevance: "high",
            sourceType: "other",
            publicationSignal: "unknown",
            recencySignal: "unknown",
            accessibilityStatus: "unknown",
          },
        ],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Later source metadata is stronger.",
        citations: [
          {
            id: "c2",
            source: "Shared Source",
            claim: "Claim B",
            relevance: "medium",
            url: "https://www.example.com/docs?ref=nav",
            sourceType: "documentation",
            publicationDate: "2026-01-02",
            publicationSignal: "official",
            recencySignal: "current",
            accessibilityStatus: "public",
          },
        ],
      }),
      createSummaryResponse("Summary"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 2, maxSections: 2, maxCitationsPerSection: 2 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.sourceInventory.selected).toEqual([
      {
        id: "selected-shared-source",
        title: "Shared Source",
        canonicalId: "shared-source",
        sourceType: "documentation",
        status: "selected",
        citationIds: ["c1", "c2"],
        sectionIds: ["market", "technical"],
        url: "https://www.example.com/docs?ref=nav",
        canonicalUrl: "https://example.com/docs",
        domain: "example.com",
        publicationDate: "2026-01-02",
        publicationSignal: "official",
        recencySignal: "current",
        accessibilityStatus: "public",
        claimCount: 2,
        rejectionReason: undefined,
      },
    ]);
  });

  it("keeps recency conservative from publication dates alone and upgrades it when richer metadata arrives", async () => {
    const client = createMockClient([
      JSON.stringify({
        id: "market",
        title: "Market",
        angle: "Demand",
        findings: "Initial metadata is missing dates.",
        citations: [
          {
            id: "c1",
            source: "Shared Source",
            claim: "Claim A",
            relevance: "high",
            url: "https://example.com/report",
          },
        ],
      }),
      JSON.stringify({
        id: "technical",
        title: "Technical",
        angle: "Feasibility",
        findings: "Later metadata adds a publication date.",
        citations: [
          {
            id: "c2",
            source: "Shared Source",
            claim: "Claim B",
            relevance: "medium",
            url: "https://example.com/report?ref=nav",
            publicationDate: "2026-01-02",
          },
        ],
      }),
      JSON.stringify({
        id: "competitive",
        title: "Competitive",
        angle: "Landscape",
        findings: "Final metadata adds an explicit recency signal.",
        citations: [
          {
            id: "c3",
            source: "Shared Source",
            claim: "Claim C",
            relevance: "medium",
            recencySignal: "recent",
          },
        ],
      }),
      createSummaryResponse("Summary"),
    ]);

    const artifact = await runResearch(client, {
      projectName: "Orbit",
      projectDescription: "AI workspace",
      researchQuestion: "Where is demand strongest?",
      budgets: { maxAngles: 3, maxSections: 3, maxCitationsPerSection: 2 },
      generatedAt: "2026-04-08T16:12:00.000Z",
    });

    expect(artifact.sourceInventory.selected).toEqual([
      expect.objectContaining({
        title: "Shared Source",
        citationIds: ["c1", "c2", "c3"],
        sectionIds: ["market", "technical", "competitive"],
        publicationDate: "2026-01-02",
        recencySignal: "recent",
      }),
    ]);
  });
});
