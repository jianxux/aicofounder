import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResearchMemoDualView from "@/components/ResearchMemoDualView";
import { normalizeProject, type Project } from "@/lib/types";

vi.mock("@/components/GeneratedDiagram", () => ({
  default: ({ diagram }: { diagram: { nodes: Array<{ id: string; label: string }> } }) => (
    <div data-testid="generated-diagram">{diagram.nodes.map((node) => node.label).join(" | ")}</div>
  ),
}));

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
      artifact: { status: "completed", metrics: { attemptedAngles: 2 } },
      report: {
        sections: [
          { id: "section-demand", title: "Demand", angle: "Demand signals", findings: "Operators report weekly churn risks.", citations: [] },
        ],
        executiveSummary: "Demand is real but trust still blocks expansion.",
        researchQuestion: "What are the strongest demand signals?",
        generatedAt: "2025-01-12T00:00:00.000Z",
        keyFindings: [{ id: "finding-1", statement: "Operators escalate churn weekly.", citationIds: [], strength: "strong" }],
        contradictions: [{ id: "contradiction-1", statement: "Mid-market urgency is weaker.", citationIds: [] }],
        unansweredQuestions: [{ id: "question-1", question: "Who owns budget?", citationIds: [] }],
        sources: [
          {
            id: "source-1",
            title: "Acme report",
            canonicalId: "acme-report",
            sourceType: "report",
            status: "selected",
            citationIds: [],
            sectionIds: ["section-demand"],
            url: "https://example.com/report",
            claimCount: 1,
          },
        ],
      },
    },
    ...overrides,
  });
}

describe("ResearchMemoDualView", () => {
  it("renders a paired memo and synchronized map for the research memo artifact", () => {
    const project = makeProject({ activeArtifactId: "artifact-customer-research-memo" });
    const artifact = project.artifacts.find((entry) => entry.type === "customer-research-memo");

    if (!artifact || artifact.type !== "customer-research-memo") {
      throw new Error("Expected research memo artifact");
    }

    render(
      <ResearchMemoDualView
        artifact={artifact}
        status="success"
        report={artifact.research?.report ?? null}
        researchArtifact={artifact.research?.artifact}
        researchQuestion={artifact.research?.researchQuestion}
        sourceContext={artifact.research?.sourceContext}
      />,
    );

    expect(screen.getByTestId("research-memo-dual-view")).toBeInTheDocument();
    expect(screen.getByText("Customer research memo + canvas map")).toBeInTheDocument();
    expect(screen.getByText("Synchronized")).toBeInTheDocument();
    expect(screen.getByTestId("research-memo-canvas-map")).toBeInTheDocument();
    expect(screen.getByText(/memo nodes/)).toBeInTheDocument();
    expect(screen.getByText("1 source")).toBeInTheDocument();
    expect(screen.getByTestId("generated-diagram")).toHaveTextContent("Customer research memo");
    expect(screen.getByTestId("generated-diagram")).toHaveTextContent("Executive summary");
  });

  it("shows an empty synchronized-map hint when the memo has no research state yet", () => {
    const project = makeProject({ activeArtifactId: "artifact-customer-research-memo", research: null });
    const artifact = project.artifacts.find((entry) => entry.type === "customer-research-memo");

    if (!artifact || artifact.type !== "customer-research-memo") {
      throw new Error("Expected research memo artifact");
    }

    render(<ResearchMemoDualView artifact={artifact} status="empty" report={null} />);

    expect(screen.getByText("0 memo nodes")).toBeInTheDocument();
    expect(screen.getByText("Run or refresh the customer research memo to populate the synchronized map.")).toBeInTheDocument();
  });
});
