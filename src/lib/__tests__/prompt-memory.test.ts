import { describe, expect, it } from "vitest";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { buildPromptMemory } from "@/lib/prompt-memory";

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

function buildSummary(overrides: Partial<MemorySummary> = {}): MemorySummary {
  return {
    id: "summary-default",
    userId: "user-1",
    projectId: "project-1",
    sessionId: "session-1",
    summaryLevel: "session",
    summaryVersion: 1,
    content: "Key facts:\n- Default summary",
    sourceMessageStartId: null,
    sourceMessageEndId: null,
    tokenEstimate: 32,
    freshnessScore: 0.9,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPromptMemory", () => {
  it("returns an empty block when no query can be derived", () => {
    expect(buildPromptMemory({ memoryEntries: [buildEntry()] })).toEqual({
      block: "",
      metadata: {
        query: "",
        entryIds: [],
        summaryIds: [],
        summaryLevel: null,
        reloadTokenEstimate: 0,
      },
    });
  });

  it("derives a query from the latest user messages and reloads relevant memory", () => {
    const result = buildPromptMemory({
      messages: [
        { sender: "assistant", content: "What segment are we targeting?" },
        { sender: "user", content: "We need pricing for creator teams." },
      ],
      memoryEntries: [
        buildEntry({
          id: "entry-pricing",
          title: "Pricing direction",
          content: "Annual pricing works best for creator teams.",
          tags: ["pricing", "creators"],
          dedupeKey: "decision:pricing-direction",
        }),
      ],
      memorySummaries: [
        buildSummary({
          id: "summary-pricing",
          content: "Key facts:\n- Creator teams respond better to annual pricing.",
        }),
      ],
    });

    expect(result.block).toContain("Relevant memory context:");
    expect(result.block).toContain("Rolling summary:");
    expect(result.block).toContain("creator teams");
    expect(result.metadata.query).toBe("We need pricing for creator teams.");
    expect(result.metadata.entryIds).toEqual(["entry-pricing"]);
    expect(result.metadata.summaryIds).toEqual(["summary-pricing"]);
    expect(result.metadata.summaryLevel).toBe("session");
    expect(result.metadata.reloadTokenEstimate).toBeGreaterThan(0);
  });

  it("falls back to recent messages when there are no user messages", () => {
    const result = buildPromptMemory({
      messages: [
        { role: "system", content: "Keep the discussion focused on onboarding." },
        { sender: "assistant", content: "Enterprise onboarding needs white-glove support." },
      ],
      memoryEntries: [
        buildEntry({
          id: "entry-onboarding",
          title: "Onboarding constraint",
          content: "Enterprise onboarding needs white-glove support.",
          tags: ["onboarding"],
        }),
      ],
    });

    expect(result.metadata.query).toBe(
      "Keep the discussion focused on onboarding. Enterprise onboarding needs white-glove support.",
    );
    expect(result.metadata.entryIds).toEqual(["entry-onboarding"]);
    expect(result.block).toContain("Enterprise onboarding needs white-glove support.");
  });

  it("prefers an explicit query and removes superseded or duplicate entries", () => {
    const result = buildPromptMemory({
      query: "pricing direction",
      memoryEntries: [
        buildEntry({
          id: "entry-old",
          title: "Pricing direction",
          content: "Monthly pricing.",
          dedupeKey: "decision:pricing-direction",
          importance: 2,
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-new",
          title: "Pricing direction",
          content: "Annual pricing for creator teams.",
          dedupeKey: "decision:pricing-direction",
          supersedesMemoryId: "entry-old",
          importance: 5,
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-archived",
          title: "Pricing direction",
          content: "Old archived note.",
          status: "archived",
          updatedAt: "2025-01-04T00:00:00.000Z",
        }),
      ],
    });

    expect(result.metadata.query).toBe("pricing direction");
    expect(result.metadata.entryIds).toEqual(["entry-new"]);
    expect(result.block).toContain("Annual pricing for creator teams.");
    expect(result.block).not.toContain("Monthly pricing.");
    expect(result.block).not.toContain("Old archived note.");
  });

  it("keeps summaries from the strongest matched level and drops duplicate content", () => {
    const result = buildPromptMemory({
      query: "onboarding workflow",
      memorySummaries: [
        buildSummary({
          id: "summary-session-new",
          summaryLevel: "session",
          summaryVersion: 3,
          createdAt: "2025-01-03T00:00:00.000Z",
          content: "Key facts:\n- Sales-assisted onboarding is required for enterprise pilots.",
        }),
        buildSummary({
          id: "summary-session-dup",
          summaryLevel: "session",
          summaryVersion: 2,
          createdAt: "2025-01-02T00:00:00.000Z",
          content: "Key facts:\n- Sales-assisted onboarding is required for enterprise pilots.",
        }),
        buildSummary({
          id: "summary-project",
          summaryLevel: "project",
          summaryVersion: 5,
          createdAt: "2025-01-04T00:00:00.000Z",
          content: "Key facts:\n- Broader market context.",
        }),
      ],
    });

    expect(result.metadata.summaryIds).toEqual(["summary-session-new"]);
    expect(result.metadata.summaryLevel).toBe("session");
    expect(result.block).toContain("Sales-assisted onboarding is required for enterprise pilots.");
    expect(result.block).not.toContain("Broader market context.");
  });

  it("uses the strongest summary match to align entry retrieval before deduping", () => {
    const result = buildPromptMemory({
      query: "pricing creator teams",
      memoryEntries: [
        buildEntry({
          id: "entry-project-mismatch",
          projectId: "project-2",
          sessionId: "session-2",
          scope: "project",
          kind: "decision",
          title: "Pricing direction",
          content: "Annual pricing for creator teams.",
          tags: ["pricing", "creators"],
          importance: 5,
          confidence: 1,
          updatedAt: "2025-01-05T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-session-aligned",
          projectId: "project-1",
          sessionId: "session-1",
          scope: "session",
          kind: "decision",
          title: "Pricing direction",
          content: "Annual pricing for creator teams with guided onboarding.",
          tags: ["pricing", "creators"],
          importance: 2,
          confidence: 0.8,
          updatedAt: "2025-01-02T00:00:00.000Z",
        }),
      ],
      memorySummaries: [
        buildSummary({
          id: "summary-aligned",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          summaryVersion: 3,
          content: "Decisions:\n- Creator teams need guided onboarding.",
          createdAt: "2025-01-03T00:00:00.000Z",
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
      ],
    });

    expect(result.metadata.entryIds).toEqual(["entry-session-aligned", "entry-project-mismatch"]);
    expect(result.metadata.summaryIds).toEqual(["summary-aligned"]);
  });

  it("returns an empty block when the query finds no relevant memory", () => {
    const result = buildPromptMemory({
      query: "pricing",
      memoryEntries: [buildEntry({ content: "Technical architecture note", title: "Architecture" })],
      memorySummaries: [buildSummary({ content: "Key facts:\n- Market size is unclear." })],
    });

    expect(result.block).toBe("");
    expect(result.metadata.entryIds).toEqual([]);
    expect(result.metadata.summaryIds).toEqual([]);
    expect(result.metadata.reloadTokenEstimate).toBe(0);
  });
});
