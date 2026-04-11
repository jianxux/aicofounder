import { describe, expect, it } from "vitest";
import { deriveResearchMemoSharedState, normalizeProject, type ArtifactRevisionMetadata, type Project, type ProjectResearch } from "@/lib/types";

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
        id: "phase-1",
        title: "Discovery",
        tasks: [],
      },
    ],
    research: null,
    ...overrides,
  });
}

function makeRevision(overrides: Partial<ArtifactRevisionMetadata> = {}): ArtifactRevisionMetadata {
  return {
    id: "revision-2",
    number: 2,
    createdAt: "2025-01-12T00:00:00.000Z",
    status: "completed",
    ...overrides,
  };
}

function makeResearch(overrides: Partial<ProjectResearch> = {}): ProjectResearch {
  return {
    status: "success",
    researchQuestion: "What are the most urgent customer pains?",
    sourceContext: "Saved workspace evidence",
    updatedAt: "2025-01-12T00:00:00.000Z",
    artifact: {
      status: "completed",
    },
    report: {
      sections: [
        {
          id: "section-demand",
          title: "Demand",
          angle: "Demand signals",
          findings: "Operators report weekly churn risks.",
          citations: [
            {
              id: "citation-1",
              source: "Acme report",
              claim: "Teams escalate churn every week.",
              relevance: "high",
              url: "https://example.com/report",
            },
          ],
        },
      ],
      executiveSummary: "Demand is real but trust still blocks expansion.",
      researchQuestion: "What are the most urgent customer pains?",
      generatedAt: "2025-01-12T00:00:00.000Z",
      citations: [
        {
          id: "citation-1",
          source: "Acme report",
          claim: "Teams escalate churn every week.",
          relevance: "high",
          url: "https://example.com/report",
        },
      ],
      sources: [
        {
          id: "source-1",
          title: "Acme report",
          canonicalId: "acme-report",
          sourceType: "report",
          status: "selected",
          citationIds: ["citation-1"],
          sectionIds: ["section-demand"],
          url: "https://example.com/report",
          domain: "example.com",
          claimCount: 1,
        },
      ],
      keyFindings: [
        {
          id: "finding-1",
          statement: "Operators escalate churn weekly.",
          citationIds: ["citation-1"],
          strength: "strong",
        },
      ],
      contradictions: [
        {
          id: "contradiction-1",
          statement: "Some teams report lower urgency in mid-market accounts.",
          citationIds: ["citation-1"],
        },
      ],
      unansweredQuestions: [
        {
          id: "question-1",
          question: "Who owns the renewal workflow?",
          citationIds: ["citation-1"],
        },
      ],
    },
    ...overrides,
  };
}

