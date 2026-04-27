import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import UltraplanReport from "@/components/UltraplanReport";
import type { UltraplanResult } from "@/lib/ultraplan";

const createResult = (): UltraplanResult => ({
  rationale:
    "Customer feedback is noisy because the product positioning is still too broad, which blocks effective iteration.",
  nextStep: "Book five ICP interviews and use them to rewrite the homepage promise.",
  blocker: {
    id: "blocker-1",
    title: "Positioning is too broad",
    description:
      "The team is talking to too many audience segments at once, so feedback and messaging are inconsistent.",
    severity: 4,
    category: "market",
  },
  actions: [
    {
      id: "action-1",
      title: "Interview five target users",
      description: "Run structured calls with users in the most promising segment.",
      effort: "medium",
      impact: "high",
      timelineHours: 6,
    },
    {
      id: "action-2",
      title: "Rewrite the homepage",
      description: "Refocus the headline and proof points around one urgent problem.",
      effort: "low",
      impact: "high",
      timelineHours: 3,
    },
    {
      id: "action-3",
      title: "Add qualification questions",
      description: "Filter inbound leads so calls stay concentrated on the target segment.",
      effort: "low",
      impact: "medium",
      timelineHours: 2,
    },
  ],
});

const renderUltraplanReport = (result: UltraplanResult = createResult()) => {
  render(<UltraplanReport result={result} />);
};

