import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProjectDiagram, normalizeProject, type Project } from "@/lib/types";

function makeProject(overrides: Partial<Project> = {}): Project {
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
    documents: [],
    websiteBuilders: [],
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
  });
}

async function loadProjectsModule(options: {
  isSupabaseConfigured: boolean;
  supabaseProjectsMock?: {
    fetchProjects?: ReturnType<typeof vi.fn>;
    fetchProjectById?: ReturnType<typeof vi.fn>;
    saveProjectToSupabase?: ReturnType<typeof vi.fn>;
    createSupabaseProject?: ReturnType<typeof vi.fn>;
  };
}) {
  vi.resetModules();

  vi.doMock("@/lib/supabase", () => ({
    isSupabaseConfigured: vi.fn(() => options.isSupabaseConfigured),
  }));

  if (options.supabaseProjectsMock) {
    vi.doMock("@/lib/supabase-projects", () => ({
      fetchProjects: options.supabaseProjectsMock?.fetchProjects ?? vi.fn(),
      fetchProjectById: options.supabaseProjectsMock?.fetchProjectById ?? vi.fn(),
      saveProjectToSupabase: options.supabaseProjectsMock?.saveProjectToSupabase ?? vi.fn(),
      createSupabaseProject: options.supabaseProjectsMock?.createSupabaseProject ?? vi.fn(),
    }));
  } else {
    vi.doUnmock("@/lib/supabase-projects");
  }

  return import("@/lib/projects");
}

describe("lib/projects async wrappers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("getProjects returns localStorage results when Supabase is not configured", async () => {
    const storedProjects = [makeProject(), makeProject({ id: "project-2" })];
    localStorage.setItem("aicofounder.projects", JSON.stringify(storedProjects));
    const projectsModule = await loadProjectsModule({ isSupabaseConfigured: false });

    await expect(projectsModule.getProjects()).resolves.toEqual(storedProjects);
  });

  it("getProjects dynamically imports supabase-projects when Supabase is configured", async () => {
    const fetchProjects = vi.fn().mockResolvedValue([makeProject({ id: "remote-project" })]);
    const projectsModule = await loadProjectsModule({
      isSupabaseConfigured: true,
      supabaseProjectsMock: { fetchProjects },
    });

    await expect(projectsModule.getProjects()).resolves.toEqual([makeProject({ id: "remote-project" })]);
    expect(fetchProjects).toHaveBeenCalledTimes(1);
  });

  it("getProject uses localStorage when Supabase is not configured", async () => {
    const storedProject = makeProject({ id: "local-project" });
    localStorage.setItem("aicofounder.projects", JSON.stringify([storedProject]));
    const projectsModule = await loadProjectsModule({ isSupabaseConfigured: false });

    await expect(projectsModule.getProject("local-project")).resolves.toEqual(storedProject);
  });

  it("getProject delegates to supabase-projects when Supabase is configured", async () => {
    const fetchProjectById = vi.fn().mockResolvedValue(makeProject({ id: "remote-project" }));
    const projectsModule = await loadProjectsModule({
      isSupabaseConfigured: true,
      supabaseProjectsMock: { fetchProjectById },
    });

    await expect(projectsModule.getProject("remote-project")).resolves.toEqual(makeProject({ id: "remote-project" }));
    expect(fetchProjectById).toHaveBeenCalledWith("remote-project");
  });

  it("saveProject writes to localStorage when Supabase is not configured", async () => {
    const project = makeProject({ id: "saved-project" });
    const projectsModule = await loadProjectsModule({ isSupabaseConfigured: false });

    await projectsModule.saveProject(project);

    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);
  });

  it("saveProject delegates to supabase-projects when Supabase is configured", async () => {
    const project = makeProject({ id: "remote-save" });
    const saveProjectToSupabase = vi.fn().mockResolvedValue(undefined);
    const projectsModule = await loadProjectsModule({
      isSupabaseConfigured: true,
      supabaseProjectsMock: { saveProjectToSupabase },
    });

    await projectsModule.saveProject(project);

    expect(saveProjectToSupabase).toHaveBeenCalledWith(project);
  });

  it("createProject creates and stores locally when Supabase is not configured", async () => {
    const projectsModule = await loadProjectsModule({ isSupabaseConfigured: false });

    const project = await projectsModule.createProject();

    expect(project).toMatchObject({
      name: "Untitled Project",
      description: "A new concept taking shape with your AI cofounder.",
      phase: "Getting started",
    });
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);
  });

  it("createProject persists a provided initial project when Supabase is not configured", async () => {
    const projectsModule = await loadProjectsModule({ isSupabaseConfigured: false });
    const initialProject = makeProject({
      id: "initial-project",
      name: "Personalized Project",
      description: "Personalized description",
    });

    const project = await projectsModule.createProject(initialProject);

    expect(project.id).toBe("initial-project");
    expect(project.name).toBe("Personalized Project");
    expect(project.description).toBe("Personalized description");
    expect(JSON.parse(localStorage.getItem("aicofounder.projects") ?? "[]")).toEqual([project]);
  });

  it("createProject delegates to supabase-projects when Supabase is configured", async () => {
    const createdProject = makeProject({ id: "remote-create" });
    const createSupabaseProject = vi.fn().mockResolvedValue(createdProject);
    const projectsModule = await loadProjectsModule({
      isSupabaseConfigured: true,
      supabaseProjectsMock: { createSupabaseProject },
    });

    const initialProject = makeProject({
      id: "initial-project",
      name: "Personalized Project",
      description: "Personalized description",
    });

    await expect(projectsModule.createProject(initialProject)).resolves.toEqual(createdProject);
    expect(createSupabaseProject).toHaveBeenCalledWith(initialProject);
  });
});