describe("deriveResearchMemoSharedState", () => {
  it("derives shared memo primitives from project and research inputs", () => {
    const project = makeProject({
      diagram: {
        ...makeProject().diagram!,
        nodes: [
          {
            id: "branch:research:research:summary",
            type: "detail",
            label: "Executive summary",
            x: 640,
            y: 1180,
            layout: { parentId: "branch:research", order: 0 },
          },
        ],
      },
    });
    const state = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project,
      research: makeResearch(),
    });

    expect(state).toMatchObject({
      artifactId: "artifact-customer-research-memo",
      family: "customer-research-memo",
      revisionId: "revision-2",
      revisionNumber: 2,
      projectFacts: [
        { id: "fact:project-name", value: "Launchpad" },
        { id: "fact:project-description", value: "AI-assisted startup planning" },
        { id: "fact:research-question", value: "What are the most urgent customer pains?" },
        { id: "fact:source-context", value: "Saved workspace evidence" },
      ],
    });
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "research:summary", kind: "summary" }),
        expect.objectContaining({
          id: "research:section:section-demand",
          kind: "section",
          evidenceRefIds: ["evidence:citation-1"],
        }),
        expect.objectContaining({
          id: "research:finding:finding-1",
          kind: "finding",
          sourceRefIds: ["research:source:source-1"],
        }),
        expect.objectContaining({ id: "research:source:source-1", kind: "source" }),
      ]),
    );
    expect(state.evidenceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "evidence:citation-1",
          sourceId: "source-1",
          sectionIds: ["section-demand"],
        }),
      ]),
    );
    expect(state.records).toEqual(expect.arrayContaining([...state.sourceRefs, ...state.evidenceRefs]));
    expect(state.entities.find((entity) => entity.id === "research:summary")?.recordIds).toEqual([
      "research:source:source-1",
      "evidence:citation-1",
    ]);
    expect(state.views.find((view) => view.view === "diagram")).toEqual(
      expect.objectContaining({
        layouts: expect.arrayContaining([
          expect.objectContaining({
            entityId: "research:summary",
            parentId: "branch:research",
            order: 0,
            x: 640,
            y: 1180,
          }),
        ]),
      }),
    );
  });

  it("handles empty memo state without inventing entities", () => {
    const project = makeProject();
    const state = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision({ status: "draft" }),
      updatedAt: "2025-01-10T00:00:00.000Z",
      project,
      research: null,
    });

    expect(state.entities).toEqual([]);
    expect(state.sourceRefs).toEqual([]);
    expect(state.evidenceRefs).toEqual([]);
    expect(state.views.find((view) => view.view === "diagram")?.layouts).toEqual([]);
    expect(state.projectFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "fact:project-name" }),
        expect.objectContaining({ id: "fact:project-description" }),
      ]),
    );
  });

  it("fills source references from citations when the report source inventory is partial", () => {
    const state = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch({
        report: {
          ...makeResearch().report!,
          sources: undefined,
        },
      }),
    });

    expect(state.sourceRefs).toEqual([
      expect.objectContaining({
        id: "research:source:research-fallback-source-1w1h5ds",
        citationIds: ["citation-1"],
      }),
    ]);
    expect(state.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "research:finding:finding-1",
          sourceRefIds: ["research:source:research-fallback-source-1w1h5ds"],
        }),
      ]),
    );
  });

  it("merges existing diagram layout metadata when new project inputs do not carry positions", () => {
    const existing = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project: makeProject({
        diagram: {
          ...makeProject().diagram!,
          nodes: [
            {
              id: "branch:research:research:finding:finding-1",
              type: "detail",
              label: "Key finding",
              x: 900,
              y: 1400,
              layout: { parentId: "branch:research", order: 1 },
            },
          ],
        },
      }),
      research: makeResearch(),
    });

    const merged = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision({ id: "revision-3", number: 3 }),
      updatedAt: "2025-01-13T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch(),
      existingState: existing,
    });

    expect(merged.views.find((view) => view.view === "diagram")?.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: "research:finding:finding-1",
          x: 900,
          y: 1400,
          order: 1,
        }),
      ]),
    );
  });

  it("derives useful diagram entities when the executive summary is blank", () => {
    const state = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch({
        report: {
          ...makeResearch().report!,
          executiveSummary: "   ",
        },
      }),
    });

    expect(state.entities.some((entity) => entity.id === "research:summary")).toBe(false);
    expect(state.views.find((view) => view.view === "diagram")?.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: "research:finding:finding-1", order: 0 }),
        expect.objectContaining({ entityId: "research:source:source-1", order: 1 }),
      ]),
    );
  });

  it("keeps existing shared view layout order ahead of regenerated defaults", () => {
    const existing = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch(),
    });
    const existingDiagram = existing.views.find((view) => view.view === "diagram")!;
    const existingState = {
      ...existing,
      views: existing.views.map((view) =>
        view.view === "diagram"
          ? {
              ...view,
              layouts: existingDiagram.layouts.map((layout) =>
                layout.entityId === "research:finding:finding-1"
                  ? { ...layout, order: 20, x: 1200, y: 1600 }
                  : layout,
              ),
            }
          : view,
      ),
    };

    const merged = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision({ id: "revision-3", number: 3 }),
      updatedAt: "2025-01-13T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch(),
      existingState,
    });

    expect(merged.views.find((view) => view.view === "diagram")?.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: "research:finding:finding-1",
          order: 20,
          x: 1200,
          y: 1600,
        }),
      ]),
    );
  });

  it("lets persisted canvas node layout override existing shared diagram layout", () => {
    const existing = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision(),
      updatedAt: "2025-01-12T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch(),
    });
    const existingDiagram = existing.views.find((view) => view.view === "diagram")!;
    const existingState = {
      ...existing,
      views: existing.views.map((view) =>
        view.view === "diagram"
          ? {
              ...view,
              layouts: existingDiagram.layouts.map((layout) =>
                layout.entityId === "research:finding:finding-1"
                  ? { ...layout, order: 20, x: 1200, y: 1600 }
                  : layout,
              ),
            }
          : view,
      ),
    };

    const merged = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision({ id: "revision-3", number: 3 }),
      updatedAt: "2025-01-13T00:00:00.000Z",
      project: makeProject({
        diagram: {
          ...makeProject().diagram!,
          nodes: [
            {
              id: "branch:research:research:finding:finding-1",
              type: "detail",
              label: "Key finding",
              x: 900,
              y: 1400,
              layout: { parentId: "branch:research", order: 1 },
            },
          ],
        },
      }),
      research: makeResearch(),
      existingState,
    });

    expect(merged.views.find((view) => view.view === "diagram")?.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: "research:finding:finding-1",
          order: 1,
          x: 900,
          y: 1400,
        }),
      ]),
    );
  });

  it("captures conflicting error revisions as a failed memo view", () => {
    const state = deriveResearchMemoSharedState({
      artifactId: "artifact-customer-research-memo",
      revision: makeRevision({ status: "failed" }),
      updatedAt: "2025-01-13T00:00:00.000Z",
      project: makeProject(),
      research: makeResearch({
        status: "error",
        artifact: undefined,
        report: undefined,
        errorMessage: "Provider timeout",
      }),
    });

    expect(state.entities).toEqual([
      expect.objectContaining({
        id: "research:error",
        kind: "error",
        content: "Provider timeout",
      }),
    ]);
    expect(state.views.find((view) => view.view === "diagram")?.layouts).toEqual([
      expect.objectContaining({
        entityId: "research:error",
        order: 0,
      }),
    ]);
  });
});
