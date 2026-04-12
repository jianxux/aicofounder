import { describe, expect, it } from "vitest";
import { deriveProjectMemoryFromArtifacts } from "@/lib/project-memory";
import { normalizeProject, type Project, type ProjectMemory } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}) {
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

describe("project-memory", () => {
  it("extracts reusable memory from validation and research artifacts while keeping validated findings conservative", () => {
    const project = makeProject({
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Validation scorecard",
          updatedAt: "2025-01-14T00:00:00.000Z",
          summary:
            "ICP is still unclear for mid-market RevOps teams. Budget constraints slow procurement. Run five ICP interviews next week.",
          criteria: [
            {
              id: "criterion-1",
              label: "Problem urgency",
              score: 5,
              notes: "Operators escalate churn every week.",
            },
            {
              id: "criterion-2",
              label: "ICP clarity",
              score: 2,
              notes: "ICP may be RevOps leaders at 50-200 seat SaaS teams.",
            },
          ],
        },
        {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          title: "Customer research memo",
          updatedAt: "2025-01-15T00:00:00.000Z",
          research: {
            status: "success",
            researchQuestion: "Who should buy first?",
            sourceContext: "Saved workspace evidence",
            updatedAt: "2025-01-15T00:00:00.000Z",
            artifact: {
              status: "completed",
            },
            report: {
              sections: [
                {
                  id: "section-1",
                  title: "Interviews",
                  angle: "Demand",
                  findings: "The best-fit customer is RevOps teams with weekly renewal risk. Run a concierge pilot with three accounts.",
                  citations: [
                    {
                      id: "citation-1",
                      source: "Interview set",
                      claim: "RevOps teams feel weekly renewal pain.",
                      relevance: "high",
                    },
                  ],
                },
              ],
              executiveSummary:
                "The best-fit customer is RevOps teams with weekly renewal risk. Security review is a buying constraint.",
              researchQuestion: "Who should buy first?",
              generatedAt: "2025-01-15T00:00:00.000Z",
              keyFindings: [
                {
                  id: "finding-1",
                  statement: "The best-fit customer is RevOps teams with weekly renewal risk.",
                  citationIds: ["citation-1"],
                  strength: "strong",
                },
                {
                  id: "finding-2",
                  statement: "A broader operations persona may also buy later.",
                  citationIds: ["citation-1"],
                  strength: "weak",
                },
              ],
              caveats: [
                {
                  id: "caveat-1",
                  statement: "Security review adds 4-6 weeks to sales cycles.",
                },
              ],
              contradictions: [
                {
                  id: "contradiction-1",
                  statement: "Some smaller teams report the problem is monthly, not weekly.",
                  citationIds: ["citation-1"],
                },
              ],
              unansweredQuestions: [
                {
                  id: "question-1",
                  question: "Who signs off on renewal workflow tooling?",
                },
              ],
            },
          },
        },
      ],
    });

    const memory = project.projectMemory!;

    expect(memory.icp.map((entry) => entry.content)).toEqual([
      "ICP clarity: ICP may be RevOps leaders at 50-200 seat SaaS teams.",
      "ICP is still unclear for mid-market RevOps teams.",
      "The best-fit customer is RevOps teams with weekly renewal risk.",
    ]);
    expect(memory.constraints.map((entry) => entry.content)).toEqual([
      "Budget constraints slow procurement.",
      "Security review adds 4-6 weeks to sales cycles.",
      "Security review is a buying constraint.",
    ]);
    expect(memory.experiments.map((entry) => entry.content)).toEqual([
      "Run a concierge pilot with three accounts.",
      "Run five ICP interviews next week.",
    ]);
    expect(memory.hypotheses.map((entry) => entry.content)).toEqual([
      "ICP clarity: ICP may be RevOps leaders at 50-200 seat SaaS teams.",
      "ICP is still unclear for mid-market RevOps teams.",
      "Some smaller teams report the problem is monthly, not weekly.",
      "Who signs off on renewal workflow tooling?",
    ]);
    expect(memory.validatedFindings.map((entry) => entry.content)).toEqual([
      "Problem urgency: Operators escalate churn every week.",
      "The best-fit customer is RevOps teams with weekly renewal risk.",
    ]);
    expect(memory.validatedFindings.map((entry) => entry.content)).not.toContain(
      "A broader operations persona may also buy later.",
    );
    expect(memory.validatedFindings.map((entry) => entry.content)).not.toContain(
      "Who signs off on renewal workflow tooling?",
    );
  });

  it("dedupes repeated facts, updates only the changed artifact source, and preserves unrelated memory", () => {
    const existingMemory: ProjectMemory = {
      icp: [
        {
          id: "memory:icp:legacy",
          field: "icp",
          label: "Ideal customer profile",
          content: "The best-fit customer is RevOps teams with weekly renewal risk.",
          confidence: "supported",
          updatedAt: "2025-01-10T00:00:00.000Z",
          sources: [
            {
              artifactId: "artifact-customer-research-memo",
              artifactType: "customer-research-memo",
              revisionId: "artifact-customer-research-memo-revision-1",
              updatedAt: "2025-01-10T00:00:00.000Z",
            },
          ],
        },
      ],
      constraints: [
        {
          id: "memory:constraints:legacy",
          field: "constraints",
          label: "Constraint",
          content: "Security review adds 4-6 weeks to sales cycles.",
          confidence: "supported",
          updatedAt: "2025-01-10T00:00:00.000Z",
          sources: [
            {
              artifactId: "artifact-customer-research-memo",
              artifactType: "customer-research-memo",
              revisionId: "artifact-customer-research-memo-revision-1",
              updatedAt: "2025-01-10T00:00:00.000Z",
            },
          ],
        },
      ],
      hypotheses: [],
      experiments: [],
      validatedFindings: [
        {
          id: "memory:validated:legacy",
          field: "validatedFindings",
          label: "Validated finding",
          content: "Operators escalate churn every week.",
          confidence: "validated",
          updatedAt: "2025-01-10T00:00:00.000Z",
          sources: [
            {
              artifactId: "artifact-validation-scorecard",
              artifactType: "validation-scorecard",
              revisionId: "artifact-validation-scorecard-revision-1",
              updatedAt: "2025-01-10T00:00:00.000Z",
            },
          ],
        },
      ],
    };

    const project = makeProject({
      projectMemory: existingMemory,
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Validation scorecard",
          updatedAt: "2025-01-20T00:00:00.000Z",
          summary: "Run five ICP interviews next week.",
          criteria: [
            {
              id: "criterion-1",
              label: "Problem urgency",
              score: 5,
              notes: "Operators escalate churn every week.",
            },
          ],
        },
      ],
    });

    const derived = deriveProjectMemoryFromArtifacts({
      artifacts: project.artifacts?.filter((artifact) => artifact.type === "validation-scorecard"),
      existingMemory,
    });

    expect(derived.constraints.map((entry) => entry.content)).toEqual(["Security review adds 4-6 weeks to sales cycles."]);
    expect(derived.experiments.map((entry) => entry.content)).toEqual(["Run five ICP interviews next week."]);
    expect(derived.validatedFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Problem urgency: Operators escalate churn every week.",
          sources: [
            expect.objectContaining({
              artifactId: "artifact-validation-scorecard",
              artifactType: "validation-scorecard",
              updatedAt: "2025-01-20T00:00:00.000Z",
            }),
          ],
        }),
      ]),
    );
    expect(derived.icp.map((entry) => entry.content)).toEqual([
      "The best-fit customer is RevOps teams with weekly renewal risk.",
    ]);
  });

  it("normalizes persisted memory fields deterministically when loading a project", () => {
    const project = makeProject({
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
              label: "ICP clarity",
              score: 2,
              notes: "RevOps leaders at 50-200 seat SaaS teams.",
            },
          ],
        },
        {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          title: "Customer research memo",
          updatedAt: "2025-01-11T00:00:00.000Z",
          research: {
            status: "success",
            researchQuestion: "Who should buy first?",
            sourceContext: "Saved workspace evidence",
            updatedAt: "2025-01-11T00:00:00.000Z",
            artifact: {
              status: "completed",
            },
            report: {
              sections: [],
              executiveSummary: "The best-fit customer is RevOps leaders at 50-200 seat SaaS teams.",
              researchQuestion: "Who should buy first?",
              generatedAt: "2025-01-11T00:00:00.000Z",
              keyFindings: [
                {
                  id: "finding-1",
                  statement: "The best-fit customer is RevOps leaders at 50-200 seat SaaS teams.",
                  citationIds: ["citation-1"],
                  strength: "strong",
                },
              ],
            },
          },
        },
      ],
      projectMemory: {
        icp: [
          {
            id: "",
            field: "icp",
            label: " ICP ",
            content: "  RevOps leaders at 50-200 seat SaaS teams. ",
            confidence: "supported",
            updatedAt: "2025-01-10T00:00:00.000Z",
            sources: [
              {
                artifactId: "artifact-validation-scorecard",
                artifactType: "validation-scorecard",
                revisionId: "artifact-validation-scorecard-revision-1",
                updatedAt: "2025-01-10T00:00:00.000Z",
              },
            ],
          },
          {
            id: "duplicate",
            field: "icp",
            label: "Ideal customer profile",
            content: "RevOps leaders at 50-200 seat SaaS teams.",
            confidence: "supported",
            updatedAt: "2025-01-11T00:00:00.000Z",
            sources: [
              {
                artifactId: "artifact-customer-research-memo",
                artifactType: "customer-research-memo",
                revisionId: "artifact-customer-research-memo-revision-2",
                updatedAt: "2025-01-11T00:00:00.000Z",
              },
            ],
          },
        ],
        constraints: [],
        hypotheses: [],
        experiments: [],
        validatedFindings: [],
      },
    });

    expect(project.projectMemory?.icp).toEqual([
      expect.objectContaining({
        content: "ICP clarity: RevOps leaders at 50-200 seat SaaS teams.",
        sources: [expect.objectContaining({ artifactType: "validation-scorecard" })],
      }),
      expect.objectContaining({
        content: "The best-fit customer is RevOps leaders at 50-200 seat SaaS teams.",
        sources: [expect.objectContaining({ artifactType: "customer-research-memo" })],
      }),
    ]);
  });

  it("merges repeated promoted facts with persisted memory and drops invalid persisted entries", () => {
    const artifactProject = makeProject({
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Validation scorecard",
          updatedAt: "2025-01-20T00:00:00.000Z",
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
      ],
    });

    const derived = deriveProjectMemoryFromArtifacts({
      artifacts: artifactProject.artifacts?.filter((artifact) => artifact.type === "validation-scorecard"),
      existingMemory: {
        icp: [
          {
            id: "",
            field: "icp",
            label: "  ",
            content: "  ",
            confidence: "supported",
            updatedAt: "",
            sources: [],
          },
        ],
        constraints: [],
        hypotheses: [],
        experiments: [],
        validatedFindings: [
          {
            id: "legacy-finding",
            field: "validatedFindings",
            label: "Finding",
            content: "Problem urgency: Operators escalate churn every week.",
            confidence: "tentative",
            updatedAt: "2025-01-10T00:00:00.000Z",
            sources: [
              {
                artifactId: "artifact-customer-research-memo",
                artifactType: "customer-research-memo",
                revisionId: "artifact-customer-research-memo-revision-1",
                updatedAt: "2025-01-10T00:00:00.000Z",
              },
              {
                artifactId: "",
                artifactType: "customer-research-memo",
                revisionId: "",
                updatedAt: "",
              },
            ],
          },
        ],
      },
    });

    expect(derived.icp).toEqual([]);
    expect(derived.validatedFindings).toEqual([
      expect.objectContaining({
        id: "legacy-finding",
        confidence: "validated",
        sources: [
          expect.objectContaining({ artifactType: "customer-research-memo" }),
          expect.objectContaining({ artifactType: "validation-scorecard" }),
        ],
      }),
    ]);
  });
});
