import { Project } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "aicofounder.projects";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createStarterNotes() {
  return [
    {
      id: createId(),
      title: "Idea",
      content: "Describe the product idea in one sentence. What are you trying to help people do better?",
      color: "yellow" as const,
      x: 72,
      y: 72,
    },
    {
      id: createId(),
      title: "Problem statement",
      content: "Who has the problem, how often does it happen, and what does the current workaround look like?",
      color: "yellow" as const,
      x: 340,
      y: 140,
    },
  ];
}

function createStarterPhases() {
  return [
    {
      id: "getting-started",
      title: "Getting started",
      tasks: [
        { id: createId(), label: "Write down the idea", done: false },
        { id: createId(), label: "Define the problem statement", done: false },
      ],
    },
    {
      id: "understand-project",
      title: "Understand the project",
      tasks: [
        { id: createId(), label: "Collect market signals", done: false },
        { id: createId(), label: "Identify the target customer", done: false },
      ],
    },
    {
      id: "plan",
      title: "Plan",
      tasks: [
        { id: createId(), label: "Prioritize a first milestone", done: false },
        { id: createId(), label: "Outline scope for MVP", done: false },
      ],
    },
    {
      id: "build",
      title: "Build",
      tasks: [
        { id: createId(), label: "Create the core workflow", done: false },
        { id: createId(), label: "Prepare validation assets", done: false },
      ],
    },
    {
      id: "launch",
      title: "Launch",
      tasks: [
        { id: createId(), label: "Prepare launch checklist", done: false },
        { id: createId(), label: "Define success metrics", done: false },
      ],
    },
  ];
}

export function createProjectRecord(): Project {
  return {
    id: createId(),
    name: "Untitled Project",
    description: "A new concept taking shape with your AI cofounder.",
    phase: "Getting started",
    updatedAt: nowIso(),
    notes: createStarterNotes(),
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [
      {
        id: createId(),
        sender: "assistant",
        content: "I’m analyzing your idea. Let me research this and turn it into a sharper plan.",
        createdAt: nowIso(),
      },
    ],
    phases: createStarterPhases(),
  };
}

export function getStoredProjects(): Project[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects: Project[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function upsertProject(project: Project) {
  const projects = getStoredProjects();
  const next = [...projects.filter((entry) => entry.id !== project.id), project].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  saveStoredProjects(next);
  return next;
}

export function createAndStoreProject() {
  const project = createProjectRecord();
  upsertProject(project);
  return project;
}

export function getProjectById(id: string) {
  return getStoredProjects().find((project) => project.id === id) ?? null;
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(getStoredProjects());
  }

  const { fetchProjects } = await import("@/lib/supabase-projects");
  return fetchProjects();
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(getProjectById(id));
  }

  const { fetchProjectById } = await import("@/lib/supabase-projects");
  return fetchProjectById(id);
}

export async function saveProject(project: Project): Promise<void> {
  if (!isSupabaseConfigured()) {
    upsertProject(project);
    return Promise.resolve();
  }

  const { saveProjectToSupabase } = await import("@/lib/supabase-projects");
  await saveProjectToSupabase(project);
}

export async function createProject(): Promise<Project> {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(createAndStoreProject());
  }

  const { createSupabaseProject } = await import("@/lib/supabase-projects");
  return createSupabaseProject();
}
