export type DbProject = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  phase: string;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: string;
  project_id: string;
  sender: "user" | "assistant";
  content: string;
  created_at: string;
};

export type CanvasItemType = "note" | "section" | "document" | "website_builder";

export type DbCanvasItem = {
  id: string;
  project_id: string;
  type: CanvasItemType;
  data: Record<string, unknown>;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
};

export type DbPhase = {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
};

export type DbPhaseTask = {
  id: string;
  phase_id: string;
  project_id: string;
  label: string;
  done: boolean;
  sort_order: number;
};

export type Tables = {
  projects: DbProject;
  messages: DbMessage;
  canvas_items: DbCanvasItem;
  phases: DbPhase;
  phase_tasks: DbPhaseTask;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCanvasItemType = (value: unknown): value is CanvasItemType =>
  value === "note" ||
  value === "section" ||
  value === "document" ||
  value === "website_builder";

const isMessageSender = (value: unknown): value is DbMessage["sender"] =>
  value === "user" || value === "assistant";

export const isDbProject = (value: unknown): value is DbProject => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.phase === "string" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
};

export const isDbMessage = (value: unknown): value is DbMessage => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.project_id === "string" &&
    isMessageSender(value.sender) &&
    typeof value.content === "string" &&
    typeof value.created_at === "string"
  );
};

export const isDbCanvasItem = (value: unknown): value is DbCanvasItem => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.project_id === "string" &&
    isCanvasItemType(value.type) &&
    isRecord(value.data) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
};

export const isDbPhase = (value: unknown): value is DbPhase => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.project_id === "string" &&
    typeof value.title === "string" &&
    typeof value.sort_order === "number"
  );
};

export const isDbPhaseTask = (value: unknown): value is DbPhaseTask => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.phase_id === "string" &&
    typeof value.project_id === "string" &&
    typeof value.label === "string" &&
    typeof value.done === "boolean" &&
    typeof value.sort_order === "number"
  );
};
