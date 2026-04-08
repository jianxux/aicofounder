import { describe, expect, it } from "vitest";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import {
  buildCompressionMemorySummaryInput,
  compressContext,
  type CompressionChatTurn,
} from "@/lib/context-compression";

function buildTurn(overrides: Partial<CompressionChatTurn> = {}): CompressionChatTurn {
  return {
    id: "message-1",
    role: "user",
    content: "We are building an AI cofounder for founders.",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildSummary(overrides: Partial<MemorySummary> = {}): MemorySummary {
  return {
    id: "summary-1",
    userId: "user-1",
    projectId: "project-1",
    sessionId: "session-1",
    summaryLevel: "session",
    summaryVersion: 1,
    content: "Objective/context:\n- Initial direction\nKey facts:\n- Existing summary fact",
    sourceMessageStartId: "message-1",
    sourceMessageEndId: "message-2",
    tokenEstimate: 32,
    freshnessScore: 0.8,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildMemoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "memory-1",
    userId: "user-1",
    projectId: "project-1",
    sessionId: "session-1",
    scope: "project",
    kind: "fact",
    title: "Target customer",
    content: "The ICP is indie hackers selling courses.",
    source: "chat",
    sourceMessageId: "message-3",
    sourceRefs: [],
    tags: ["icp"],
    importance: 4,
    confidence: 0.9,
    confirmationStatus: "user_confirmed",
    status: "active",
    supersedesMemoryId: null,
    dedupeKey: "fact:icp",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("context compression", () => {
  it("returns a deterministic empty summary when no usable context exists", () => {
    const result = compressContext({ turns: [] });

    expect(result.summaryText).toBe("No summarized context available.");
    expect(result.reloadContext).toContain("Rolling summary:");
    expect(result.metadata.summarizedRange).toBeNull();
    expect(result.metadata.summaryVersion).toBe(1);
    expect(result.metadata.freshnessScore).toBe(1);
  });

  it("summarizes short chats without dropping the chat tail", () => {
    const turns = [
      buildTurn({
        id: "message-1",
        content: "We are building an AI cofounder for founders and want persistent context.",
      }),
      buildTurn({
        id: "message-2",
        role: "assistant",
        content: "We should use the existing memory tables and keep the core provider-agnostic.",
      }),
      buildTurn({
        id: "message-3",
        content: "What should the safe reload payload include?",
      }),
    ];

    const result = compressContext({ turns });

    expect(result.summaryText).toContain("Objective/context:");
    expect(result.summaryText).toContain("Open questions:");
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).not.toContain("Rolling summary:");
    expect(result.reloadContext).toContain("- user: What should the safe reload payload include?");
    expect(result.metadata.summarizedRange).toEqual({
      startTurnIndex: 0,
      endTurnIndex: 2,
      startMessageId: "message-1",
      endMessageId: "message-3",
      messageCount: 3,
    });
    expect(result.metadata.unsummarizedTailTokenEstimate).toBe(0);
    expect(result.metadata.freshnessScore).toBe(1);
  });

  it("keeps a recent tail when chats cross compression thresholds", () => {
    const turns = Array.from({ length: 8 }, (_, index) =>
      buildTurn({
        id: `message-${index + 1}`,
        role: index % 2 === 0 ? "user" : "assistant",
        content:
          index === 2
            ? "We decided to use the existing memory store and avoid live LLM summarization."
            : index === 4
              ? "The implementation must be deterministic, provider-agnostic, and safe to reload."
              : index === 7
                ? "Next step is to run coverage and confirm the changed code stays above ninety percent."
                : `Conversation chunk ${index + 1} with enough repeated content to push token estimates over the configured limit.`,
      }),
    );

    const result = compressContext({
      turns,
      options: {
        maxTurnsBeforeCompression: 5,
        recentTurnsToKeep: 2,
        maxTokensBeforeCompression: 80,
      },
    });

    expect(result.metadata.summarizedRange).toEqual({
      startTurnIndex: 0,
      endTurnIndex: 5,
      startMessageId: "message-1",
      endMessageId: "message-6",
      messageCount: 6,
    });
    expect(result.reloadContext).toContain(
      "- assistant: Next step is to run coverage and confirm the changed code stays above ninety percent.",
    );
    expect(result.reloadContext).not.toContain("message-6");
    expect(result.metadata.unsummarizedTailTokenEstimate).toBeGreaterThan(0);
    expect(result.metadata.freshnessScore).toBeLessThan(1);
  });

  it("merges prior summaries with newer turns and increments summary version", () => {
    const priorSummaries = [
      buildSummary({
        id: "summary-older",
        summaryVersion: 1,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        content: [
          "Objective/context:",
          "- Build context compression",
          "Key facts:",
          "- Existing summary fact",
          "Constraints:",
          "- Use a temporary JSON blob",
        ].join("\n"),
      }),
      buildSummary({
        id: "summary-newer",
        summaryVersion: 2,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
        content: [
          "Objective/context:",
          "- Build context compression",
          "Key facts:",
          "- Existing summary fact",
        ].join("\n"),
      }),
    ];

    const turns = [
      buildTurn({
        id: "message-10",
        content: "We should use the existing memory models instead of a temporary JSON blob.",
      }),
    ];

    const result = compressContext({ turns, priorSummaries });

    expect(result.summaryText).toContain("Existing summary fact");
    expect(result.summaryText).toContain("existing memory models instead of a temporary JSON blob");
    expect(result.metadata.summaryVersion).toBe(3);
    expect(result.metadata.priorSummaryIds).toEqual(["summary-newer", "summary-older"]);
  });

  it("evicts stale summary items when a kept recent tail contradicts them", () => {
    const priorSummaries = [
      buildSummary({
        id: "summary-tail-conflict",
        summaryVersion: 2,
        content: [
          "Key facts:",
          "- The ICP is indie hackers selling courses.",
          "Constraints:",
          "- Persistence should use a temporary JSON blob.",
        ].join("\n"),
      }),
    ];

    const turns = [
      buildTurn({
        id: "message-tail-conflict-1",
        content: "Capture implementation details in the rolling summary before the chat crosses the threshold.",
      }),
      buildTurn({
        id: "message-tail-conflict-2",
        role: "assistant",
        content: "The ICP is B2B SaaS founders with sales-led onboarding.",
      }),
      buildTurn({
        id: "message-tail-conflict-3",
        content: "We decided to use the existing memory store instead of a temporary JSON blob.",
      }),
    ];

    const result = compressContext({
      turns,
      priorSummaries,
      options: {
        maxTurnsBeforeCompression: 2,
        recentTurnsToKeep: 2,
      },
    });

    expect(result.summaryText).not.toContain("The ICP is indie hackers selling courses.");
    expect(result.summaryText).not.toContain("Persistence should use a temporary JSON blob.");
    expect(result.reloadContext).toContain("- assistant: The ICP is B2B SaaS founders with sales-led onboarding.");
    expect(result.reloadContext).toContain(
      "- user: We decided to use the existing memory store instead of a temporary JSON blob.",
    );
  });

  it("replaces stale prior items when newer turns contradict the same subject", () => {
    const priorSummaries = [
      buildSummary({
        id: "summary-contradiction",
        summaryVersion: 2,
        content: [
          "Key facts:",
          "- The ICP is indie hackers selling courses.",
          "Constraints:",
          "- Persistence should use a temporary JSON blob.",
        ].join("\n"),
      }),
    ];

    const turns = [
      buildTurn({
        id: "message-override-1",
        content: "The ICP is B2B SaaS founders with sales-led onboarding.",
      }),
      buildTurn({
        id: "message-override-2",
        role: "assistant",
        content: "We decided to use the existing memory store instead of a temporary JSON blob.",
      }),
    ];

    const result = compressContext({ turns, priorSummaries });

    expect(result.summaryText).toContain("The ICP is B2B SaaS founders with sales-led onboarding.");
    expect(result.summaryText).not.toContain("The ICP is indie hackers selling courses.");
    expect(result.summaryText).toContain("use the existing memory store instead of a temporary JSON blob");
    expect(result.summaryText).not.toContain("Persistence should use a temporary JSON blob.");
  });

  it("keeps durable memory visible and sorted in the reload payload", () => {
    const durableMemoryEntries = [
      buildMemoryEntry({
        id: "memory-constraint",
        kind: "constraint",
        title: "Implementation constraint",
        content: "The summarizer must stay deterministic and provider-agnostic.",
        importance: 5,
        dedupeKey: "constraint:deterministic",
      }),
      buildMemoryEntry({
        id: "memory-decision",
        kind: "decision",
        title: "Persistence layer",
        content: "Use the existing memory store layer for summaries and facts.",
        importance: 5,
        dedupeKey: "decision:store",
        updatedAt: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-03T00:00:00.000Z",
      }),
      buildMemoryEntry({
        id: "memory-archived",
        status: "archived",
        dedupeKey: "fact:archived",
      }),
    ];

    const result = compressContext({
      turns: [buildTurn({ id: "message-20", content: "We need a safe reload payload." })],
      durableMemoryEntries,
    });

    expect(result.reloadContext).toContain("Durable memory:");
    expect(result.reloadContext).toContain("[decision] Persistence layer: Use the existing memory store layer for summaries and facts.");
    expect(result.reloadContext).toContain("[constraint] Implementation constraint: The summarizer must stay deterministic and provider-agnostic.");
    expect(result.reloadContext).not.toContain("memory-archived");
    expect(result.summaryText).not.toContain("[decision] Persistence layer: Use the existing memory store layer for summaries and facts.");
    expect(result.summaryText).not.toContain("[constraint] Implementation constraint: The summarizer must stay deterministic and provider-agnostic.");
    expect(result.metadata.durableMemoryIds).toEqual(["memory-decision", "memory-constraint"]);
  });

  it("builds a memory summary insert payload compatible with the store layer", () => {
    const result = compressContext({
      turns: [
        buildTurn({ id: "message-30", content: "We decided to reload durable facts before future turns." }),
        buildTurn({ id: "message-31", role: "assistant", content: "Next step is to save a session summary row." }),
      ],
      options: { summaryLevel: "project" },
    });

    const payload = buildCompressionMemorySummaryInput({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-9",
      result,
    });

    expect(payload).toEqual({
      userId: "user-1",
      projectId: "project-1",
      sessionId: "session-9",
      summaryLevel: "project",
      summaryVersion: 1,
      content: result.summaryText,
      sourceMessageStartId: "message-30",
      sourceMessageEndId: "message-31",
      tokenEstimate: result.metadata.summaryTokenEstimate,
      freshnessScore: result.metadata.freshnessScore,
    });
  });

  it("filters prior summaries to the requested summary level before merging and versioning", () => {
    const priorSummaries = [
      buildSummary({
        id: "project-summary",
        summaryLevel: "project",
        summaryVersion: 7,
        content: "Key facts:\n- Project summary content should be ignored.",
      }),
      buildSummary({
        id: "phase-summary",
        summaryLevel: "phase",
        summaryVersion: 4,
        content: "Key facts:\n- Phase summary content should be kept.",
      }),
      buildSummary({
        id: "session-summary",
        summaryLevel: "session",
        summaryVersion: 9,
        content: "Key facts:\n- Session summary content should be ignored.",
      }),
    ];

    const result = compressContext({
      turns: [buildTurn({ id: "message-level-filter", content: "Carry forward the matching summary level only." })],
      priorSummaries,
      options: { summaryLevel: "phase" },
    });

    expect(result.summaryText).toContain("Phase summary content should be kept.");
    expect(result.summaryText).not.toContain("Project summary content should be ignored.");
    expect(result.summaryText).not.toContain("Session summary content should be ignored.");
    expect(result.metadata.summaryVersion).toBe(5);
    expect(result.metadata.priorSummaryIds).toEqual(["phase-summary"]);
  });

  it("carries forward prior-summary provenance into merged source coverage", () => {
    const result = compressContext({
      turns: [
        buildTurn({ id: "message-provenance-10", content: "Current summarized turn one." }),
        buildTurn({ id: "message-provenance-11", role: "assistant", content: "Current summarized turn two." }),
      ],
      priorSummaries: [
        buildSummary({
          id: "summary-provenance-older",
          summaryVersion: 1,
          sourceMessageStartId: "message-provenance-1",
          sourceMessageEndId: "message-provenance-4",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
        buildSummary({
          id: "summary-provenance-newer",
          summaryVersion: 2,
          sourceMessageStartId: "message-provenance-5",
          sourceMessageEndId: "message-provenance-9",
          createdAt: "2025-01-02T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        }),
      ],
    });

    expect(result.metadata.summarizedRange).toEqual({
      startTurnIndex: 0,
      endTurnIndex: 1,
      startMessageId: "message-provenance-1",
      endMessageId: "message-provenance-11",
      messageCount: 2,
    });
  });

  it("generates compact reload payloads and ignores blank turns", () => {
    const turns = [
      buildTurn({ id: "message-40", content: "   " }),
      buildTurn({
        id: "message-41",
        content:
          "We are implementing a long context compression pipeline with a deliberately verbose description that should be truncated in the reload payload because future turns only need the compact version.",
      }),
      buildTurn({
        id: "message-42",
        role: "assistant",
        content:
          "I will preserve durable facts, decisions, constraints, open questions, and action items while keeping the payload safe to reload in future turns.",
      }),
    ];

    const result = compressContext({
      turns,
      options: { maxReloadCharacters: 320 },
    });

    expect(result.reloadContext.length).toBeLessThanOrEqual(320);
    expect(result.summaryText).not.toContain("message-40");
    expect(result.reloadContext).toContain("...");
  });

  it("preserves the recent tail when reload context is budget-constrained", () => {
    const turns = Array.from({ length: 6 }, (_, index) =>
      buildTurn({
        id: `message-budget-${index + 1}`,
        role: index % 2 === 0 ? "user" : "assistant",
        content:
          index < 4
            ? `Earlier context block ${index + 1} with enough detail to consume reload budget before the recent tail is appended.`
            : index === 4
              ? "Keep this exact recent user tail line visible in the reload payload."
              : "Keep this exact recent assistant tail line visible in the reload payload.",
      }),
    );

    const result = compressContext({
      turns,
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-budget",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 4,
        recentTurnsToKeep: 2,
        maxReloadCharacters: 272,
      },
    });

    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).toContain("Rolling summary:");
    expect(result.reloadContext).toContain("- user: Keep this exact recent user tail line visible in the reload payload.");
    expect(result.reloadContext).toContain(
      "- assistant: Keep this exact recent assistant tail line visible in the reload payload.",
    );
    expect(result.reloadContext.length).toBeLessThanOrEqual(272);
  });

  it("omits durable memory when only the required sections fit in the reload budget", () => {
    const result = compressContext({
      turns: [
        buildTurn({
          id: "message-optional-budget-1",
          content: "Earlier summary content should exist and be short.",
        }),
        buildTurn({
          id: "message-optional-budget-2",
          role: "assistant",
          content: `${"Tail ".repeat(22)}visible.`,
        }),
      ],
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-optional-budget",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 1,
        maxReloadCharacters: 200,
      },
    });

    expect(result.reloadContext).toContain("Rolling summary:");
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).not.toContain("Durable memory:");
    expect(result.reloadContext).toContain("Tail Tail Tail");
    expect(result.reloadContext.length).toBeLessThanOrEqual(200);
  });

  it("drops optional sections when the required tail consumes the full reload budget", () => {
    const result = compressContext({
      turns: [
        buildTurn({
          id: "message-min-budget-1",
          content: "Capture the earlier discussion in the rolling summary before we hit the strict reload budget.",
        }),
        buildTurn({
          id: "message-min-budget-2",
          role: "assistant",
          content:
            "Tail ".repeat(80) +
            "must stay visible even when it leaves no room for durable memory or the rolling summary in the reload payload.",
        }),
      ],
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-min-budget",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 1,
        maxReloadCharacters: 200,
      },
    });

    expect(result.summaryText).toContain("Capture the earlier discussion in the rolling summary");
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).toContain("Tail Tail Tail");
    expect(result.reloadContext).not.toContain("Rolling summary:");
    expect(result.reloadContext).not.toContain("Durable memory:");
    expect(result.reloadContext).toHaveLength(200);
  });

  it("rejects invalid input and invalid options", () => {
    expect(() => compressContext({ turns: "bad" as never })).toThrow("turns must be an array.");
    expect(() => compressContext({ turns: [null as never] })).toThrow("turns[0] must be an object.");
    expect(() => compressContext({ turns: [{ id: "", role: "user", content: "x" }] })).toThrow(
      "turns[0].id must be a non-empty string.",
    );
    expect(() =>
      compressContext({ turns: [{ id: "message-1", role: "tool" as never, content: "x" }] }),
    ).toThrow("turns[0].role must be user, assistant, or system.");
    expect(() =>
      compressContext({ turns: [{ id: "message-1", role: "user", content: 123 as never }] }),
    ).toThrow("turns[0].content must be a string.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { maxTurnsBeforeCompression: 0 } }),
    ).toThrow("maxTurnsBeforeCompression must be at least 1.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { maxTokensBeforeCompression: -1 } }),
    ).toThrow("maxTokensBeforeCompression must be non-negative.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { recentTurnsToKeep: -1 } }),
    ).toThrow("recentTurnsToKeep must be non-negative.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { maxSummaryItemsPerSection: 0 } }),
    ).toThrow("maxSummaryItemsPerSection must be at least 1.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { summaryLevel: "invalid" as never } }),
    ).toThrow("summaryLevel must be session, phase, or project.");
    expect(() =>
      compressContext({ turns: [buildTurn()], options: { maxReloadCharacters: 199 } }),
    ).toThrow("maxReloadCharacters must be at least 200.");
    expect(() => compressContext({ turns: [buildTurn()], priorSummaries: "bad" as never })).toThrow(
      "priorSummaries must be an array.",
    );
    expect(() =>
      compressContext({ turns: [buildTurn()], priorSummaries: [{} as never] }),
    ).toThrow("priorSummaries[0] must be a valid memory summary.");
    expect(() => compressContext({ turns: [buildTurn()], durableMemoryEntries: "bad" as never })).toThrow(
      "durableMemoryEntries must be an array.",
    );
    expect(() =>
      compressContext({ turns: [buildTurn()], durableMemoryEntries: [{} as never] }),
    ).toThrow("durableMemoryEntries[0] must be a valid memory entry.");
  });

  it("falls back to compact durable lines when the reload budget cannot keep summary and headed durable sections", () => {
    const firstDurableLine =
      "[decision] Persistence layer: Use the existing memory store layer for summaries and facts.";
    const secondDurableLine =
      "[constraint] Determinism: Keep the compressor deterministic across reloads and test runs.";
    const result = compressContext({
      turns: [
        buildTurn({
          id: "message-fallback-1",
          content:
            "We are carrying forward a deliberately long summary seed that should lose its headed rolling summary section once the reload payload gets squeezed hard enough by the tail and durable facts.",
        }),
        buildTurn({
          id: "message-fallback-2",
          role: "assistant",
          content:
            "Keep this recent assistant tail line visible after the compact durable fallback path is applied.",
        }),
      ],
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-fallback-1",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
        }),
        buildMemoryEntry({
          id: "memory-fallback-2",
          kind: "constraint",
          title: "Determinism",
          content: "Keep the compressor deterministic across reloads and test runs.",
          importance: 4,
          dedupeKey: "constraint:determinism",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 1,
        maxReloadCharacters: 200,
      },
    });

    expect(result.reloadContext).toContain("Rolling summary:");
    expect(result.reloadContext).not.toContain("Durable memory:");
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext.length).toBeLessThanOrEqual(200);
  });

  it("keeps only the first optional durable line when the budget runs out before the second", () => {
    const firstDurableLine =
      "[decision] Persistence layer: Use the existing memory store layer for summaries and facts.";
    const secondDurableLine =
      "[constraint] Determinism: Keep the compressor deterministic across reloads and test runs.";
    const result = compressContext({
      turns: [
        buildTurn({
          id: "message-optional-1",
          content:
            "This long earlier context block exists only to force compression while keeping the summary deterministic and stable for the reload payload tests.",
        }),
        buildTurn({
          id: "message-optional-2",
          role: "assistant",
          content: "Keep this exact recent assistant tail line visible in the reload payload.",
        }),
      ],
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-optional-1",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
        }),
        buildMemoryEntry({
          id: "memory-optional-2",
          kind: "constraint",
          title: "Determinism",
          content: "Keep the compressor deterministic across reloads and test runs.",
          importance: 4,
          dedupeKey: "constraint:determinism",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 1,
        maxReloadCharacters: 238,
      },
    });

    expect(result.reloadContext).not.toContain("Durable memory:");
    expect(result.reloadContext).not.toContain(firstDurableLine);
    expect(result.reloadContext).not.toContain(secondDurableLine);
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).toContain(
      "- assistant: Keep this exact recent assistant tail line visible in the reload payload.",
    );
  });

  it("keeps a truncated rolling summary section when there is no durable memory and the reload budget is tiny", () => {
    const result = compressContext({
      turns: [
        buildTurn({
          id: "message-summary-1",
          content:
            "We are generating an intentionally verbose source turn so the rolling summary has to be compacted aggressively while staying present in the reload context.",
        }),
        buildTurn({
          id: "message-summary-2",
          role: "assistant",
          content:
            "Keep this exact recent assistant tail line visible even when the remaining budget for the summary section is extremely small.",
        }),
      ],
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 1,
        maxReloadCharacters: 200,
      },
    });

    expect(result.reloadContext).toContain("Rolling summary:");
    expect(result.reloadContext).toContain("...");
    expect(result.reloadContext).toContain("Recent chat tail:");
    expect(result.reloadContext).not.toContain("Durable memory:");
  });

  it("drops the durable section when only its heading budget remains", () => {
    const turns = [
      buildTurn({
        id: "message-heading-1",
        content:
          "This earlier context exists to consume summary budget while still leaving the recent tail visible for the reload payload branch tests.",
      }),
      buildTurn({
        id: "message-heading-2",
        role: "assistant",
        content:
          "This assistant tail line is intentionally long so the remaining durable-memory budget can land in the tiny heading-only range.",
      }),
    ];

    const durableMemoryEntries = [
      buildMemoryEntry({
        id: "memory-heading-1",
        kind: "decision",
        title: "Persistence layer",
        content: "Use the existing memory store layer for summaries and facts.",
        importance: 5,
        dedupeKey: "decision:store",
      }),
    ];

    const budgetWithNoDurableSection = Array.from({ length: 80 }, (_, index) => 200 + index).find((budget) => {
      const result = compressContext({
        turns,
        durableMemoryEntries,
        options: {
          maxTurnsBeforeCompression: 1,
          recentTurnsToKeep: 1,
          maxReloadCharacters: budget,
        },
      });

      return result.reloadContext.includes("Rolling summary:") && !result.reloadContext.includes("Durable memory:");
    });

    expect(budgetWithNoDurableSection).toBeDefined();
  });

  it("truncates the first durable line when only partial durable budget remains", () => {
    const fullDurableLine = "[decision] Persistence layer: Use the existing memory store layer for summaries and facts.";
    const turns = [
      buildTurn({
        id: "message-durable-truncate-1",
        content:
          "This earlier context block exists only to force summary compression while still leaving some room for a clipped durable memory line.",
      }),
      buildTurn({
        id: "message-durable-truncate-2",
        role: "assistant",
        content: "Keep this exact recent assistant tail line visible in the reload payload.",
      }),
    ];

    const durableMemoryEntries = [
      buildMemoryEntry({
        id: "memory-durable-truncate-1",
        kind: "decision",
        title: "Persistence layer",
        content: "Use the existing memory store layer for summaries and facts.",
        importance: 5,
        dedupeKey: "decision:store",
      }),
    ];

    const truncatedResult = Array.from({ length: 401 }, (_, index) => 200 + index)
      .map((budget) =>
        compressContext({
          turns,
          durableMemoryEntries,
          options: {
            maxTurnsBeforeCompression: 1,
            recentTurnsToKeep: 1,
            maxReloadCharacters: budget,
          },
        }),
      )
      .find(
        (result) =>
          result.reloadContext.includes("Durable memory:") &&
          result.reloadContext.includes("[decision]") &&
          result.reloadContext.includes("...") &&
          !result.reloadContext.includes(fullDurableLine),
      );

    expect(truncatedResult).toBeDefined();
    expect(truncatedResult?.reloadContext).toContain("Durable memory:");
  });

  it("omits the recent tail section entirely when recentTurnsToKeep is zero", () => {
    const turns = [
      buildTurn({
        id: "message-zero-tail-1",
        content: "First summarized turn for the zero-tail compression edge case.",
      }),
      buildTurn({
        id: "message-zero-tail-2",
        role: "assistant",
        content: "Second summarized turn for the zero-tail compression edge case.",
      }),
      buildTurn({
        id: "message-zero-tail-3",
        content: "Third summarized turn for the zero-tail compression edge case.",
      }),
    ];

    const result = compressContext({
      turns,
      options: {
        maxTurnsBeforeCompression: 1,
        recentTurnsToKeep: 0,
        maxReloadCharacters: 240,
      },
    });

    expect(result.metadata.summarizedRange).toEqual({
      startTurnIndex: 0,
      endTurnIndex: 2,
      startMessageId: "message-zero-tail-1",
      endMessageId: "message-zero-tail-3",
      messageCount: 3,
    });
    expect(result.metadata.unsummarizedTailTokenEstimate).toBe(0);
    expect(result.reloadContext).not.toContain("Recent chat tail:");
    expect(result.reloadContext).not.toContain("- user:");
    expect(result.reloadContext).not.toContain("- assistant:");
  });

  it("parses alternate prior-summary headers and durable facts without dedupe keys", () => {
    const priorSummaries = [
      buildSummary({
        id: "summary-alt",
        summaryVersion: 4,
        content: [
          "Context:",
          "- Research run completed",
          "Questions:",
          "- Which memory rows should be reloaded first?",
          "Next steps:",
          "- Add store-compatible summary output",
        ].join("\n"),
      }),
    ];

    const durableMemoryEntries = [
      buildMemoryEntry({
        id: "memory-fallback",
        kind: "fact",
        title: "",
        dedupeKey: null,
        content: "Founders keep asking for safe reload context.",
      }),
    ];

    const result = compressContext({
      turns: [{ id: "assistant-only", role: "assistant", content: "Status update." }],
      priorSummaries,
      durableMemoryEntries,
    });

    expect(result.summaryText).toContain("Objective/context:");
    expect(result.summaryText).toContain("Research run completed");
    expect(result.summaryText).toContain("Open questions:");
    expect(result.summaryText).toContain("Which memory rows should be reloaded first?");
    expect(result.summaryText).toContain("Action items:");
    expect(result.summaryText).toContain("Add store-compatible summary output");
    expect(result.reloadContext).toContain("[fact] Founders keep asking for safe reload context.");
  });

  it("keeps the highest-priority durable memory entry when duplicate durable subjects exist", () => {
    const result = compressContext({
      turns: [buildTurn({ id: "message-durable-dedupe", content: "Reload durable context safely." })],
      durableMemoryEntries: [
        buildMemoryEntry({
          id: "memory-newer",
          kind: "decision",
          title: "Persistence layer",
          content: "Use the existing memory store layer for summaries and facts.",
          importance: 5,
          dedupeKey: "decision:store",
          createdAt: "2025-01-03T00:00:00.000Z",
          updatedAt: "2025-01-03T00:00:00.000Z",
        }),
        buildMemoryEntry({
          id: "memory-older",
          kind: "decision",
          title: "Persistence layer",
          content: "Use a temporary JSON blob for summaries and facts.",
          importance: 1,
          dedupeKey: "decision:store",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
      ],
    });

    expect(result.reloadContext).toContain(
      "[decision] Persistence layer: Use the existing memory store layer for summaries and facts.",
    );
    expect(result.reloadContext).not.toContain(
      "[decision] Persistence layer: Use a temporary JSON blob for summaries and facts.",
    );
    expect(result.metadata.durableMemoryIds).toEqual(["memory-newer"]);
  });
});
