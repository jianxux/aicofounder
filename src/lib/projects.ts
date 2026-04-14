import { createDefaultProjectDiagram, isProject, normalizeProject, Project } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "aicofounder.projects";

export type ProjectStarterIntake = {
  primaryIdea: string;
  targetUser?: string;
  mainUncertainty?: string;
  url?: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStarterIntake(intake?: ProjectStarterIntake) {
  return {
    primaryIdea: intake?.primaryIdea?.trim() ?? "",
    targetUser: intake?.targetUser?.trim() ?? "",
    mainUncertainty: intake?.mainUncertainty?.trim() ?? "",
    url: intake?.url?.trim() ?? "",
  };
}

function toSentence(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function createStarterNotes(intake?: ProjectStarterIntake) {
  const normalizedIntake = normalizeStarterIntake(intake);

  if (!normalizedIntake.primaryIdea) {
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

  return [
    {
      id: createId(),
      title: "Idea brief",
      content: toSentence(normalizedIntake.primaryIdea),
      color: "yellow" as const,
      x: 72,
      y: 72,
    },
    {
      id: createId(),
      title: "First validation focus",
      content: [
        normalizedIntake.targetUser ? `Target user: ${normalizedIntake.targetUser}` : null,
        normalizedIntake.mainUncertainty ? `Main uncertainty: ${normalizedIntake.mainUncertainty}` : null,
        normalizedIntake.url ? `Reference URL: ${normalizedIntake.url}` : null,
        !normalizedIntake.targetUser && !normalizedIntake.mainUncertainty && !normalizedIntake.url
          ? "Clarify the target user, core uncertainty, and any helpful references."
          : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n"),
      color: "yellow" as const,
      x: 340,
      y: 140,
    },
  ];
}

function createStarterMessage(intake?: ProjectStarterIntake) {
  const normalizedIntake = normalizeStarterIntake(intake);

  if (!normalizedIntake.primaryIdea) {
    return "I’m analyzing your idea. Let me research this and turn it into a sharper plan.";
  }

  return [
    `I’m starting with ${toSentence(normalizedIntake.primaryIdea)}`,
    normalizedIntake.targetUser ? `I’ll frame the first pass around ${normalizedIntake.targetUser}.` : null,
    normalizedIntake.mainUncertainty
      ? `The first question to pressure-test is ${toSentence(normalizedIntake.mainUncertainty)}`
      : "I’ll turn the rough idea into a sharper validation plan.",
    normalizedIntake.url ? `I’ll use ${normalizedIntake.url} as initial context.` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function createStarterPhases(intake?: ProjectStarterIntake) {
  const normalizedIntake = normalizeStarterIntake(intake);

  if (!normalizedIntake.primaryIdea) {
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

  return [
    {
      id: "getting-started",
      title: "Getting started",
      tasks: [
        { id: createId(), label: `Capture the core idea: ${normalizedIntake.primaryIdea}`, done: false },
        {
          id: createId(),
          label: normalizedIntake.targetUser
            ? `Define why ${normalizedIntake.targetUser} would care first`
            : "Define the highest-priority user problem",
          done: false,
        },
      ],
    },
    {
      id: "understand-project",
      title: "Understand the project",
      tasks: [
        {
          id: createId(),
          label: normalizedIntake.mainUncertainty
            ? `Pressure-test: ${normalizedIntake.mainUncertainty}`
            : "Collect market signals around the biggest risk",
          done: false,
        },
        {
          id: createId(),
          label: normalizedIntake.url ? `Extract useful signals from ${normalizedIntake.url}` : "Identify the best research inputs",
          done: false,
        },
      ],
    },
    {
      id: "plan",
      title: "Plan",
      tasks: [
        { id: createId(), label: "Prioritize a first validation milestone", done: false },
        { id: createId(), label: "Outline scope for the smallest useful MVP", done: false },
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
        { id: createId(), label: "Prepare the first outreach and launch checklist", done: false },
        { id: createId(), label: "Define the success metrics to watch", done: false },
      ],
    },
  ];
}

export function applyOnboardingStarterContent(project: Project, intake: ProjectStarterIntake): Project {
  const updatedAt = nowIso();

  return normalizeProject({
    ...project,
    updatedAt,
    notes: createStarterNotes(intake),
    messages: [
      {
        id: createId(),
        sender: "assistant",
        content: createStarterMessage(intake),
        createdAt: updatedAt,
      },
    ],
    phases: createStarterPhases(intake),
  });
}

function repairStoredProject(value: unknown): Project | null {
  if (isProject(value)) {
    return normalizeProject(value);
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const repairedValue: Record<string, unknown> & { diagram: Project["diagram"] } = {
    ...(value as Record<string, unknown>),
    diagram: createDefaultProjectDiagram(),
  };

  if (isProject(repairedValue)) {
    return normalizeProject(repairedValue);
  }

  if (
    typeof repairedValue.id === "string" &&
    typeof repairedValue.name === "string" &&
    typeof repairedValue.description === "string" &&
    typeof repairedValue.phase === "string" &&
    typeof repairedValue.updatedAt === "string" &&
    Array.isArray(repairedValue.notes) &&
    Array.isArray(repairedValue.documents) &&
    Array.isArray(repairedValue.messages) &&
    Array.isArray(repairedValue.phases)
  ) {
    return normalizeProject(repairedValue as Project);
  }

  return null;
}

export function createProjectRecord(intake?: ProjectStarterIntake): Project {
  const updatedAt = nowIso();

  return normalizeProject({
    id: createId(),
    name: "Untitled Project",
    description: "A new concept taking shape with your AI cofounder.",
    phase: "Getting started",
    updatedAt,
    notes: createStarterNotes(intake),
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [
      {
        id: createId(),
        sender: "assistant",
        content: createStarterMessage(intake),
        createdAt: updatedAt,
      },
    ],
    phases: createStarterPhases(intake),
    research: null,
  });
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
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(repairStoredProject).filter((project) => project !== null) : [];
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
  const normalizedProject = normalizeProject(project);
  const projects = getStoredProjects();
  const next = [...projects.filter((entry) => entry.id !== normalizedProject.id), normalizedProject].sort(
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
  upsertProject(project);

  if (!isSupabaseConfigured()) {
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
