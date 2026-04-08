import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEMORY_CONFIDENCE,
  DEFAULT_MEMORY_CONFIRMATION,
  DEFAULT_MEMORY_IMPORTANCE,
  DEFAULT_MEMORY_SCOPE,
  DEFAULT_MEMORY_SOURCE,
  DEFAULT_MEMORY_STATUS,
  DEFAULT_SUMMARY_FRESHNESS_SCORE,
  DEFAULT_SUMMARY_TOKEN_ESTIMATE,
  DEFAULT_SUMMARY_VERSION,
  buildAgentSessionInsert,
  buildMemoryEntryInsert,
  buildMemoryEntryUpdate,
  buildMemorySummaryInsert,
  canonicalizeDedupeKey,
  compareMemoryEntries,
  compareMemorySummaries,
  isAgentSession,
  isMemoryEntry,
  isMemorySummary,
  mapDbAgentSession,
  mapDbMemoryEntry,
  mapDbMemorySummary,
  normalizeMemoryText,
} from "@/lib/agent-memory";

describe("agent-memory domain helpers", () => {
  it("builds memory entry inserts with defaults and normalized values", () => {
    const entry = buildMemoryEntryInsert({
      userId: "user-1",
      projectId: "project-1",
      kind: "decision",
      content: "  Keep it focused.  ",
      dedupeKey: "  Decision : ICP  ",
      tags: ["icp", "focus", 123 as never],
      importance: 8,
      confidence: 1.5,
      sourceRefs: { bad: true } as never,
    });

    expect(entry.scope).toBe(DEFAULT_MEMORY_SCOPE);
    expect(entry.source).toBe(DEFAULT_MEMORY_SOURCE);
    expect(entry.importance).toBe(DEFAULT_MEMORY_IMPORTANCE + 2);
    expect(entry.confidence).toBe(1);
    expect(entry.confirmation_status).toBe(DEFAULT_MEMORY_CONFIRMATION);
    expect(entry.status).toBe(DEFAULT_MEMORY_STATUS);
    expect(entry.content).toBe("Keep it focused.");
    expect(entry.dedupe_key).toBe("decision : icp");
    expect(entry.tags).toEqual(["icp", "focus"]);
    expect(entry.source_refs).toEqual([]);
  });

  it("builds memory entry updates without clobbering unspecified fields", () => {
    const update = buildMemoryEntryUpdate({
      title: "  New title  ",
      importance: 0,
      confidence: -1,
      dedupeKey: "  Same Key ",
      supersedesMemoryId: "memory-0",
    });

    expect(update.title).toBe("New title");
    expect(update.importance).toBe(1);
    expect(update.confidence).toBe(0);
    expect(update.dedupe_key).toBe("same key");
    expect(update.supersedes_memory_id).toBe("memory-0");
    expect(typeof update.updated_at).toBe("string");
  });

  it("maps optional memory entry update fields when they are provided", () => {
    const update = buildMemoryEntryUpdate({
      sourceRefs: [{ messageId: "message-1" }],
      tags: ["one", 2 as never, "two"],
      confirmationStatus: "system_imported",
      status: "archived",
    });

    expect(update.source_refs).toEqual([{ messageId: "message-1" }]);
    expect(update.tags).toEqual(["one", "two"]);
    expect(update.confirmation_status).toBe("system_imported");
    expect(update.status).toBe("archived");
  });

  it("builds summary inserts with sensible defaults", () => {
    const summary = buildMemorySummaryInsert({
      userId: "user-1",
      projectId: "project-1",
      summaryLevel: "session",
      content: "  Summary body  ",
    });

    expect(summary.summary_version).toBe(DEFAULT_SUMMARY_VERSION);
    expect(summary.token_estimate).toBe(DEFAULT_SUMMARY_TOKEN_ESTIMATE);
    expect(summary.freshness_score).toBe(DEFAULT_SUMMARY_FRESHNESS_SCORE);
    expect(summary.content).toBe("Summary body");
  });

  it("normalizes valid summary numeric inputs", () => {
    const summary = buildMemorySummaryInsert({
      userId: "user-1",
      projectId: "project-1",
      summaryLevel: "phase",
      content: "Summary body",
      tokenEstimate: 12.6,
      freshnessScore: 0.4567,
    });

    expect(summary.token_estimate).toBe(13);
    expect(summary.freshness_score).toBe(0.457);
  });

  it("maps db records into domain records", () => {
    const session = mapDbAgentSession({
      id: "session-1",
      user_id: "user-1",
      project_id: "project-1",
      origin: "chat",
      started_at: "2025-01-01T00:00:00.000Z",
      ended_at: null,
      metadata: { a: 1 },
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });

    const entry = mapDbMemoryEntry({
      id: "memory-1",
      user_id: "user-1",
      project_id: "project-1",
      session_id: "session-1",
      scope: "project",
      kind: "fact",
      title: "Fact",
      content: "Memory body",
      source: "chat",
      source_message_id: null,
      source_refs: [{ x: 1 }],
      tags: ["a"],
      importance: DEFAULT_MEMORY_IMPORTANCE,
      confidence: DEFAULT_MEMORY_CONFIDENCE,
      confirmation_status: DEFAULT_MEMORY_CONFIRMATION,
      status: DEFAULT_MEMORY_STATUS,
      supersedes_memory_id: null,
      dedupe_key: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });

    const summary = mapDbMemorySummary({
      id: "summary-1",
      user_id: "user-1",
      project_id: "project-1",
      session_id: "session-1",
      summary_level: "project",
      summary_version: 3,
      content: "Snapshot",
      source_message_start_id: null,
      source_message_end_id: null,
      token_estimate: 42,
      freshness_score: 0.5,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });

    expect(isAgentSession(session)).toBe(true);
    expect(isMemoryEntry(entry)).toBe(true);
    expect(isMemorySummary(summary)).toBe(true);
    expect(summary.summaryVersion).toBe(3);
  });

  it("sorts memory entries and summaries in stable useful order", () => {
    const entries = [
      {
        id: "b",
        status: "superseded",
        importance: 5,
        updatedAt: "2025-01-02T00:00:00.000Z",
        createdAt: "2025-01-02T00:00:00.000Z",
      },
      {
        id: "c",
        status: "active",
        importance: 2,
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "a",
        status: "active",
        importance: 5,
        updatedAt: "2025-01-01T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ];

    expect(entries.sort(compareMemoryEntries).map((entry) => entry.id)).toEqual(["a", "c", "b"]);

    const summaries = [
      { id: "s1", summaryLevel: "session", summaryVersion: 3, createdAt: "2025-01-03T00:00:00.000Z" },
      { id: "s2", summaryLevel: "project", summaryVersion: 1, createdAt: "2025-01-01T00:00:00.000Z" },
      { id: "s3", summaryLevel: "phase", summaryVersion: 2, createdAt: "2025-01-02T00:00:00.000Z" },
    ];

    expect(summaries.sort(compareMemorySummaries).map((summary) => summary.id)).toEqual(["s2", "s3", "s1"]);
  });

  it("builds session inserts and canonicalizes empty dedupe keys", () => {
    const session = buildAgentSessionInsert({
      userId: "user-1",
      projectId: "project-1",
      metadata: [] as never,
    });

    expect(session.origin).toBe("chat");
    expect(session.metadata).toEqual({});
    expect(canonicalizeDedupeKey("   ")).toBeNull();
  });

  it("normalizes memory text and falls back for invalid insert values", () => {
    const summary = buildMemorySummaryInsert({
      userId: "user-1",
      projectId: "project-1",
      summaryLevel: "project",
      content: "  rollup\n\nwith extra\tspace ",
      tokenEstimate: Number.NaN,
      freshnessScore: Number.POSITIVE_INFINITY,
    });

    expect(normalizeMemoryText("  rollup\n\nwith extra\tspace ")).toBe("rollup with extra space");
    expect(summary.token_estimate).toBe(DEFAULT_SUMMARY_TOKEN_ESTIMATE);
    expect(summary.freshness_score).toBe(DEFAULT_SUMMARY_FRESHNESS_SCORE);
    expect(canonicalizeDedupeKey(undefined)).toBeNull();
  });

  it("uses createdAt and id tie-breakers when sorting memory entries", () => {
    const entries = [
      {
        id: "b",
        status: "active",
        importance: 4,
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "a",
        status: "active",
        importance: 4,
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "c",
        status: "active",
        importance: 4,
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-02T00:00:00.000Z",
      },
    ];

    expect(entries.sort(compareMemoryEntries).map((entry) => entry.id)).toEqual(["c", "a", "b"]);
  });

  it("uses updatedAt before createdAt when sorting memory entries", () => {
    const entries = [
      {
        id: "a",
        status: "active",
        importance: 4,
        updatedAt: "2025-01-02T00:00:00.000Z",
        createdAt: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "b",
        status: "active",
        importance: 4,
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ];

    expect(entries.sort(compareMemoryEntries).map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("uses createdAt and id tie-breakers when sorting memory summaries", () => {
    const summaries = [
      { id: "b", summaryLevel: "session", summaryVersion: 2, createdAt: "2025-01-02T00:00:00.000Z" },
      { id: "a", summaryLevel: "session", summaryVersion: 2, createdAt: "2025-01-02T00:00:00.000Z" },
      { id: "c", summaryLevel: "session", summaryVersion: 2, createdAt: "2025-01-03T00:00:00.000Z" },
    ];

    expect(summaries.sort(compareMemorySummaries).map((summary) => summary.id)).toEqual(["c", "a", "b"]);
  });

  it("uses summary version before createdAt when sorting memory summaries", () => {
    const summaries = [
      { id: "a", summaryLevel: "phase", summaryVersion: 1, createdAt: "2025-01-03T00:00:00.000Z" },
      { id: "b", summaryLevel: "phase", summaryVersion: 2, createdAt: "2025-01-01T00:00:00.000Z" },
    ];

    expect(summaries.sort(compareMemorySummaries).map((summary) => summary.id)).toEqual(["b", "a"]);
  });

  it("rejects invalid agent-memory domain objects", () => {
    expect(isAgentSession({})).toBe(false);
    expect(
      isAgentSession({
        id: "session-1",
        userId: "user-1",
        projectId: "project-1",
        origin: "invalid",
        startedAt: "2025-01-01T00:00:00.000Z",
        endedAt: null,
        metadata: {},
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      isMemoryEntry({
        id: "memory-1",
        userId: "user-1",
        projectId: "project-1",
        sessionId: null,
        scope: "project",
        kind: "fact",
        title: "Title",
        content: "Body",
        source: "chat",
        sourceMessageId: null,
        sourceRefs: [],
        tags: ["ok", 1],
        importance: 3,
        confidence: 0.7,
        confirmationStatus: "assistant_inferred",
        status: "active",
        supersedesMemoryId: null,
        dedupeKey: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      isMemorySummary({
        id: "summary-1",
        userId: "user-1",
        projectId: "project-1",
        sessionId: null,
        summaryLevel: "project",
        summaryVersion: "1",
        content: "Body",
        sourceMessageStartId: null,
        sourceMessageEndId: null,
        tokenEstimate: 100,
        freshnessScore: 0.8,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
