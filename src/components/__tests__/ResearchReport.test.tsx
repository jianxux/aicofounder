import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResearchReport from "@/components/ResearchReport";

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
        lastUpdatedAt="2025-01-16T12:00:00.000Z"
        sourceContext="User asked for a market scan."
      />,
    );

    expect(screen.getByText("Executive summary")).toBeInTheDocument();
    expect(screen.getByText("Demand exists.")).toBeInTheDocument();
    expect(screen.getByText("Execution risk is moderate.")).toBeInTheDocument();
    expect(screen.getByText("Market demand")).toBeInTheDocument();
    expect(screen.getByText("Industry report")).toBeInTheDocument();
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Market demand/i }));

    expect(screen.queryByText("Customers are actively searching.")).not.toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
  });
});
