import { describe, expect, it } from "vitest";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import {
  normalizeSearchText,
  searchMemoryEntries,
  searchMemorySummaries,
  tokenizeSearchQuery,
} from "@/lib/memory-search";

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
    content: "Default summary",
    sourceMessageStartId: null,
    sourceMessageEndId: null,
    tokenEstimate: 100,
    freshnessScore: 0.7,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("memory-search", () => {
  it("normalizes free-form query text into stable tokens", () => {
    expect(normalizeSearchText("  ICP,\nSegments!!!  ")).toBe("icp segments");
    expect(tokenizeSearchQuery("  ICP icp   segments ")).toEqual(["icp", "segments"]);
  });

  it("returns no results for empty or punctuation-only queries", () => {
    const entries = [buildEntry()];
    const summaries = [buildSummary()];

    expect(searchMemoryEntries(entries, "   ")).toEqual([]);
    expect(searchMemoryEntries(entries, "!!!")).toEqual([]);
    expect(searchMemorySummaries(summaries, "   ")).toEqual([]);
  });

  it("returns richer entry metadata and ranks title phrase matches above weaker matches", () => {
    const results = searchMemoryEntries(
      [
        buildEntry({
          id: "entry-title",
          title: "ICP for creators",
          content: "Generic note",
          tags: ["audience"],
          importance: 2,
          updatedAt: "2025-01-02T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-content",
          title: "Audience",
          content: "We should refine the ICP for creators before launch.",
          importance: 5,
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-partial",
          title: "Creator economics",
          content: "This mentions creators only.",
          importance: 5,
          updatedAt: "2025-01-04T00:00:00.000Z",
        }),
      ],
      "ICP for creators",
      { projectId: "project-1", sessionId: "session-1" },
    );

    expect(results.map((result) => result.entry.id)).toEqual(["entry-title", "entry-content", "entry-partial"]);
    expect(results[0]).toMatchObject({
      sourceType: "entry",
      matchedTerms: ["creators", "for", "icp"],
    });
    expect(results[0]?.snippet).toContain("ICP for creators");
    expect(results[0]?.reasons).toContain("exact phrase in title");
    expect(results[1]?.reasons).toContain("exact phrase in content");
  });

  it("uses scope, project, session, status, and metadata signals in entry ranking", () => {
    const results = searchMemoryEntries(
      [
        buildEntry({
          id: "entry-aligned",
          scope: "session",
          sessionId: "session-1",
          projectId: "project-1",
          kind: "decision",
          title: "Pricing direction",
          content: "Annual pricing plan for creator teams.",
          tags: ["pricing", "creators"],
          dedupeKey: "decision:pricing-direction",
          importance: 4,
          confidence: 0.9,
          updatedAt: "2025-01-05T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-mismatch",
          scope: "project",
          sessionId: "session-2",
          projectId: "project-2",
          kind: "decision",
          title: "Pricing direction",
          content: "Annual pricing plan for creator teams.",
          tags: ["pricing", "creators"],
          dedupeKey: "decision:pricing-direction",
          importance: 5,
          confidence: 1,
          updatedAt: "2025-01-04T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-archived",
          scope: "session",
          sessionId: "session-1",
          projectId: "project-1",
          title: "Pricing direction",
          content: "Annual pricing plan for creator teams.",
          tags: ["pricing", "creators"],
          status: "archived",
          importance: 5,
          confidence: 1,
          updatedAt: "2025-01-06T00:00:00.000Z",
        }),
      ],
      "pricing creators",
      { projectId: "project-1", sessionId: "session-1" },
    );

    expect(results.map((result) => result.entry.id)).toEqual(["entry-aligned", "entry-mismatch", "entry-archived"]);
    expect(results[0]?.reasons).toContain("session alignment");
    expect(results[1]?.reasons).toContain("project mismatch penalty");
    expect(results[2]?.reasons).toContain("archived status adjustment");
  });

  it("uses tags, dedupe keys, and all-term coverage to rank entries deterministically", () => {
    const results = searchMemoryEntries(
      [
        buildEntry({
          id: "entry-tags",
          title: "Audience note",
          tags: ["startup", "pricing"],
          importance: 2,
          confidence: 0.4,
          updatedAt: "2025-01-02T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-dedupe",
          title: "Related note",
          dedupeKey: "decision:startup-pricing",
          importance: 3,
          confidence: 0.5,
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-one-term",
          title: "Startup note",
          content: "General launch planning only.",
          importance: 5,
          confidence: 1,
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
      ],
      "startup pricing",
      { projectId: "project-1" },
    );

    expect(results.map((result) => result.entry.id)).toEqual(["entry-tags", "entry-dedupe", "entry-one-term"]);
    expect(results[0]?.matchedTerms).toEqual(["pricing", "startup"]);
    expect(results[1]?.matchedTerms).toEqual(["pricing", "startup"]);
    expect(results[2]?.matchedTerms).toEqual(["startup"]);
    expect(results[0]?.reasons).toContain("all query terms matched");
    expect(results[1]?.reasons).toContain('dedupe key match for "startup"');
  });

  it("prefers default entry ordering when search scores tie", () => {
    const results = searchMemoryEntries(
      [
        buildEntry({
          id: "entry-active",
          title: "",
          content: "alpha",
          importance: 3,
          confidence: 0.7,
          status: "active",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-superseded",
          title: "",
          content: "alpha",
          importance: 5,
          confidence: 0.7,
          status: "superseded",
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
        buildEntry({
          id: "entry-archived",
          title: "",
          content: "alpha",
          importance: 5,
          confidence: 0.7,
          status: "archived",
          updatedAt: "2025-01-04T00:00:00.000Z",
        }),
      ],
      "alpha",
    );

    expect(results.map((result) => result.entry.id)).toEqual(["entry-active", "entry-superseded", "entry-archived"]);
  });

  it("respects limits after ranking entry matches", () => {
    const results = searchMemoryEntries(
      [
        buildEntry({ id: "entry-1", title: "ICP", content: "alpha beta" }),
        buildEntry({ id: "entry-2", title: "Pricing", content: "alpha beta gamma" }),
        buildEntry({ id: "entry-3", title: "Launch", content: "alpha beta gamma delta" }),
      ],
      "alpha",
      { limit: 2 },
    );

    expect(results).toHaveLength(2);
  });

  it("returns richer summary metadata and ranks content relevance above level-only matches", () => {
    const results = searchMemorySummaries(
      [
        buildSummary({
          id: "summary-content",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          content: "Customer interview insights about churn risk.",
          freshnessScore: 0.5,
          createdAt: "2025-01-02T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-level",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "project",
          content: "General notes.",
          freshnessScore: 1,
          createdAt: "2025-01-03T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-tie-older",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          content: "churn",
          freshnessScore: 0.7,
          summaryVersion: 2,
          createdAt: "2025-01-02T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-tie-newer",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          content: "churn",
          freshnessScore: 0.7,
          summaryVersion: 2,
          createdAt: "2025-01-03T00:00:00.000Z",
        }),
      ],
      "churn",
      { projectId: "project-1", sessionId: "session-1" },
    );

    expect(results.map((result) => result.summary.id)).toEqual([
      "summary-content",
      "summary-tie-newer",
      "summary-tie-older",
    ]);
    expect(results[0]).toMatchObject({
      sourceType: "summary",
      matchedTerms: ["churn"],
    });
    expect(results[0]?.snippet).toContain("churn");
    expect(results[0]?.reasons).toContain("exact phrase in summary content");
  });

  it("uses freshness, summary level, project/session alignment, and recency in summary ranking", () => {
    const results = searchMemorySummaries(
      [
        buildSummary({
          id: "summary-aligned",
          projectId: "project-1",
          sessionId: "session-1",
          summaryLevel: "session",
          content: "Project decisions about onboarding.",
          freshnessScore: 0.9,
          createdAt: "2025-01-04T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-project-mismatch",
          projectId: "project-2",
          sessionId: "session-1",
          summaryLevel: "session",
          content: "Project decisions about onboarding.",
          freshnessScore: 1,
          createdAt: "2025-01-05T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-level-only",
          projectId: "project-1",
          sessionId: null,
          summaryLevel: "project",
          content: "General notes.",
          freshnessScore: 1,
          createdAt: "2025-01-06T00:00:00.000Z",
        }),
      ],
      "project",
      { projectId: "project-1", sessionId: "session-1" },
    );

    expect(results.map((result) => result.summary.id)).toEqual([
      "summary-aligned",
      "summary-project-mismatch",
      "summary-level-only",
    ]);
    expect(results[0]?.reasons).toContain("project alignment");
    expect(results[1]?.reasons).toContain("project mismatch penalty");
    expect(results[2]?.reasons).toContain("exact phrase in summary level");
  });

  it("respects limits and excludes summaries with no term matches", () => {
    const results = searchMemorySummaries(
      [
        buildSummary({ id: "summary-1", content: "alpha beta" }),
        buildSummary({ id: "summary-2", content: "alpha gamma" }),
        buildSummary({ id: "summary-3", content: "delta epsilon" }),
      ],
      "alpha",
      { limit: 1 },
    );

    expect(results.map((result) => result.summary.id)).toEqual(["summary-1"]);
  });
});
