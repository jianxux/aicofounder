import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { normalizeMemoryText } from "@/lib/agent-memory";
import { compressContext } from "@/lib/context-compression";
import { searchMemoryEntries, searchMemorySummaries } from "@/lib/memory-search";
import type { SummaryLevel } from "@/lib/database.types";

export type PromptMemoryMessage = {
  sender?: "user" | "assistant";
  role?: "user" | "assistant" | "system";
  content: string;
};

export type BuildPromptMemoryInput = {
  messages?: readonly PromptMemoryMessage[];
  query?: string;
  memoryEntries?: readonly MemoryEntry[];
  memorySummaries?: readonly MemorySummary[];
};

export type PromptMemoryMetadata = {
  query: string;
  entryIds: string[];
  summaryIds: string[];
  summaryLevel: SummaryLevel | null;
  reloadTokenEstimate: number;
};

export type PromptMemoryResult = {
  block: string;
  metadata: PromptMemoryMetadata;
};

type RetrievalContext = {
  projectId?: string;
  sessionId?: string;
};

const DEFAULT_ENTRY_LIMIT = 6;
const DEFAULT_SUMMARY_LIMIT = 4;
const MAX_RELOAD_CHARACTERS = 1200;

function normalizeQuery(messages: readonly PromptMemoryMessage[] | undefined, query: string | undefined) {
  const explicitQuery = query?.trim();
  if (explicitQuery) {
    return normalizeMemoryText(explicitQuery);
  }

  if (!messages?.length) {
    return "";
  }

  const prioritizedMessages = [...messages]
    .reverse()
    .filter((message) => {
      const role = message.role ?? message.sender;
      return role === "user" && message.content.trim().length > 0;
    });

  const fallbackMessages = prioritizedMessages.length > 0 ? prioritizedMessages : [...messages].reverse();
  const recentContext = fallbackMessages
    .slice(0, 3)
    .map((message) => message.content.trim())
    .filter(Boolean)
    .reverse()
    .join(" ");

  return recentContext ? normalizeMemoryText(recentContext) : "";
}

function dedupeEntries(entries: readonly MemoryEntry[]) {
  const supersededIds = new Set(
    entries
      .map((entry) => entry.supersedesMemoryId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const seenKeys = new Set<string>();
  const deduped: MemoryEntry[] = [];

  for (const entry of entries) {
    if (entry.status !== "active" || supersededIds.has(entry.id)) {
      continue;
    }

    const key =
      entry.dedupeKey ??
      `${normalizeMemoryText(entry.title).toLowerCase()}::${normalizeMemoryText(entry.content).toLowerCase()}`;

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    deduped.push(entry);
  }

  return deduped.slice(0, DEFAULT_ENTRY_LIMIT);
}

function dedupeSummaries(summaries: readonly MemorySummary[]) {
  if (summaries.length === 0) {
    return { summaries: [] as MemorySummary[], summaryLevel: null as SummaryLevel | null };
  }

  const summaryLevel = summaries[0]?.summaryLevel ?? null;
  const seenContent = new Set<string>();
  const deduped: MemorySummary[] = [];

  for (const summary of summaries) {
    if (summary.summaryLevel !== summaryLevel) {
      continue;
    }

    const contentKey = normalizeMemoryText(summary.content).toLowerCase();
    if (seenContent.has(contentKey)) {
      continue;
    }

    seenContent.add(contentKey);
    deduped.push(summary);
  }

  return {
    summaries: deduped.slice(0, DEFAULT_SUMMARY_LIMIT),
    summaryLevel,
  };
}

function deriveRetrievalContext(
  entryHits: ReturnType<typeof searchMemoryEntries>,
  summaryHits: ReturnType<typeof searchMemorySummaries>,
): RetrievalContext {
  const summary = summaryHits[0]?.summary;
  if (summary) {
    return {
      projectId: summary.projectId ?? undefined,
      sessionId: summary.sessionId ?? undefined,
    };
  }

  const entry = entryHits[0]?.entry;
  if (entry) {
    return {
      projectId: entry.projectId ?? undefined,
      sessionId: entry.sessionId ?? undefined,
    };
  }

  return {};
}

function scoreEntryAlignment(entry: MemoryEntry, context: RetrievalContext) {
  let score = 0;

  if (context.projectId) {
    score += entry.projectId === context.projectId ? 3 : entry.projectId ? -2 : 0;
  }

  if (context.sessionId) {
    score += entry.sessionId === context.sessionId ? 5 : entry.sessionId ? -2 : 0;
    score += entry.scope === "session" ? 2 : entry.scope === "project" ? 1 : 0;
  }

  return score;
}

function prioritizeEntriesByContext(
  hits: ReturnType<typeof searchMemoryEntries>,
  context: RetrievalContext,
) {
  return hits
    .map((hit, index) => ({
      hit,
      index,
      alignmentScore: scoreEntryAlignment(hit.entry, context),
    }))
    .sort((left, right) => right.alignmentScore - left.alignmentScore || left.index - right.index)
    .map(({ hit }) => hit);
}

export function buildPromptMemory(input: BuildPromptMemoryInput): PromptMemoryResult {
  const query = normalizeQuery(input.messages, input.query);

  if (!query) {
    return {
      block: "",
      metadata: {
        query: "",
        entryIds: [],
        summaryIds: [],
        summaryLevel: null,
        reloadTokenEstimate: 0,
      },
    };
  }

  const initialEntryHits = searchMemoryEntries(input.memoryEntries ?? [], query, { limit: DEFAULT_ENTRY_LIMIT * 2 });
  const initialSummaryHits = searchMemorySummaries(input.memorySummaries ?? [], query, { limit: DEFAULT_SUMMARY_LIMIT * 2 });
  const retrievalContext = deriveRetrievalContext(initialEntryHits, initialSummaryHits);
  const entryHits = prioritizeEntriesByContext(
    searchMemoryEntries(input.memoryEntries ?? [], query, {
      limit: DEFAULT_ENTRY_LIMIT * 2,
      ...retrievalContext,
    }),
    retrievalContext,
  );
  const summaryHits = searchMemorySummaries(input.memorySummaries ?? [], query, {
    limit: DEFAULT_SUMMARY_LIMIT * 2,
    ...retrievalContext,
  });
  const selectedEntries = dedupeEntries(entryHits.map((hit) => hit.entry));
  const { summaries: selectedSummaries, summaryLevel } = dedupeSummaries(summaryHits.map((hit) => hit.summary));

  if (selectedEntries.length === 0 && selectedSummaries.length === 0) {
    return {
      block: "",
      metadata: {
        query,
        entryIds: [],
        summaryIds: [],
        summaryLevel,
        reloadTokenEstimate: 0,
      },
    };
  }

  const result = compressContext({
    turns: [],
    priorSummaries: selectedSummaries,
    durableMemoryEntries: selectedEntries,
    options: {
      summaryLevel: summaryLevel ?? "session",
      maxReloadCharacters: MAX_RELOAD_CHARACTERS,
    },
  });

  return {
    block: `Relevant memory context:\n${result.reloadContext}`.trim(),
    metadata: {
      query,
      entryIds: selectedEntries.map((entry) => entry.id),
      summaryIds: selectedSummaries.map((summary) => summary.id),
      summaryLevel,
      reloadTokenEstimate: result.metadata.reloadTokenEstimate,
    },
  };
}
