import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectMemoryPanel from "@/components/ProjectMemoryPanel";
import { createDefaultProjectDiagram, type Project } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}) {
  return {
    id: "project-memory-test",
    name: "Launchpad",
    description: "Workspace memory test",
    phase: "Discovery",
    updatedAt: "2025-01-10T00:00:00.000Z",
    notes: [],
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [],
    phases: [],
    research: null,
    diagram: createDefaultProjectDiagram(),
    ...overrides,
  } as Project;
}

describe("ProjectMemoryPanel", () => {
  it("renders helpful empty-state copy for all five memory buckets", () => {
    render(<ProjectMemoryPanel project={makeProject()} />);

    expect(screen.getByTestId("project-memory-panel")).toBeInTheDocument();
    expect(screen.getByText("What the workspace is carrying forward")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is workspace-level memory promoted from saved artifacts, so you can inspect what carries across runs instead of only what belongs to the active artifact.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No workspace memory has been promoted yet. Generate or refine artifacts like the validation scorecard and customer research memo, and reusable facts will appear here with their source references across future runs.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByTestId("memory-bucket-icp")).toBeInTheDocument();
    expect(screen.getByTestId("memory-bucket-constraints")).toBeInTheDocument();
    expect(screen.getByTestId("memory-bucket-hypotheses")).toBeInTheDocument();
    expect(screen.getByTestId("memory-bucket-experiments")).toBeInTheDocument();
    expect(screen.getByTestId("memory-bucket-validatedFindings")).toBeInTheDocument();
    expect(
      screen.getAllByText("Nothing saved here yet. This bucket fills when reusable workspace memory is promoted from artifact output."),
    ).toHaveLength(5);
    expect(screen.queryByRole("region", { name: "Advisor handoff prompts" })).not.toBeInTheDocument();
  });

  it("renders memory entries with confidence and revision-aware artifact provenance", () => {
    const project = makeProject({
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Demand evidence scorecard",
          updatedAt: "2025-01-10T00:00:00.000Z",
          status: "completed",
          currentRevision: {
            id: "artifact-validation-scorecard-revision-1",
            number: 1,
            createdAt: "2025-01-10T00:00:00.000Z",
            status: "completed",
          },
          revisionHistory: [
            {
              id: "artifact-validation-scorecard-revision-1",
              number: 1,
              createdAt: "2025-01-10T00:00:00.000Z",
              status: "completed",
              summary: "Signals are improving.",
              criteria: [],
            },
          ],
          summary: "Signals are improving.",
          criteria: [],
        },
        {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          title: "SMB operations memo",
          updatedAt: "2025-01-11T00:00:00.000Z",
          status: "completed",
          currentRevision: {
            id: "artifact-customer-research-memo-revision-2",
            number: 2,
            createdAt: "2025-01-11T00:00:00.000Z",
            status: "completed",
          },
          revisionHistory: [
            {
              id: "artifact-customer-research-memo-revision-1",
              number: 1,
              createdAt: "2025-01-10T00:00:00.000Z",
              status: "draft",
              research: null,
            },
            {
              id: "artifact-customer-research-memo-revision-2",
              number: 2,
              createdAt: "2025-01-11T00:00:00.000Z",
              status: "completed",
              research: null,
            },
          ],
          research: null,
        },
      ] as unknown as Project["artifacts"],
      projectMemory: {
        icp: [
          {
            id: "memory-icp",
            field: "icp",
            label: "Best-fit buyer",
            content: "Operations leads at 20-100 person service teams feel the pain weekly.",
            confidence: "supported",
            updatedAt: "2025-01-11T00:00:00.000Z",
            sources: [
              {
                artifactId: "artifact-customer-research-memo",
                artifactType: "customer-research-memo",
                revisionId: "artifact-customer-research-memo-revision-2",
                updatedAt: "2025-01-12T12:00:00.000Z",
              },
            ],
          },
        ],
        constraints: [
          {
            id: "memory-constraint",
            field: "constraints",
            label: "Security review",
            content: "Security review and procurement create a long sales cycle.",
            confidence: "tentative",
            updatedAt: "2025-01-11T00:00:00.000Z",
            sources: [
              {
                artifactId: "artifact-validation-scorecard",
                artifactType: "validation-scorecard",
                revisionId: "artifact-validation-scorecard-revision-1",
                updatedAt: "2025-01-10T12:00:00.000Z",
              },
            ],
          },
        ],
        hypotheses: [],
        experiments: [],
        validatedFindings: [
          {
            id: "memory-finding",
            field: "validatedFindings",
            label: "Validated signal",
            content: "Teams already pay for adjacent workflow automation tools.",
            confidence: "validated",
            updatedAt: "2025-01-12T00:00:00.000Z",
            sources: [
              {
                artifactId: "missing-artifact",
                artifactType: "validation-scorecard",
                revisionId: "missing-artifact-revision-1",
                updatedAt: "2025-01-12T12:00:00.000Z",
              },
            ],
          },
        ],
      },
    });

    render(<ProjectMemoryPanel project={project} />);

    const icpBucket = screen.getByTestId("memory-bucket-icp");
    expect(within(icpBucket).getByText("Best-fit buyer")).toBeInTheDocument();
    expect(
      within(icpBucket).getByText("Operations leads at 20-100 person service teams feel the pain weekly."),
    ).toBeInTheDocument();
    expect(within(icpBucket).getByText("supported")).toBeInTheDocument();
    expect(within(icpBucket).getByText("SMB operations memo")).toBeInTheDocument();
    expect(within(icpBucket).getByText("Customer research memo")).toBeInTheDocument();
    expect(within(icpBucket).getByText("Revision 2")).toBeInTheDocument();
    expect(within(icpBucket).getByText(/^Updated Jan \d{1,2}, 2025$/)).toBeInTheDocument();

    const constraintsBucket = screen.getByTestId("memory-bucket-constraints");
    expect(within(constraintsBucket).getByText("Security review")).toBeInTheDocument();
    expect(within(constraintsBucket).getByText("tentative")).toBeInTheDocument();
    expect(within(constraintsBucket).getByText("Demand evidence scorecard")).toBeInTheDocument();
    expect(within(constraintsBucket).getByText("Validation scorecard")).toBeInTheDocument();
    expect(within(constraintsBucket).getByText("Revision 1")).toBeInTheDocument();
    expect(within(constraintsBucket).getByText(/^Updated Jan \d{1,2}, 2025$/)).toBeInTheDocument();

    const findingsBucket = screen.getByTestId("memory-bucket-validatedFindings");
    expect(within(findingsBucket).getByText("Validated signal")).toBeInTheDocument();
    expect(within(findingsBucket).getByText("validated")).toBeInTheDocument();
    expect(within(findingsBucket).getAllByText("Validation scorecard").length).toBeGreaterThan(0);
    expect(within(findingsBucket).getByText("Revision 1")).toBeInTheDocument();
    expect(within(findingsBucket).getByText(/^Updated Jan \d{1,2}, 2025$/)).toBeInTheDocument();

    const handoffPanel = screen.getByRole("region", { name: "Advisor handoff prompts" });
    const promptsList = within(handoffPanel).getByRole("list");
    const prompts = within(promptsList).getAllByRole("listitem");
    expect(prompts).toHaveLength(3);
    expect(within(promptsList).getByText(/validated evidence from 1 finding/i)).toBeInTheDocument();
    expect(within(promptsList).getByText(/assumption from 0 hypotheses/i)).toBeInTheDocument();
    expect(within(promptsList).getByText(/next experiment from 0 experiments/i)).toBeInTheDocument();
  });
});
