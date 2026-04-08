import { describe, expect, it } from "vitest";

import {
  buildResearchPrompt,
  buildSynthesisPrompt,
  parseResearchResponse,
  RESEARCH_ANGLES,
} from "@/lib/research";

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
    expect(prompt).toContain("Research question: What are the key opportunities and risks?.");
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

    expect(result).toEqual({
      id: "market-section",
      title: "Market Analysis",
      angle: "Demand validation",
      findings: "Early teams show strong pull.",
      citations: [
        {
          id: "citation-1",
          source: "TechCrunch analysis",
          claim: "Startups are increasing spend on AI workflows.",
          relevance: "high",
          url: "https://example.com/report",
        },
      ],
    });
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

    expect(result).toEqual({
      id: "technical-section",
      title: "Technical Feasibility",
      angle: "System design",
      findings: "Retrieval and orchestration are tractable.",
      citations: [],
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseResearchResponse("not json")).toBeNull();
  });

  it("returns null for JSON that does not match the expected shape", () => {
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
  });

  it("accepts citations without a url and rejects citations with an invalid url type", () => {
    expect(
      parseResearchResponse(`{
        "id": "market-section",
        "title": "Market Analysis",
        "angle": "Demand validation",
        "findings": "Valid section without URLs.",
        "citations": [
          {
            "id": "citation-1",
            "source": "Industry report",
            "claim": "Claim",
            "relevance": "medium"
          }
        ]
      }`),
    ).toEqual({
      id: "market-section",
      title: "Market Analysis",
      angle: "Demand validation",
      findings: "Valid section without URLs.",
      citations: [
        {
          id: "citation-1",
          source: "Industry report",
          claim: "Claim",
          relevance: "medium",
        },
      ],
    });

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
    expect(prompt).toContain("Market Analysis (Demand validation)");
    expect(prompt).toContain("AI workflow budgets are expanding.");
  });

  it("falls back to the default synthesis question when blank", () => {
    const prompt = buildSynthesisPrompt([], "   ");

    expect(prompt).toContain("Research question: What are the key opportunities and risks?.");
  });
});
