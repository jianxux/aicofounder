import { describe, expect, it } from "vitest";
import type { BrainstormResult } from "@/lib/brainstorm";
import { generateProjectDiagram } from "@/lib/diagram-generation";
import type { Project } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Founder Graph",
    description: "Organize startup research, planning, and execution context in one place.",
    phase: "Discovery",
    updatedAt: "2025-01-10T00:00:00.000Z",
    notes: [
      {
        id: "note-1",
        title: "ICP",
        content: "Solo founders need a tighter loop between research and execution.",
        color: "yellow",
        x: 120,
        y: 120,
      },
    ],
    sections: [
      {
        id: "section-1",
        title: "Validation",
        color: "blue",
        x: 80,
        y: 80,
        width: 400,
        height: 280,
      },
    ],
    documents: [
      {
        id: "doc-1",
        title: "Strategy memo",
        content: "# Positioning\n\nDifferentiate on decision speed.",
        x: 240,
        y: 200,
      },
    ],
    websiteBuilders: [
      {
        id: "website-1",
        title: "Launch page",
        blocks: [
          {
            id: "block-1",
            type: "hero",
            heading: "Sharper startup decisions",
            body: "Research, brainstorm, and plan in one workspace.",
            buttonText: "Join",
          },
        ],
        x: 360,
        y: 260,
      },
    ],
    messages: [
      {
        id: "assistant-1",
        sender: "assistant",
        content: "What do you want to validate first?",
        createdAt: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "user-1",
        sender: "user",
        content: "Find evidence that founders struggle to connect research to concrete next steps.",
        createdAt: "2025-01-10T00:01:00.000Z",
      },
    ],
    phases: [
      {
        id: "discovery",
        title: "Discovery",
        tasks: [
          { id: "task-1", label: "Interview founders", done: false },
          { id: "task-2", label: "Review competitors", done: true },
        ],
      },
    ],
    research: {
      status: "success",
      updatedAt: "2025-01-12T00:00:00.000Z",
      researchQuestion: "What are the strongest demand signals?",
      sourceContext: "Discovery phase",
      report: {
        executiveSummary: "The strongest signal is repeated frustration with fragmented workflows.",
        researchQuestion: "What are the strongest demand signals?",
        generatedAt: "2025-01-12T00:00:00.000Z",
        sections: [
          {
            id: "section-demand",
            title: "Demand",
            angle: "Market demand",
            findings: "Founders repeatedly mention scattered notes and decisions.",
            citations: [],
          },
        ],
        keyFindings: [
          {
            id: "finding-1",
            statement: "Founders want one place to turn loose research into decisions.",
            citationIds: [],
            strength: "moderate",
          },
        ],
        sources: [
          {
            id: "source-1",
            title: "Indie Hackers thread",
            canonicalId: "indie-hackers-thread",
            sourceType: "community",
            status: "selected",
            citationIds: [],
            sectionIds: [],
            domain: "indiehackers.com",
            claimCount: 1,
          },
        ],
      },
    },
    diagram: undefined,
    ...overrides,
  };
}

const brainstormResult: BrainstormResult = {
  summary: "Pain clusters center on messy context switching and weak prioritization.",
  searchContext: "Founders discussing research and planning workflows in startup communities.",
  painPoints: [
    {
      id: "pain-1",
      title: "Scattered decisions",
      description: "Research gets captured, but decisions never become a clear roadmap.",
      source: "Indie Hackers",
      severity: 4,
      frequency: "weekly",
      quotes: ["I have the notes, but not the plan."],
    },
  ],
};

describe("generateProjectDiagram", () => {
  it("creates a non-empty mind map from realistic project context", () => {
    const diagram = generateProjectDiagram(makeProject(), { brainstormResult });

    expect(diagram.nodes.length).toBeGreaterThan(10);
    expect(diagram.edges.length).toBeGreaterThan(6);
    expect(diagram.layout.algorithm).toBe("mind_map");
    expect(diagram.layout.rootNodeId).toBe("diagram-root");
    expect(diagram.nodes.some((node) => node.label === "Founder Graph")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Phase & tasks")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Notes")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Documents")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Website builders")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Research")).toBe(true);
    expect(diagram.nodes.some((node) => node.label === "Brainstorm")).toBe(true);
  });

  it("keeps minimal projects usable with a root, branches, and normalized metadata", () => {
    const diagram = generateProjectDiagram(
      makeProject({
        name: "",
        description: "",
        notes: [],
        sections: [],
        documents: [],
        websiteBuilders: [],
        messages: [],
        phases: [],
        research: null,
      }),
    );

    expect(diagram.nodes[0]?.label).toBe("Untitled project");
    expect(diagram.nodes.filter((node) => node.type === "branch")).toHaveLength(6);
    expect(diagram.layout).toEqual({
      algorithm: "mind_map",
      direction: "horizontal",
      rootNodeId: "diagram-root",
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    expect(diagram.drag).toEqual({
      snapToGrid: false,
      gridSize: 24,
      reparentOnDrop: true,
    });
  });

  it("assigns parent-child relationships for root, branch, and detail nodes", () => {
    const diagram = generateProjectDiagram(makeProject(), { brainstormResult });
    const notesBranch = diagram.nodes.find((node) => node.id === "branch:notes");
    const noteNode = diagram.nodes.find((node) => node.id === "branch:notes:note:note-1");

    expect(notesBranch?.layout?.parentId).toBe("diagram-root");
    expect(noteNode?.layout?.parentId).toBe("branch:notes");
    expect(diagram.edges).toContainEqual({
      id: "edge:diagram-root->branch:notes",
      from: "diagram-root",
      to: "branch:notes",
      type: "parent_child",
    });
    expect(diagram.edges).toContainEqual({
      id: "edge:branch:notes->branch:notes:note:note-1",
      from: "branch:notes",
      to: "branch:notes:note:note-1",
      type: "parent_child",
    });
  });
});
