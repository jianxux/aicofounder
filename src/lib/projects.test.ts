import { createDefaultProjectDiagram, isProject, normalizeProject, type Project } from "@/lib/types";
import {
  applyOnboardingStarterContent,
  createAndStoreProject,
  createProjectRecord,
  getProjectById,
  getStoredProjects,
  saveStoredProjects,
  upsertProject,
} from "@/lib/projects";

const STORAGE_KEY = "aicofounder.projects";

function makeProject(overrides: Partial<Project> & { artifacts?: unknown } = {}): Project {
  return normalizeProject({
    id: "project-1",
    name: "Project",
    description: "Description",
    phase: "Getting started",
    updatedAt: "2025-01-01T00:00:00.000Z",
    notes: [
      {
        id: "note-1",
        title: "Idea",
        content: "Build something useful.",
        color: "yellow",
        x: 72,
        y: 72,
      },
    ],
    sections: [],
    websiteBuilders: [],
    documents: [
      {
        id: "doc-1",
        title: "Document",
        content: "# Notes",
        x: 120,
        y: 140,
      },
    ],
    messages: [
      {
        id: "message-1",
        sender: "assistant",
        content: "Hello",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    phases: [
      {
        id: "getting-started",
        title: "Getting started",
        tasks: [{ id: "task-1", label: "Write down the idea", done: false }],
      },
    ],
    research: null,
    diagram: createDefaultProjectDiagram(),
    ...overrides,
  } as Project);
}

describe("lib/projects", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("createProjectRecord", () => {
    it("returns a valid starter project with the expected defaults", () => {
      const project = createProjectRecord();

      expect(isProject(project)).toBe(true);
      expect(project.name).toBe("Untitled Project");
      expect(project.description).toBe("A new concept taking shape with your AI cofounder.");
      expect(project.phase).toBe("Getting started");
      expect(Number.isNaN(Date.parse(project.updatedAt))).toBe(false);

      expect(project.notes).toHaveLength(2);
      expect(project.notes.map((note) => note.title)).toEqual(["Idea", "Problem statement"]);
      expect(project.documents).toEqual([]);
      expect(project.research).toBeNull();
      expect(project.artifacts?.map((artifact) => artifact.type)).toEqual([
        "validation-scorecard",
        "customer-research-memo",
      ]);
      expect(project.activeArtifactId).toBe("artifact-validation-scorecard");
      expect(project.diagram).toEqual({
        nodes: [],
        edges: [],
        layout: {
          algorithm: "manual",
          direction: "radial",
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        drag: {
          snapToGrid: false,
          gridSize: 24,
          reparentOnDrop: true,
        },
      });

      expect(project.messages).toHaveLength(1);
      expect(project.messages[0]).toMatchObject({
        sender: "assistant",
        content: "I’m analyzing your idea. Let me research this and turn it into a sharper plan.",
      });

      expect(project.phases).toHaveLength(5);
      expect(project.phases.map((phase) => phase.id)).toEqual([
        "getting-started",
        "understand-project",
        "plan",
        "build",
        "launch",
      ]);
    });

    it("creates unique project ids across calls", () => {
      const first = createProjectRecord();
      const second = createProjectRecord();

      expect(first.id).not.toBe(second.id);
    });

    it("uses crypto.randomUUID when available", () => {
      const randomUUID = vi.fn(() => "uuid-from-crypto");
      vi.stubGlobal("crypto", { randomUUID });

      const project = createProjectRecord();

      expect(randomUUID).toHaveBeenCalled();
      expect(project.id).toBe("uuid-from-crypto");
    });

    it("falls back to Date.now and Math.random when crypto.randomUUID is unavailable", () => {
      vi.stubGlobal("crypto", {});
      vi.spyOn(Date, "now").mockReturnValue(123456789);
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const project = createProjectRecord();

      expect(project.id).toBe("123456789-8");
    });

    it("tailors starter content when onboarding intake is provided", () => {
      const project = createProjectRecord({
        primaryIdea: "An AI copilot for founder research that turns scattered notes into a concrete validation plan.",
        targetUser: "Seed-stage founders",
        mainUncertainty: "Whether they want one workspace.",
        url: "https://example.com",
      });

      expect(project.notes).toMatchObject([
        {
          title: "Idea brief",
          content: "An AI copilot for founder research that turns scattered notes into a concrete validation plan.",
        },
        {
          title: "First validation focus",
          content:
            "Target user: Seed-stage founders\nMain uncertainty: Whether they want one workspace.\nReference URL: https://example.com",
        },
      ]);
      expect(project.messages[0]).toMatchObject({
        sender: "assistant",
        content:
          "I’m starting with An AI copilot for founder research that turns scattered notes into a concrete validation plan. I’ll frame the first pass around Seed-stage founders. The first question to pressure-test is Whether they want one workspace. I’ll use https://example.com as initial context.",
      });
      expect(project.phases[0]?.tasks.map((task) => task.label)).toEqual([
        "Capture the core idea: An AI copilot for founder research that turns scattered notes into a concrete validation plan.",
        "Define why Seed-stage founders would care first",
      ]);
      expect(project.phases[1]?.tasks.map((task) => task.label)).toEqual([
        "Pressure-test: Whether they want one workspace.",
        "Extract useful signals from https://example.com",
      ]);
    });
  });

  describe("applyOnboardingStarterContent", () => {
    it("replaces generic first-run content on an existing project", () => {
      const project = makeProject();
      const updatedProject = applyOnboardingStarterContent(project, {
        primaryIdea: "A clinic workflow assistant",
        targetUser: "Practice managers",
        mainUncertainty: "Whether no-show recovery is the first wedge.",
      });

      expect(updatedProject.notes).toMatchObject([
        {
          title: "Idea brief",
          content: "A clinic workflow assistant.",
        },
        {
          title: "First validation focus",
          content:
            "Target user: Practice managers\nMain uncertainty: Whether no-show recovery is the first wedge.",
        },
      ]);
      expect(updatedProject.messages[0]?.content).toContain("A clinic workflow assistant");
      expect(updatedProject.messages[0]?.content).toContain("Practice managers");
      expect(updatedProject.phases[0]?.tasks[0]?.label).toBe("Capture the core idea: A clinic workflow assistant");
      expect(updatedProject.phases[1]?.tasks[0]?.label).toBe(
        "Pressure-test: Whether no-show recovery is the first wedge.",
      );
    });
  });

  describe("getStoredProjects", () => {
    it("returns an empty array when window is undefined", () => {
      vi.stubGlobal("window", undefined);

      expect(getStoredProjects()).toEqual([]);
    });

    it("returns an empty array when storage has no projects", () => {
      expect(getStoredProjects()).toEqual([]);
    });

    it("returns an empty array when storage contains invalid JSON", () => {
      localStorage.setItem(STORAGE_KEY, "{invalid-json");

      expect(getStoredProjects()).toEqual([]);
    });

    it("returns an empty array when storage contains valid JSON that is not an array", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: "not-an-array" }));

      expect(getStoredProjects()).toEqual([]);
    });

    it("returns the parsed project array when storage contains valid projects", () => {
      const projects = [makeProject(), makeProject({ id: "project-2" })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

      expect(getStoredProjects()).toEqual(projects);
    });

    it("round-trips persisted artifacts, active artifact id, and revision history through local storage", () => {
      const project = makeProject({
        activeArtifactId: "artifact-customer-research-memo",
        artifacts: [
          {
            id: "artifact-validation-scorecard",
            type: "validation-scorecard",
            title: "Validation scorecard",
            updatedAt: "2025-01-03T00:00:00.000Z",
            status: "completed",
            currentRevision: {
              id: "artifact-validation-scorecard-revision-2",
              number: 2,
              createdAt: "2025-01-03T00:00:00.000Z",
              status: "completed",
            },
            summary: "Revised summary",
            criteria: [{ id: "criterion-1", label: "Urgency", score: 4 }],
            revisionHistory: [
              {
                id: "artifact-validation-scorecard-revision-1",
                number: 1,
                createdAt: "2025-01-02T00:00:00.000Z",
                status: "draft",
                criteria: [],
              },
              {
                id: "artifact-validation-scorecard-revision-2",
                number: 2,
                createdAt: "2025-01-03T00:00:00.000Z",
                status: "completed",
                summary: "Revised summary",
                criteria: [{ id: "criterion-1", label: "Urgency", score: 4 }],
              },
            ],
          },
          {
            id: "artifact-customer-research-memo",
            type: "customer-research-memo",
            title: "Customer research memo",
            updatedAt: "2025-01-04T00:00:00.000Z",
            status: "completed",
            currentRevision: {
              id: "artifact-customer-research-memo-revision-2",
              number: 2,
              createdAt: "2025-01-04T00:00:00.000Z",
              status: "completed",
            },
            research: {
              status: "success",
              researchQuestion: "What matters most?",
              sourceContext: "Reload this",
              updatedAt: "2025-01-04T00:00:00.000Z",
              report: {
                sections: [],
                executiveSummary: "Signals are strong.",
                researchQuestion: "What matters most?",
                generatedAt: "2025-01-04T00:00:00.000Z",
              },
            },
            revisionHistory: [
              {
                id: "artifact-customer-research-memo-revision-1",
                number: 1,
                createdAt: "2025-01-02T00:00:00.000Z",
                status: "draft",
                research: null,
              },
              {
                id: "artifact-customer-research-memo-revision-2",
                number: 2,
                createdAt: "2025-01-04T00:00:00.000Z",
                status: "completed",
                research: {
                  status: "success",
                  researchQuestion: "What matters most?",
                  sourceContext: "Reload this",
                  updatedAt: "2025-01-04T00:00:00.000Z",
                  report: {
                    sections: [],
                    executiveSummary: "Signals are strong.",
                    researchQuestion: "What matters most?",
                    generatedAt: "2025-01-04T00:00:00.000Z",
                  },
                },
              },
            ],
          },
        ],
      });
      saveStoredProjects([project]);

      const [storedProject] = getStoredProjects();

      expect(storedProject?.activeArtifactId).toBe("artifact-customer-research-memo");
      expect(storedProject?.artifacts?.find((artifact) => artifact.type === "validation-scorecard")?.revisionHistory).toHaveLength(2);
      expect(storedProject?.artifacts?.find((artifact) => artifact.type === "customer-research-memo")?.currentRevision.id).toBe(
        "artifact-customer-research-memo-revision-2",
      );
      expect(storedProject?.research?.report?.executiveSummary).toBe("Signals are strong.");
    });

    it("normalizes legacy projects that do not yet include diagram data", () => {
      const { diagram, ...legacyProject } = makeProject();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([legacyProject]));

      const [storedProject] = getStoredProjects();

      expect(diagram).toEqual(createDefaultProjectDiagram());
      expect(storedProject?.diagram).toEqual(createDefaultProjectDiagram());
    });

    it("repairs an invalid persisted diagram payload to the default diagram", () => {
      const malformedDiagramProject = makeProject({
        diagram: { nodes: [], edges: [] } as Project["diagram"],
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([malformedDiagramProject]));

      const [storedProject] = getStoredProjects();

      expect(storedProject?.diagram).toEqual(createDefaultProjectDiagram());
    });

    it("keeps a project with malformed persisted diagram data instead of discarding it", () => {
      const malformedDiagramProject = makeProject({
        id: "project-with-bad-diagram",
        diagram: { nodes: [], edges: [] } as Project["diagram"],
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([malformedDiagramProject]));

      const storedProjects = getStoredProjects();

      expect(storedProjects).toHaveLength(1);
      expect(storedProjects[0]?.id).toBe("project-with-bad-diagram");
    });

    it("normalizes persisted partial artifact rows without dropping the project", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            ...makeProject(),
            artifacts: [
              {
                id: "artifact-validation-scorecard",
                type: "validation-scorecard",
                title: "Legacy scorecard",
                updatedAt: "2025-01-03T00:00:00.000Z",
                summary: "Recovered from storage",
              },
              {
                id: "artifact-customer-research-memo",
                type: "customer-research-memo",
                title: "Legacy memo",
                updatedAt: "2025-01-04T00:00:00.000Z",
                currentRevisionId: "missing-history-revision",
              },
            ],
            activeArtifactId: "artifact-customer-research-memo",
          },
        ]),
      );

      const [storedProject] = getStoredProjects();

      expect(storedProject?.artifacts?.find((artifact) => artifact.type === "validation-scorecard")).toEqual(
        expect.objectContaining({
          title: "Legacy scorecard",
          summary: "Recovered from storage",
          revisionHistory: [
            expect.objectContaining({
              number: 1,
              summary: "Recovered from storage",
            }),
          ],
        }),
      );
      expect(storedProject?.artifacts?.find((artifact) => artifact.type === "customer-research-memo")).toEqual(
        expect.objectContaining({
          title: "Legacy memo",
          revisionHistory: [
            expect.objectContaining({
              number: 1,
              status: "draft",
            }),
          ],
        }),
      );
      expect(storedProject?.activeArtifactId).toBe("artifact-customer-research-memo");
    });
  });

  describe("saveStoredProjects", () => {
    it("writes JSON to localStorage under the storage key", () => {
      const projects = [makeProject()];

      saveStoredProjects(projects);

      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(projects));
    });

    it("does nothing when window is undefined", () => {
      vi.stubGlobal("window", undefined);

      expect(() => saveStoredProjects([makeProject()])).not.toThrow();
    });
  });

  describe("upsertProject", () => {
    it("inserts a new project when the id does not exist", () => {
      const existing = makeProject();
      saveStoredProjects([existing]);
      const nextProject = makeProject({
        id: "project-2",
        updatedAt: "2025-01-02T00:00:00.000Z",
      });

      const result = upsertProject(nextProject);

      expect(result).toEqual([nextProject, existing]);
      expect(getStoredProjects()).toEqual([nextProject, existing]);
    });

    it("updates an existing project when the id matches", () => {
      const existing = makeProject();
      saveStoredProjects([existing]);
      const updated = makeProject({
        id: existing.id,
        name: "Updated name",
        updatedAt: "2025-02-01T00:00:00.000Z",
      });

      const result = upsertProject(updated);

      expect(result).toEqual([updated]);
      expect(getStoredProjects()).toEqual([updated]);
    });

    it("sorts projects by updatedAt descending", () => {
      const oldest = makeProject({
        id: "project-1",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      const newest = makeProject({
        id: "project-2",
        updatedAt: "2025-03-01T00:00:00.000Z",
      });
      const middle = makeProject({
        id: "project-3",
        updatedAt: "2025-02-01T00:00:00.000Z",
      });

      saveStoredProjects([oldest, newest]);

      const result = upsertProject(middle);

      expect(result.map((project) => project.id)).toEqual(["project-2", "project-3", "project-1"]);
    });
  });

  describe("createAndStoreProject", () => {
    it("creates, stores, and returns a project", () => {
      const project = createAndStoreProject();
      const storedProjects = getStoredProjects();

      expect(project).toEqual(storedProjects[0]);
      expect(storedProjects).toHaveLength(1);
      expect(isProject(project)).toBe(true);
    });

    it("stores the provided initial project without overwriting personalized fields", () => {
      const initial = makeProject({
        id: "initial-project",
        name: "Personalized Project",
        description: "Personalized description",
      });

      const project = createAndStoreProject(initial);
      const storedProjects = getStoredProjects();

      expect(project.id).toBe("initial-project");
      expect(project.name).toBe("Personalized Project");
      expect(project.description).toBe("Personalized description");
      expect(storedProjects).toEqual([project]);
    });
  });

  describe("getProjectById", () => {
    it("returns the matching project when found", () => {
      const first = makeProject();
      const second = makeProject({ id: "project-2" });
      saveStoredProjects([first, second]);

      expect(getProjectById("project-2")).toEqual(second);
    });

    it("returns null when the project is not found", () => {
      saveStoredProjects([makeProject()]);

      expect(getProjectById("missing")).toBeNull();
    });

    it("returns null when no projects are stored", () => {
      expect(getProjectById("missing")).toBeNull();
    });
  });
});
