import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCustomerResearchMemoUpdate,
  applyValidationScorecardChatUpdate,
  buildArtifactContextPayload,
} from "@/lib/project-artifacts";
import { createDefaultProjectDiagram, normalizeProject, type Project, type ProjectResearch } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}): Project {
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
    phases: [
      {
        id: "discovery",
        title: "Discovery",
        tasks: [],
      },
    ],
    research: null,
    diagram: createDefaultProjectDiagram(),
    ...overrides,
  });
}

function makeResearch(overrides: Partial<ProjectResearch> = {}): ProjectResearch {
  return {
    status: "success",
    researchQuestion: "What are the key opportunities and risks?",
    sourceContext: "Saved locally",
    updatedAt: "2025-01-11T00:00:00.000Z",
    artifact: {
      status: "completed",
      metrics: { attemptedAngles: 3 },
    },
    report: {
      sections: [],
      executiveSummary: "Demand is real.",
      researchQuestion: "What are the key opportunities and risks?",
      generatedAt: "2025-01-11T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("project-artifacts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("appends a scorecard revision while keeping the artifact id stable", () => {
    const project = makeProject();
    const initialArtifact = project.artifacts?.find((artifact) => artifact.type === "validation-scorecard");

    const result = applyValidationScorecardChatUpdate(
      project,
      "Evidence is promising, but ICP clarity is still weak.",
      "2025-01-12T00:00:00.000Z",
    );

    const nextArtifact = result.project.artifacts?.find((artifact) => artifact.type === "validation-scorecard");

    expect(result.changed).toBe(true);
    expect(nextArtifact?.id).toBe(initialArtifact?.id);
    expect(nextArtifact).toEqual(expect.objectContaining({
      status: "completed",
      summary: "Evidence is promising, but ICP clarity is still weak.",
      currentRevision: expect.objectContaining({
        number: 2,
        status: "completed",
      }),
    }));
    expect(nextArtifact?.revisionHistory).toHaveLength(2);
    expect(nextArtifact?.revisionHistory.at(-1)).toEqual(
      expect.objectContaining({
        number: 2,
        summary: "Evidence is promising, but ICP clarity is still weak.",
      }),
    );
  });

  it("skips appending a scorecard revision when the content does not change", () => {
    const project = makeProject();
    const firstUpdate = applyValidationScorecardChatUpdate(
      project,
      "Stable summary",
      "2025-01-12T00:00:00.000Z",
    ).project;

    const secondUpdate = applyValidationScorecardChatUpdate(
      firstUpdate,
      "Stable summary",
      "2025-01-13T00:00:00.000Z",
    );

    const artifact = secondUpdate.project.artifacts?.find((entry) => entry.type === "validation-scorecard");

    expect(secondUpdate.changed).toBe(false);
    expect(artifact?.revisionHistory).toHaveLength(2);
    expect(artifact?.currentRevision.number).toBe(2);
  });

  it("appends memo revisions for both successful and failed research updates", () => {
    const project = makeProject();
    const successResearch = makeResearch();
    const successUpdate = applyCustomerResearchMemoUpdate(project, successResearch);
    const failedResearch = makeResearch({
      status: "error",
      updatedAt: "2025-01-13T00:00:00.000Z",
      errorMessage: "Provider timeout",
      artifact: {
        status: "failed",
        metrics: { attemptedAngles: 4, rejectedSources: 1 },
      },
    });
    const failedUpdate = applyCustomerResearchMemoUpdate(successUpdate.project, failedResearch);
    const memo = failedUpdate.project.artifacts?.find((artifact) => artifact.type === "customer-research-memo");

    expect(successUpdate.changed).toBe(true);
    expect(failedUpdate.changed).toBe(true);
    expect(memo).toEqual(expect.objectContaining({
      id: "artifact-customer-research-memo",
      status: "failed",
      research: failedResearch,
      currentRevision: expect.objectContaining({
        number: 3,
        status: "failed",
      }),
    }));
    expect(memo?.revisionHistory).toHaveLength(3);
    expect(memo?.revisionHistory.at(-2)).toEqual(
      expect.objectContaining({
        number: 2,
        status: "completed",
        research: successResearch,
      }),
    );
    expect(memo?.revisionHistory.at(-1)).toEqual(
      expect.objectContaining({
        number: 3,
        status: "failed",
        research: failedResearch,
      }),
    );
  });

  it("keeps persisted project memory in sync as artifacts update", () => {
    const validationUpdated = applyValidationScorecardChatUpdate(
      makeProject({
        artifacts: [
          {
            id: "artifact-validation-scorecard",
            type: "validation-scorecard",
            title: "Validation scorecard",
            updatedAt: "2025-01-10T00:00:00.000Z",
            summary: "",
            criteria: [
              {
                id: "criterion-1",
                label: "Problem urgency",
                score: 5,
                notes: "Operators escalate churn every week.",
              },
            ],
          },
          {
            id: "artifact-customer-research-memo",
            type: "customer-research-memo",
            title: "Customer research memo",
            updatedAt: "2025-01-10T00:00:00.000Z",
            research: null,
          },
        ],
      }),
      "Budget constraints slow procurement. Run five ICP interviews next week.",
      "2025-01-12T00:00:00.000Z",
    ).project;

    const researchUpdated = applyCustomerResearchMemoUpdate(
      validationUpdated,
      makeResearch({
        updatedAt: "2025-01-13T00:00:00.000Z",
        report: {
          ...makeResearch().report!,
          executiveSummary: "The best-fit customer is RevOps teams with weekly renewal risk.",
          keyFindings: [
            {
              id: "finding-1",
              statement: "The best-fit customer is RevOps teams with weekly renewal risk.",
              citationIds: ["citation-1"],
              strength: "strong",
            },
          ],
        },
      }),
    ).project;

    expect(researchUpdated.projectMemory).toEqual(
      expect.objectContaining({
        constraints: [expect.objectContaining({ content: "Budget constraints slow procurement." })],
        experiments: [expect.objectContaining({ content: "Run five ICP interviews next week." })],
        validatedFindings: expect.arrayContaining([
          expect.objectContaining({ content: "Problem urgency: Operators escalate churn every week." }),
          expect.objectContaining({ content: "The best-fit customer is RevOps teams with weekly renewal risk." }),
        ]),
      }),
    );
  });

  it("uses a deterministic fallback revision id when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    vi.spyOn(Date, "now").mockReturnValue(12345);

    const result = applyValidationScorecardChatUpdate(
      makeProject(),
      "Fallback id summary",
      "2025-01-12T00:00:00.000Z",
    );
    const artifact = result.project.artifacts?.find((entry) => entry.type === "validation-scorecard");

    expect(artifact?.currentRevision.id).toBe("artifact-validation-scorecard-revision-2-12345");
  });

  it("sets draft memo status and appends a revision when the memo is cleared", () => {
    const successUpdate = applyCustomerResearchMemoUpdate(makeProject(), makeResearch());
    const cleared = applyCustomerResearchMemoUpdate(successUpdate.project, null);
    const memo = cleared.project.artifacts?.find((artifact) => artifact.type === "customer-research-memo");

    expect(cleared.changed).toBe(true);
    expect(memo).toEqual(expect.objectContaining({
      status: "draft",
      research: null,
      currentRevision: expect.objectContaining({
        number: 3,
        status: "draft",
      }),
    }));
  });

  it("derives failed memo status from a top-level error when the nested artifact status is absent", () => {
    const failedResearch = makeResearch({
      status: "error",
      artifact: undefined,
      errorMessage: "Provider timeout",
      updatedAt: "2025-01-13T00:00:00.000Z",
    });
    const failedUpdate = applyCustomerResearchMemoUpdate(makeProject(), failedResearch);
    const memo = failedUpdate.project.artifacts?.find((artifact) => artifact.type === "customer-research-memo");

    expect(memo?.status).toBe("failed");
    expect(memo?.currentRevision).toEqual(
      expect.objectContaining({
        number: 2,
        status: "failed",
      }),
    );
  });

  it("keeps draft memo status for successful research without a report or nested artifact status", () => {
    const research = makeResearch({
      artifact: undefined,
      report: undefined,
    });

    const updated = applyCustomerResearchMemoUpdate(makeProject(), research);
    const memo = updated.project.artifacts?.find((artifact) => artifact.type === "customer-research-memo");

    expect(memo?.status).toBe("draft");
    expect(memo?.currentRevision.status).toBe("draft");
  });

  it("skips appending a memo revision when the research state is unchanged", () => {
    const successResearch = makeResearch();
    const firstUpdate = applyCustomerResearchMemoUpdate(makeProject(), successResearch);
    const secondUpdate = applyCustomerResearchMemoUpdate(firstUpdate.project, successResearch);
    const memo = secondUpdate.project.artifacts?.find((artifact) => artifact.type === "customer-research-memo");

    expect(secondUpdate.changed).toBe(false);
    expect(memo?.revisionHistory).toHaveLength(2);
    expect(memo?.currentRevision.number).toBe(2);
  });

  it("builds validation scorecard follow-up context from the active artifact", () => {
    const project = makeProject({
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Validation scorecard",
          updatedAt: "2025-01-10T00:00:00.000Z",
          summary: "Pain is sharp for operators.",
          criteria: [
            { id: "criterion-1", label: "Problem urgency", score: 4, notes: "Interviewees escalate weekly." },
            { id: "criterion-2", label: "Budget owner", notes: "Still unclear." },
          ],
        },
        {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          title: "Customer research memo",
          updatedAt: "2025-01-10T00:00:00.000Z",
          research: null,
        },
      ],
      activeArtifactId: "artifact-validation-scorecard",
    });

    expect(buildArtifactContextPayload(project)).toEqual({
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
      label: "Validation scorecard",
      status: "completed",
      mode: "artifact-follow-up",
      hasMeaningfulOutput: true,
      revision: expect.objectContaining({
        number: 1,
        status: "completed",
      }),
      evidenceSnapshot: {
        artifactType: "validation-scorecard",
        summary: "Pain is sharp for operators.",
        criteriaCount: 2,
        scoredCriteriaCount: 1,
        criteria: [
          { label: "Problem urgency", score: 4, notes: "Interviewees escalate weekly." },
          { label: "Budget owner", score: undefined, notes: "Still unclear." },
        ],
      },
    });
  });

  it("builds research memo create context when the memo exists but has no meaningful output", () => {
    const project = makeProject({
      activeArtifactId: "artifact-customer-research-memo",
    });

    expect(buildArtifactContextPayload(project)).toEqual({
      id: "artifact-customer-research-memo",
      type: "customer-research-memo",
      label: "Customer research memo",
      status: "draft",
      mode: "create",
      hasMeaningfulOutput: false,
      revision: expect.objectContaining({
        number: 1,
        status: "draft",
      }),
      evidenceSnapshot: {
        artifactType: "customer-research-memo",
        researchStatus: "empty",
        artifactStatus: undefined,
        executiveSummary: undefined,
        keyFindings: [],
        contradictions: [],
        unansweredQuestions: [],
        sourceCount: 0,
        sectionCount: 0,
      },
    });
  });
});
