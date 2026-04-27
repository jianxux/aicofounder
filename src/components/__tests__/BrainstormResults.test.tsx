import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BrainstormResults from "@/components/BrainstormResults";
import type { BrainstormResult } from "@/lib/brainstorm";

const createResult = (painPoints: BrainstormResult["painPoints"] = createPainPoints()): BrainstormResult => ({
  summary: "Founders consistently complain about repetitive setup work and weak workflow automation.",
  searchContext: "Reviewed r/SaaS, Indie Hackers, Product Hunt comments, and solo founder discussions.",
  painPoints,
});

function createPainPoints(): BrainstormResult["painPoints"] {
  return [
    {
      id: "pain-1",
      title: "Manual onboarding setup takes too long",
      description: "Teams spend hours recreating the same onboarding steps for each new customer.",
      source: "r/SaaS",
      severity: 1,
      frequency: "Weekly",
      quotes: [
        "Every new customer means rebuilding the same workflow from scratch.",
        "Setup is so repetitive that it blocks us from doing real product work.",
      ],
    },
    {
      id: "pain-2",
      title: "Templates still require too much editing",
      description: "Reusable templates exist, but operators still need to tweak most details manually.",
      source: "Indie Hackers",
      severity: 2,
      frequency: "Daily",
      quotes: [
        "Our so-called templates save maybe ten percent of the work.",
        "I still have to check every field before shipping anything.",
      ],
    },
    {
      id: "pain-3",
      title: "Internal handoffs break process consistency",
      description: "When ownership changes between teams, no one is sure which version of the process is correct.",
      source: "Hacker News",
      severity: 3,
      frequency: "Daily",
      quotes: [
        "Every handoff turns into a guessing game about who changed what.",
        "The process works until another team touches it.",
      ],
    },
    {
      id: "pain-4",
      title: "Approvals slow urgent customer work",
      description: "Managers become bottlenecks because every exception request needs direct approval.",
      source: "Product Hunt",
      severity: 4,
      frequency: "Several times a week",
      quotes: [
        "Urgent requests sit idle because only one person can approve them.",
        "We lose momentum every time something falls outside the default flow.",
      ],
    },
    {
      id: "pain-5",
      title: "No visibility into broken automations",
      description: "Failures are discovered by customers first because monitoring is too limited.",
      source: "r/startups",
      severity: 5,
      frequency: "Daily",
      quotes: [
        "We only find out the automation broke when a customer complains.",
        "If a sync fails overnight, nobody notices until revenue is at risk.",
      ],
    },
  ];
}

const renderBrainstormResults = (result: BrainstormResult = createResult()) => {
  render(<BrainstormResults result={result} />);
};

function getSeveritySignal(severity: number) {
  if (severity <= 2) {
    return "low urgency";
  }

  if (severity === 3) {
    return "moderate urgency";
  }

  if (severity === 4) {
    return "high urgency";
  }

  return "critical urgency";
}

