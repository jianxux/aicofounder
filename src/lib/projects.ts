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

function deriveProjectName(primaryIdea: string) {
  const normalizedIdea = primaryIdea.trim().replace(/\s+/g, " ");

  if (!normalizedIdea) {
    return "Untitled Project";
  }

  const firstSentence = normalizedIdea.split(/[.!?]/)[0]?.trim() || normalizedIdea;

  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 57).trimEnd()}...`;
}

function buildProjectDescription({ primaryIdea, url, targetUser, mainUncertainty }: ProjectStarterIntake) {
  return [
    primaryIdea.trim(),
    targetUser?.trim() ? `Target user: ${targetUser.trim()}` : null,
    mainUncertainty?.trim() ? `Main uncertainty: ${mainUncertainty.trim()}` : null,
    url?.trim() ? `Reference URL: ${url.trim()}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function buildTailoredTaskLabel(prefix: string, value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const label = normalized ? `${prefix}: ${normalized}` : fallback;
  return label.length > 120 ? `${label.slice(0, 117).trimEnd()}...` : label;
}

function createStarterNotes(intake?: ProjectStarterIntake) {
  if (!intake) {
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

  const primaryIdea = intake.primaryIdea.trim();
  const targetUser = intake.targetUser?.trim() ?? "";
  const mainUncertainty = intake.mainUncertainty?.trim() ?? "";
  const url = intake.url?.trim() ?? "";

  return [
    {
      id: createId(),
      title: "Idea",
      content: primaryIdea || "Describe the product idea in one sentence. What are you trying to help people do better?",
      color: "yellow" as const,
      x: 72,
      y: 72,
    },
    {
      id: createId(),
      title: "Validation focus",
      content: [
        targetUser ? `Target user: ${targetUser}` : "Target user: define who feels this pain most.",
        mainUncertainty ? `Main uncertainty: ${mainUncertainty}` : "Main uncertainty: call out the biggest risk to test.",
        url ? `Reference URL: ${url}` : "Reference URL: optional context link.",
      ].join("\n"),
      color: "yellow" as const,
      x: 340,
      y: 140,
    },
  ];
}

function createStarterPhases(intake?: ProjectStarterIntake) {
  if (!intake) {
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

  const primaryIdea = intake.primaryIdea.trim();
  const targetUser = intake.targetUser?.trim() ?? "";
  const mainUncertainty = intake.mainUncertainty?.trim() ?? "";
  const url = intake.url?.trim() ?? "";

  return [
    {
      id: "getting-started",
      title: "Getting started",
      tasks: [
        {
          id: createId(),
          label: buildTailoredTaskLabel("Clarify idea", primaryIdea, "Clarify the core idea"),
          done: false,
        },
        {
          id: createId(),
          label: buildTailoredTaskLabel("Define target user", targetUser, "Define the target user"),
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
          label: buildTailoredTaskLabel(
            "Pressure-test uncertainty",
            mainUncertainty,
            "Pressure-test the biggest uncertainty",
          ),
          done: false,
        },
        {
          id: createId(),
          label: buildTailoredTaskLabel("Review source", url, "Collect supporting source material"),
          done: false,
        },
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
  const primaryIdea = intake?.primaryIdea.trim() ?? "";
  const targetUser = intake?.targetUser?.trim() ?? "";
  const mainUncertainty = intake?.mainUncertainty?.trim() ?? "";
  const url = intake?.url?.trim() ?? "";

  const starterMessage =
    `I captured your intake: ${primaryIdea || "new product idea"}.` +
    (targetUser ? ` We will focus on ${targetUser}.` : "") +
    (mainUncertainty ? ` First uncertainty to test: ${mainUncertainty}.` : "") +
    (url ? ` Reference URL: ${url}.` : "");

  return normalizeProject({
    id: createId(),
    name: intake ? deriveProjectName(primaryIdea) : "Untitled Project",
    description: intake ? buildProjectDescription(intake) : "A new concept taking shape with your AI cofounder.",
    phase: "Getting started",
    updatedAt: nowIso(),
    notes: createStarterNotes(intake),
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [
      {
        id: createId(),
        sender: "assistant",
        content: intake
          ? starterMessage
          : "I’m analyzing your idea. Let me research this and turn it into a sharper plan.",
        createdAt: nowIso(),
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

export function createAndStoreProject(initialProject?: Project) {
  const project = normalizeProject(initialProject ?? createProjectRecord());
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

export async function createProject(initialProject?: Project): Promise<Project> {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(createAndStoreProject(initialProject));
  }

  const { createSupabaseProject } = await import("@/lib/supabase-projects");
  return createSupabaseProject(initialProject);
}
