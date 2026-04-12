import { describe, expect, it } from "vitest";
import {
  frameworkHasRenderableContent,
  getFrameworkTemplateLabel,
  isArtifactFramework,
  normalizeArtifactFramework,
  summarizeFramework,
} from "@/lib/frameworks";

describe("framework helpers", () => {
  it("normalizes supported memo frameworks and drops invalid items", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "swot",
        strengths: [
          {
            id: "s1",
            title: "Sharp pain",
            detail: "Weekly escalation",
            evidence: [
              "  Weekly escalation notes  ",
              { citationId: "citation-1" },
              { citationId: "citation-1", label: "Duplicate citation" },
              { sourceId: "source-1", label: "Source inventory" },
            ],
          },
        ],
        weaknesses: [{ id: "w1", title: "Missing budget owner" }],
        opportunities: [{ id: "o1", title: "Expand into support" }],
        threats: [{ id: "t1", title: "" }, { id: "t2", title: "Incumbent bundle" }],
      },
      "customer-research-memo",
    );

    expect(framework).toEqual({
      type: "swot",
      strengths: [
        {
          id: "s1",
          title: "Sharp pain",
          detail: "Weekly escalation",
          evidence: [
            { type: "note", label: "Weekly escalation notes" },
            { type: "citation", citationId: "citation-1", label: "citation-1" },
            { type: "source", sourceId: "source-1", label: "Source inventory" },
          ],
        },
      ],
      weaknesses: [{ id: "w1", title: "Missing budget owner", detail: undefined, evidence: undefined }],
      opportunities: [{ id: "o1", title: "Expand into support", detail: undefined, evidence: undefined }],
      threats: [{ id: "t2", title: "Incumbent bundle", detail: undefined, evidence: undefined }],
    });
  });

  it("rejects unknown or wrong-context frameworks", () => {
    expect(normalizeArtifactFramework({ type: "unknown" }, "customer-research-memo")).toBeUndefined();
    expect(
      normalizeArtifactFramework(
        {
          type: "validation-experiment-planning",
          experiments: [
            {
              id: "e1",
              name: "Test",
              hypothesis: "H",
              method: "M",
              successMetric: "S",
            },
          ],
        },
        "customer-research-memo",
      ),
    ).toBeUndefined();
  });

  it("normalizes experiment planning and exposes summary metadata", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "validation-experiment-planning",
        experiments: [
          {
            id: "e1",
            name: "Concierge pilot",
            hypothesis: "Users will pay for manual onboarding.",
            method: "Offer 5 paid pilots.",
            successMetric: "2 pilots close",
            signal: "Budget discussion advances",
            risks: ["Small sample", "Founder bias"],
          },
        ],
      },
      "validation-scorecard",
    );

    expect(isArtifactFramework(framework, "validation-scorecard")).toBe(true);
    expect(frameworkHasRenderableContent(framework)).toBe(true);
    expect(summarizeFramework(framework)).toEqual({
      type: "validation-experiment-planning",
      label: "Validation experiment plan",
      itemCount: 1,
    });
    expect(getFrameworkTemplateLabel("five-forces")).toBe("Five Forces");
  });

  it("normalizes five-forces entries, fallback labels, and generic framework checks", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "five-forces",
        forces: [
          {
            id: "f1",
            force: "supplier-power",
            label: "   ",
            summary: " Suppliers are concentrated. ",
            intensity: "extreme",
            evidence: ["  Long contracts  ", "", "Limited alternatives", { type: "source", id: "source-2" }],
          },
          {
            id: "f2",
            force: "buyer-power",
            label: " ",
          },
        ],
      },
      "customer-research-memo",
    );

    expect(framework).toEqual({
      type: "five-forces",
      forces: [
        {
          id: "f1",
          force: "supplier-power",
          label: "supplier power",
          intensity: undefined,
          summary: "Suppliers are concentrated.",
          evidence: [
            { type: "note", label: "Long contracts" },
            { type: "note", label: "Limited alternatives" },
            { type: "source", sourceId: "source-2", label: "source-2" },
          ],
        },
      ],
    });
    expect(isArtifactFramework(framework)).toBe(true);
    expect(summarizeFramework(framework)).toEqual({
      type: "five-forces",
      label: "Five Forces",
      itemCount: 1,
    });
  });

  it("summarizes problem-solution fit frameworks and exposes remaining labels", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "problem-solution-fit",
        customerSegments: [{ id: "c1", title: "Founders" }],
        problems: [{ id: "p1", title: "Slow discovery" }],
        existingAlternatives: [{ id: "a1", title: "Consultants" }],
        solutionFitSignals: [{ id: "s1", title: "Users ask for pilots" }],
        adoptionRisks: [{ id: "r1", title: "Workflow change resistance" }],
      },
      "validation-scorecard",
    );

    expect(frameworkHasRenderableContent(framework)).toBe(true);
    expect(summarizeFramework(framework)).toEqual({
      type: "problem-solution-fit",
      label: "Problem-solution fit",
      itemCount: 5,
    });
    expect(getFrameworkTemplateLabel("swot")).toBe("SWOT");
  });

  it("returns falsey helpers for empty frameworks", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "problem-solution-fit",
        customerSegments: [],
        problems: [],
        existingAlternatives: [],
        solutionFitSignals: [],
        adoptionRisks: [],
      },
      "validation-scorecard",
    );

    expect(framework).toBeUndefined();
    expect(frameworkHasRenderableContent(undefined)).toBe(false);
    expect(summarizeFramework(undefined)).toBeUndefined();
    expect(isArtifactFramework({ type: "validation-experiment-planning", experiments: [] })).toBe(false);
  });

  it("normalizes validation experiment evidence with citation, source, and note fallbacks", () => {
    const framework = normalizeArtifactFramework(
      {
        type: "validation-experiment-planning",
        experiments: [
          {
            id: "e1",
            name: "Interview sprint",
            hypothesis: "Budget owners will commit to a pilot.",
            method: "Run 6 structured calls.",
            successMetric: "2 pilot commitments",
            evidence: [
              { type: "citation", id: "citation-2", label: "Call transcript" },
              { sourceId: "source-4" },
              { text: "Founder notes" },
            ],
          },
        ],
      },
      "validation-scorecard",
    );

    expect(framework).toEqual({
      type: "validation-experiment-planning",
      experiments: [
        {
          id: "e1",
          name: "Interview sprint",
          hypothesis: "Budget owners will commit to a pilot.",
          method: "Run 6 structured calls.",
          successMetric: "2 pilot commitments",
          signal: undefined,
          effort: undefined,
          timeframe: undefined,
          evidence: [
            { type: "citation", citationId: "citation-2", label: "Call transcript" },
            { type: "source", sourceId: "source-4", label: "source-4" },
            { type: "note", label: "Founder notes" },
          ],
          risks: undefined,
        },
      ],
    });
  });
});