describe("BrainstormResults", () => {
  describe("render basics", () => {
    it("renders the summary text", () => {
      renderBrainstormResults();

      expect(
        screen.getByText(
          "Founders consistently complain about repetitive setup work and weak workflow automation.",
        ),
      ).toBeInTheDocument();
    });

    it("renders the searchContext text", () => {
      renderBrainstormResults();

      expect(
        screen.getByText(
          "Reviewed r/SaaS, Indie Hackers, Product Hunt comments, and solo founder discussions.",
        ),
      ).toBeInTheDocument();
    });

    it("renders each pain point title", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        expect(screen.getByText(painPoint.title)).toBeInTheDocument();
      });
    });

    it("renders source badges for each pain point", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        const badge = screen.getByText(painPoint.source);

        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-stone-100");
      });
    });

    it("renders frequency text for each pain point", () => {
      const result = createResult();
      renderBrainstormResults(result);

      const uniqueFrequencies = [...new Set(result.painPoints.map((p) => p.frequency))];

      uniqueFrequencies.forEach((frequency) => {
        const matches = screen.getAllByText(frequency);
        const expectedCount = result.painPoints.filter((p) => p.frequency === frequency).length;

        expect(matches).toHaveLength(expectedCount);
      });
    });

    it("renders description for each pain point", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        expect(screen.getByText(painPoint.description)).toBeInTheDocument();
      });
    });

    it("renders quotes inside details summary sections", () => {
      const result = createResult();
      renderBrainstormResults(result);

      const summaries = screen.getAllByText("Complaint quotes");

      expect(summaries).toHaveLength(result.painPoints.length);

      result.painPoints.forEach((painPoint) => {
        painPoint.quotes.forEach((quote) => {
          const blockquote = screen.getByText(`"${quote}"`);
          const details = blockquote.closest("details");

          expect(blockquote).toBeInTheDocument();
          expect(details).not.toBeNull();
          expect(within(details as HTMLDetailsElement).getByText("Complaint quotes")).toBeInTheDocument();
        });
      });
    });

    it("handles an empty painPoints array gracefully", () => {
      renderBrainstormResults(createResult([]));

      expect(
        screen.getByText(
          "Founders consistently complain about repetitive setup work and weak workflow automation.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Reviewed r/SaaS, Indie Hackers, Product Hunt comments, and solo founder discussions.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("Complaint quotes")).not.toBeInTheDocument();
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });
  });

  describe("severity indicators", () => {
    it("renders filled and empty severity dots correctly for different severity levels", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        const severityGroup = screen.getByLabelText(`Severity ${painPoint.severity} out of 5`);
        const dots = Array.from(severityGroup.querySelectorAll("span"));

        expect(dots).toHaveLength(5);

        dots.forEach((dot, index) => {
          if (index < painPoint.severity) {
            expect(dot).not.toHaveClass("bg-stone-200");
          } else {
            expect(dot).toHaveClass("bg-stone-200");
          }
        });
      });
    });

    it("renders the correct severity colors", () => {
      const result = createResult();
      renderBrainstormResults(result);

      const expectedClasses: Record<number, string> = {
        1: "bg-emerald-500",
        2: "bg-emerald-500",
        3: "bg-amber-400",
        4: "bg-orange-500",
        5: "bg-rose-500",
      };

      result.painPoints.forEach((painPoint) => {
        const severityGroup = screen.getByLabelText(`Severity ${painPoint.severity} out of 5`);
        const dots = Array.from(severityGroup.querySelectorAll("span"));
        const filledDots = dots.slice(0, painPoint.severity);

        filledDots.forEach((dot) => {
          expect(dot).toHaveClass(expectedClasses[painPoint.severity]);
        });
      });
    });
  });

  describe("validation sprint cues", () => {
    it("renders one validation sprint cue region per pain point", () => {
      const result = createResult();
      renderBrainstormResults(result);

      const cueRegions = screen.getAllByRole("region", { name: /validation sprint cue/i });

      expect(cueRegions).toHaveLength(result.painPoints.length);
    });

    it("semantically groups and labels each cue with its pain point title", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        const cueRegion = screen.getByRole("region", {
          name: `Validation sprint cue for ${painPoint.title}`,
        });

        expect(cueRegion).toBeInTheDocument();
        expect(
          within(cueRegion).getByRole("heading", { name: `Validation sprint cue for ${painPoint.title}` }),
        ).toBeInTheDocument();
      });
    });

    it("renders cue body guidance content for each pain point", () => {
      const result = createResult();
      renderBrainstormResults(result);

      result.painPoints.forEach((painPoint) => {
        const cueRegion = screen.getByRole("region", {
          name: `Validation sprint cue for ${painPoint.title}`,
        });

        expect(
          within(cueRegion).getByText(
            `Interview 3 users found via ${painPoint.source} who report "${painPoint.title}" and capture the exact failing workflow.`,
          ),
        ).toBeInTheDocument();
        expect(
          within(cueRegion).getByText(
            `Track how often this appears (${painPoint.frequency}) and treat severity ${painPoint.severity}/5 as a ${getSeveritySignal(painPoint.severity)} signal.`,
          ),
        ).toBeInTheDocument();
        expect(
          within(cueRegion).getByText(
            `Draft a one-page offer for "${painPoint.title}" with a first solution concept tailored to ${painPoint.source}.`,
          ),
        ).toBeInTheDocument();
      });
    });

    it("does not render validation sprint cue sections when pain points are empty", () => {
      renderBrainstormResults(createResult([]));

      expect(screen.queryByRole("region", { name: /validation sprint cue/i })).not.toBeInTheDocument();
    });
  });
});
