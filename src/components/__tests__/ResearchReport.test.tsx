import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

    expect(screen.getByText("Customer research memo")).toBeInTheDocument();
    expect(screen.getByText(/No customer research memo yet/i)).toBeInTheDocument();
    expect(screen.getByText("Research progress")).toBeInTheDocument();
    expect(screen.getByText("Objective")).toBeInTheDocument();
    expect(screen.getByText("Recommended next actions")).toBeInTheDocument();
    expect(
      screen.getByText("Start a research run to track objective, scope, evidence, synthesis, and next actions."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create customer research memo" }));

    expect(onRunResearch).toHaveBeenCalledTimes(1);
  });

  it("renders the loading state", () => {
    render(<ResearchReport status="loading" researchQuestion="Investigate the market" />);

    expect(screen.getByRole("button", { name: "Updating memo..." })).toBeDisabled();
    expect(screen.getByText("Updating the customer research memo for this project.")).toBeInTheDocument();
    expect(
      screen.getByText("Research run in progress. Stage details will update as the memo is assembled."),
    ).toBeInTheDocument();
    expect(screen.getByText("Source scope")).toBeInTheDocument();
    expect(screen.getAllByText("In progress").length).toBeGreaterThan(0);
  });

  it("preserves completed loading stages from partial artifact progress", () => {
    render(
      <ResearchReport
        status="loading"
        researchQuestion="Investigate the market"
        artifact={{
          status: "partial",
          metrics: { attemptedAngles: 2, completedSections: 0, selectedSources: 3, rejectedSources: 1 },
          plan: {
            steps: [
              { id: "market", title: "Market demand", angle: "Demand signals", query: "q", rationale: "r" },
              { id: "competition", title: "Competition", angle: "Competitive scan", query: "q2", rationale: "r2" },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Complete")).toHaveLength(3);

    const synthesisStage = screen.getByText("Synthesis").closest("div");
    expect(synthesisStage).not.toBeNull();
    expect(within(synthesisStage as HTMLElement).getByText("In progress")).toBeInTheDocument();

    const actionsStage = screen.getByText("Recommended next actions").closest("div");
    expect(actionsStage).not.toBeNull();
    expect(within(actionsStage as HTMLElement).getByText("Pending")).toBeInTheDocument();
  });

  it("renders the failure state and indicates where the run stopped", () => {
    render(
      <ResearchReport
        status="error"
        errorMessage="Provider timeout"
        artifact={{
          status: "failed",
          failures: [{ stage: "gather", code: "provider-error", message: "Provider timeout" }],
          metrics: { attemptedAngles: 2, completedSections: 0, selectedSources: 0, rejectedSources: 0 },
          plan: {
            steps: [
              { id: "market", title: "Market demand", angle: "Demand signals", query: "q", rationale: "r" },
              { id: "competition", title: "Competition", angle: "Competitive scan", query: "q2", rationale: "r2" },
            ],
          },
        }}
        researchQuestion="Investigate the market"
        sourceContext="Current phase: Discovery"
      />,
    );

    expect(screen.getAllByText("Provider timeout").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Investigate the market").length).toBeGreaterThan(0);
    expect(screen.getByText("Current phase: Discovery")).toBeInTheDocument();
    expect(screen.getByText("Run stopped during evidence gathering: Provider timeout")).toBeInTheDocument();
    expect(screen.getByText("Stopped here")).toBeInTheDocument();
  });

  it("does not mark source scope complete when attemptedAngles is zero", () => {
    render(
      <ResearchReport
        status="success"
        researchQuestion="Investigate the market"
        artifact={{
          status: "completed",
          metrics: { attemptedAngles: 0, completedSections: 0, selectedSources: 0, rejectedSources: 0 },
        }}
      />,
    );

    expect(screen.getByText("0 research angles attempted.")).toBeInTheDocument();

    const scopeStage = screen.getByText("Source scope").closest("div");
    expect(scopeStage).not.toBeNull();
    expect(within(scopeStage as HTMLElement).getByText("Pending")).toBeInTheDocument();
    expect(screen.getAllByText("Complete")).toHaveLength(1);
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
    expect(
      screen.getByText("Run completed with issues during evidence gathering: One section failed validation"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Recommended next actions should validate 1 caveat before committing to a decision."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("3 angles")).toBeInTheDocument();
    expect(screen.getByText("1 rejected")).toBeInTheDocument();
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh customer research memo" })).toBeInTheDocument();

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
        artifact={{
          status: "failed",
          generatedAt: "2025-01-20T12:00:00.000Z",
          metrics: { attemptedAngles: 2 },
          failures: [{ stage: "gather", code: "provider-error", message: "Provider timeout" }],
        }}
        lastUpdatedAt="2025-01-15T12:00:00.000Z"
      />,
    );

    expect(screen.getAllByText("Provider timeout").length).toBeGreaterThan(0);
    expect(screen.getByText("Executive summary")).toBeInTheDocument();
    expect(screen.getByText("Run stopped during evidence gathering: Provider timeout")).toBeInTheDocument();
    expect(screen.getByText("2 angles")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry customer research memo" })).toBeInTheDocument();
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

  it("renders richer memo analysis from artifact source inventory fallbacks", () => {
    render(
      <ResearchReport
        status="success"
        report={{
          ...report,
          generatedAt: "not-a-date",
          citations: [
            {
              id: "citation-1",
              source: "Analyst brief",
              claim: "Budget owners are actively reallocating spend.",
              relevance: "medium" as const,
              url: "https://example.com/brief",
              sourceType: "news",
              publicationDate: "2025-01-10",
              publicationSignal: "peer_reviewed",
              recencySignal: "recent",
              accessibilityStatus: "registration_required",
            },
          ],
          sources: [],
          keyFindings: [
            {
              id: "finding-1",
              statement: "Budget is moving toward workflow tools.",
              strength: "strong" as const,
              citationIds: ["citation-1"],
            },
          ],
          caveats: [
            {
              id: "caveat-1",
              statement: "Most data comes from larger teams.",
              citationIds: [],
            },
          ],
          contradictions: [
            {
              id: "contradiction-1",
              statement: "SMBs report weaker urgency.",
              citationIds: ["citation-1"],
            },
          ],
          unansweredQuestions: [
            {
              id: "question-1",
              question: "How much budget is controlled by operations leaders?",
              citationIds: [],
            },
          ],
          sections: [
            {
              ...report.sections[0],
              citations: [
                {
                  id: "citation-1",
                  source: "Analyst brief",
                  claim: "Budget owners are actively reallocating spend.",
                  relevance: "low" as const,
                  url: "https://example.com/brief",
                  sourceType: "news",
                  publicationDate: "2025-01-10",
                  publicationSignal: "peer_reviewed",
                  recencySignal: "recent",
                  accessibilityStatus: "registration_required",
                },
              ],
            },
          ],
        }}
        artifact={{
          status: "completed",
          sourceInventory: {
            selected: [
              {
                id: "inventory-1",
                title: "Analyst brief",
                canonicalId: "https://example.com/brief",
                sourceType: "news",
                status: "selected",
                citationIds: ["citation-1"],
                sectionIds: ["market"],
                url: "https://example.com/brief",
                publicationDate: "2025-01-10",
                publicationSignal: "peer_reviewed",
                recencySignal: "recent",
                accessibilityStatus: "registration_required",
                claimCount: 2,
              },
            ],
            rejected: [
              {
                id: "rejected-1",
                title: "Paywalled note",
                canonicalId: "paywalled-note",
                status: "rejected",
                sourceType: "report",
                rejectionReason: "insufficient evidence",
                citationIds: [],
                sectionIds: [],
                claimCount: 0,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Key findings")).toBeInTheDocument();
    expect(screen.getByText("Budget is moving toward workflow tools.")).toBeInTheDocument();
    expect(screen.getByText("Caveats")).toBeInTheDocument();
    expect(screen.getByText("Most data comes from larger teams.")).toBeInTheDocument();
    expect(screen.getByText("Contradictions")).toBeInTheDocument();
    expect(screen.getByText("SMBs report weaker urgency.")).toBeInTheDocument();
    expect(screen.getByText("Unanswered questions")).toBeInTheDocument();
    expect(screen.getByText("How much budget is controlled by operations leaders?")).toBeInTheDocument();
    expect(
      screen.getByText("Recommended next actions surfaced 1 open question for follow-up research."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("peer reviewed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("registration required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("published 2025-01-10").length).toBeGreaterThan(0);
    expect(screen.getByText("Research conducted not-a-date")).toBeInTheDocument();
  });

  it("renders source context without a research question", () => {
    render(<ResearchReport status="empty" sourceContext="User asked for a market scan." />);

    expect(screen.getByText("Research context")).toBeInTheDocument();
    expect(screen.getByText("User asked for a market scan.")).toBeInTheDocument();
  });
});
