import { createProjectRecord, getProjectById, getStoredProjects, saveStoredProjects, upsertProject } from "@/lib/projects";
import type { DbCanvasItem, DbMessage, DbPhase, DbPhaseTask, DbProject } from "@/lib/database.types";
import { createBrowserClient } from "@/lib/supabase";
import { normalizeProject } from "@/lib/types";
import type {
  ChatMessage,
  DocumentCardData,
  NoteColor,
  Phase,
  Project,
  SectionData,
  StickyNoteData,
  WebsiteBuilderData,
  WebsiteBlock,
} from "@/lib/types";

type ProjectRow = DbProject & {
  messages?: DbMessage[] | null;
  canvas_items?: DbCanvasItem[] | null;
  phases?: DbPhase[] | null;
};

const DEFAULT_NOTE_COLOR: NoteColor = "yellow";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNoteColor(value: unknown): NoteColor {
  return value === "yellow" || value === "blue" || value === "green" || value === "pink" || value === "purple"
    ? value
    : DEFAULT_NOTE_COLOR;
}

function asWebsiteBlocks(value: unknown): WebsiteBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((block) => {
    if (!isRecord(block)) {
      return [];
    }

    const type = block.type;

    if (type !== "hero" && type !== "features" && type !== "cta" && type !== "text" && type !== "lead_capture") {
      return [];
    }

    return [
      {
        id: asString(block.id),
        type,
        heading: asString(block.heading),
        body: asString(block.body),
        ...(typeof block.buttonText === "string" ? { buttonText: block.buttonText } : {}),
      },
    ];
  });
}

function mapCanvasItems(canvasItems: DbCanvasItem[] | null | undefined): Pick<
  Project,
  "notes" | "sections" | "documents" | "websiteBuilders"
> {
  const notes: StickyNoteData[] = [];
  const sections: SectionData[] = [];
  const documents: DocumentCardData[] = [];
  const websiteBuilders: WebsiteBuilderData[] = [];

  for (const item of canvasItems ?? []) {
    const data = isRecord(item.data) ? item.data : {};

    if (item.type === "note") {
      notes.push({
        id: item.id,
        title: asString(data.title),
        content: asString(data.content),
        color: asNoteColor(data.color),
        x: item.x,
        y: item.y,
      });
      continue;
    }

    if (item.type === "section") {
      sections.push({
        id: item.id,
        title: asString(data.title),
        color: asNoteColor(data.color),
        x: item.x,
        y: item.y,
        width: asNumber(data.width),
        height: asNumber(data.height),
      });
      continue;
    }

    if (item.type === "document") {
      documents.push({
        id: item.id,
        title: asString(data.title),
        content: asString(data.content),
        x: item.x,
        y: item.y,
      });
      continue;
    }

    if (item.type === "website_builder") {
      websiteBuilders.push({
        id: item.id,
        title: asString(data.title),
        blocks: asWebsiteBlocks(data.blocks),
        x: item.x,
        y: item.y,
      });
    }
  }

  return { notes, sections, documents, websiteBuilders };
}

