import { describe, expect, it } from "vitest";
import * as dbTypes from "@/lib/database.types";

describe("lib/database.types guards", () => {
  const nonRecordValues: unknown[] = [null, undefined, 123, "hello", true, []];

  const project: dbTypes.DbProject = {
    id: "project-1",
    user_id: "user-1",
    name: "AI Cofounder",
    description: "Planning workspace",
    phase: "Getting started",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const message: dbTypes.DbMessage = {
    id: "message-1",
    project_id: "project-1",
    sender: "user",
    content: "Hello",
    created_at: "2025-01-01T00:00:00.000Z",
  };

  const canvasItem: dbTypes.DbCanvasItem = {
    id: "canvas-1",
    project_id: "project-1",
    type: "note",
    data: { title: "Idea" },
    x: 10,
    y: 20,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const phase: dbTypes.DbPhase = {
    id: "discovery",
    project_id: "project-1",
    title: "Discovery",
    sort_order: 1,
  };

  const phaseTask: dbTypes.DbPhaseTask = {
    id: "task-1",
    phase_id: "discovery",
    project_id: "project-1",
    label: "Define scope",
    done: false,
    sort_order: 1,
  };

  const agentSession: dbTypes.DbAgentSession = {
    id: "session-1",
    user_id: "user-1",
    project_id: "project-1",
    origin: "chat",
    started_at: "2025-01-01T00:00:00.000Z",
    ended_at: null,
    metadata: { requestId: "req-1" },
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const memoryEntry: dbTypes.DbMemoryEntry = {
    id: "memory-1",
    user_id: "user-1",
    project_id: "project-1",
    session_id: "session-1",
    scope: "project",
    kind: "decision",
    title: "ICP",
    content: "Target solo founders.",
    source: "chat",
    source_message_id: "message-1",
    source_refs: [{ messageId: "message-1" }],
    tags: ["icp", "positioning"],
    importance: 4,
    confidence: 0.8,
    confirmation_status: "user_confirmed",
    status: "active",
    supersedes_memory_id: null,
    dedupe_key: "decision:icp",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const memorySummary: dbTypes.DbMemorySummary = {
    id: "summary-1",
    user_id: "user-1",
    project_id: "project-1",
    session_id: "session-1",
    summary_level: "session",
    summary_version: 1,
    content: "Conversation summary",
    source_message_start_id: "message-1",
    source_message_end_id: "message-2",
    token_estimate: 120,
    freshness_score: 0.9,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  it("accepts valid objects", () => {
    expect(dbTypes.isDbProject(project)).toBe(true);
    expect(dbTypes.isDbMessage(message)).toBe(true);
    expect(dbTypes.isDbCanvasItem(canvasItem)).toBe(true);
    expect(dbTypes.isDbPhase(phase)).toBe(true);
    expect(dbTypes.isDbPhaseTask(phaseTask)).toBe(true);
    expect(dbTypes.isDbAgentSession(agentSession)).toBe(true);
    expect(dbTypes.isDbMemoryEntry(memoryEntry)).toBe(true);
    expect(dbTypes.isDbMemorySummary(memorySummary)).toBe(true);
  });

  it("accepts valid objects with extra fields", () => {
    expect(dbTypes.isDbProject({ ...project, extra: true })).toBe(true);
    expect(dbTypes.isDbMessage({ ...message, extra: true })).toBe(true);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, extra: true })).toBe(true);
    expect(dbTypes.isDbPhase({ ...phase, extra: true })).toBe(true);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, extra: true })).toBe(true);
    expect(dbTypes.isDbAgentSession({ ...agentSession, extra: true })).toBe(true);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, extra: true })).toBe(true);
    expect(dbTypes.isDbMemorySummary({ ...memorySummary, extra: true })).toBe(true);
  });

  it("rejects non-record values in every guard", () => {
    nonRecordValues.forEach((value) => {
      expect(dbTypes.isDbProject(value)).toBe(false);
      expect(dbTypes.isDbMessage(value)).toBe(false);
      expect(dbTypes.isDbCanvasItem(value)).toBe(false);
      expect(dbTypes.isDbPhase(value)).toBe(false);
      expect(dbTypes.isDbPhaseTask(value)).toBe(false);
      expect(dbTypes.isDbAgentSession(value)).toBe(false);
      expect(dbTypes.isDbMemoryEntry(value)).toBe(false);
      expect(dbTypes.isDbMemorySummary(value)).toBe(false);
    });
  });

  it("rejects empty objects in every guard", () => {
    expect(dbTypes.isDbProject({})).toBe(false);
    expect(dbTypes.isDbMessage({})).toBe(false);
    expect(dbTypes.isDbCanvasItem({})).toBe(false);
    expect(dbTypes.isDbPhase({})).toBe(false);
    expect(dbTypes.isDbPhaseTask({})).toBe(false);
    expect(dbTypes.isDbAgentSession({})).toBe(false);
    expect(dbTypes.isDbMemoryEntry({})).toBe(false);
    expect(dbTypes.isDbMemorySummary({})).toBe(false);
  });

  it("rejects DbProject with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbProject({ ...project, id: undefined })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, user_id: 1 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, name: null })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, description: 2 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, phase: false })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, created_at: 3 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, updated_at: null })).toBe(false);
  });

  it("rejects DbMessage with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbMessage({ ...message, id: undefined })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, sender: "system" })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, sender: null })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, content: 2 })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, created_at: null })).toBe(false);
  });

  it("rejects DbCanvasItem with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, id: undefined })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, type: "board" })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, data: null })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, data: [] })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, x: "10" })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, y: null })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, created_at: 3 })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, updated_at: false })).toBe(false);
  });

  it("accepts every supported canvas item type", () => {
    const validTypes: dbTypes.CanvasItemType[] = [
      "note",
      "section",
      "document",
      "website_builder",
    ];

    validTypes.forEach((type) => {
      expect(dbTypes.isDbCanvasItem({ ...canvasItem, type })).toBe(true);
    });
  });

  it("rejects DbPhase with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbPhase({ ...phase, id: undefined })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, title: null })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, sort_order: "1" })).toBe(false);
  });

  it("rejects DbPhaseTask with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, id: undefined })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, phase_id: 1 })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, project_id: null })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, label: 2 })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, done: "false" })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, sort_order: null })).toBe(false);
  });

  it("accepts all supported memory enums", () => {
    (["chat", "brainstorm", "research", "ultraplan"] as const).forEach((origin) => {
      expect(dbTypes.isAgentSessionOrigin(origin)).toBe(true);
    });

    (["user", "project", "session", "run"] as const).forEach((scope) => {
      expect(dbTypes.isMemoryScope(scope)).toBe(true);
    });

    (["fact", "decision", "constraint", "research_finding", "customer_quote", "task_state", "summary"] as const).forEach(
      (kind) => {
        expect(dbTypes.isMemoryKind(kind)).toBe(true);
      },
    );

    (["active", "superseded", "archived"] as const).forEach((status) => {
      expect(dbTypes.isMemoryStatus(status)).toBe(true);
    });

    (["user_confirmed", "assistant_inferred", "system_imported"] as const).forEach((confirmation) => {
      expect(dbTypes.isMemoryConfirmation(confirmation)).toBe(true);
    });

    (["session", "phase", "project"] as const).forEach((level) => {
      expect(dbTypes.isSummaryLevel(level)).toBe(true);
    });
  });

  it("rejects DbAgentSession with missing fields and wrong types", () => {
    expect(dbTypes.isDbAgentSession({ ...agentSession, origin: "email" })).toBe(false);
    expect(dbTypes.isDbAgentSession({ ...agentSession, metadata: [] })).toBe(false);
    expect(dbTypes.isDbAgentSession({ ...agentSession, ended_at: 123 })).toBe(false);
    expect(dbTypes.isDbAgentSession({ ...agentSession, project_id: null })).toBe(false);
  });

  it("rejects DbMemoryEntry with missing fields and wrong types", () => {
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, scope: "global" })).toBe(false);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, kind: "quote" })).toBe(false);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, source_refs: {} })).toBe(false);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, tags: ["ok", 1] })).toBe(false);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, confirmation_status: "manual" })).toBe(false);
    expect(dbTypes.isDbMemoryEntry({ ...memoryEntry, status: "deleted" })).toBe(false);
  });

  it("rejects DbMemorySummary with missing fields and wrong types", () => {
    expect(dbTypes.isDbMemorySummary({ ...memorySummary, summary_level: "global" })).toBe(false);
    expect(dbTypes.isDbMemorySummary({ ...memorySummary, summary_version: "1" })).toBe(false);
    expect(dbTypes.isDbMemorySummary({ ...memorySummary, token_estimate: null })).toBe(false);
    expect(dbTypes.isDbMemorySummary({ ...memorySummary, freshness_score: "high" })).toBe(false);
  });
});
