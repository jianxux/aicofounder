import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProjectDiagram, normalizeProject, type Project } from "@/lib/types";
import type { DbCanvasItem, DbMessage, DbPhase, DbPhaseTask, DbProject } from "@/lib/database.types";

type QueryResult<T = unknown> = { data: T | null; error: Error | null };
type ResponseMap = Partial<
  Record<
    string,
    Partial<Record<"order" | "maybeSingle" | "upsert" | "insert" | "delete", QueryResult>>
  >
>;

type Operation = {
  table: string;
  method: string;
  args: unknown[];
};

function makeProject(overrides: Partial<Project> & { artifacts?: unknown } = {}): Project {
  return normalizeProject({
    id: "project-1",
    name: "Launchpad",
    description: "AI-assisted startup planning",
    phase: "Build",
    updatedAt: "2025-01-15T12:00:00.000Z",
    notes: [
      {
        id: "note-1",
        title: "Idea",
        content: "Help founders validate faster.",
        color: "green",
        x: 10,
        y: 20,
      },
    ],
    sections: [
      {
        id: "section-1",
        title: "Research",
        color: "blue",
        x: 30,
        y: 40,
        width: 500,
        height: 300,
      },
    ],
    documents: [
      {
        id: "doc-1",
        title: "PRD",
        content: "# MVP",
        x: 50,
        y: 60,
      },
    ],
    websiteBuilders: [
      {
        id: "site-1",
        title: "Landing Page",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            heading: "Ship faster",
            body: "From idea to launch.",
            buttonText: "Start",
          },
          {
            id: "text-1",
            type: "text",
            heading: "Why",
            body: "Because speed matters.",
          },
        ],
        x: 70,
        y: 80,
      },
    ],
    messages: [
      {
        id: "message-1",
        sender: "assistant",
        content: "Let’s define the plan.",
        createdAt: "2025-01-15T12:01:00.000Z",
      },
      {
        id: "message-2",
        sender: "user",
        content: "Here is the idea.",
        createdAt: "2025-01-15T12:00:30.000Z",
      },
    ],
    phases: [
      {
        id: "phase-2",
        title: "Build",
        tasks: [
          { id: "task-2", label: "Create MVP", done: false },
          { id: "task-3", label: "Collect feedback", done: true },
        ],
      },
      {
        id: "phase-1",
        title: "Research",
        tasks: [{ id: "task-1", label: "Interview users", done: true }],
      },
    ],
    research: null,
    diagram: createDefaultProjectDiagram(),
    ...overrides,
  } as Project);
}

function makeProjectRow(projectId = "project-1"): DbProject & {
  messages: DbMessage[];
  canvas_items: DbCanvasItem[];
  phases: DbPhase[];
} {
  return {
    id: projectId,
    user_id: "user-1",
    name: "Mapped Project",
    description: "Mapped from Supabase",
    phase: "Plan",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-10T00:00:00.000Z",
    messages: [
      {
        id: "message-late",
        project_id: projectId,
        sender: "assistant",
        content: "Second",
        created_at: "2025-01-10T00:00:02.000Z",
      },
      {
        id: "message-early",
        project_id: projectId,
        sender: "user",
        content: "First",
        created_at: "2025-01-10T00:00:01.000Z",
      },
    ],
    canvas_items: [
      {
        id: "note-db",
        project_id: projectId,
        type: "note",
        data: {
          title: 42,
          content: "Mapped note",
          color: "invalid-color",
        },
        x: 11,
        y: 12,
        created_at: "2025-01-10T00:00:00.000Z",
        updated_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "section-db",
        project_id: projectId,
        type: "section",
        data: {
          title: "Section",
          color: "pink",
          width: "wide",
          height: null,
        },
        x: 21,
        y: 22,
        created_at: "2025-01-10T00:00:00.000Z",
        updated_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "document-db",
        project_id: projectId,
        type: "document",
        data: {
          title: "Doc",
          content: ["bad"],
        },
        x: 31,
        y: 32,
        created_at: "2025-01-10T00:00:00.000Z",
        updated_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "website-db",
        project_id: projectId,
        type: "website_builder",
        data: {
          title: "Builder",
          blocks: [
            null,
            {
              id: "block-1",
              type: "hero",
              heading: 123,
              body: "Hero body",
              buttonText: "Go",
            },
            {
              id: "block-2",
              type: "unknown",
              heading: "Ignore",
              body: "Ignore",
            },
            {
              id: "block-3",
              type: "text",
              heading: "Text block",
              body: 456,
            },
          ],
        },
        x: 41,
        y: 42,
        created_at: "2025-01-10T00:00:00.000Z",
        updated_at: "2025-01-10T00:00:00.000Z",
      },
    ],
    phases: [
      { id: "phase-b", project_id: projectId, title: "Build", sort_order: 1 },
      { id: "phase-a", project_id: projectId, title: "Research", sort_order: 0 },
    ],
  };
}

