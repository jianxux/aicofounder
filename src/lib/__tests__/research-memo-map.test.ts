import { describe, expect, it } from "vitest";
import { buildResearchMemoCanvasMap, summarizeResearchMemoCanvasMap } from "@/lib/research-memo-map";
import { normalizeProject, type Project } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}) {
  return normalizeProject({
    id: "project-1",
    name: "Launchpad",
    description: "AI-assisted startup planning",
    phase: "Discovery",
    updatedAt: "2025-01-10T00:00:00.000Z",
    notes: [],
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [],
    phases: [{ id: "discovery", title: "Discovery", tasks: [] }],
    research: {
      status: "success",
      researchQuestion: "What are the strongest demand signals?",
      sourceContext: "Saved workspace evidence",
      updatedAt: "2025-01-12T00:00:00.000Z",
      artifact: { status: "completed" },
      report: {
        sections: [
          {
            id: "section-demand",
            title: "Demand",
            angle: "Demand signals",
            findings: "Operators report weekly churn risks.",
            citations: [
              {
                id: "citation-1",
                source: "Acme report",
                claim: "Teams escalate churn every week.",
                relevance: "high",
                url: "https://example.com/report",
              },
            ],
          },
        ],
        executiveSummary: "Demand is real but trust still blocks expansion.",
        researchQuestion: "What are the strongest demand signals?",
        generatedAt: "2025-01-12T00:00:00.000Z",
        citations: [
          {
            id: "citation-1",
            source: "Acme report",
            claim: "Teams escalate churn every week.",
            relevance: "high",
            url: "https://example.com/report",
          },
        ],
        sources: [
          {
            id: "source-1",
            title: "Acme report",
            canonicalId: "acme-report",
            sourceType: "report",
            status: "selected",
            citationIds: ["citation-1"],
            sectionIds: ["section-demand"],
            url: "https://example.com/report",
            domain: "example.com",
            claimCount: 1,
          },
        ],
        keyFindings: [
          {
            id: "finding-1",
            statement: "Operators escalate churn weekly.",
            citationIds: ["citation-1"],
            strength: "strong",
          },
        ],
        contradictions: [
          {
            id: "contradiction-1",
            statement: "Some teams report lower urgency in mid-market accounts.",
            citationIds: ["citation-1"],
          },
        ],
        unansweredQuestions: [
          {
            id: "question-1",
            question: "Who owns the renewal workflow?",
            citationIds: ["citation-1"],
          },
        ],
      },
    },
    ...overrides,
  });
}

describe("research-memo-map", () => {
  it("builds a deterministic memo-linked diagram from the active memo shared state", () => {
    const project = makeProject({ activeArtifactId: "artifact-customer-research-memo" });
    const artifact = project.artifacts.find((entry) => entry.type === "customer-research-memo");

    expect(artifact?.type).toBe("customer-research-memo");
    const diagram = buildResearchMemoCanvasMap(artifact?.type === "customer-research-memo" ? artifact : null);

    expect(diagram.layout.rootNodeId).toBe("research-memo-map-root");
    expect(diagram.nodes[0]).toMatchObject({
      id: "research-memo-map-root",
      label: "Customer research memo",
      content: "What are the strongest demand signals?",
    });
    expect(diagram.nodes.length).toBeGreaterThanOrEqual(4);
    expect(diagram.nodes.some((node) => node.id.includes("research:summary") && node.label === "Executive summary")).toBe(true);
    expect(diagram.nodes.some((node) => node.type === "detail")).toBe(true);
    expect(
      diagram.nodes.some(
        (node) => node.id === "research-memo-map:research:source:source-1" && node.label === "Acme report" && node.type === "reference",
      ),
    ).toBe(true);
    expect(diagram.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "research-memo-map-root", to: "research-memo-map:research:summary" }),
        expect.objectContaining({ from: "research-memo-map-root", to: "research-memo-map:research:source:source-1" }),
      ]),
    );
  });

  it("falls back to a root-only placeholder diagram when no memo exists", () => {
    const diagram = buildResearchMemoCanvasMap(null);

    expect(diagram.nodes).toEqual([
      expect.objectContaining({
        id: "research-memo-map-root",
        label: "Customer research memo",
        content: "Memo-linked canvas map",
      }),
    ]);
    expect(diagram.edges).toEqual([]);
    expect(diagram.drag.reparentOnDrop).toBe(false);
  });

  it("summarizes synced memo counts from shared state", () => {
    const project = makeProject({ activeArtifactId: "artifact-customer-research-memo" });
    const artifact = project.artifacts.find((entry) => entry.type === "customer-research-memo");
    const summary = summarizeResearchMemoCanvasMap(artifact?.type === "customer-research-memo" ? artifact : null);

    expect(summary.sourceCount).toBe(1);
    expect(summary.evidenceCount).toBe(1);
    expect(summary.nodeCount).toBeGreaterThanOrEqual(5);
    expect(summary.updatedAt).toBe("2025-01-12T00:00:00.000Z");
  });
});
