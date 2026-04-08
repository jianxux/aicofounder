import type {
  AgentSessionOrigin,
  DbAgentSession,
  DbMemoryEntry,
  DbMemorySummary,
  MemoryConfirmation,
  MemoryKind,
  MemoryScope,
  MemoryStatus,
  SummaryLevel,
} from "@/lib/database.types";
import {
  isAgentSessionOrigin,
  isDbAgentSession,
  isDbMemoryEntry,
  isDbMemorySummary,
  isMemoryConfirmation,
  isMemoryKind,
  isMemoryScope,
  isMemoryStatus,
  isSummaryLevel,
} from "@/lib/database.types";

export type AgentSession = {
  id: string;
  userId: string;
  projectId: string;
  origin: AgentSessionOrigin;
  startedAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MemoryEntry = {
  id: string;
  userId: string;
  projectId: string | null;
  sessionId: string | null;
  scope: MemoryScope;
  kind: MemoryKind;
  title: string;
  content: string;
  source: string;
  sourceMessageId: string | null;
  sourceRefs: unknown[];
  tags: string[];
  importance: number;
  confidence: number;
  confirmationStatus: MemoryConfirmation;
  status: MemoryStatus;
  supersedesMemoryId: string | null;
  dedupeKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemorySummary = {
  id: string;
  userId: string;
  projectId: string;
  sessionId: string | null;
  summaryLevel: SummaryLevel;
  summaryVersion: number;
  content: string;
  sourceMessageStartId: string | null;
  sourceMessageEndId: string | null;
  tokenEstimate: number;
  freshnessScore: number;
  createdAt: string;
  updatedAt: string;
};

export type StartAgentSessionInput = {
  userId: string;
  projectId: string;
  origin?: AgentSessionOrigin;
  startedAt?: string;
  metadata?: Record<string, unknown>;
};

export type EndAgentSessionInput = {
  endedAt?: string;
  metadata?: Record<string, unknown>;
};

export type CreateMemoryEntryInput = {
  userId: string;
  projectId?: string | null;
  sessionId?: string | null;
  scope?: MemoryScope;
  kind: MemoryKind;
  title?: string;
  content: string;
  source?: string;
  sourceMessageId?: string | null;
  sourceRefs?: unknown[];
  tags?: string[];
  importance?: number;
  confidence?: number;
  confirmationStatus?: MemoryConfirmation;
  status?: MemoryStatus;
  supersedesMemoryId?: string | null;
  dedupeKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateMemoryEntryInput = Partial<
  Omit<CreateMemoryEntryInput, "userId" | "kind" | "content">
> & {
  kind?: MemoryKind;
  content?: string;
};

export type CreateMemorySummaryInput = {
  userId: string;
  projectId: string;
  sessionId?: string | null;
  summaryLevel: SummaryLevel;
  summaryVersion?: number;
  content: string;
  sourceMessageStartId?: string | null;
  sourceMessageEndId?: string | null;
  tokenEstimate?: number;
  freshnessScore?: number;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_AGENT_SESSION_ORIGIN: AgentSessionOrigin = "chat";
export const DEFAULT_MEMORY_SCOPE: MemoryScope = "project";
export const DEFAULT_MEMORY_SOURCE = "chat";
export const DEFAULT_MEMORY_IMPORTANCE = 3;
export const DEFAULT_MEMORY_CONFIDENCE = 0.75;
export const DEFAULT_MEMORY_CONFIRMATION: MemoryConfirmation = "assistant_inferred";
export const DEFAULT_MEMORY_STATUS: MemoryStatus = "active";
export const DEFAULT_SUMMARY_VERSION = 1;
export const DEFAULT_SUMMARY_TOKEN_ESTIMATE = 0;
export const DEFAULT_SUMMARY_FRESHNESS_SCORE = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asUnknownArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeImportance = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MEMORY_IMPORTANCE;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
};

const normalizeConfidence = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MEMORY_CONFIDENCE;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(3))));
};

const normalizeFreshnessScore = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SUMMARY_FRESHNESS_SCORE;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(3))));
};

const normalizeTokenEstimate = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SUMMARY_TOKEN_ESTIMATE;
  }

  return Math.max(0, Math.round(value));
};

export const normalizeMemoryText = (value: string) => value.trim().replace(/\s+/g, " ");

