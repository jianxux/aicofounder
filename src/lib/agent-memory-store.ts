import type { DbAgentSession, DbMemoryEntry, DbMemorySummary } from "@/lib/database.types";
import {
  buildAgentSessionInsert,
  buildMemoryEntryInsert,
  buildMemoryEntryUpdate,
  buildMemorySummaryInsert,
  canonicalizeDedupeKey,
  compareMemoryEntries,
  compareMemorySummaries,
  mapDbAgentSession,
  mapDbMemoryEntry,
  mapDbMemorySummary,
  normalizeMemoryText,
} from "@/lib/agent-memory";
import type {
  AgentSession,
  CreateMemoryEntryInput,
  CreateMemorySummaryInput,
  EndAgentSessionInput,
  MemoryEntry,
  MemorySummary,
  StartAgentSessionInput,
  UpdateMemoryEntryInput,
} from "@/lib/agent-memory";
import type { MemoryConfirmation, MemoryStatus } from "@/lib/database.types";
import {
  searchMemoryEntries,
  searchMemorySummaries,
  type MemoryEntrySearchResult,
  type MemorySearchOptions,
  type MemorySummarySearchResult,
} from "@/lib/memory-search";

type QueryResult<T> = Promise<{ data: T | null; error: Error | null }>;

type FilterOperator = "eq" | "in" | "is";

type TableRow = DbAgentSession | DbMemoryEntry | DbMemorySummary;

type QueryBuilder<Row extends TableRow> = PromiseLike<{ data: Row[] | null; error: Error | null }> & {
  select(columns: string): QueryBuilder<Row>;
  insert(payload: Partial<Row> | Partial<Row>[]): QueryBuilder<Row>;
  update(payload: Partial<Row>): QueryBuilder<Row>;
  eq(column: string, value: unknown): QueryBuilder<Row>;
  in(column: string, values: readonly unknown[]): QueryBuilder<Row>;
  is(column: string, value: unknown): QueryBuilder<Row>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<Row>;
  maybeSingle(): QueryResult<Row>;
  then<TResult1 = { data: Row[] | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};

type SupabaseLike = {
  from<Row extends TableRow>(table: "agent_sessions" | "memory_entries" | "memory_summaries"): QueryBuilder<Row>;
};

export type UpsertDurableMemoryResult =
  | { action: "created"; entry: MemoryEntry; supersededEntries: MemoryEntry[] }
  | { action: "deduped"; entry: MemoryEntry; supersededEntries: MemoryEntry[] }
  | { action: "superseded"; entry: MemoryEntry; supersededEntries: MemoryEntry[] };

type ListMemoryEntriesOptions = {
  sessionId?: string;
  statuses?: MemoryStatus[];
};

type ListMemorySummariesOptions = {
  sessionId?: string;
};

type SearchMemoryEntriesOptions = ListMemoryEntriesOptions & MemorySearchOptions;
type SearchMemorySummariesOptions = ListMemorySummariesOptions & MemorySearchOptions;

async function expectSingle<Row extends TableRow>(promise: QueryResult<Row>): Promise<Row> {
  const { data, error } = await promise;

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Expected a single row but none was returned.");
  }

  return data;
}

async function expectMany<Row extends TableRow>(
  promise: PromiseLike<{ data: Row[] | null; error: Error | null }>,
): Promise<Row[]> {
  const { data, error } = await promise;

  if (error) {
    throw error;
  }

  return data ?? [];
}

function entriesEquivalent(existing: MemoryEntry, next: CreateMemoryEntryInput) {
  const nextTitle = next.title?.trim() ?? existing.title;
  const nextContent = next.content.trim();

  return (
    normalizeMemoryText(existing.title) === normalizeMemoryText(nextTitle) &&
    normalizeMemoryText(existing.content) === normalizeMemoryText(nextContent)
  );
}

