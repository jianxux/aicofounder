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

export type AgentSessionOrigin = "chat" | "brainstorm" | "research" | "ultraplan";

export type DbAgentSession = {
  id: string;
  user_id: string;
  project_id: string;
  origin: AgentSessionOrigin;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MemoryScope = "user" | "project" | "session" | "run";

export type MemoryKind =
  | "fact"
  | "decision"
  | "constraint"
  | "research_finding"
  | "customer_quote"
  | "task_state"
  | "summary";

export type MemoryStatus = "active" | "superseded" | "archived";

export type MemoryConfirmation = "user_confirmed" | "assistant_inferred" | "system_imported";

export type SummaryLevel = "session" | "phase" | "project";

export type DbMemoryEntry = {
  id: string;
  user_id: string;
  project_id: string | null;
  session_id: string | null;
  scope: MemoryScope;
  kind: MemoryKind;
  title: string;
  content: string;
  source: string;
  source_message_id: string | null;
  source_refs: unknown[];
  tags: string[];
  importance: number;
  confidence: number;
  confirmation_status: MemoryConfirmation;
  status: MemoryStatus;
  supersedes_memory_id: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
};

export type DbMemorySummary = {
  id: string;
  user_id: string;
  project_id: string;
  session_id: string | null;
  summary_level: SummaryLevel;
  summary_version: number;
  content: string;
  source_message_start_id: string | null;
  source_message_end_id: string | null;
  token_estimate: number;
  freshness_score: number;
  created_at: string;
  updated_at: string;
};

export type Tables = {
  projects: DbProject;
  messages: DbMessage;
  canvas_items: DbCanvasItem;
  phases: DbPhase;
  phase_tasks: DbPhaseTask;
  agent_sessions: DbAgentSession;
  memory_entries: DbMemoryEntry;
  memory_summaries: DbMemorySummary;
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

export const isAgentSessionOrigin = (value: unknown): value is AgentSessionOrigin =>
  value === "chat" || value === "brainstorm" || value === "research" || value === "ultraplan";

export const isMemoryScope = (value: unknown): value is MemoryScope =>
  value === "user" || value === "project" || value === "session" || value === "run";

export const isMemoryKind = (value: unknown): value is MemoryKind =>
  value === "fact" ||
  value === "decision" ||
  value === "constraint" ||
  value === "research_finding" ||
  value === "customer_quote" ||
  value === "task_state" ||
  value === "summary";

export const isMemoryStatus = (value: unknown): value is MemoryStatus =>
  value === "active" || value === "superseded" || value === "archived";

export const isMemoryConfirmation = (value: unknown): value is MemoryConfirmation =>
  value === "user_confirmed" || value === "assistant_inferred" || value === "system_imported";

export const isSummaryLevel = (value: unknown): value is SummaryLevel =>
  value === "session" || value === "phase" || value === "project";

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

export const isDbAgentSession = (value: unknown): value is DbAgentSession => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.project_id === "string" &&
    isAgentSessionOrigin(value.origin) &&
    typeof value.started_at === "string" &&
    (value.ended_at === null || typeof value.ended_at === "string") &&
    isRecord(value.metadata) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
};

export const isDbMemoryEntry = (value: unknown): value is DbMemoryEntry => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    (value.project_id === null || typeof value.project_id === "string") &&
    (value.session_id === null || typeof value.session_id === "string") &&
    isMemoryScope(value.scope) &&
    isMemoryKind(value.kind) &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.source === "string" &&
    (value.source_message_id === null || typeof value.source_message_id === "string") &&
    Array.isArray(value.source_refs) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.importance === "number" &&
    typeof value.confidence === "number" &&
    isMemoryConfirmation(value.confirmation_status) &&
    isMemoryStatus(value.status) &&
    (value.supersedes_memory_id === null || typeof value.supersedes_memory_id === "string") &&
    (value.dedupe_key === null || typeof value.dedupe_key === "string") &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
};

export const isDbMemorySummary = (value: unknown): value is DbMemorySummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.project_id === "string" &&
    (value.session_id === null || typeof value.session_id === "string") &&
    isSummaryLevel(value.summary_level) &&
    typeof value.summary_version === "number" &&
    typeof value.content === "string" &&
    (value.source_message_start_id === null || typeof value.source_message_start_id === "string") &&
    (value.source_message_end_id === null || typeof value.source_message_end_id === "string") &&
    typeof value.token_estimate === "number" &&
    typeof value.freshness_score === "number" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
};