export const canonicalizeDedupeKey = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeMemoryText(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const buildMemoryEntryInsert = (input: CreateMemoryEntryInput): Omit<DbMemoryEntry, "id"> => ({
  user_id: input.userId,
  project_id: input.projectId ?? null,
  session_id: input.sessionId ?? null,
  scope: input.scope ?? DEFAULT_MEMORY_SCOPE,
  kind: input.kind,
  title: input.title?.trim() ?? "",
  content: input.content.trim(),
  source: input.source?.trim() || DEFAULT_MEMORY_SOURCE,
  source_message_id: input.sourceMessageId ?? null,
  source_refs: asUnknownArray(input.sourceRefs),
  tags: asStringArray(input.tags),
  importance: normalizeImportance(input.importance),
  confidence: normalizeConfidence(input.confidence),
  confirmation_status: input.confirmationStatus ?? DEFAULT_MEMORY_CONFIRMATION,
  status: input.status ?? DEFAULT_MEMORY_STATUS,
  supersedes_memory_id: input.supersedesMemoryId ?? null,
  dedupe_key: canonicalizeDedupeKey(input.dedupeKey),
  created_at: input.createdAt ?? new Date().toISOString(),
  updated_at: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
});

export const buildMemoryEntryUpdate = (input: UpdateMemoryEntryInput): Partial<DbMemoryEntry> => {
  const update: Partial<DbMemoryEntry> = {};

  if (input.projectId !== undefined) {
    update.project_id = input.projectId;
  }

  if (input.sessionId !== undefined) {
    update.session_id = input.sessionId;
  }

  if (input.scope !== undefined) {
    update.scope = input.scope;
  }

  if (input.kind !== undefined) {
    update.kind = input.kind;
  }

  if (input.title !== undefined) {
    update.title = input.title.trim();
  }

  if (input.content !== undefined) {
    update.content = input.content.trim();
  }

  if (input.source !== undefined) {
    update.source = input.source.trim() || DEFAULT_MEMORY_SOURCE;
  }

  if (input.sourceMessageId !== undefined) {
    update.source_message_id = input.sourceMessageId;
  }

  if (input.sourceRefs !== undefined) {
    update.source_refs = asUnknownArray(input.sourceRefs);
  }

  if (input.tags !== undefined) {
    update.tags = asStringArray(input.tags);
  }

  if (input.importance !== undefined) {
    update.importance = normalizeImportance(input.importance);
  }

  if (input.confidence !== undefined) {
    update.confidence = normalizeConfidence(input.confidence);
  }

  if (input.confirmationStatus !== undefined) {
    update.confirmation_status = input.confirmationStatus;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  if (input.supersedesMemoryId !== undefined) {
    update.supersedes_memory_id = input.supersedesMemoryId;
  }

  if (input.dedupeKey !== undefined) {
    update.dedupe_key = canonicalizeDedupeKey(input.dedupeKey);
  }

  update.updated_at = input.updatedAt ?? new Date().toISOString();

  return update;
};

export const buildMemorySummaryInsert = (input: CreateMemorySummaryInput): Omit<DbMemorySummary, "id"> => ({
  user_id: input.userId,
  project_id: input.projectId,
  session_id: input.sessionId ?? null,
  summary_level: input.summaryLevel,
  summary_version: input.summaryVersion ?? DEFAULT_SUMMARY_VERSION,
  content: input.content.trim(),
  source_message_start_id: input.sourceMessageStartId ?? null,
  source_message_end_id: input.sourceMessageEndId ?? null,
  token_estimate: normalizeTokenEstimate(input.tokenEstimate),
  freshness_score: normalizeFreshnessScore(input.freshnessScore),
  created_at: input.createdAt ?? new Date().toISOString(),
  updated_at: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
});

export const buildAgentSessionInsert = (input: StartAgentSessionInput): Omit<DbAgentSession, "id"> => ({
  user_id: input.userId,
  project_id: input.projectId,
  origin: input.origin ?? DEFAULT_AGENT_SESSION_ORIGIN,
  started_at: input.startedAt ?? new Date().toISOString(),
  ended_at: null,
  metadata: asRecord(input.metadata),
  created_at: input.startedAt ?? new Date().toISOString(),
  updated_at: input.startedAt ?? new Date().toISOString(),
});

export const mapDbAgentSession = (session: DbAgentSession): AgentSession => ({
  id: session.id,
  userId: session.user_id,
  projectId: session.project_id,
  origin: session.origin,
  startedAt: session.started_at,
  endedAt: session.ended_at,
  metadata: asRecord(session.metadata),
  createdAt: session.created_at,
  updatedAt: session.updated_at,
});

export const mapDbMemoryEntry = (entry: DbMemoryEntry): MemoryEntry => ({
  id: entry.id,
  userId: entry.user_id,
  projectId: entry.project_id,
  sessionId: entry.session_id,
  scope: entry.scope,
  kind: entry.kind,
  title: entry.title,
  content: entry.content,
  source: entry.source,
  sourceMessageId: entry.source_message_id,
  sourceRefs: asUnknownArray(entry.source_refs),
  tags: asStringArray(entry.tags),
  importance: entry.importance,
  confidence: entry.confidence,
  confirmationStatus: entry.confirmation_status,
  status: entry.status,
  supersedesMemoryId: entry.supersedes_memory_id,
  dedupeKey: entry.dedupe_key,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
});

export const mapDbMemorySummary = (summary: DbMemorySummary): MemorySummary => ({
  id: summary.id,
  userId: summary.user_id,
  projectId: summary.project_id,
  sessionId: summary.session_id,
  summaryLevel: summary.summary_level,
  summaryVersion: summary.summary_version,
  content: summary.content,
  sourceMessageStartId: summary.source_message_start_id,
  sourceMessageEndId: summary.source_message_end_id,
  tokenEstimate: summary.token_estimate,
  freshnessScore: summary.freshness_score,
  createdAt: summary.created_at,
  updatedAt: summary.updated_at,
});

export const compareMemoryEntries = (left: Pick<MemoryEntry, "status" | "importance" | "updatedAt" | "createdAt" | "id">, right: Pick<MemoryEntry, "status" | "importance" | "updatedAt" | "createdAt" | "id">) => {
  const statusWeight = { active: 0, superseded: 1, archived: 2 } as const;
  const leftStatus = statusWeight[left.status];
  const rightStatus = statusWeight[right.status];

  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus;
  }

  if (left.importance !== right.importance) {
    return right.importance - left.importance;
  }

  const updatedDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const createdDelta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
};

export const compareMemorySummaries = (
  left: Pick<MemorySummary, "summaryLevel" | "summaryVersion" | "createdAt" | "id">,
  right: Pick<MemorySummary, "summaryLevel" | "summaryVersion" | "createdAt" | "id">,
) => {
  const levelWeight = { project: 0, phase: 1, session: 2 } as const;
  const leftLevel = levelWeight[left.summaryLevel];
  const rightLevel = levelWeight[right.summaryLevel];

  if (leftLevel !== rightLevel) {
    return leftLevel - rightLevel;
  }

  if (left.summaryVersion !== right.summaryVersion) {
    return right.summaryVersion - left.summaryVersion;
  }

  const createdDelta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
};

export const isAgentSession = (value: unknown): value is AgentSession =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.userId === "string" &&
  typeof value.projectId === "string" &&
  isAgentSessionOrigin(value.origin) &&
  typeof value.startedAt === "string" &&
  (value.endedAt === null || typeof value.endedAt === "string") &&
  isRecord(value.metadata) &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

export const isMemoryEntry = (value: unknown): value is MemoryEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.userId === "string" &&
  (value.projectId === null || typeof value.projectId === "string") &&
  (value.sessionId === null || typeof value.sessionId === "string") &&
  isMemoryScope(value.scope) &&
  isMemoryKind(value.kind) &&
  typeof value.title === "string" &&
  typeof value.content === "string" &&
  typeof value.source === "string" &&
  (value.sourceMessageId === null || typeof value.sourceMessageId === "string") &&
  Array.isArray(value.sourceRefs) &&
  Array.isArray(value.tags) &&
  value.tags.every((tag) => typeof tag === "string") &&
  typeof value.importance === "number" &&
  typeof value.confidence === "number" &&
  isMemoryConfirmation(value.confirmationStatus) &&
  isMemoryStatus(value.status) &&
  (value.supersedesMemoryId === null || typeof value.supersedesMemoryId === "string") &&
  (value.dedupeKey === null || typeof value.dedupeKey === "string") &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

export const isMemorySummary = (value: unknown): value is MemorySummary =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.userId === "string" &&
  typeof value.projectId === "string" &&
  (value.sessionId === null || typeof value.sessionId === "string") &&
  isSummaryLevel(value.summaryLevel) &&
  typeof value.summaryVersion === "number" &&
  typeof value.content === "string" &&
  (value.sourceMessageStartId === null || typeof value.sourceMessageStartId === "string") &&
  (value.sourceMessageEndId === null || typeof value.sourceMessageEndId === "string") &&
  typeof value.tokenEstimate === "number" &&
  typeof value.freshnessScore === "number" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

export const isValidDbAgentSession = isDbAgentSession;
export const isValidDbMemoryEntry = isDbMemoryEntry;
export const isValidDbMemorySummary = isDbMemorySummary;