const confirmationWeight: Record<MemoryConfirmation, number> = {
  assistant_inferred: 0,
  system_imported: 1,
  user_confirmed: 2,
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeStringArrays(existing: readonly string[], next: readonly string[]) {
  return [...new Set([...existing, ...next])];
}

function mergeUnknownArrays(existing: readonly unknown[], next: readonly unknown[]) {
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const item of [...existing, ...next]) {
    const key = JSON.stringify(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function buildMetadataStrengtheningUpdate(existing: MemoryEntry, next: CreateMemoryEntryInput): UpdateMemoryEntryInput | null {
  const update: UpdateMemoryEntryInput = {};

  const normalizedTags = asStringArray(next.tags);
  const mergedTags = mergeStringArrays(existing.tags, normalizedTags);
  if (mergedTags.join("\u0000") !== existing.tags.join("\u0000")) {
    update.tags = mergedTags;
  }

  const normalizedSourceRefs = Array.isArray(next.sourceRefs) ? next.sourceRefs : [];
  const mergedSourceRefs = mergeUnknownArrays(existing.sourceRefs, normalizedSourceRefs);
  if (JSON.stringify(mergedSourceRefs) !== JSON.stringify(existing.sourceRefs)) {
    update.sourceRefs = mergedSourceRefs;
  }

  if (typeof next.importance === "number" && Number.isFinite(next.importance) && next.importance > existing.importance) {
    update.importance = next.importance;
  }

  if (typeof next.confidence === "number" && Number.isFinite(next.confidence) && next.confidence > existing.confidence) {
    update.confidence = next.confidence;
  }

  if (
    next.confirmationStatus &&
    confirmationWeight[next.confirmationStatus] > confirmationWeight[existing.confirmationStatus]
  ) {
    update.confirmationStatus = next.confirmationStatus;
  }

  if (next.sessionId && !existing.sessionId) {
    update.sessionId = next.sessionId;
  }

  if (next.sourceMessageId && !existing.sourceMessageId) {
    update.sourceMessageId = next.sourceMessageId;
  }

  const normalizedSource = next.source?.trim();
  if (normalizedSource && normalizedSource !== existing.source && existing.source === "chat") {
    update.source = normalizedSource;
  }

  return Object.keys(update).length > 0 ? update : null;
}

function isUniqueViolation(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (code === "23505") {
    return true;
  }

  return /duplicate key|unique constraint|23505/i.test(error.message);
}

export function createAgentMemoryStore(supabase: SupabaseLike) {
  const store = {
    async getActiveMemoryEntriesByDedupe(projectId: string, dedupeKey: string): Promise<MemoryEntry[]> {
      const rows = await expectMany(
        supabase
          .from<DbMemoryEntry>("memory_entries")
          .select("*")
          .eq("project_id", projectId)
          .eq("dedupe_key", dedupeKey)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .order("id", { ascending: true }),
      );

      return rows.map(mapDbMemoryEntry).sort(compareMemoryEntries);
    },

    async startAgentSession(input: StartAgentSessionInput): Promise<AgentSession> {
      const payload = buildAgentSessionInsert(input);
      const row = await expectSingle(
        supabase.from<DbAgentSession>("agent_sessions").insert(payload).select("*").maybeSingle(),
      );

      return mapDbAgentSession(row);
    },

    async endAgentSession(sessionId: string, input: EndAgentSessionInput = {}): Promise<AgentSession> {
      const payload: Partial<DbAgentSession> = {
        ended_at: input.endedAt ?? new Date().toISOString(),
        updated_at: input.endedAt ?? new Date().toISOString(),
      };

      if (input.metadata !== undefined) {
        payload.metadata = input.metadata;
      }

      const row = await expectSingle(
        supabase.from<DbAgentSession>("agent_sessions").update(payload).eq("id", sessionId).select("*").maybeSingle(),
      );

      return mapDbAgentSession(row);
    },

    async createMemoryEntry(input: CreateMemoryEntryInput): Promise<MemoryEntry> {
      const payload = buildMemoryEntryInsert(input);
      const row = await expectSingle(
        supabase.from<DbMemoryEntry>("memory_entries").insert(payload).select("*").maybeSingle(),
      );

      return mapDbMemoryEntry(row);
    },

    async updateMemoryEntry(id: string, input: UpdateMemoryEntryInput): Promise<MemoryEntry> {
      const payload = buildMemoryEntryUpdate(input);
      const row = await expectSingle(
        supabase.from<DbMemoryEntry>("memory_entries").update(payload).eq("id", id).select("*").maybeSingle(),
      );

      return mapDbMemoryEntry(row);
    },

    async listMemoryEntriesByProject(projectId: string, options: ListMemoryEntriesOptions = {}): Promise<MemoryEntry[]> {
      let query = supabase
        .from<DbMemoryEntry>("memory_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true });

      if (options.sessionId) {
        query = query.eq("session_id", options.sessionId);
      }

      if (options.statuses && options.statuses.length > 0) {
        query = query.in("status", options.statuses);
      }

      const rows = await expectMany(query);
      return rows.map(mapDbMemoryEntry).sort(compareMemoryEntries);
    },

    async listMemoryEntriesBySession(sessionId: string, options: Omit<ListMemoryEntriesOptions, "sessionId"> = {}): Promise<MemoryEntry[]> {
      let query = supabase
        .from<DbMemoryEntry>("memory_entries")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });

      if (options.statuses && options.statuses.length > 0) {
        query = query.in("status", options.statuses);
      }

      const rows = await expectMany(query);
      return rows.map(mapDbMemoryEntry).sort(compareMemoryEntries);
    },

    async searchMemoryEntriesByProject(
      projectId: string,
      query: string,
      options: SearchMemoryEntriesOptions = {},
    ): Promise<MemoryEntrySearchResult[]> {
      const entries = await store.listMemoryEntriesByProject(projectId, {
        sessionId: options.sessionId,
        statuses: options.statuses,
      });

      return searchMemoryEntries(entries, query, {
        limit: options.limit,
        projectId,
        sessionId: options.sessionId,
      });
    },

    async searchMemoryEntriesBySession(
      sessionId: string,
      query: string,
      options: Omit<SearchMemoryEntriesOptions, "sessionId"> = {},
    ): Promise<MemoryEntrySearchResult[]> {
      const entries = await store.listMemoryEntriesBySession(sessionId, {
        statuses: options.statuses,
      });

      return searchMemoryEntries(entries, query, {
        limit: options.limit,
        sessionId,
      });
    },

    async upsertDurableMemory(input: CreateMemoryEntryInput): Promise<UpsertDurableMemoryResult> {
      const dedupeKey = canonicalizeDedupeKey(input.dedupeKey);
      if (!dedupeKey) {
        return {
          action: "created",
          entry: await this.createMemoryEntry(input),
          supersededEntries: [],
        };
      }

      if (!input.projectId) {
        throw new Error("upsertDurableMemory requires a projectId when dedupeKey is provided.");
      }

      const supersededEntries: MemoryEntry[] = [];

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const existingEntries = await this.getActiveMemoryEntriesByDedupe(input.projectId, dedupeKey);
        const latest = existingEntries[0];

        if (!latest) {
          try {
            return {
              action: "created",
              entry: await this.createMemoryEntry({ ...input, dedupeKey, status: "active" }),
              supersededEntries,
            };
          } catch (error) {
            if (isUniqueViolation(error)) {
              continue;
            }
            throw error;
          }
        }

        if (entriesEquivalent(latest, input)) {
          const strengthenedUpdate = buildMetadataStrengtheningUpdate(latest, input);
          const entry = strengthenedUpdate ? await this.updateMemoryEntry(latest.id, strengthenedUpdate) : latest;
          return {
            action: "deduped",
            entry,
            supersededEntries,
          };
        }

        const superseded = await this.updateMemoryEntry(latest.id, { status: "superseded" });
        supersededEntries.push(superseded);

        try {
          const entry = await this.createMemoryEntry({
            ...input,
            dedupeKey,
            supersedesMemoryId: latest.id,
            status: "active",
          });

          return {
            action: "superseded",
            entry,
            supersededEntries,
          };
        } catch (error) {
          if (isUniqueViolation(error)) {
            continue;
          }
          throw error;
        }
      }

      throw new Error(`Unable to upsert durable memory for dedupe key "${dedupeKey}" after multiple attempts.`);
    },

    async createMemorySummary(input: CreateMemorySummaryInput): Promise<MemorySummary> {
      const payload = buildMemorySummaryInsert(input);
      const row = await expectSingle(
        supabase.from<DbMemorySummary>("memory_summaries").insert(payload).select("*").maybeSingle(),
      );

      return mapDbMemorySummary(row);
    },

    async listMemorySummariesByProject(projectId: string, options: ListMemorySummariesOptions = {}): Promise<MemorySummary[]> {
      let query = supabase
        .from<DbMemorySummary>("memory_summaries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .order("summary_version", { ascending: false })
        .order("id", { ascending: true });

      if (options.sessionId) {
        query = query.eq("session_id", options.sessionId);
      }

      const rows = await expectMany(query);
      return rows.map(mapDbMemorySummary).sort(compareMemorySummaries);
    },

    async listMemorySummariesBySession(sessionId: string): Promise<MemorySummary[]> {
      const rows = await expectMany(
        supabase
          .from<DbMemorySummary>("memory_summaries")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .order("summary_version", { ascending: false })
          .order("id", { ascending: true }),
      );

      return rows.map(mapDbMemorySummary).sort(compareMemorySummaries);
    },

    async searchMemorySummariesByProject(
      projectId: string,
      query: string,
      options: SearchMemorySummariesOptions = {},
    ): Promise<MemorySummarySearchResult[]> {
      const summaries = await store.listMemorySummariesByProject(projectId, {
        sessionId: options.sessionId,
      });

      return searchMemorySummaries(summaries, query, {
        limit: options.limit,
        projectId,
        sessionId: options.sessionId,
      });
    },

    async searchMemorySummariesBySession(
      sessionId: string,
      query: string,
      options: MemorySearchOptions = {},
    ): Promise<MemorySummarySearchResult[]> {
      const summaries = await store.listMemorySummariesBySession(sessionId);
      return searchMemorySummaries(summaries, query, {
        limit: options.limit,
        sessionId,
      });
    },
  };

  return store;
}