function mapMessages(messages: DbMessage[] | null | undefined): ChatMessage[] {
  return [...(messages ?? [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((message) => ({
      id: message.id,
      sender: message.sender,
      content: message.content,
      createdAt: message.created_at,
    }));
}

function mapPhases(phases: DbPhase[] | null | undefined, tasks: DbPhaseTask[] | null | undefined): Phase[] {
  const tasksByPhaseId = new Map<string, DbPhaseTask[]>();

  for (const task of tasks ?? []) {
    const phaseTasks = tasksByPhaseId.get(task.phase_id) ?? [];
    phaseTasks.push(task);
    tasksByPhaseId.set(task.phase_id, phaseTasks);
  }

  return [...(phases ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((phase) => ({
      id: phase.id,
      title: phase.title,
      tasks: [...(tasksByPhaseId.get(phase.id) ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((task) => ({
          id: task.id,
          label: task.label,
          done: task.done,
        })),
    }));
}

function mapProjectRow(project: ProjectRow, tasks: DbPhaseTask[] | null | undefined): Project {
  const canvas = mapCanvasItems(project.canvas_items);

  return normalizeProject({
    id: project.id,
    name: project.name,
    description: project.description,
    phase: project.phase,
    updatedAt: project.updated_at,
    notes: canvas.notes,
    sections: canvas.sections,
    documents: canvas.documents,
    websiteBuilders: canvas.websiteBuilders,
    messages: mapMessages(project.messages),
    phases: mapPhases(project.phases, tasks),
    artifacts: Array.isArray(project.artifacts) ? (project.artifacts as Project["artifacts"]) : undefined,
    activeArtifactId: project.active_artifact_id ?? undefined,
  } as Project);
}

function mergeLocalProjectState(project: Project): Project {
  const localProject = getProjectById(project.id);

  if (!localProject) {
    return normalizeProject(project);
  }

  return normalizeProject({
    ...project,
    research: project.research ?? localProject.research ?? null,
    artifacts:
      project.research == null && localProject.research != null
        ? localProject.artifacts ?? project.artifacts
        : project.artifacts,
    activeArtifactId:
      project.research == null && localProject.research != null
        ? localProject.activeArtifactId ?? project.activeArtifactId
        : project.activeArtifactId,
    diagram: localProject.diagram ?? project.diagram,
  });
}

function mapProjectToDbProject(project: Project, userId: string): DbProject {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    description: project.description,
    phase: project.phase,
    artifacts: project.artifacts ?? null,
    active_artifact_id: project.activeArtifactId ?? null,
    created_at: project.updatedAt,
    updated_at: project.updatedAt,
  };
}

function mapProjectToDbMessages(project: Project): DbMessage[] {
  return project.messages.map((message) => ({
    id: message.id,
    project_id: project.id,
    sender: message.sender,
    content: message.content,
    created_at: message.createdAt,
  }));
}

function mapProjectToDbCanvasItems(project: Project): DbCanvasItem[] {
  const notes = project.notes.map<DbCanvasItem>((note) => ({
    id: note.id,
    project_id: project.id,
    type: "note",
    data: {
      title: note.title,
      content: note.content,
      color: note.color,
    },
    x: note.x,
    y: note.y,
    created_at: project.updatedAt,
    updated_at: project.updatedAt,
  }));

  const sections = (project.sections ?? []).map<DbCanvasItem>((section) => ({
    id: section.id,
    project_id: project.id,
    type: "section",
    data: {
      title: section.title,
      color: section.color,
      width: section.width,
      height: section.height,
    },
    x: section.x,
    y: section.y,
    created_at: project.updatedAt,
    updated_at: project.updatedAt,
  }));

  const documents = project.documents.map<DbCanvasItem>((document) => ({
    id: document.id,
    project_id: project.id,
    type: "document",
    data: {
      title: document.title,
      content: document.content,
    },
    x: document.x,
    y: document.y,
    created_at: project.updatedAt,
    updated_at: project.updatedAt,
  }));

  const websiteBuilders = (project.websiteBuilders ?? []).map<DbCanvasItem>((builder) => ({
    id: builder.id,
    project_id: project.id,
    type: "website_builder",
    data: {
      title: builder.title,
      blocks: builder.blocks,
    },
    x: builder.x,
    y: builder.y,
    created_at: project.updatedAt,
    updated_at: project.updatedAt,
  }));

  return [...notes, ...sections, ...documents, ...websiteBuilders];
}

function mapProjectToDbPhases(project: Project): DbPhase[] {
  return project.phases.map((phase, index) => ({
    id: phase.id,
    project_id: project.id,
    title: phase.title,
    sort_order: index,
  }));
}

function mapProjectToDbPhaseTasks(project: Project): DbPhaseTask[] {
  return project.phases.flatMap((phase) =>
    phase.tasks.map((task, index) => ({
      id: task.id,
      phase_id: phase.id,
      project_id: project.id,
      label: task.label,
      done: task.done,
      sort_order: index,
    })),
  );
}

async function getSupabaseUserId() {
  const supabase = createBrowserClient();

  if (!supabase) {
    return { supabase: null, userId: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { supabase, userId: user?.id ?? null };
}

async function fetchPhaseTasks(projectIds: string[]): Promise<DbPhaseTask[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const supabase = createBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("phase_tasks")
    .select("*")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DbPhaseTask[];
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const { supabase, userId } = await getSupabaseUserId();

    if (!supabase || !userId) {
      return getStoredProjects();
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*, messages(*), canvas_items(*), phases(*)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const projects = (data ?? []) as ProjectRow[];
    const phaseTasks = await fetchPhaseTasks(projects.map((project) => project.id));

    return projects.map((project) =>
      mergeLocalProjectState(
        mapProjectRow(
          project,
          phaseTasks.filter((task) => task.project_id === project.id),
        ),
      ),
    );
  } catch (error) {
    console.warn("Failed to fetch projects from Supabase, falling back to localStorage.", error);
    return getStoredProjects();
  }
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  try {
    const { supabase, userId } = await getSupabaseUserId();

    if (!supabase || !userId) {
      return getProjectById(id);
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*, messages(*), canvas_items(*), phases(*)")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return getProjectById(id);
    }

    const phaseTasks = await fetchPhaseTasks([id]);
    return mergeLocalProjectState(mapProjectRow(data as ProjectRow, phaseTasks));
  } catch (error) {
    console.warn(`Failed to fetch project ${id} from Supabase, falling back to localStorage.`, error);
    return getProjectById(id);
  }
}

export async function saveProjectToSupabase(project: Project): Promise<void> {
  upsertProject(project);

  try {
    const { supabase, userId } = await getSupabaseUserId();

    if (!supabase || !userId) {
      return;
    }

    const dbProject = mapProjectToDbProject(project, userId);
    const dbMessages = mapProjectToDbMessages(project);
    const dbCanvasItems = mapProjectToDbCanvasItems(project);
    const dbPhases = mapProjectToDbPhases(project);
    const dbPhaseTasks = mapProjectToDbPhaseTasks(project);

    const { error: projectError } = await supabase.from("projects").upsert(dbProject);

    if (projectError) {
      throw projectError;
    }

    const { error: deleteMessagesError } = await supabase.from("messages").delete().eq("project_id", project.id);
    if (deleteMessagesError) {
      throw deleteMessagesError;
    }

    const { error: deleteCanvasError } = await supabase.from("canvas_items").delete().eq("project_id", project.id);
    if (deleteCanvasError) {
      throw deleteCanvasError;
    }

    const { error: deleteTasksError } = await supabase.from("phase_tasks").delete().eq("project_id", project.id);
    if (deleteTasksError) {
      throw deleteTasksError;
    }

    const { error: deletePhasesError } = await supabase.from("phases").delete().eq("project_id", project.id);
    if (deletePhasesError) {
      throw deletePhasesError;
    }

    if (dbMessages.length > 0) {
      const { error } = await supabase.from("messages").insert(dbMessages);
      if (error) {
        throw error;
      }
    }

    if (dbCanvasItems.length > 0) {
      const { error } = await supabase.from("canvas_items").insert(dbCanvasItems);
      if (error) {
        throw error;
      }
    }

    if (dbPhases.length > 0) {
      const { error } = await supabase.from("phases").insert(dbPhases);
      if (error) {
        throw error;
      }
    }

    if (dbPhaseTasks.length > 0) {
      const { error } = await supabase.from("phase_tasks").insert(dbPhaseTasks);
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.warn(`Failed to save project ${project.id} to Supabase, falling back to localStorage.`, error);
    upsertProject(project);
  }
}

export async function createSupabaseProject(): Promise<Project> {
  const project = createProjectRecord();

  try {
    await saveProjectToSupabase(project);
    return project;
  } catch (error) {
    console.warn("Failed to create Supabase-backed project, falling back to localStorage.", error);
    return upsertProject(project)[0] ?? project;
  }
}

export async function deleteProjectFromSupabase(id: string): Promise<void> {
  try {
    const { supabase, userId } = await getSupabaseUserId();

    if (!supabase || !userId) {
      const remainingProjects = getStoredProjects().filter((project) => project.id !== id);
      saveStoredProjects(remainingProjects);
      return;
    }

    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(`Failed to delete project ${id} from Supabase, falling back to localStorage.`, error);
    const remainingProjects = getStoredProjects().filter((project) => project.id !== id);
    saveStoredProjects(remainingProjects);
  }
}
