import { beforeEach, describe, expect, it } from "vitest";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { createAgentMemoryStore } from "@/lib/agent-memory-store";
import { buildPromptMemory } from "@/lib/prompt-memory";
import type { DbAgentSession, DbMemoryEntry, DbMemorySummary } from "@/lib/database.types";

type Tables = {
  agent_sessions: DbAgentSession[];
  memory_entries: DbMemoryEntry[];
  memory_summaries: DbMemorySummary[];
};

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

function createMemorySupabase(initial?: Partial<Tables>) {
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

function buildEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "entry-default",
    userId: "user-1",
    projectId: "project-1",
    sessionId: "session-1",
    scope: "project",
    kind: "fact",
    title: "Default title",
    content: "Default content",
    source: "chat",
    sourceMessageId: null,
    sourceRefs: [],
    tags: [],
    importance: 3,
    confidence: 0.7,
    confirmationStatus: "assistant_inferred",
    status: "active",
    supersedesMemoryId: null,
    dedupeKey: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("agent memory integration", () => {
  let supabase: ReturnType<typeof createMemorySupabase>;

  beforeEach(() => {
    supabase = createMemorySupabase();
  });

  it("preserves retrieval ranking when selecting prompt memory entries", () => {
    const result = buildPromptMemory({
      query: "pricing creator teams",
      memoryEntries: [
        buildEntry({
          id: "entry-content-match",
          kind: "fact",
          title: "Audience note",
          content: "We should lock pricing for creator teams before launch.",
          tags: ["audience"],
          importance: 5,
          confidence: 1,
          updatedAt: "2025-01-05T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-title-match",
          kind: "decision",
          title: "Pricing for creator teams",
          content: "General note.",
          tags: ["pricing", "creators"],
          importance: 2,
          confidence: 0.8,
          updatedAt: "2025-01-02T00:00:00.000Z",
        }),
      ],
      memorySummaries: [
        {
          id: "summary-aligned",
          userId: "user-1",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          summaryVersion: 3,
          content: "Decisions:\n- Creator teams need guided onboarding.",
          sourceMessageStartId: null,
          sourceMessageEndId: null,
          tokenEstimate: 20,
          freshnessScore: 1,
          createdAt: "2025-01-03T00:00:00.000Z",
          updatedAt: "2025-01-03T00:00:00.000Z",
        },
      ] satisfies MemorySummary[],
    });

    expect(result.metadata.entryIds).toEqual(["entry-title-match", "entry-content-match"]);
    expect(result.metadata.summaryIds).toEqual(["summary-aligned"]);
  });

  it("builds deterministic reload context from store state while only reloading the active durable memory entry", async () => {
    const store = createAgentMemoryStore(supabase);

    const firstWrite = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-1",
      kind: "decision",
      title: "Pricing direction",
      content: "Monthly pricing for creator teams.",
      tags: ["pricing", "creators"],
      importance: 3,
      confirmationStatus: "assistant_inferred",
      dedupeKey: "decision:pricing-direction",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    const secondWrite = await store.upsertDurableMemory({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-1",
      kind: "decision",
      title: "Pricing direction",
      content: "Annual pricing for creator teams with guided onboarding.",
      tags: ["pricing", "creators", "onboarding"],
      importance: 5,
      confirmationStatus: "user_confirmed",
      dedupeKey: "decision:pricing-direction",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(firstWrite.action).toBe("created");
    expect(secondWrite.action).toBe("superseded");

    await store.createMemorySummary({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-1",
      summaryLevel: "session",
      summaryVersion: 2,
      content: ["Decisions:", "- Monthly pricing for creator teams."].join("\n"),
      createdAt: "2025-01-01T12:00:00.000Z",
      updatedAt: "2025-01-01T12:00:00.000Z",
    });

    const entries = await store.listMemoryEntriesByProject("project-1", {
      statuses: ["active", "superseded", "archived"],
    });
    const summaries = await store.listMemorySummariesByProject("project-1", {
      sessionId: "session-1",
    });

    const firstResult = buildPromptMemory({
      query: "pricing creator teams onboarding",
      memoryEntries: entries,
      memorySummaries: summaries,
    });
    const secondResult = buildPromptMemory({
      query: "pricing creator teams onboarding",
      memoryEntries: entries,
      memorySummaries: summaries,
    });

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.metadata.entryIds).toEqual([secondWrite.entry.id]);
    expect(firstResult.metadata.summaryIds).toEqual([summaries[0]?.id ?? ""]);
    expect(firstResult.block).toContain("Annual pricing for creator teams with guided onboarding.");
    expect(firstResult.block).not.toContain("Monthly pricing for creator teams.");
  });
});
