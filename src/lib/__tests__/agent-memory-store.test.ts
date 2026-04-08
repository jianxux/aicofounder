import { beforeEach, describe, expect, it } from "vitest";
import { createAgentMemoryStore } from "@/lib/agent-memory-store";
import type { DbAgentSession, DbMemoryEntry, DbMemorySummary } from "@/lib/database.types";

type Tables = {
  agent_sessions: DbAgentSession[];
  memory_entries: DbMemoryEntry[];
  memory_summaries: DbMemorySummary[];
};

type InsertHook = (
  table: keyof Tables,
  row: Record<string, unknown>,
  tables: Tables,
) => Error | null;

type OrderSpec = { column: string; ascending: boolean };
type FilterSpec =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; value: readonly unknown[] }
  | { op: "is"; column: string; value: unknown };

function compareUnknown(left: unknown, right: unknown) {
  if (left === right) {
    return 0;
  }

  if (left == null) {
    return -1;
  }

  if (right == null) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function createUniqueViolation(message = "duplicate key value violates unique constraint") {
  const error = new Error(message) as Error & { code: string };
  error.code = "23505";
  return error;
}

function createMemorySupabase(initial?: Partial<Tables>, options?: { onInsert?: InsertHook }) {
  const tables: Tables = {
    agent_sessions: initial?.agent_sessions ? [...initial.agent_sessions] : [],
    memory_entries: initial?.memory_entries ? [...initial.memory_entries] : [],
    memory_summaries: initial?.memory_summaries ? [...initial.memory_summaries] : [],
  };

  let nextId = 100;

  class Builder<Row extends Tables[keyof Tables][number]> {
    private filters: FilterSpec[] = [];
    private orders: OrderSpec[] = [];
    private mode: "select" | "insert" | "update" = "select";
    private insertPayload: Partial<Row>[] = [];
    private updatePayload: Partial<Row> | null = null;

    constructor(private readonly table: keyof Tables) {}

    select(_columns: string) {
      return this;
    }

    insert(payload: Partial<Row> | Partial<Row>[]) {
      this.mode = "insert";
      this.insertPayload = Array.isArray(payload) ? payload : [payload];
      return this;
    }

    update(payload: Partial<Row>) {
      this.mode = "update";
      this.updatePayload = payload;
      return this;
    }

    eq(column: string, value: unknown) {
      this.filters.push({ op: "eq", column, value });
      return this;
    }

    in(column: string, value: readonly unknown[]) {
      this.filters.push({ op: "in", column, value });
      return this;
    }

    is(column: string, value: unknown) {
      this.filters.push({ op: "is", column, value });
      return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.orders.push({ column, ascending: options?.ascending ?? true });
      return this;
    }

    async maybeSingle() {
      try {
        const rows = await this.execute();
        return { data: rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }

    then<TResult1 = { data: Row[] | null; error: Error | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return this.executePromise().then(onfulfilled, onrejected);
    }

    private executePromise() {
      return this.execute()
        .then((rows) => ({ data: rows, error: null as Error | null }))
        .catch((error) => ({ data: null, error: error as Error }));
    }

    private async execute(): Promise<Row[]> {
      if (this.mode === "insert") {
        const inserted = this.insertPayload.map((item) => {
          const row = {
            ...item,
            id: (item.id ?? `generated-${nextId++}`) as Row["id"],
          } as Row;

          const hookError = options?.onInsert?.(this.table, row as Record<string, unknown>, tables);
          if (hookError) {
            throw hookError;
          }

          if (
            this.table === "memory_entries" &&
            row.status === "active" &&
            typeof row.project_id === "string" &&
            typeof row.dedupe_key === "string"
          ) {
            const duplicate = tables.memory_entries.find(
              (existing) =>
                existing.status === "active" &&
                existing.project_id === row.project_id &&
                existing.dedupe_key === row.dedupe_key,
            );

            if (duplicate) {
              throw createUniqueViolation();
            }
          }

          return row;
        });
        tables[this.table].push(...inserted);
        return this.applyOrder(inserted);
      }

      if (this.mode === "update") {
        const rows = this.filterRows();
        const updated = rows.map((row) => Object.assign(row, this.updatePayload ?? {}));
        return this.applyOrder(updated);
      }

      return this.applyOrder(this.filterRows());
    }

    private filterRows() {
      return tables[this.table].filter((row) =>
        this.filters.every((filter) => {
          const value = (row as Record<string, unknown>)[filter.column];
          if (filter.op === "eq") {
            return value === filter.value;
          }

          if (filter.op === "in") {
            return filter.value.includes(value);
          }

          return value === filter.value;
        }),
      ) as Row[];
    }

    private applyOrder(rows: Row[]) {
      return [...rows].sort((left, right) => {
        for (const order of this.orders) {
          const delta = compareUnknown(
            (left as Record<string, unknown>)[order.column],
            (right as Record<string, unknown>)[order.column],
          );
          if (delta !== 0) {
            return order.ascending ? delta : -delta;
          }
        }

        return 0;
      });
    }
  }

  return {
    tables,
    from<Row extends DbAgentSession | DbMemoryEntry | DbMemorySummary>(table: keyof Tables) {
      return new Builder<Row>(table);
    },
  };
}

function buildMemoryEntry(overrides: Partial<DbMemoryEntry> = {}): DbMemoryEntry {
  return {
    id: "memory-default",
    user_id: "user-1",
    project_id: "project-1",
    session_id: "session-1",
    scope: "project",
    kind: "fact",
    title: "Title",
    content: "Body",
    source: "chat",
    source_message_id: null,
    source_refs: [],
    tags: [],
    importance: 3,
    confidence: 0.7,
    confirmation_status: "assistant_inferred",
    status: "active",
    supersedes_memory_id: null,
    dedupe_key: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildMemorySummary(overrides: Partial<DbMemorySummary> = {}): DbMemorySummary {
  return {
    id: "summary-default",
    user_id: "user-1",
    project_id: "project-1",
    session_id: "session-1",
    summary_level: "session",
    summary_version: 1,
    content: "Summary",
    source_message_start_id: null,
    source_message_end_id: null,
    token_estimate: 100,
    freshness_score: 0.8,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createResultSupabase<Row extends DbAgentSession | DbMemoryEntry | DbMemorySummary>(options: {
  single?: { data: Row | null; error: Error | null };
  many?: { data: Row[] | null; error: Error | null };
}) {
  const single = options.single ?? { data: null, error: null };
  const many = options.many ?? { data: [], error: null };

  const builder = {
    select() {
      return this;
    },
    insert() {
      return this;
    },
    update() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    is() {
      return this;
    },
    order() {
      return this;
    },
    maybeSingle: async () => single,
    then<TResult1 = { data: Row[] | null; error: Error | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(many).then(onfulfilled, onrejected);
    },
  };

  return {
    from() {
      return builder;
    },
  };
}

describe("agent-memory-store", () => {
  let supabase: ReturnType<typeof createMemorySupabase>;

  beforeEach(() => {
    supabase = createMemorySupabase();
  });

  it("starts and ends agent sessions", async () => {
    const store = createAgentMemoryStore(supabase);
    const session = await store.startAgentSession({
      userId: "user-1",
      projectId: "project-1",
      origin: "research",
      startedAt: "2025-01-01T00:00:00.000Z",
      metadata: { topic: "pricing" },
    });

    expect(session.origin).toBe("research");
    expect(session.endedAt).toBeNull();

    const ended = await store.endAgentSession(session.id, {
      endedAt: "2025-01-01T00:05:00.000Z",
      metadata: { topic: "pricing", completed: true },
    });

    expect(ended.endedAt).toBe("2025-01-01T00:05:00.000Z");
    expect(ended.metadata).toEqual({ topic: "pricing", completed: true });
  });

  it("ends a session with generated timestamps when no values are provided", async () => {
    const store = createAgentMemoryStore(supabase);
    const session = await store.startAgentSession({
      userId: "user-1",
      projectId: "project-1",
    });

    const ended = await store.endAgentSession(session.id);

    expect(typeof ended.endedAt).toBe("string");
    expect(ended.updatedAt).toBe(ended.endedAt);
    expect(ended.metadata).toEqual({});
  });

  it("lists memory entries by project and session in deterministic order", async () => {
    supabase.tables.memory_entries.push(
      {
        id: "memory-1",
        user_id: "user-1",
        project_id: "project-1",
        session_id: "session-1",
        scope: "project",
        kind: "fact",
        title: "Lower priority",
        content: "One",
        source: "chat",
        source_message_id: null,
        source_refs: [],
        tags: [],
        importance: 2,
        confidence: 0.7,
        confirmation_status: "assistant_inferred",
        status: "active",
        supersedes_memory_id: null,
        dedupe_key: null,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "memory-2",
        user_id: "user-1",
        project_id: "project-1",
        session_id: "session-1",
        scope: "project",
        kind: "fact",
        title: "Higher priority",
        content: "Two",
        source: "chat",
        source_message_id: null,
        source_refs: [],
        tags: [],
        importance: 5,
        confidence: 0.9,
        confirmation_status: "user_confirmed",
        status: "active",
        supersedes_memory_id: null,
        dedupe_key: null,
        created_at: "2025-01-02T00:00:00.000Z",
        updated_at: "2025-01-02T00:00:00.000Z",
      },
      {
        id: "memory-3",
        user_id: "user-1",
        project_id: "project-1",
        session_id: "session-1",
        scope: "project",
        kind: "fact",
        title: "Old version",
        content: "Three",
        source: "chat",
        source_message_id: null,
        source_refs: [],
        tags: [],
        importance: 5,
        confidence: 0.9,
        confirmation_status: "user_confirmed",
        status: "superseded",
        supersedes_memory_id: null,
        dedupe_key: null,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-04T00:00:00.000Z",
      },
    );

    const store = createAgentMemoryStore(supabase);
    const projectEntries = await store.listMemoryEntriesByProject("project-1");
    const sessionEntries = await store.listMemoryEntriesBySession("session-1");

    expect(projectEntries.map((entry) => entry.id)).toEqual(["memory-2", "memory-1", "memory-3"]);
    expect(sessionEntries.map((entry) => entry.id)).toEqual(["memory-2", "memory-1", "memory-3"]);
  });

  it("applies session and status filters when listing memory entries", async () => {
    supabase.tables.memory_entries.push(
      buildMemoryEntry({ id: "memory-1", session_id: "session-1", status: "active", importance: 1 }),
      buildMemoryEntry({ id: "memory-2", session_id: "session-1", status: "archived", importance: 5 }),
      buildMemoryEntry({ id: "memory-3", session_id: "session-2", status: "active", importance: 5 }),
    );

    const store = createAgentMemoryStore(supabase);
    const projectEntries = await store.listMemoryEntriesByProject("project-1", {
      sessionId: "session-1",
      statuses: ["active"],
    });
    const sessionEntries = await store.listMemoryEntriesBySession("session-1", {
      statuses: ["archived"],
    });

    expect(projectEntries.map((entry) => entry.id)).toEqual(["memory-1"]);
    expect(sessionEntries.map((entry) => entry.id)).toEqual(["memory-2"]);
  });

  it("creates summaries with default versions and lists them in stable order", async () => {
    supabase.tables.memory_summaries.push(
      {
        id: "summary-1",
        user_id: "user-1",
        project_id: "project-1",
        session_id: "session-1",
        summary_level: "session",
        summary_version: 3,
        content: "Session rollup",
        source_message_start_id: null,
        source_message_end_id: null,
        token_estimate: 200,
        freshness_score: 0.8,
        created_at: "2025-01-03T00:00:00.000Z",
        updated_at: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "summary-2",
        user_id: "user-1",
        project_id: "project-1",
        session_id: null,
        summary_level: "project",
        summary_version: 1,
        content: "Project snapshot",
        source_message_start_id: null,
        source_message_end_id: null,
        token_estimate: 400,
        freshness_score: 1,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    );

    const store = createAgentMemoryStore(supabase);
    const created = await store.createMemorySummary({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-1",
      summaryLevel: "phase",
      content: "Phase summary",
    });

    const summaries = await store.listMemorySummariesByProject("project-1");

    expect(created.summaryVersion).toBe(1);
    expect(summaries.map((summary) => summary.summaryLevel)).toEqual(["project", "phase", "session"]);
  });

  it("filters and orders summaries by project and session with deterministic tie-breaks", async () => {
    supabase.tables.memory_summaries.push(
      buildMemorySummary({
        id: "summary-1",
        session_id: "session-1",
        summary_level: "project",
        summary_version: 1,
        created_at: "2025-01-02T00:00:00.000Z",
      }),
      buildMemorySummary({
        id: "summary-2",
        session_id: "session-1",
        summary_level: "phase",
        summary_version: 2,
        created_at: "2025-01-03T00:00:00.000Z",
      }),
      buildMemorySummary({
        id: "summary-3",
        session_id: "session-1",
        summary_level: "session",
        summary_version: 2,
        created_at: "2025-01-03T00:00:00.000Z",
      }),
      buildMemorySummary({
        id: "summary-0",
        session_id: "session-1",
        summary_level: "session",
        summary_version: 2,
        created_at: "2025-01-03T00:00:00.000Z",
      }),
      buildMemorySummary({
        id: "summary-4",
        session_id: "session-2",
        summary_level: "session",
        summary_version: 3,
        created_at: "2025-01-04T00:00:00.000Z",
      }),
    );

    const store = createAgentMemoryStore(supabase);
    const projectSummaries = await store.listMemorySummariesByProject("project-1", {
      sessionId: "session-1",
    });
    const sessionSummaries = await store.listMemorySummariesBySession("session-1");

    expect(projectSummaries.map((summary) => summary.id)).toEqual([
      "summary-1",
      "summary-2",
      "summary-0",
      "summary-3",
    ]);
    expect(sessionSummaries.map((summary) => summary.id)).toEqual([
      "summary-1",
      "summary-2",
      "summary-0",
      "summary-3",
    ]);
  });

  it("creates durable memory directly when no dedupe key is provided", async () => {
    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      kind: "fact",
      content: "Direct create",
    });

    expect(result.action).toBe("created");
    expect(result.supersededEntries).toEqual([]);
    expect(result.entry.dedupeKey).toBeNull();
    expect(supabase.tables.memory_entries).toHaveLength(1);
  });

  it("creates durable memory when a dedupe key is new for the project", async () => {
    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      kind: "fact",
      content: "Fresh durable memory",
      dedupeKey: " fact:new ",
    });

    expect(result.action).toBe("created");
    expect(result.entry.dedupeKey).toBe("fact:new");
    expect(result.supersededEntries).toEqual([]);
    expect(supabase.tables.memory_entries).toHaveLength(1);
  });

  it("requires projectId when upserting durable memory with a dedupe key", async () => {
    const store = createAgentMemoryStore(supabase);

    await expect(
      store.upsertDurableMemory({
        userId: "user-1",
        kind: "fact",
        content: "Needs a project",
        dedupeKey: "fact:key",
      }),
    ).rejects.toThrow("upsertDurableMemory requires a projectId");
  });

  it("dedupes identical durable memory entries", async () => {
    supabase.tables.memory_entries.push({
      id: "memory-1",
      user_id: "user-1",
      project_id: "project-1",
      session_id: "session-1",
      scope: "project",
      kind: "decision",
      title: "ICP",
      content: "Target indie founders.",
      source: "chat",
      source_message_id: null,
      source_refs: [],
      tags: ["icp"],
      importance: 4,
      confidence: 0.8,
      confirmation_status: "user_confirmed",
      status: "active",
      supersedes_memory_id: null,
      dedupe_key: "decision:icp",
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });

    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-2",
      scope: "project",
      kind: "decision",
      title: "ICP",
      content: "Target indie founders.",
      source: "chat",
      tags: ["icp"],
      dedupeKey: "decision:ICP",
    });

    expect(result.action).toBe("deduped");
    expect(result.entry.id).toBe("memory-1");
    expect(supabase.tables.memory_entries).toHaveLength(1);
  });

  it("dedupes durable memory when optional comparison fields are omitted", async () => {
    supabase.tables.memory_entries.push(
      buildMemoryEntry({
        id: "memory-1",
        kind: "fact",
        title: "",
        content: "Normalized body",
        source: "import",
        tags: ["alpha"],
        dedupe_key: "fact:alpha",
      }),
    );

    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      kind: "fact",
      content: "Normalized body",
      dedupeKey: "fact:alpha",
    });

    expect(result.action).toBe("deduped");
    expect(result.entry.id).toBe("memory-1");
  });

  it("strengthens metadata and provenance when the same durable memory is seen again", async () => {
    supabase.tables.memory_entries.push(
      buildMemoryEntry({
        id: "memory-1",
        session_id: null,
        title: "ICP",
        content: "Target indie founders.",
        source: "chat",
        source_message_id: null,
        source_refs: [{ messageId: "message-1" }],
        tags: ["icp"],
        importance: 2,
        confidence: 0.4,
        confirmation_status: "assistant_inferred",
        dedupe_key: "decision:icp",
      }),
    );

    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-9",
      kind: "decision",
      title: "ICP",
      content: "Target indie founders.",
      source: "research",
      sourceMessageId: "message-9",
      sourceRefs: [{ messageId: "message-1" }, { messageId: "message-9" }],
      tags: ["icp", "validated"],
      importance: 5,
      confidence: 0.95,
      confirmationStatus: "user_confirmed",
      dedupeKey: "decision:icp",
    });

    expect(result.action).toBe("deduped");
    expect(result.entry.id).toBe("memory-1");
    expect(result.entry.sessionId).toBe("session-9");
    expect(result.entry.source).toBe("research");
    expect(result.entry.sourceMessageId).toBe("message-9");
    expect(result.entry.sourceRefs).toEqual([{ messageId: "message-1" }, { messageId: "message-9" }]);
    expect(result.entry.tags).toEqual(["icp", "validated"]);
    expect(result.entry.importance).toBe(5);
    expect(result.entry.confidence).toBe(0.95);
    expect(result.entry.confirmationStatus).toBe("user_confirmed");
    expect(supabase.tables.memory_entries).toHaveLength(1);
  });

  it("retries after an active-row uniqueness conflict and returns the winner", async () => {
    let injectedConflict = false;
    const racingSupabase = createMemorySupabase(undefined, {
      onInsert(table, row, tables) {
        if (table !== "memory_entries" || injectedConflict || row.dedupe_key !== "fact:race") {
          return null;
        }

        injectedConflict = true;
        tables.memory_entries.push(
          buildMemoryEntry({
            id: "memory-race",
            project_id: "project-1",
            session_id: "session-race",
            kind: "fact",
            title: "Race",
            content: "Concurrent write",
            dedupe_key: "fact:race",
          }),
        );
        return createUniqueViolation();
      },
    });

    const store = createAgentMemoryStore(racingSupabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      kind: "fact",
      title: "Race",
      content: "Concurrent write",
      dedupeKey: "fact:race",
    });

    expect(result.action).toBe("deduped");
    expect(result.entry.id).toBe("memory-race");
    expect(racingSupabase.tables.memory_entries).toHaveLength(1);
  });

  it("supersedes older durable memory when content changes", async () => {
    supabase.tables.memory_entries.push({
      id: "memory-1",
      user_id: "user-1",
      project_id: "project-1",
      session_id: "session-1",
      scope: "project",
      kind: "decision",
      title: "ICP",
      content: "Target indie founders.",
      source: "chat",
      source_message_id: null,
      source_refs: [],
      tags: ["icp"],
      importance: 4,
      confidence: 0.8,
      confirmation_status: "user_confirmed",
      status: "active",
      supersedes_memory_id: null,
      dedupe_key: "decision:icp",
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });

    const store = createAgentMemoryStore(supabase);
    const result = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-2",
      scope: "project",
      kind: "decision",
      title: "ICP",
      content: "Target course creators selling to niche audiences.",
      source: "chat",
      tags: ["icp"],
      dedupeKey: "decision:icp",
    });

    expect(result.action).toBe("superseded");
    expect(result.supersededEntries).toHaveLength(1);
    expect(result.supersededEntries[0]?.status).toBe("superseded");
    expect(result.entry.supersedesMemoryId).toBe("memory-1");
    expect(supabase.tables.memory_entries).toHaveLength(2);
  });

  it("throws store errors when single-row mutations fail or return null", async () => {
    const errorStore = createAgentMemoryStore(
      createResultSupabase<DbAgentSession>({
        single: { data: null, error: new Error("insert failed") },
      }),
    );
    const missingRowStore = createAgentMemoryStore(
      createResultSupabase<DbAgentSession>({
        single: { data: null, error: null },
      }),
    );

    await expect(
      errorStore.startAgentSession({
        userId: "user-1",
        projectId: "project-1",
      }),
    ).rejects.toThrow("insert failed");
    await expect(
      missingRowStore.startAgentSession({
        userId: "user-1",
        projectId: "project-1",
      }),
    ).rejects.toThrow("Expected a single row but none was returned.");
  });

  it("throws or falls back cleanly when list queries fail or return null", async () => {
    const errorStore = createAgentMemoryStore(
      createResultSupabase<DbMemoryEntry>({
        many: { data: null, error: new Error("query failed") },
      }),
    );
    const emptyStore = createAgentMemoryStore(
      createResultSupabase<DbMemoryEntry>({
        many: { data: null, error: null },
      }),
    );

    await expect(errorStore.listMemoryEntriesByProject("project-1")).rejects.toThrow("query failed");
    await expect(emptyStore.listMemoryEntriesByProject("project-1")).resolves.toEqual([]);
  });
});