describe("UltraplanReport", () => {
  it("renders ULTRAPLAN header", () => {
    renderUltraplanReport();

    expect(screen.getByText("ULTRAPLAN")).toBeInTheDocument();
  });

  it("renders rationale", () => {
    const result = createResult();
    renderUltraplanReport(result);

    expect(screen.getByText(result.rationale)).toBeInTheDocument();
  });

  it("renders next step in sky box", () => {
    const result = createResult();
    renderUltraplanReport(result);

    expect(screen.getByText("NEXT STEP")).toBeInTheDocument();
    const nextStep = screen.getByText(result.nextStep);

    expect(nextStep).toBeInTheDocument();
    expect(nextStep.closest("div")).toHaveClass("bg-sky-50");
  });

  it("renders blocker title and category badge", () => {
    const result = createResult();
    renderUltraplanReport(result);

    expect(screen.getByText(result.blocker.title)).toBeInTheDocument();

    const badge = screen.getByText(result.blocker.category);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-stone-100");
  });

  it("renders severity dots", () => {
    const result = createResult();
    renderUltraplanReport(result);

    const severityGroup = screen.getByLabelText(`Severity ${result.blocker.severity} out of 5`);
    const dots = Array.from(severityGroup.querySelectorAll("span"));

    expect(dots).toHaveLength(5);

    dots.forEach((dot, index) => {
      if (index < result.blocker.severity) {
        expect(dot).toHaveClass("bg-orange-500");
      } else {
        expect(dot).toHaveClass("bg-stone-200");
      }
    });
  });

  it("renders all severity color variants", () => {
    const severities = [
      { severity: 2, className: "bg-emerald-500" },
      { severity: 3, className: "bg-amber-400" },
      { severity: 5, className: "bg-rose-500" },
    ] as const;

    severities.forEach(({ severity, className }) => {
      const { unmount } = render(
        <UltraplanReport
          result={{
            ...createResult(),
            blocker: {
              ...createResult().blocker,
              severity,
            },
          }}
        />,
      );

      const dots = Array.from(screen.getByLabelText(`Severity ${severity} out of 5`).querySelectorAll("span"));
      expect(dots[0]).toHaveClass(className);
      unmount();
    });
  });

  it("renders all action cards with titles", () => {
    const result = createResult();
    renderUltraplanReport(result);

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(result.actions.length);

    result.actions.forEach((action) => {
      expect(screen.getByText(action.title)).toBeInTheDocument();
    });
  });

  it("renders effort and impact badges", () => {
    const result = createResult();
    renderUltraplanReport(result);

    const effortBadges = screen.getAllByText(/^Effort: /);
    const impactBadges = screen.getAllByText(/^Impact: /);

    expect(effortBadges).toHaveLength(result.actions.length);
    expect(impactBadges).toHaveLength(result.actions.length);

    result.actions.forEach((action, index) => {
      expect(effortBadges[index]).toHaveTextContent(`Effort: ${action.effort}`);
      expect(impactBadges[index]).toHaveTextContent(`Impact: ${action.impact}`);
    });
  });

  it("renders low, medium, and high badge color variants", () => {
    render(
      <UltraplanReport
        result={{
          ...createResult(),
          actions: [
            {
              id: "action-low",
              title: "Low effort action",
              description: "Quick fix.",
              effort: "low",
              impact: "medium",
              timelineHours: 1,
            },
            {
              id: "action-high",
              title: "High impact action",
              description: "Harder fix.",
              effort: "high",
              impact: "low",
              timelineHours: 8,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Effort: low")).toHaveClass("bg-emerald-100", "text-emerald-700");
    expect(screen.getByText("Impact: medium")).toHaveClass("bg-amber-100", "text-amber-700");
    expect(screen.getByText("Effort: high")).toHaveClass("bg-rose-100", "text-rose-700");
    expect(screen.getByText("Impact: low")).toHaveClass("bg-emerald-100", "text-emerald-700");
  });

  it("renders timeline hours", () => {
    const result = createResult();
    renderUltraplanReport(result);

    result.actions.forEach((action) => {
      expect(screen.getByText(`${action.timelineHours}h`)).toBeInTheDocument();
    });
  });

  it("renders action plan snapshot region", () => {
    renderUltraplanReport();

    expect(screen.getByRole("region", { name: "Action plan snapshot" })).toBeInTheDocument();
  });

  it("derives snapshot metrics", () => {
    const result = createResult();
    renderUltraplanReport(result);

    expect(screen.getByText("11h total")).toBeInTheDocument();
    expect(screen.getByText("2 high-impact actions")).toBeInTheDocument();
  });

  it("pluralizes high-impact action metric label", () => {
    renderUltraplanReport({
      ...createResult(),
      actions: [
        {
          id: "action-only-high-impact",
          title: "One high impact action",
          description: "Only one action is high-impact.",
          effort: "low",
          impact: "high",
          timelineHours: 1,
        },
        {
          id: "action-not-high-impact",
          title: "Not high impact action",
          description: "This action is medium impact.",
          effort: "low",
          impact: "medium",
          timelineHours: 1,
        },
      ],
    });

    expect(screen.getByText("1 high-impact action")).toBeInTheDocument();
  });

  it("uses unique action plan snapshot heading ids across multiple reports", () => {
    const { container } = render(
      <>
        <UltraplanReport result={createResult()} />
        <UltraplanReport result={createResult()} />
      </>,
    );

    const regions = screen.getAllByRole("region", { name: "Action plan snapshot" });
    expect(regions).toHaveLength(2);

    const headingIds = regions.map((region) => {
      const heading = region.querySelector("h3");
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe("Action plan snapshot");
      expect(heading?.id).toBeTruthy();
      expect(region).toHaveAttribute("aria-labelledby", heading?.id);
      return heading?.id ?? "";
    });

    expect(new Set(headingIds).size).toBe(2);

    headingIds.forEach((id) => {
      expect(container.querySelectorAll(`h3#${id}`)).toHaveLength(1);
    });
  });

  it("selects the next lowest-effort action", () => {
    renderUltraplanReport();

    expect(screen.getByText("Start with: Add qualification questions (2h)")).toBeInTheDocument();
  });

  it("handles empty actions in snapshot gracefully", () => {
    renderUltraplanReport({
      ...createResult(),
      actions: [],
    });

    expect(screen.getByText("0h total")).toBeInTheDocument();
    expect(screen.getByText("0 high-impact actions")).toBeInTheDocument();
    expect(screen.getByText("Start with: No actions yet")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