function makePhaseTasks(projectId = "project-1"): DbPhaseTask[] {
  return [
    {
      id: "task-b",
      phase_id: "phase-b",
      project_id: projectId,
      label: "Second build task",
      done: false,
      sort_order: 1,
    },
    {
      id: "task-a",
      phase_id: "phase-b",
      project_id: projectId,
      label: "First build task",
      done: true,
      sort_order: 0,
    },
    {
      id: "task-c",
      phase_id: "phase-a",
      project_id: projectId,
      label: "Research task",
      done: true,
      sort_order: 0,
    },
  ];
}

function createMockSupabase(
  responses: ResponseMap = {},
  operations: Operation[] = [],
  getUserResult: QueryResult<{ user: { id: string } | null }> = {
    data: { user: { id: "user-1" } },
    error: null,
  },
) {
  const getResponse = (table: string, action: "order" | "maybeSingle" | "upsert" | "insert" | "delete") =>
    responses[table]?.[action] ?? { data: null, error: null };

  const from = vi.fn((table: string) => {
    let action: "order" | "maybeSingle" | "upsert" | "insert" | "delete" = "order";

    const chain = {
      select: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "select", args });
        return chain;
      }),
      insert: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "insert", args });
        action = "insert";
        return chain;
      }),
      upsert: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "upsert", args });
        action = "upsert";
        return chain;
      }),
      delete: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "delete", args });
        action = "delete";
        return chain;
      }),
      update: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "update", args });
        return chain;
      }),
      eq: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "eq", args });
        return chain;
      }),
      in: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "in", args });
        return chain;
      }),
      order: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "order", args });
        action = "order";
        return chain;
      }),
      maybeSingle: vi.fn((...args: unknown[]) => {
        operations.push({ table, method: "maybeSingle", args });
        action = "maybeSingle";
        return Promise.resolve(getResponse(table, "maybeSingle"));
      }),
      then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(getResponse(table, action)).then(resolve, reject),
    };

    return chain;
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(getUserResult),
    },
    from,
  };
}

