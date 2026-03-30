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

  it("renders timeline hours", () => {
    const result = createResult();
    renderUltraplanReport(result);

    result.actions.forEach((action) => {
      expect(screen.getByText(`${action.timelineHours}h`)).toBeInTheDocument();
    });
  });
});
