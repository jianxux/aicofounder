import { describe, expect, it } from "vitest";
import * as types from "@/lib/types";

describe("lib/types guards", () => {
  const nonRecordValues: unknown[] = [null, undefined, 123, "hello"];

  const chatMessage: types.ChatMessage = {
    id: "message-1",
    sender: "user",
    content: "Hello",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  const stickyNote: types.StickyNoteData = {
    id: "note-1",
    title: "Idea",
    content: "Build the MVP",
    color: "yellow",
    x: 120,
    y: 240,
  };

  const sectionData: types.SectionData = {
    id: "section-1",
    title: "Research",
    color: "yellow",
    x: 100,
    y: 120,
    width: 320,
    height: 220,
  };

  const documentCard: types.DocumentCardData = {
    id: "doc-1",
    title: "My Document",
    content: "# Hello\n\nSome **bold** text",
    x: 100,
    y: 200,
  };

  const websiteBlock: types.WebsiteBlock = {
    id: "block-1",
    type: "hero",
    heading: "Build trust fast",
    body: "Explain what you do in one line.",
    buttonText: "Get started",
  };

  const websiteBuilder: types.WebsiteBuilderData = {
    id: "website-1",
    title: "Acme AI",
    blocks: [websiteBlock],
    x: 160,
    y: 280,
  };

  const phaseTask: types.PhaseTask = {
    id: "task-1",
    label: "Define scope",
    done: false,
  };

  const phase: types.Phase = {
    id: "phase-1",
    title: "Discovery",
    tasks: [phaseTask],
  };

  const diagramNode: types.DiagramNode = {
    id: "diagram-node-1",
    type: "topic",
    label: "Core idea",
    content: "Start here",
    x: 240,
    y: 120,
    source: {
      type: "canvas_item",
      itemKind: "note",
      itemId: stickyNote.id,
    },
    style: {
      color: "yellow",
      shape: "pill",
    },
    layout: {
      order: 0,
      collapsed: false,
    },
  };

  const diagramEdge: types.DiagramEdge = {
    id: "diagram-edge-1",
    from: diagramNode.id,
    to: "diagram-node-2",
    type: "parent_child",
    label: "expands to",
  };

  const projectDiagram: types.ProjectDiagram = {
    nodes: [
      diagramNode,
      {
        id: "diagram-node-2",
        type: "detail",
        label: "Customer pain",
        x: 420,
        y: 180,
        source: {
          type: "generated",
        },
        layout: {
          parentId: diagramNode.id,
          order: 1,
        },
      },
    ],
    edges: [diagramEdge],
    layout: {
      algorithm: "mind_map",
      direction: "radial",
      rootNodeId: diagramNode.id,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    drag: {
      snapToGrid: false,
      gridSize: 24,
      reparentOnDrop: true,
    },
  };

  const project: types.Project = {
    id: "project-1",
    name: "AI Cofounder",
    description: "Product planning workspace",
    phase: phase.id,
    updatedAt: "2025-01-01T00:00:00.000Z",
    notes: [stickyNote],
    sections: [sectionData],
    documents: [documentCard],
    messages: [chatMessage],
    phases: [phase],
    research: null,
    diagram: projectDiagram,
  };

  const researchReport: types.ProjectResearch = {
    status: "success",
    researchQuestion: "What are the key opportunities and risks?",
    sourceContext: "User asked for a market scan.",
    updatedAt: "2025-01-02T00:00:00.000Z",
    artifact: {
      status: "completed",
      generatedAt: "2025-01-02T00:00:00.000Z",
      metrics: {
        attemptedAngles: 3,
        completedSections: 1,
      },
      selectedSources: [
        {
          id: "citation-1",
          source: "Source",
          claim: "Claim",
          relevance: "high",
          url: "https://example.com",
        },
      ],
    },
    report: {
      sections: [
        {
          id: "section-1",
          title: "Market demand",
          angle: "Demand",
          findings: "Demand is growing.",
          citations: [
            {
              id: "citation-1",
              source: "Source",
              claim: "Claim",
              relevance: "high",
              url: "https://example.com",
            },
          ],
        },
      ],
      executiveSummary: "A concise summary.",
      researchQuestion: "What are the key opportunities and risks?",
      generatedAt: "2025-01-02T00:00:00.000Z",
    },
  };

  it("accepts a valid ChatMessage", () => {
    expect(types.isChatMessage(chatMessage)).toBe(true);
    expect(types.isSender(chatMessage.sender)).toBe(true);
  });

  it("accepts a valid StickyNoteData object", () => {
    expect(types.isStickyNoteData(stickyNote)).toBe(true);
    expect(types.isNoteColor(stickyNote.color)).toBe(true);
  });

  it("accepts a valid DocumentCardData object", () => {
    expect(types.isDocumentCardData(documentCard)).toBe(true);
  });

  it.each(["hero", "features", "cta", "text"] as const)(
    "accepts %s as a valid website block type",
    (type) => {
      expect(types.isWebsiteBlockType(type)).toBe(true);
    },
  );

  it.each(["", "Hero", "grid", null, undefined, 123, {}, []])(
    "rejects %o as an invalid website block type",
    (value) => {
      expect(types.isWebsiteBlockType(value)).toBe(false);
    },
  );

  it("accepts a valid WebsiteBlock", () => {
    expect(types.isWebsiteBlock(websiteBlock)).toBe(true);
  });

  it("accepts a WebsiteBlock without buttonText", () => {
    expect(types.isWebsiteBlock({ ...websiteBlock, buttonText: undefined })).toBe(true);
  });

  it("rejects WebsiteBlock with missing required fields", () => {
    expect(types.isWebsiteBlock({ type: "hero", heading: "Heading", body: "Body" })).toBe(false);
    expect(types.isWebsiteBlock({ id: "block-1", heading: "Heading", body: "Body" })).toBe(false);
    expect(types.isWebsiteBlock({ id: "block-1", type: "hero", body: "Body" })).toBe(false);
    expect(types.isWebsiteBlock({ id: "block-1", type: "hero", heading: "Heading" })).toBe(false);
  });

  it("rejects WebsiteBlock with wrong field types", () => {
    expect(types.isWebsiteBlock({ ...websiteBlock, id: 1 })).toBe(false);
    expect(types.isWebsiteBlock({ ...websiteBlock, type: "grid" })).toBe(false);
    expect(types.isWebsiteBlock({ ...websiteBlock, heading: 123 })).toBe(false);
    expect(types.isWebsiteBlock({ ...websiteBlock, body: false })).toBe(false);
    expect(types.isWebsiteBlock({ ...websiteBlock, buttonText: 123 })).toBe(false);
  });

  it("accepts a valid WebsiteBuilderData object", () => {
    expect(types.isWebsiteBuilderData(websiteBuilder)).toBe(true);
  });

  it("accepts WebsiteBuilderData with an empty blocks array", () => {
    expect(types.isWebsiteBuilderData({ ...websiteBuilder, blocks: [] })).toBe(true);
  });

  it("rejects WebsiteBuilderData with missing fields", () => {
    expect(types.isWebsiteBuilderData({ title: "Acme AI", blocks: [], x: 0, y: 0 })).toBe(false);
    expect(types.isWebsiteBuilderData({ id: "website-1", blocks: [], x: 0, y: 0 })).toBe(false);
    expect(types.isWebsiteBuilderData({ id: "website-1", title: "Acme AI", x: 0, y: 0 })).toBe(false);
    expect(types.isWebsiteBuilderData({ id: "website-1", title: "Acme AI", blocks: [] })).toBe(false);
  });

  it("rejects WebsiteBuilderData with an invalid blocks array", () => {
    expect(types.isWebsiteBuilderData({ ...websiteBuilder, blocks: null })).toBe(false);
    expect(types.isWebsiteBuilderData({ ...websiteBuilder, blocks: undefined })).toBe(false);
    expect(types.isWebsiteBuilderData({ ...websiteBuilder, blocks: "blocks" })).toBe(false);
    expect(types.isWebsiteBuilderData({ ...websiteBuilder, blocks: [{ id: "bad" }] })).toBe(false);
  });

  it.each(["yellow", "blue", "green", "pink", "purple"] as const)(
    "accepts %s as a valid note color",
    (color) => {
      expect(types.isNoteColor(color)).toBe(true);
      expect(types.isStickyNoteData({ ...stickyNote, color })).toBe(true);
    },
  );

  it("accepts a valid PhaseTask and Phase", () => {
    expect(types.isPhaseTask(phaseTask)).toBe(true);
    expect(types.isPhase(phase)).toBe(true);
  });

  it("accepts a valid Project with nested data", () => {
    expect(types.isProject(project)).toBe(true);
  });

  it("accepts a valid ProjectDiagram with linked and generated nodes", () => {
    expect(types.isDiagramLinkedCanvasItemKind("note")).toBe(true);
    expect(types.isDiagramNode(diagramNode)).toBe(true);
    expect(types.isDiagramEdge(diagramEdge)).toBe(true);
    expect(types.isDiagramLayoutMetadata(projectDiagram.layout)).toBe(true);
    expect(types.isDiagramDragMetadata(projectDiagram.drag)).toBe(true);
    expect(types.isProjectDiagram(projectDiagram)).toBe(true);
  });

  it("accepts a valid ProjectResearch payload", () => {
    expect(types.isProjectResearch(researchReport)).toBe(true);
    expect(types.isProject({ ...project, research: researchReport })).toBe(true);
  });

  it("accepts the supported project artifact types and rejects unknown ones", () => {
    expect(types.isProjectArtifactType("validation-scorecard")).toBe(true);
    expect(types.isProjectArtifactType("customer-research-memo")).toBe(true);
    expect(types.isProjectArtifactType("research-report")).toBe(false);
  });

  it("accepts valid project artifacts and rejects unknown artifact types", () => {
    const validationArtifact: types.ValidationScorecardArtifact = {
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
      title: "Validation scorecard",
      updatedAt: "2025-01-03T00:00:00.000Z",
      criteria: [{ id: "criterion-1", label: "Urgency", score: 4 }],
    };
    const researchArtifact: types.CustomerResearchMemoArtifact = {
      id: "artifact-customer-research-memo",
      type: "customer-research-memo",
      title: "Customer research memo",
      updatedAt: "2025-01-03T00:00:00.000Z",
      research: researchReport,
    };

    expect(types.isValidationScorecardArtifact(validationArtifact)).toBe(true);
    expect(types.isCustomerResearchMemoArtifact(researchArtifact)).toBe(true);
    expect(types.isProjectArtifact(validationArtifact)).toBe(true);
    expect(types.isProjectArtifact(researchArtifact)).toBe(true);
    expect(
      types.isProjectArtifact({
        id: "artifact-unknown",
        type: "unknown-artifact",
        title: "Unknown",
        updatedAt: "2025-01-03T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("accepts a legacy ProjectResearch payload with only a report", () => {
    const { artifact, ...legacyResearch } = researchReport;

    expect(types.isProjectResearch(legacyResearch)).toBe(true);
  });

  it("accepts a partial persisted research artifact", () => {
    expect(
      types.isProjectResearchArtifact({
        status: "partial",
        generatedAt: "2025-01-02T00:00:00.000Z",
        metrics: { attemptedAngles: 2 },
      }),
    ).toBe(true);
  });

  it("accepts a detailed persisted research artifact payload", () => {
    expect(
      types.isProjectResearchArtifact({
        status: "completed",
        generatedAt: "2025-01-02T00:00:00.000Z",
        plan: {
          projectName: "AI Cofounder",
          projectDescription: "Product planning workspace",
          researchQuestion: "What are the key opportunities and risks?",
          budget: {
            maxAngles: 3,
            maxSections: 3,
            maxCitationsPerSection: 2,
          },
          steps: [
            {
              id: "step-1",
              title: "Demand scan",
              angle: "Demand",
              query: "AI workspace founder demand",
              rationale: "Check market pull.",
            },
          ],
        },
        report: researchReport.report,
        selectedSources: researchReport.artifact?.selectedSources,
        rejectedSources: [{ reason: "budget", source: "Skipped source", citationId: "citation-2" }],
        sourceInventory: {
          selected: [
            {
              id: "source-1",
              title: "Source",
              canonicalId: "source-1",
              sourceType: "report",
              status: "selected",
              citationIds: ["citation-1"],
              sectionIds: ["section-1"],
              claimCount: 1,
            },
          ],
          rejected: [
            {
              id: "source-2",
              title: "Skipped",
              canonicalId: "source-2",
              sourceType: "news",
              status: "rejected",
              citationIds: [],
              sectionIds: [],
              claimCount: 0,
              rejectionReason: "budget",
            },
          ],
        },
        metrics: {
          attemptedAngles: 3,
          completedSections: 1,
          selectedSources: 1,
          rejectedSources: 1,
        },
        failures: [{ stage: "gather", code: "provider-error", message: "Timeout" }],
      }),
    ).toBe(true);
  });

  it("rejects invalid validation patterns", () => {
    expect(types.isChatMessage({ ...chatMessage, sender: "system" })).toBe(false);
    expect(types.isStickyNoteData({ ...stickyNote, x: "120" })).toBe(false);
    expect(types.isDocumentCardData({ ...documentCard, y: "200" })).toBe(false);
    expect(types.isPhaseTask({ ...phaseTask, done: "no" })).toBe(false);
    expect(types.isPhase({ ...phase, tasks: [{ ...phaseTask, done: "no" }] })).toBe(false);
    expect(types.isProject({ ...project, notes: [{ ...stickyNote, color: "blue" }] })).toBe(true);
    expect(types.isProjectResearch({ ...researchReport, status: "loading" })).toBe(false);
    expect(types.isProjectResearch({ ...researchReport, report: { ...researchReport.report, sections: [{}] } })).toBe(
      false,
    );
    expect(types.isProjectResearchArtifact({ status: "completed", metrics: { attemptedAngles: "3" } })).toBe(false);
    expect(types.isProjectResearchArtifact({ plan: { steps: [{ id: 1 }] } })).toBe(false);
    expect(types.isProjectResearch(null)).toBe(false);
    expect(types.isValidationScorecardCriterion(null)).toBe(false);
    expect(types.isValidationScorecardCriterion({ id: "criterion-1", label: "Urgency", score: "4" })).toBe(false);
    expect(types.isCustomerResearchMemoArtifact({ id: "memo-1", type: "customer-research-memo", title: "Memo", updatedAt: "2025-01-03T00:00:00.000Z", research: {} })).toBe(false);
    expect(types.isDiagramNode({ ...diagramNode, source: { type: "canvas_item", itemKind: "sticky", itemId: "1" } })).toBe(
      false,
    );
    expect(types.isDiagramEdge({ ...diagramEdge, type: "invalid" })).toBe(false);
    expect(types.isProjectDiagram({ ...projectDiagram, drag: { snapToGrid: true, gridSize: "24" } })).toBe(false);
  });

  it.each(["amber", "", null, undefined, 123, {}, []])(
    "rejects %o as an invalid note color",
    (value) => {
      expect(types.isNoteColor(value)).toBe(false);
    },
  );

  it("rejects non-record values in every object type guard", () => {
    nonRecordValues.forEach((value) => {
      expect(types.isChatMessage(value)).toBe(false);
      expect(types.isStickyNoteData(value)).toBe(false);
      expect(types.isDocumentCardData(value)).toBe(false);
      expect(types.isWebsiteBlock(value)).toBe(false);
      expect(types.isWebsiteBuilderData(value)).toBe(false);
      expect(types.isPhaseTask(value)).toBe(false);
      expect(types.isPhase(value)).toBe(false);
      expect(types.isProject(value)).toBe(false);
      expect(types.isSectionData(value)).toBe(false);
      expect(types.isProjectResearchArtifact(value)).toBe(false);
      expect(types.isProjectResearch(value)).toBe(false);
      expect(types.isValidationScorecardCriterion(value)).toBe(false);
      expect(types.isValidationScorecardArtifact(value)).toBe(false);
      expect(types.isCustomerResearchMemoArtifact(value)).toBe(false);
    });
  });

  it("rejects empty objects in each object type guard", () => {
    expect(types.isChatMessage({})).toBe(false);
    expect(types.isStickyNoteData({})).toBe(false);
    expect(types.isDocumentCardData({})).toBe(false);
    expect(types.isWebsiteBlock({})).toBe(false);
    expect(types.isWebsiteBuilderData({})).toBe(false);
    expect(types.isPhaseTask({})).toBe(false);
    expect(types.isPhase({})).toBe(false);
    expect(types.isProject({})).toBe(false);
    expect(types.isSectionData({})).toBe(false);
  });

  it("rejects Phase when tasks is not an array", () => {
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: null })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: undefined })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: 123 })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: "tasks" })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: {} })).toBe(false);
  });

  it("rejects Project when notes, documents, messages, or phases are not arrays", () => {
    expect(types.isProject({ ...project, notes: null })).toBe(false);
    expect(types.isProject({ ...project, notes: undefined })).toBe(false);
    expect(types.isProject({ ...project, notes: 123 })).toBe(false);
    expect(types.isProject({ ...project, notes: "notes" })).toBe(false);
    expect(types.isProject({ ...project, notes: {} })).toBe(false);

    expect(types.isProject({ ...project, documents: null })).toBe(false);
    expect(types.isProject({ ...project, documents: undefined })).toBe(false);
    expect(types.isProject({ ...project, documents: 123 })).toBe(false);
    expect(types.isProject({ ...project, documents: "documents" })).toBe(false);
    expect(types.isProject({ ...project, documents: {} })).toBe(false);

    expect(types.isProject({ ...project, messages: null })).toBe(false);
    expect(types.isProject({ ...project, messages: undefined })).toBe(false);
    expect(types.isProject({ ...project, messages: 123 })).toBe(false);
    expect(types.isProject({ ...project, messages: "messages" })).toBe(false);
    expect(types.isProject({ ...project, messages: {} })).toBe(false);

    expect(types.isProject({ ...project, phases: null })).toBe(false);
    expect(types.isProject({ ...project, phases: undefined })).toBe(false);
    expect(types.isProject({ ...project, phases: 123 })).toBe(false);
    expect(types.isProject({ ...project, phases: "phases" })).toBe(false);
    expect(types.isProject({ ...project, phases: {} })).toBe(false);
  });

  it("accepts Project with empty notes, documents, messages, and phases arrays", () => {
    expect(
      types.isProject({
        ...project,
        notes: [],
        sections: [],
        documents: [],
        messages: [],
        phases: [],
      }),
    ).toBe(true);
  });

  // Section-specific tests
  it("accepts a valid SectionData", () => {
    expect(types.isSectionData(sectionData)).toBe(true);
  });

  it("rejects SectionData with missing width/height", () => {
    expect(types.isSectionData({ id: "s1", title: "T", color: "yellow", x: 0, y: 0 })).toBe(false);
  });

  it("rejects SectionData with invalid color", () => {
    expect(types.isSectionData({ ...sectionData, color: "orange" })).toBe(false);
  });

  it("accepts Project with undefined sections (backward compat)", () => {
    const { sections, ...legacyProject } = project;
    expect(types.isProject(legacyProject)).toBe(true);
  });

  it("accepts Project with undefined diagram (backward compat)", () => {
    const { diagram, ...legacyProject } = project;
    expect(types.isProject(legacyProject)).toBe(true);
  });

  it("rejects Project with invalid sections array", () => {
    expect(types.isProject({ ...project, sections: [{ id: "bad" }] })).toBe(false);
  });

  it("rejects Project with an invalid diagram", () => {
    expect(types.isProject({ ...project, diagram: { nodes: [], edges: [] } })).toBe(false);
  });

  it("normalizes missing optional project fields to safe defaults", () => {
    const { sections, websiteBuilders, research, diagram, ...legacyProject } = project;
    const normalized = types.normalizeProject(legacyProject);

    expect(normalized.sections).toEqual([]);
    expect(normalized.websiteBuilders).toEqual([]);
    expect(normalized.research).toBeNull();
    expect(normalized.artifacts?.map((artifact) => artifact.type)).toEqual([
      "validation-scorecard",
      "customer-research-memo",
    ]);
    expect(normalized.activeArtifactId).toBe("artifact-validation-scorecard");
    expect(normalized.diagram).toEqual(types.createDefaultProjectDiagram());
  });

  it("normalizes artifacts from research and resolves the active artifact safely", () => {
    const normalized = types.normalizeProject({
      ...project,
      research: researchReport,
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Validation scorecard",
          updatedAt: "2025-01-03T00:00:00.000Z",
          criteria: [],
        },
        {
          id: "artifact-unknown",
          type: "unknown-artifact",
          title: "Unknown artifact",
          updatedAt: "2025-01-03T00:00:00.000Z",
        } as unknown as types.ProjectArtifact,
      ],
      activeArtifactId: "missing-artifact",
    });

    expect(normalized.artifacts).toHaveLength(2);
    expect(types.getProjectArtifactByType(normalized, "customer-research-memo")).toMatchObject({
      type: "customer-research-memo",
      research: researchReport,
    });
    expect(types.getActiveProjectArtifact(normalized)).toMatchObject({
      id: "artifact-customer-research-memo",
      type: "customer-research-memo",
    });
  });

  it("preserves a valid active artifact selection and keeps hydrated memo research when project research is missing", () => {
    const normalized = types.normalizeProject({
      ...project,
      research: null,
      artifacts: [
        {
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          title: "Custom scorecard",
          updatedAt: "2025-01-04T00:00:00.000Z",
          summary: "Score what matters first.",
          criteria: [{ id: "criterion-1", label: "Pain intensity", score: 5, notes: "High urgency." }],
        },
        {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          title: "Custom memo",
          updatedAt: "2025-01-05T00:00:00.000Z",
          research: researchReport,
        },
      ],
      activeArtifactId: "artifact-validation-scorecard",
    });

    expect(types.getProjectArtifactByType(normalized, "validation-scorecard")).toMatchObject({
      title: "Custom scorecard",
      summary: "Score what matters first.",
    });
    expect(types.getProjectArtifactByType(normalized, "customer-research-memo")).toMatchObject({
      title: "Custom memo",
      research: researchReport,
    });
    expect(types.getActiveProjectArtifact(normalized)).toMatchObject({
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
    });
  });

  it("returns the first normalized artifact when no active artifact id is available and null when there are no artifacts", () => {
    const normalized = types.normalizeProject({
      ...project,
      activeArtifactId: undefined,
    });

    expect(types.getActiveProjectArtifact(normalized)).toMatchObject({
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
    });
    expect(types.getActiveProjectArtifact({ artifacts: [], activeArtifactId: "missing" })).toBeNull();
  });
});