async function loadModule(options?: {
  createBrowserClient?: ReturnType<typeof vi.fn>;
  createProjectRecord?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();

  const createBrowserClient = options?.createBrowserClient ?? vi.fn();
  vi.doMock("@/lib/supabase", () => ({
    createBrowserClient,
  }));

  if (options?.createProjectRecord) {
    vi.doMock("@/lib/projects", async () => {
      const actual = await vi.importActual<typeof import("@/lib/projects")>("@/lib/projects");
      return {
        ...actual,
        createProjectRecord: options.createProjectRecord,
      };
    });
  } else {
    vi.doUnmock("@/lib/projects");
  }

  return {
    module: await import("@/lib/supabase-projects"),
    createBrowserClient,
  };
}

describe("lib/supabase-projects", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/projects");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fetchProjects maps Supabase rows and builds the expected queries", async () => {
    const projectRow = makeProjectRow();
    const phaseTasks = makePhaseTasks();
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase(
      {
        projects: { order: { data: [projectRow], error: null } },
        phase_tasks: { order: { data: phaseTasks, error: null } },
      },
      operations,
    );
    const { module, createBrowserClient } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    const projects = await module.fetchProjects();

    expect(createBrowserClient).toHaveBeenCalledTimes(2);
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toEqual(
      expect.objectContaining(
        normalizeProject({
          id: "project-1",
          name: "Mapped Project",
          description: "Mapped from Supabase",
          phase: "Plan",
          updatedAt: "2025-01-10T00:00:00.000Z",
          notes: [
            {
              id: "note-db",
              title: "",
              content: "Mapped note",
              color: "yellow",
              x: 11,
              y: 12,
            },
          ],
          sections: [
            {
              id: "section-db",
              title: "Section",
              color: "pink",
              x: 21,
              y: 22,
              width: 0,
              height: 0,
            },
          ],
          documents: [
            {
              id: "document-db",
              title: "Doc",
              content: "",
              x: 31,
              y: 32,
            },
          ],
          websiteBuilders: [
            {
              id: "website-db",
              title: "Builder",
              blocks: [
                {
                  id: "block-1",
                  type: "hero",
                  heading: "",
                  body: "Hero body",
                  buttonText: "Go",
                },
                {
                  id: "block-3",
                  type: "text",
                  heading: "Text block",
                  body: "",
                },
              ],
              x: 41,
              y: 42,
            },
          ],
          messages: [
            {
              id: "message-early",
              sender: "user",
              content: "First",
              createdAt: "2025-01-10T00:00:01.000Z",
            },
            {
              id: "message-late",
              sender: "assistant",
              content: "Second",
              createdAt: "2025-01-10T00:00:02.000Z",
            },
          ],
          phases: [
            {
              id: "phase-a",
              title: "Research",
              tasks: [{ id: "task-c", label: "Research task", done: true }],
            },
            {
              id: "phase-b",
              title: "Build",
              tasks: [
                { id: "task-a", label: "First build task", done: true },
                { id: "task-b", label: "Second build task", done: false },
              ],
            },
          ],
          research: null,
          diagram: createDefaultProjectDiagram(),
        } as Project),
      ),
    );
    expect(projects[0]?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "artifact-validation-scorecard",
          type: "validation-scorecard",
          status: "draft",
          currentRevision: expect.objectContaining({
            number: 1,
            status: "draft",
          }),
        }),
        expect.objectContaining({
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          status: "draft",
          currentRevision: expect.objectContaining({
            number: 1,
            status: "draft",
          }),
        }),
      ]),
    );

    expect(operations).toContainEqual({
      table: "projects",
      method: "select",
      args: ["*, messages(*), canvas_items(*), phases(*)"],
    });
    expect(operations).toContainEqual({
      table: "projects",
      method: "eq",
      args: ["user_id", "user-1"],
    });
    expect(operations).toContainEqual({
      table: "projects",
      method: "order",
      args: ["updated_at", { ascending: false }],
    });
    expect(operations).toContainEqual({
      table: "phase_tasks",
      method: "in",
      args: ["project_id", ["project-1"]],
    });
    expect(operations).toContainEqual({
      table: "phase_tasks",
      method: "order",
      args: ["sort_order", { ascending: true }],
    });
  });

  it("fetchProjects falls back to localStorage when Supabase errors", async () => {
    const fallbackProject = makeProject();
    localStorage.setItem("aicofounder.projects", JSON.stringify([fallbackProject]));
    const mockSupabase = createMockSupabase({
      projects: { order: { data: null, error: new Error("boom") } },
    });
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    await expect(module.fetchProjects()).resolves.toEqual([fallbackProject]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("fetchProjects falls back to localStorage when Supabase is unavailable or the user is signed out", async () => {
    const fallbackProject = makeProject({ id: "local-only" });
    localStorage.setItem("aicofounder.projects", JSON.stringify([fallbackProject]));

    const missingSupabaseLoad = await loadModule({
      createBrowserClient: vi.fn(() => null),
    });
    await expect(missingSupabaseLoad.module.fetchProjects()).resolves.toEqual([fallbackProject]);

    const signedOutSupabase = createMockSupabase({}, [], {
      data: { user: null },
      error: null,
    });
    const signedOutLoad = await loadModule({
      createBrowserClient: vi.fn(() => signedOutSupabase),
    });
    await expect(signedOutLoad.module.fetchProjects()).resolves.toEqual([fallbackProject]);
  });

  it("fetchProjects skips phase task fetching when no projects are returned", async () => {
    const createBrowserClient = vi.fn(() =>
      createMockSupabase({
        projects: { order: { data: [], error: null } },
      }),
    );
    const { module } = await loadModule({ createBrowserClient });

    await expect(module.fetchProjects()).resolves.toEqual([]);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });

  it("fetchProjectById applies both eq filters, maps data, and fetches tasks", async () => {
    const projectRow = makeProjectRow("project-9");
    const phaseTasks = makePhaseTasks("project-9");
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase(
      {
        projects: { maybeSingle: { data: projectRow, error: null } },
        phase_tasks: { order: { data: phaseTasks, error: null } },
      },
      operations,
    );
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    const project = await module.fetchProjectById("project-9");

    expect(project?.id).toBe("project-9");
    expect(project?.messages.map((message) => message.id)).toEqual(["message-early", "message-late"]);
    expect(project?.phases.map((phase) => phase.id)).toEqual(["phase-a", "phase-b"]);
    expect(operations).toContainEqual({
      table: "projects",
      method: "eq",
      args: ["user_id", "user-1"],
    });
    expect(operations).toContainEqual({
      table: "projects",
      method: "eq",
      args: ["id", "project-9"],
    });
    expect(operations).toContainEqual({
      table: "projects",
      method: "maybeSingle",
      args: [],
    });
  });

  it("fetchProjectById merges locally persisted research data into the remote project", async () => {
    const localResearch = {
      status: "success" as const,
      researchQuestion: "What are the key opportunities and risks?",
      sourceContext: "Saved locally",
      updatedAt: "2025-01-20T00:00:00.000Z",
      report: {
        sections: [],
        executiveSummary: "Stored summary",
        researchQuestion: "What are the key opportunities and risks?",
        generatedAt: "2025-01-20T00:00:00.000Z",
      },
    };
    const localDiagram = {
      ...createDefaultProjectDiagram(),
      nodes: [
        {
          id: "diagram-node-1",
          type: "topic" as const,
          label: "Saved locally",
          x: 100,
          y: 120,
          source: {
            type: "generated" as const,
          },
        },
      ],
    };
    localStorage.setItem(
      "aicofounder.projects",
      JSON.stringify([
        makeProject({
          id: "project-9",
          research: localResearch,
          activeArtifactId: "artifact-customer-research-memo",
          diagram: localDiagram,
        }),
      ]),
    );
    const mockSupabase = createMockSupabase(
      {
        projects: { maybeSingle: { data: makeProjectRow("project-9"), error: null } },
        phase_tasks: { order: { data: makePhaseTasks("project-9"), error: null } },
      },
      [],
    );
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    const project = await module.fetchProjectById("project-9");

    expect(project?.research).toEqual(localResearch);
    expect(project?.activeArtifactId).toBe("artifact-customer-research-memo");
    expect(project?.artifacts?.find((artifact) => artifact.type === "customer-research-memo")).toMatchObject({
      research: localResearch,
    });
    expect(project?.diagram).toEqual(localDiagram);
  });

  it("fetchProjectById falls back to localStorage on query error and when no row exists", async () => {
    const fallbackProject = makeProject({ id: "project-2", name: "Local Project" });
    localStorage.setItem("aicofounder.projects", JSON.stringify([fallbackProject]));

    const errorSupabase = createMockSupabase({
      projects: { maybeSingle: { data: null, error: new Error("lookup failed") } },
    });
    const missingSupabase = createMockSupabase({
      projects: { maybeSingle: { data: null, error: null } },
    });

    const errorLoad = await loadModule({
      createBrowserClient: vi.fn(() => errorSupabase),
    });
    await expect(errorLoad.module.fetchProjectById("project-2")).resolves.toEqual(fallbackProject);

    const missingLoad = await loadModule({
      createBrowserClient: vi.fn(() => missingSupabase),
    });
    await expect(missingLoad.module.fetchProjectById("project-2")).resolves.toEqual(fallbackProject);
  });

  it("fetchProjectById falls back to localStorage when Supabase is unavailable or the user is signed out", async () => {
    const fallbackProject = makeProject({ id: "project-3", name: "Offline Project" });
    localStorage.setItem("aicofounder.projects", JSON.stringify([fallbackProject]));

    const missingSupabaseLoad = await loadModule({
      createBrowserClient: vi.fn(() => null),
    });
    await expect(missingSupabaseLoad.module.fetchProjectById("project-3")).resolves.toEqual(fallbackProject);

    const signedOutSupabase = createMockSupabase({}, [], {
      data: { user: null },
      error: null,
    });
    const signedOutLoad = await loadModule({
      createBrowserClient: vi.fn(() => signedOutSupabase),
    });
    await expect(signedOutLoad.module.fetchProjectById("project-3")).resolves.toEqual(fallbackProject);
  });

  it("saveProjectToSupabase writes mapped project, messages, canvas items, phases, and tasks", async () => {
    const project = makeProject();
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase({}, operations);
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    await module.saveProjectToSupabase(project);

    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);

    expect(operations).toContainEqual({
      table: "projects",
      method: "upsert",
      args: [
        expect.objectContaining({
          id: "project-1",
          user_id: "user-1",
          name: "Launchpad",
          description: "AI-assisted startup planning",
          phase: "Build",
          active_artifact_id: "artifact-validation-scorecard",
          artifacts: expect.any(Array),
          created_at: "2025-01-15T12:00:00.000Z",
          updated_at: "2025-01-15T12:00:00.000Z",
        } satisfies Partial<DbProject>),
      ],
    });

    expect(operations).toContainEqual({
      table: "messages",
      method: "delete",
      args: [],
    });
    expect(operations).toContainEqual({
      table: "messages",
      method: "eq",
      args: ["project_id", "project-1"],
    });
    expect(operations).toContainEqual({
      table: "canvas_items",
      method: "delete",
      args: [],
    });
    expect(operations).toContainEqual({
      table: "phase_tasks",
      method: "delete",
      args: [],
    });
    expect(operations).toContainEqual({
      table: "phases",
      method: "delete",
      args: [],
    });

    const messageInsert = operations.find(
      (operation) => operation.table === "messages" && operation.method === "insert",
    );
    expect(messageInsert?.args[0]).toEqual([
      {
        id: "message-1",
        project_id: "project-1",
        sender: "assistant",
        content: "Let’s define the plan.",
        created_at: "2025-01-15T12:01:00.000Z",
      },
      {
        id: "message-2",
        project_id: "project-1",
        sender: "user",
        content: "Here is the idea.",
        created_at: "2025-01-15T12:00:30.000Z",
      },
    ]);

    const canvasInsert = operations.find(
      (operation) => operation.table === "canvas_items" && operation.method === "insert",
    );
    expect(canvasInsert?.args[0]).toEqual([
      {
        id: "note-1",
        project_id: "project-1",
        type: "note",
        data: {
          title: "Idea",
          content: "Help founders validate faster.",
          color: "green",
        },
        x: 10,
        y: 20,
        created_at: "2025-01-15T12:00:00.000Z",
        updated_at: "2025-01-15T12:00:00.000Z",
      },
      {
        id: "section-1",
        project_id: "project-1",
        type: "section",
        data: {
          title: "Research",
          color: "blue",
          width: 500,
          height: 300,
        },
        x: 30,
        y: 40,
        created_at: "2025-01-15T12:00:00.000Z",
        updated_at: "2025-01-15T12:00:00.000Z",
      },
      {
        id: "doc-1",
        project_id: "project-1",
        type: "document",
        data: {
          title: "PRD",
          content: "# MVP",
        },
        x: 50,
        y: 60,
        created_at: "2025-01-15T12:00:00.000Z",
        updated_at: "2025-01-15T12:00:00.000Z",
      },
      {
        id: "site-1",
        project_id: "project-1",
        type: "website_builder",
        data: {
          title: "Landing Page",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              heading: "Ship faster",
              body: "From idea to launch.",
              buttonText: "Start",
            },
            {
              id: "text-1",
              type: "text",
              heading: "Why",
              body: "Because speed matters.",
            },
          ],
        },
        x: 70,
        y: 80,
        created_at: "2025-01-15T12:00:00.000Z",
        updated_at: "2025-01-15T12:00:00.000Z",
      },
    ]);

    const phaseInsert = operations.find((operation) => operation.table === "phases" && operation.method === "insert");
    expect(phaseInsert?.args[0]).toEqual([
      { id: "phase-2", project_id: "project-1", title: "Build", sort_order: 0 },
      { id: "phase-1", project_id: "project-1", title: "Research", sort_order: 1 },
    ]);

    const taskInsert = operations.find(
      (operation) => operation.table === "phase_tasks" && operation.method === "insert",
    );
    expect(taskInsert?.args[0]).toEqual([
      {
        id: "task-2",
        phase_id: "phase-2",
        project_id: "project-1",
        label: "Create MVP",
        done: false,
        sort_order: 0,
      },
      {
        id: "task-3",
        phase_id: "phase-2",
        project_id: "project-1",
        label: "Collect feedback",
        done: true,
        sort_order: 1,
      },
      {
        id: "task-1",
        phase_id: "phase-1",
        project_id: "project-1",
        label: "Interview users",
        done: true,
        sort_order: 0,
      },
    ]);
  });

  it("saveProjectToSupabase falls back to localStorage on write errors", async () => {
    const project = makeProject();
    const mockSupabase = createMockSupabase({
      projects: { upsert: { data: null, error: new Error("write failed") } },
    });
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    await module.saveProjectToSupabase(project);

    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("saveProjectToSupabase stores locally when Supabase is unavailable or the user is signed out", async () => {
    const project = makeProject({ id: "project-local-save" });

    const missingSupabaseLoad = await loadModule({
      createBrowserClient: vi.fn(() => null),
    });
    await missingSupabaseLoad.module.saveProjectToSupabase(project);
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);

    localStorage.clear();

    const signedOutSupabase = createMockSupabase({}, [], {
      data: { user: null },
      error: null,
    });
    const signedOutLoad = await loadModule({
      createBrowserClient: vi.fn(() => signedOutSupabase),
    });
    await signedOutLoad.module.saveProjectToSupabase(project);
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);
  });

  it("saveProjectToSupabase skips insert calls for empty collections", async () => {
    const project = makeProject({
      messages: [],
      notes: [],
      sections: [],
      documents: [],
      websiteBuilders: [],
      phases: [],
    });
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase({}, operations);
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
    });

    await module.saveProjectToSupabase(project);

    expect(operations.some((operation) => operation.method === "insert" && operation.table === "messages")).toBe(false);
    expect(operations.some((operation) => operation.method === "insert" && operation.table === "canvas_items")).toBe(false);
    expect(operations.some((operation) => operation.method === "insert" && operation.table === "phases")).toBe(false);
    expect(operations.some((operation) => operation.method === "insert" && operation.table === "phase_tasks")).toBe(false);
  });

  it("createSupabaseProject persists the created project through the save flow", async () => {
    const createdProject = makeProject({ id: "created-project" });
    const createProjectRecord = vi.fn(() => createdProject);
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase({}, operations);
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
      createProjectRecord,
    });

    const result = await module.createSupabaseProject();

    expect(createProjectRecord).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdProject);
    expect(operations.some((operation) => operation.table === "projects" && operation.method === "upsert")).toBe(true);
    expect(operations.some((operation) => operation.table === "messages" && operation.method === "insert")).toBe(true);
  });

  it("createSupabaseProject preserves a provided initial project", async () => {
    const initialProject = makeProject({
      id: "supabase-initial-project",
      name: "Onboarding-initialized project",
      description: "Created from intake before persistence",
    });
    const createProjectRecord = vi.fn(() => {
      throw new Error("createProjectRecord should not be called when initial project is provided");
    });
    const operations: Operation[] = [];
    const mockSupabase = createMockSupabase({}, operations);
    const { module } = await loadModule({
      createBrowserClient: vi.fn(() => mockSupabase),
      createProjectRecord,
    });

    const result = await module.createSupabaseProject(initialProject);

    expect(result).toEqual(initialProject);
    expect(operations).toContainEqual({
      table: "projects",
      method: "upsert",
      args: [
        expect.objectContaining({
          id: "supabase-initial-project",
          name: "Onboarding-initialized project",
          description: "Created from intake before persistence",
        }),
      ],
    });
  });

  it("deleteProjectFromSupabase deletes remotely and falls back to localStorage on error", async () => {
    const fallbackProjects = [makeProject({ id: "keep" }), makeProject({ id: "remove" })];
    localStorage.setItem("aicofounder.projects", JSON.stringify(fallbackProjects));

    const deleteOperations: Operation[] = [];
    const okSupabase = createMockSupabase({}, deleteOperations);
    const okLoad = await loadModule({
      createBrowserClient: vi.fn(() => okSupabase),
    });

    await okLoad.module.deleteProjectFromSupabase("remove");

    expect(deleteOperations).toContainEqual({
      table: "projects",
      method: "delete",
      args: [],
    });
    expect(deleteOperations).toContainEqual({
      table: "projects",
      method: "eq",
      args: ["id", "remove"],
    });
    expect(deleteOperations).toContainEqual({
      table: "projects",
      method: "eq",
      args: ["user_id", "user-1"],
    });

    const errorSupabase = createMockSupabase({
      projects: { delete: { data: null, error: new Error("delete failed") } },
    });
    const errorLoad = await loadModule({
      createBrowserClient: vi.fn(() => errorSupabase),
    });

    await errorLoad.module.deleteProjectFromSupabase("remove");

    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([fallbackProjects[0]]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("deleteProjectFromSupabase removes the project locally when Supabase is unavailable or the user is signed out", async () => {
    const fallbackProjects = [makeProject({ id: "keep" }), makeProject({ id: "remove" })];
    localStorage.setItem("aicofounder.projects", JSON.stringify(fallbackProjects));

    const missingSupabaseLoad = await loadModule({
      createBrowserClient: vi.fn(() => null),
    });
    await missingSupabaseLoad.module.deleteProjectFromSupabase("remove");
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([fallbackProjects[0]]);

    localStorage.setItem("aicofounder.projects", JSON.stringify(fallbackProjects));

    const signedOutSupabase = createMockSupabase({}, [], {
      data: { user: null },
      error: null,
    });
    const signedOutLoad = await loadModule({
      createBrowserClient: vi.fn(() => signedOutSupabase),
    });
    await signedOutLoad.module.deleteProjectFromSupabase("remove");
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([fallbackProjects[0]]);
  });
});
