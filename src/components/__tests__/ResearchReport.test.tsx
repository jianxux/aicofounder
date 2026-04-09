import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResearchReport from "@/components/ResearchReport";

const formatTimestamp = (timestamp: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

const report = {
  sections: [
    {
      id: "market",
      title: "Market demand",
      angle: "Demand signals",
      findings: "Customers are actively searching.\nGrowth remains steady.",
      citations: [
        {
          id: "citation-1",
          source: "Industry report",
          claim: "Demand is increasing.",
          relevance: "high" as const,
          url: "https://example.com/report",
        },
      ],
    },
  ],
  executiveSummary: "Demand exists.\nExecution risk is moderate.",
  researchQuestion: "What are the key opportunities and risks?",
  generatedAt: "2025-01-15T12:00:00.000Z",
  citations: [
    {
      id: "citation-1",
      source: "Industry report",
      claim: "Demand is increasing.",
      relevance: "high" as const,
      url: "https://example.com/report",
    },
  ],
  sources: [
    {
      id: "selected-industry-report",
      title: "Industry report",
      canonicalId: "https://example.com/report",
      sourceType: "report" as const,
      status: "selected" as const,
      citationIds: ["citation-1"],
      sectionIds: ["market"],
      url: "https://example.com/report",
      publicationSignal: "unknown" as const,
      recencySignal: "unknown" as const,
      accessibilityStatus: "unknown" as const,
      claimCount: 1,
    },
  ],
};

const artifact = {
  status: "partial" as const,
  generatedAt: "2025-01-15T12:00:00.000Z",
  metrics: {
    attemptedAngles: 3,
    completedSections: 1,
    selectedSources: 1,
    rejectedSources: 1,
  },
  selectedSources: [
    {
      id: "citation-1",
      source: "Industry report",
      claim: "Demand is increasing.",
      relevance: "high" as const,
      url: "https://example.com/report",
    },
  ],
  rejectedSources: [{ source: "Forum thread", reason: "duplicate" as const }],
  failures: [{ stage: "gather" as const, code: "invalid-section" as const, message: "One section failed validation" }],
  plan: {
    steps: [{ id: "market", title: "Market demand", angle: "Demand signals", query: "q", rationale: "r" }],
  },
};

describe("ResearchReport", () => {
  it("renders the empty state and launch entry point", () => {
    const onRunResearch = vi.fn();

    render(<ResearchReport status="empty" onRunResearch={onRunResearch} />);

    expect(screen.getByText("Deep research workspace")).toBeInTheDocument();
    expect(screen.getByText(/No deep research report yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run deep research" }));

    expect(onRunResearch).toHaveBeenCalledTimes(1);
  });

  it("renders the loading state", () => {
    render(<ResearchReport status="loading" researchQuestion="Investigate the market" />);

    expect(screen.getByRole("button", { name: "Researching..." })).toBeDisabled();
    expect(screen.getByText("Generating a fresh research report for this project.")).toBeInTheDocument();
  });

  it("renders the failure state", () => {
    render(
      <ResearchReport
        status="error"
        errorMessage="Provider timeout"
        researchQuestion="Investigate the market"
        sourceContext="Current phase: Discovery"
      />,
    );

    expect(screen.getByText("Provider timeout")).toBeInTheDocument();
    expect(screen.getByText("Investigate the market")).toBeInTheDocument();
    expect(screen.getByText("Current phase: Discovery")).toBeInTheDocument();
  });

  it("renders the persisted report and toggles sections", () => {
    render(
      <ResearchReport
        status="success"
        report={report}
        artifact={artifact}
        lastUpdatedAt="2025-01-16T12:00:00.000Z"
        sourceContext="User asked for a market scan."
      />,
    );

    expect(screen.getByText("Executive summary")).toBeInTheDocument();
    expect(screen.getByText("Demand exists.")).toBeInTheDocument();
    expect(screen.getByText("Execution risk is moderate.")).toBeInTheDocument();
    expect(screen.getByText("Market demand")).toBeInTheDocument();
    expect(screen.getAllByText("Industry report").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Evidence inventory")).toBeInTheDocument();
    expect(screen.getByText("Source collection")).toBeInTheDocument();
    expect(screen.getByText("Citation index")).toBeInTheDocument();
    expect(screen.getByText("Rejected sources")).toBeInTheDocument();
    expect(screen.getByText("Run notes")).toBeInTheDocument();
    expect(screen.getByText("3 angles")).toBeInTheDocument();
    expect(screen.getByText("1 rejected")).toBeInTheDocument();
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Market demand/i }));

    expect(screen.queryByText("Customers are actively searching.")).not.toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
  });

  it("keeps rendering a prior report when the latest run is in error", () => {
    render(
      <ResearchReport
        status="error"
        errorMessage="Provider timeout"
        report={report}
        artifact={{ status: "failed", generatedAt: "2025-01-20T12:00:00.000Z", metrics: { attemptedAngles: 2 } }}
        lastUpdatedAt="2025-01-15T12:00:00.000Z"
      />,
    );

    expect(screen.getByText("Provider timeout")).toBeInTheDocument();
    expect(screen.getByText("Executive summary")).toBeInTheDocument();
    expect(screen.getByText("2 angles")).toBeInTheDocument();
    expect(screen.getByText(`Research conducted ${formatTimestamp("2025-01-15T12:00:00.000Z")}`)).toBeInTheDocument();
    expect(screen.queryByText(`Research conducted ${formatTimestamp("2025-01-20T12:00:00.000Z")}`)).not.toBeInTheDocument();
  });

  it("renders stable empty states when sources or citations are missing", () => {
    render(
      <ResearchReport
        status="success"
        report={{
          ...report,
          citations: [],
          sources: [],
          sections: [{ ...report.sections[0], citations: [] }],
        }}
        artifact={{ status: "completed", metrics: { attemptedAngles: 1, selectedSources: 0, rejectedSources: 0 } }}
      />,
    );

    expect(screen.getByText("No normalized sources were retained for this run.")).toBeInTheDocument();
    expect(screen.getByText("No citations were retained for this run.")).toBeInTheDocument();
    expect(screen.getByText("No citations were retained for this section.")).toBeInTheDocument();
  });
});
