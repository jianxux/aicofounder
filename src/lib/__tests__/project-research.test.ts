import { describe, expect, it } from "vitest";
import { resolveProjectResearchResponse } from "@/lib/project-research";
import type { ProjectResearch } from "@/lib/types";

const report = {
  sections: [],
  executiveSummary: "Stored summary",
  researchQuestion: "What are the key opportunities and risks?",
  generatedAt: "2025-01-09T00:00:00.000Z",
  citations: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" as const }],
  sources: [
    {
      id: "selected-source-a",
      title: "Source A",
      canonicalId: "source-a",
      sourceType: "report" as const,
      status: "selected" as const,
      citationIds: ["c1"],
      sectionIds: ["market"],
      publicationSignal: "unknown" as const,
      recencySignal: "unknown" as const,
      accessibilityStatus: "unknown" as const,
      claimCount: 1,
    },
  ],
};

describe("resolveProjectResearchResponse", () => {
  it("keeps structured artifact data on success", () => {
    const result = resolveProjectResearchResponse(
      null,
      {
        ...report,
        artifact: {
          status: "completed",
          generatedAt: "2025-01-10T00:00:00.000Z",
          metrics: {
            attemptedAngles: 3,
            completedSections: 0,
            selectedSources: 0,
            rejectedSources: 0,
          },
          selectedSources: [],
          rejectedSources: [],
          failures: [],
        },
      },
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual(
      expect.objectContaining({
        status: "completed",
        report,
      }),
    );
  });

  it("preserves the prior successful report when a new run fails", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        status: "completed",
        report,
        metrics: { attemptedAngles: 1 },
      },
      report,
    };

    const result = resolveProjectResearchResponse(
      existingResearch,
      {
        error: "Provider timeout",
        artifact: {
          status: "failed",
          generatedAt: "2025-01-10T00:00:00.000Z",
          metrics: { attemptedAngles: 2, rejectedSources: 1 },
          failures: [{ stage: "gather", code: "no-evidence", message: "No research sections passed validation" }],
        },
      },
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Provider timeout");
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual(
      expect.objectContaining({
        status: "failed",
        generatedAt: "2025-01-10T00:00:00.000Z",
        report,
        metrics: expect.objectContaining({
          attemptedAngles: 2,
          rejectedSources: 1,
        }),
      }),
    );
  });

  it("supports legacy report-only responses without an artifact", () => {
    const result = resolveProjectResearchResponse(null, report, true);

    expect(result.ok).toBe(true);
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual({ report });
  });

  it("keeps existing artifact data when the new artifact payload is absent", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        status: "completed",
        report,
        metrics: { attemptedAngles: 1 },
      },
      report,
    };

    const result = resolveProjectResearchResponse(existingResearch, { error: "Provider timeout" }, false);

    expect(result.ok).toBe(false);
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual(existingResearch.artifact);
  });

  it("returns no artifact when neither a valid artifact nor a fallback report exists", () => {
    const result = resolveProjectResearchResponse(null, { error: "Provider timeout", artifact: { status: "bad" } }, false);

    expect(result.ok).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.artifact).toBeUndefined();
    expect(result.errorMessage).toBe("Provider timeout");
  });

  it("uses the generic failure message when the request fails without a string error", () => {
    const result = resolveProjectResearchResponse(
      null,
      {
        artifact: {
          status: "failed",
        },
      },
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Failed to run deep research");
    expect(result.artifact).toEqual({
      status: "failed",
      report: undefined,
    });
  });

  it("preserves an existing artifact report when the next artifact report is invalid", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        status: "completed",
        report,
      },
      report,
    };

    const result = resolveProjectResearchResponse(
      existingResearch,
      {
        artifact: {
          status: "partial",
          report: {
            executiveSummary: 123,
          },
        },
      },
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual({
      status: "partial",
      report,
    });
  });

  it("merges valid top-level artifact fields even when the next artifact report is invalid", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        status: "completed",
        report,
        metrics: { attemptedAngles: 1 },
      },
      report,
    };

    const result = resolveProjectResearchResponse(
      existingResearch,
      {
        artifact: {
          status: "failed",
          metrics: { attemptedAngles: 2, rejectedSources: 1 },
          report: {
            executiveSummary: 123,
          },
        },
      },
      false,
    );

    expect(result.ok).toBe(false);
    expect(result.report).toEqual(report);
    expect(result.artifact).toEqual({
      status: "failed",
      metrics: { attemptedAngles: 2, rejectedSources: 1 },
      report,
    });
  });

  it("merges nested artifact fields without dropping preserved values", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        status: "partial",
        generatedAt: "2025-01-09T00:00:00.000Z",
        plan: {
          projectName: "Orbit",
          budget: { maxAngles: 3, maxSections: 2 },
          steps: [{ id: "market", title: "Market", angle: "Demand" }],
        },
        sourceInventory: {
          selected: [
            {
              id: "selected-source-a",
              title: "Source A",
              canonicalId: "source-a",
              sourceType: "report",
              status: "selected",
              citationIds: ["c1"],
              sectionIds: ["market"],
              publicationSignal: "unknown",
              recencySignal: "unknown",
              accessibilityStatus: "unknown",
              claimCount: 1,
            },
          ],
          rejected: [],
        },
        metrics: { attemptedAngles: 1, completedSections: 1 },
        failures: [{ stage: "gather", code: "invalid-section", message: "Older warning" }],
        report,
      },
      report,
    };

    const result = resolveProjectResearchResponse(
      existingResearch,
      {
        artifact: {
          status: "completed",
          plan: {
            budget: { maxCitationsPerSection: 3 },
          },
          metrics: { rejectedSources: 2 },
          sourceInventory: {
            selected: existingResearch.artifact?.sourceInventory?.selected ?? [],
            rejected: [
              {
                id: "rejected-source-b",
                title: "Source B",
                canonicalId: "source-b",
                sourceType: "other",
                status: "rejected",
                citationIds: ["c2"],
                sectionIds: ["market"],
                publicationSignal: "unknown",
                recencySignal: "unknown",
                accessibilityStatus: "unknown",
                claimCount: 1,
                rejectionReason: "budget",
              },
            ],
          },
          failures: [{ stage: "report", code: "invalid-summary", message: "Fallback used" }],
        },
      },
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.artifact).toEqual({
      status: "completed",
      generatedAt: "2025-01-09T00:00:00.000Z",
      plan: {
        projectName: "Orbit",
        budget: { maxAngles: 3, maxSections: 2, maxCitationsPerSection: 3 },
        steps: [{ id: "market", title: "Market", angle: "Demand" }],
      },
      sourceInventory: {
        selected: [
          {
            id: "selected-source-a",
            title: "Source A",
            canonicalId: "source-a",
            sourceType: "report",
            status: "selected",
            citationIds: ["c1"],
            sectionIds: ["market"],
            publicationSignal: "unknown",
            recencySignal: "unknown",
            accessibilityStatus: "unknown",
            claimCount: 1,
          },
        ],
        rejected: [
          {
            id: "rejected-source-b",
            title: "Source B",
            canonicalId: "source-b",
            sourceType: "other",
            status: "rejected",
            citationIds: ["c2"],
            sectionIds: ["market"],
            publicationSignal: "unknown",
            recencySignal: "unknown",
            accessibilityStatus: "unknown",
            claimCount: 1,
            rejectionReason: "budget",
          },
        ],
      },
      metrics: { attemptedAngles: 1, completedSections: 1, rejectedSources: 2 },
      failures: [{ stage: "report", code: "invalid-summary", message: "Fallback used" }],
      report,
    });
  });

  it("salvages valid partial artifact fields from a non-conforming payload", () => {
    const result = resolveProjectResearchResponse(
      null,
      {
        artifact: {
          status: "partial",
          generatedAt: "2025-01-10T00:00:00.000Z",
          plan: {
            projectName: "Orbit",
          },
          report: {
            executiveSummary: "Incomplete partial report",
          },
          selectedSources: [null],
          rejectedSources: [null],
          sourceInventory: {
            selected: [null],
            rejected: [],
          },
          metrics: {
            attemptedAngles: 2,
          },
          failures: [null],
        },
      },
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.report).toBeUndefined();
    expect(result.artifact).toEqual({
      status: "partial",
      generatedAt: "2025-01-10T00:00:00.000Z",
      plan: {
        projectName: "Orbit",
      },
      metrics: {
        attemptedAngles: 2,
      },
      report: undefined,
    });
  });

  it("drops malformed nested artifact structures while keeping valid siblings", () => {
    const result = resolveProjectResearchResponse(
      null,
      {
        artifact: {
          status: "partial",
          generatedAt: "2025-01-10T00:00:00.000Z",
          plan: {
            projectName: "Orbit",
            budget: { maxAngles: "bad" },
          },
          selectedSources: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
          rejectedSources: [{ source: "Source B", reason: "invalid" }],
          sourceInventory: {
            selected: [
              {
                id: "selected-source-a",
                title: "Source A",
                canonicalId: "source-a",
                sourceType: "report",
                status: "selected",
                citationIds: ["c1"],
                sectionIds: ["market"],
                publicationSignal: "unknown",
                recencySignal: "unknown",
                accessibilityStatus: "unknown",
                claimCount: "bad",
              },
            ],
            rejected: [],
          },
          metrics: {
            attemptedAngles: 2,
          },
          failures: [{ stage: "gather", code: "provider-error", message: "Timeout" }],
        },
      },
      true,
    );

    expect(result.artifact).toEqual({
      status: "partial",
      generatedAt: "2025-01-10T00:00:00.000Z",
      selectedSources: [{ id: "c1", source: "Source A", claim: "Claim A", relevance: "high" }],
      rejectedSources: [{ source: "Source B", reason: "invalid" }],
      metrics: {
        attemptedAngles: 2,
      },
      failures: [{ stage: "gather", code: "provider-error", message: "Timeout" }],
      report: undefined,
    });
  });

  it("keeps existing nested arrays when a follow-up artifact omits them", () => {
    const existingResearch: ProjectResearch = {
      status: "success",
      researchQuestion: report.researchQuestion,
      sourceContext: "Saved locally",
      updatedAt: "2025-01-09T00:00:00.000Z",
      artifact: {
        plan: {
          steps: [{ id: "market", title: "Market", angle: "Demand", query: "q", rationale: "r" }],
        },
        sourceInventory: {
          selected: [],
          rejected: [
            {
              id: "rejected-source-b",
              title: "Source B",
              canonicalId: "source-b",
              sourceType: "other",
              status: "rejected",
              citationIds: [],
              sectionIds: [],
              publicationSignal: "unknown",
              recencySignal: "unknown",
              accessibilityStatus: "unknown",
              claimCount: 0,
              rejectionReason: "invalid",
            },
          ],
        },
        selectedSources: [
          {
            id: "c1",
            source: "Source A",
            claim: "Claim A",
            relevance: "high",
          },
        ],
        rejectedSources: [{ source: "Source B", reason: "invalid" }],
        report,
      },
      report,
    };

    const result = resolveProjectResearchResponse(
      existingResearch,
      {
        artifact: {
          metrics: {
            completedSections: 2,
          },
        },
      },
      true,
    );

    expect(result.artifact).toEqual({
      plan: {
        steps: [{ id: "market", title: "Market", angle: "Demand", query: "q", rationale: "r" }],
      },
      sourceInventory: {
        selected: [],
        rejected: [
          {
            id: "rejected-source-b",
            title: "Source B",
            canonicalId: "source-b",
            sourceType: "other",
            status: "rejected",
            citationIds: [],
            sectionIds: [],
            publicationSignal: "unknown",
            recencySignal: "unknown",
            accessibilityStatus: "unknown",
            claimCount: 0,
            rejectionReason: "invalid",
          },
        ],
      },
      selectedSources: [
        {
          id: "c1",
          source: "Source A",
          claim: "Claim A",
          relevance: "high",
        },
      ],
      rejectedSources: [{ source: "Source B", reason: "invalid" }],
      metrics: {
        completedSections: 2,
      },
      report,
    });
  });
});
