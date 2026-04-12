import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FrameworkTemplatePanel from "@/components/FrameworkTemplatePanel";

describe("FrameworkTemplatePanel", () => {
  it("renders a SWOT framework", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "swot",
          strengths: [{ id: "s1", title: "High urgency", detail: "Operators escalate the issue weekly." }],
          weaknesses: [{ id: "w1", title: "Budget owner unclear" }],
          opportunities: [{ id: "o1", title: "Cross-sell into support workflows" }],
          threats: [{ id: "t1", title: "Incumbent bundling" }],
        }}
      />,
    );

    expect(screen.getByText("SWOT")).toBeInTheDocument();
    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(screen.getByText("Incumbent bundling")).toBeInTheDocument();
  });

  it("renders a Five Forces framework", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "five-forces",
          forces: [
            {
              id: "f1",
              force: "buyer-power",
              label: "Buyer power",
              intensity: "high",
              summary: "Teams can compare many adjacent tools before buying.",
              evidence: [{ type: "note", label: "6 direct competitors in shortlist" }],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Five Forces")).toBeInTheDocument();
    expect(screen.getByText("Buyer power")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("6 direct competitors in shortlist")).toBeInTheDocument();
  });

  it("renders a problem-solution fit framework", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "problem-solution-fit",
          customerSegments: [{ id: "c1", title: "RevOps leaders" }],
          problems: [{ id: "p1", title: "Manual churn triage" }],
          existingAlternatives: [{ id: "a1", title: "Spreadsheets and CRM exports" }],
          solutionFitSignals: [{ id: "s1", title: "Users ask for automated prioritization" }],
          adoptionRisks: [{ id: "r1", title: "Integration setup friction" }],
        }}
      />,
    );

    expect(screen.getByText("Problem-solution fit")).toBeInTheDocument();
    expect(screen.getByText("Customer segments")).toBeInTheDocument();
    expect(screen.getByText("Integration setup friction")).toBeInTheDocument();
  });

  it("renders a validation experiment plan", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "validation-experiment-planning",
          experiments: [
            {
              id: "e1",
              name: "Price discovery calls",
              hypothesis: "Operators will pay to cut renewal triage time.",
              method: "Run 5 pricing interviews with the target segment.",
              successMetric: "3 out of 5 commit to a paid pilot conversation.",
              signal: "Budget language turns concrete",
              effort: "Low effort",
              timeframe: "Next 7 days",
              risks: ["Biased sample"],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Validation experiment plan")).toBeInTheDocument();
    expect(screen.getByText("Price discovery calls")).toBeInTheDocument();
    expect(screen.getByText("Signal to watch")).toBeInTheDocument();
    expect(screen.getByText("Biased sample")).toBeInTheDocument();
  });

  it("renders nothing when the framework is absent or empty", () => {
    const { container, rerender } = render(<FrameworkTemplatePanel framework={undefined} />);
    expect(container).toBeEmptyDOMElement();

    rerender(
      <FrameworkTemplatePanel
        framework={{
          type: "swot",
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders fallback labels and omits optional metadata when force details are sparse", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "five-forces",
          forces: [
            {
              id: "f1",
              force: "threat-of-substitutes",
              label: "Threat of substitutes",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Threat of substitutes")).toBeInTheDocument();
    expect(screen.queryByText("high")).not.toBeInTheDocument();
  });

  it("renders intensity badges with the expected classes", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "five-forces",
          forces: [
            { id: "f1", force: "competitive-rivalry", label: "Competitive rivalry", intensity: "low" },
            { id: "f2", force: "supplier-power", label: "Supplier power", intensity: "medium" },
            { id: "f3", force: "buyer-power", label: "Buyer power", intensity: "high" },
            { id: "f4", force: "threat-of-new-entrants", label: "Threat of new entrants" },
          ],
        }}
      />,
    );

    expect(screen.getByText("low")).toHaveClass("bg-emerald-100", "text-emerald-800");
    expect(screen.getByText("medium")).toHaveClass("bg-amber-100", "text-amber-800");
    expect(screen.getByText("high")).toHaveClass("bg-rose-100", "text-rose-800");
    expect(screen.getByText("Threat of new entrants")).toBeInTheDocument();
    expect(screen.queryAllByText(/low|medium|high/i)).toHaveLength(3);
  });

  it("renders empty-state copy and a custom heading for sparse problem-solution fit sections", () => {
    render(
      <FrameworkTemplatePanel
        heading="Structured output"
        framework={{
          type: "problem-solution-fit",
          customerSegments: [{ id: "c1", title: "RevOps leaders", evidence: [{ type: "note", label: "12 interviews" }] }],
          problems: [],
          existingAlternatives: [],
          solutionFitSignals: [],
          adoptionRisks: [],
        }}
      />,
    );

    expect(screen.getByText("Structured output")).toBeInTheDocument();
    expect(screen.getByText("12 interviews")).toBeInTheDocument();
    expect(screen.getByText("No problems captured.")).toBeInTheDocument();
    expect(screen.getByText("No existing alternatives captured.")).toBeInTheDocument();
    expect(screen.getByText("No solution fit signals captured.")).toBeInTheDocument();
    expect(screen.getByText("No adoption risks captured.")).toBeInTheDocument();
  });

  it("renders experiment plans without optional tags when they are missing", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "validation-experiment-planning",
          experiments: [
            {
              id: "e1",
              name: "Landing page smoke test",
              hypothesis: "Prospects will click through to request a demo.",
              method: "Run paid traffic to a focused page.",
              successMetric: "5 percent of visitors request a demo.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Landing page smoke test")).toBeInTheDocument();
    expect(screen.queryByText("Signal to watch")).not.toBeInTheDocument();
  });

  it("renders linked evidence chips for known citations and sources, with fallback text for unknown refs", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "swot",
          strengths: [
            {
              id: "s1",
              title: "Clear willingness to pay",
              evidence: [
                { type: "citation", citationId: "citation-1", label: "citation-1" },
                { type: "source", sourceId: "source-1", label: "source-1" },
                { type: "citation", citationId: "missing-citation", label: "Missing citation label" },
              ],
            },
          ],
          weaknesses: [],
          opportunities: [],
          threats: [],
        }}
        citationsById={new Map([["citation-1", { source: "Interview memo" }]])}
        sourceIndexById={new Map([["source-1", 1]])}
      />,
    );

    expect(screen.getByRole("link", { name: "citation-1 · Interview memo" })).toHaveAttribute("href", "#citation-citation-1");
    expect(screen.getByRole("link", { name: "S1" })).toHaveAttribute("href", "#source-source-1");
    expect(screen.getByText("Missing citation label")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Missing citation label" })).not.toBeInTheDocument();
  });

  it("renders validation experiment evidence links independently from risk tags", () => {
    render(
      <FrameworkTemplatePanel
        framework={{
          type: "validation-experiment-planning",
          experiments: [
            {
              id: "e1",
              name: "Prototype walkthrough",
              hypothesis: "Prospects will advance to procurement review.",
              method: "Run 4 guided demos.",
              successMetric: "2 follow-up procurement meetings.",
              evidence: [{ type: "source", sourceId: "source-2", label: "source-2" }],
              risks: ["Small sample"],
            },
          ],
        }}
        sourceIndexById={new Map([["source-2", 2]])}
      />,
    );

    expect(screen.getByRole("link", { name: "S2" })).toHaveAttribute("href", "#source-source-2");
    expect(screen.getByText("Small sample")).toBeInTheDocument();
  });
});
