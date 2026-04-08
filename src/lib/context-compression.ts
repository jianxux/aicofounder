import {
  DEFAULT_SUMMARY_FRESHNESS_SCORE,
  DEFAULT_SUMMARY_VERSION,
  compareMemoryEntries,
  compareMemorySummaries,
  isMemoryEntry,
  isMemorySummary,
  normalizeMemoryText,
} from "@/lib/agent-memory";
import type {
  CreateMemorySummaryInput,
  MemoryEntry,
  MemorySummary,
} from "@/lib/agent-memory";
import { isSummaryLevel, type SummaryLevel } from "@/lib/database.types";

export type CompressionTurnRole = "user" | "assistant" | "system";

export type CompressionChatTurn = {
  id: string;
  role: CompressionTurnRole;
  content: string;
  createdAt?: string | null;
};

export type CompressContextOptions = {
  summaryLevel?: SummaryLevel;
  maxTurnsBeforeCompression?: number;
  maxTokensBeforeCompression?: number;
  recentTurnsToKeep?: number;
  maxSummaryItemsPerSection?: number;
  maxReloadCharacters?: number;
};

export type CompressContextInput = {
  turns: readonly CompressionChatTurn[];
  priorSummaries?: readonly MemorySummary[];
  durableMemoryEntries?: readonly MemoryEntry[];
  options?: CompressContextOptions;
};

export type CompressionSourceRange = {
  startTurnIndex: number;
  endTurnIndex: number;
  startMessageId: string | null;
  endMessageId: string | null;
  messageCount: number;
};

export type CompressionMetadata = {
  summarizedRange: CompressionSourceRange | null;
  summaryTokenEstimate: number;
  reloadTokenEstimate: number;
  unsummarizedTailTokenEstimate: number;
  freshnessScore: number;
  summaryVersion: number;
  summaryLevel: SummaryLevel;
  priorSummaryIds: string[];
  durableMemoryIds: string[];
};

export type CompressionResult = {
  summaryText: string;
  reloadContext: string;
  metadata: CompressionMetadata;
};

type SummaryBuckets = {
  objective: string[];
  facts: string[];
  decisions: string[];
  constraints: string[];
  openQuestions: string[];
  actionItems: string[];
};

type MergeableBucket = "facts" | "decisions" | "constraints";

type SummaryProvenance = {
  startMessageId: string | null;
  endMessageId: string | null;
};

const DEFAULT_OPTIONS: Required<CompressContextOptions> = {
  summaryLevel: "session",
  maxTurnsBeforeCompression: 12,
  maxTokensBeforeCompression: 900,
  recentTurnsToKeep: 4,
  maxSummaryItemsPerSection: 6,
  maxReloadCharacters: 2400,
};

const SECTION_TITLES: Array<{ key: keyof SummaryBuckets; title: string }> = [
  { key: "objective", title: "Objective/context" },
  { key: "facts", title: "Key facts" },
  { key: "decisions", title: "Decisions" },
  { key: "constraints", title: "Constraints" },
  { key: "openQuestions", title: "Open questions" },
  { key: "actionItems", title: "Action items" },
];

const VALID_ROLES = new Set<CompressionTurnRole>(["assistant", "system", "user"]);

const emptyBuckets = (): SummaryBuckets => ({
  objective: [],
  facts: [],
  decisions: [],
  constraints: [],
  openQuestions: [],
  actionItems: [],
});

const estimateTokens = (value: string) => Math.max(0, Math.ceil(normalizeMemoryText(value).length / 4));

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const normalizeLine = (value: string) =>
  normalizeMemoryText(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^\s*[-*]\s*/gm, "")
      .replace(/\s+/g, " "),
  );

const normalizeReloadLine = (value: string) => {
  const trimmed = value.trim();
  const bulletMatch = trimmed.match(/^([-*]\s+)([\s\S]+)$/);
  if (!bulletMatch) {
    return normalizeMemoryText(trimmed.replace(/\s+/g, " "));
  }

  return `${bulletMatch[1].trimEnd()} ${normalizeMemoryText(bulletMatch[2].replace(/\s+/g, " "))}`;
};

const splitIntoClauses = (value: string) =>
  value
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map(normalizeLine)
    .filter(Boolean);

const canonicalizeSubject = (value: string) => {
  const normalized = normalizeLine(value).toLowerCase();
  const explicitSubject = normalized.match(
    /^(.{1,80}?)(?:\s+(?:is|are|was|were|will|must|should|need(?:s)?|prefer(?:s|red)?|choose|chosen|decided|requires?|cannot|can't|won't|uses?)\b|:)/,
  );

  const basis = explicitSubject?.[1] ?? normalized;
  return basis
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|this|that|these|those|we|i|you|our|your)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const canonicalizeItem = (value: string) => {
  const subject = canonicalizeSubject(value);
  if (subject.length > 0) {
    return subject;
  }

  return normalizeLine(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
};

const canonicalizeAnchor = (value: string) =>
  normalizeLine(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(the|a|an|this|that|these|those|we|i|you|our|your|is|are|was|were|be|been|being|should|must|need(?:s)?|decid(?:e|ed|ing)|use|using|instead|of)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

function extractConflictAnchors(value: string) {
  const anchors = new Set<string>();
  const subject = canonicalizeSubject(value);
  if (subject) {
    anchors.add(subject);
  }

  const normalized = normalizeLine(value).toLowerCase();
  for (const pattern of [/\binstead of\s+(.+)$/i, /\brather than\s+(.+)$/i, /\bover\s+(.+)$/i, /\bavoid\s+(.+)$/i, /\buse\s+(.+)$/i]) {
    const match = normalized.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const variants = [match[1], ...match[1].split(/\b(?:instead of|rather than|over)\b/i)];
    for (const variant of variants) {
      const anchor = canonicalizeAnchor(variant);
      if (anchor) {
        anchors.add(anchor);
      }
    }
  }

  return anchors;
}

function itemsConflict(left: string, right: string) {
  const leftAnchors = extractConflictAnchors(left);
  const rightAnchors = extractConflictAnchors(right);

  for (const anchor of leftAnchors) {
    if (rightAnchors.has(anchor)) {
      return true;
    }
  }

  return false;
}

const createItemMaps = () =>
  ({
    objective: new Map<string, string>(),
    facts: new Map<string, string>(),
    decisions: new Map<string, string>(),
    constraints: new Map<string, string>(),
    openQuestions: new Map<string, string>(),
    actionItems: new Map<string, string>(),
  }) satisfies Record<keyof SummaryBuckets, Map<string, string>>;

const MERGEABLE_BUCKETS: MergeableBucket[] = ["facts", "decisions", "constraints"];

const formatBulletLines = (items: readonly string[]) => items.map((item) => `- ${item}`);

const pushLines = (buffer: string[], heading: string, items: readonly string[]) => {
  if (items.length === 0) {
    return;
  }

  buffer.push(`${heading}:`);
  buffer.push(...formatBulletLines(items));
};

function assertValidOptions(options: Required<CompressContextOptions>) {
  if (!isSummaryLevel(options.summaryLevel)) {
    throw new TypeError("summaryLevel must be session, phase, or project.");
  }

  if (options.maxTurnsBeforeCompression < 1) {
    throw new TypeError("maxTurnsBeforeCompression must be at least 1.");
  }

  if (options.maxTokensBeforeCompression < 0) {
    throw new TypeError("maxTokensBeforeCompression must be non-negative.");
  }

  if (options.recentTurnsToKeep < 0) {
    throw new TypeError("recentTurnsToKeep must be non-negative.");
  }

  if (options.maxSummaryItemsPerSection < 1) {
    throw new TypeError("maxSummaryItemsPerSection must be at least 1.");
  }

  if (options.maxReloadCharacters < 200) {
    throw new TypeError("maxReloadCharacters must be at least 200.");
  }
}

function normalizeTurns(turns: readonly CompressionChatTurn[]): CompressionChatTurn[] {
  if (!Array.isArray(turns)) {
    throw new TypeError("turns must be an array.");
  }

  return turns.flatMap((turn, index) => {
    if (!turn || typeof turn !== "object") {
      throw new TypeError(`turns[${index}] must be an object.`);
    }

    if (typeof turn.id !== "string" || turn.id.trim().length === 0) {
      throw new TypeError(`turns[${index}].id must be a non-empty string.`);
    }

    if (!VALID_ROLES.has(turn.role)) {
      throw new TypeError(`turns[${index}].role must be user, assistant, or system.`);
    }

    if (typeof turn.content !== "string") {
      throw new TypeError(`turns[${index}].content must be a string.`);
    }

    const content = normalizeLine(turn.content);
    if (!content) {
      return [];
    }

    return [
      {
        id: turn.id,
        role: turn.role,
        content,
        createdAt: turn.createdAt ?? null,
      },
    ];
  });
}

function normalizePriorSummaries(priorSummaries: readonly MemorySummary[] | undefined): MemorySummary[] {
  if (priorSummaries === undefined) {
    return [];
  }

  if (!Array.isArray(priorSummaries)) {
    throw new TypeError("priorSummaries must be an array.");
  }

  return priorSummaries.map((summary, index) => {
    if (!isMemorySummary(summary)) {
      throw new TypeError(`priorSummaries[${index}] must be a valid memory summary.`);
    }

    return summary;
  });
}

function filterPriorSummariesForLevel(
  priorSummaries: readonly MemorySummary[],
  summaryLevel: SummaryLevel,
): MemorySummary[] {
  return priorSummaries.filter((summary) => summary.summaryLevel === summaryLevel);
}

function normalizeDurableMemoryEntries(durableMemoryEntries: readonly MemoryEntry[] | undefined): MemoryEntry[] {
  if (durableMemoryEntries === undefined) {
    return [];
  }

  if (!Array.isArray(durableMemoryEntries)) {
    throw new TypeError("durableMemoryEntries must be an array.");
  }

  return durableMemoryEntries.map((entry, index) => {
    if (!isMemoryEntry(entry)) {
      throw new TypeError(`durableMemoryEntries[${index}] must be a valid memory entry.`);
    }

    return entry;
  });
}

function chooseBucket(clause: string, role: CompressionTurnRole): keyof SummaryBuckets {
  if (/\?$/.test(clause)) {
    return "openQuestions";
  }

  if (
    /\b(todo|next step|follow up|follow-up|action item|please|need to|needs to|should\s+(?:next|follow)|let'?s|i(?:'ll| will)|we(?:'ll| will))\b/i.test(
      clause,
    )
  ) {
    return "actionItems";
  }

  if (
    /\b(decid(?:e|ed|ing)|choose|chose|chosen|prefer|preferred|go with|going with|ship|shipped|commit(?:ted)? to|finali[sz]e|use\b|using\b)\b/i.test(
      clause,
    )
  ) {
    return "decisions";
  }

  if (
    /\b(must|must not|should not|shouldn't|cannot|can't|won't|do not|don't|need to|requires?|without|within|limit|deterministic|provider-agnostic|safe)\b/i.test(
      clause,
    )
  ) {
    return "constraints";
  }

  if (role === "user" && /\b(goal|objective|trying to|want to|building|working on|implement)\b/i.test(clause)) {
    return "objective";
  }

  return "facts";
}

function addBucketItem(
  maps: Record<keyof SummaryBuckets, Map<string, string>>,
  bucket: keyof SummaryBuckets,
  text: string,
  maxLength = 220,
) {
  const normalized = truncate(normalizeLine(text), maxLength);
  if (!normalized) {
    return;
  }

  maps[bucket].set(canonicalizeItem(normalized), normalized);
}

function parseSummaryContent(content: string, maps: Record<keyof SummaryBuckets, Map<string, string>>) {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentBucket: keyof SummaryBuckets = "facts";

  for (const line of lines) {
    const normalized = normalizeLine(line.replace(/^[-*]\s*/, ""));
    if (!normalized) {
      continue;
    }

    if (/^objective\/context:?$/i.test(normalized) || /^objective:?$/i.test(normalized) || /^context:?$/i.test(normalized)) {
      currentBucket = "objective";
      continue;
    }

    if (/^key facts:?$/i.test(normalized) || /^facts:?$/i.test(normalized)) {
      currentBucket = "facts";
      continue;
    }

    if (/^decisions:?$/i.test(normalized)) {
      currentBucket = "decisions";
      continue;
    }

    if (/^constraints:?$/i.test(normalized)) {
      currentBucket = "constraints";
      continue;
    }

    if (/^open questions:?$/i.test(normalized) || /^questions:?$/i.test(normalized)) {
      currentBucket = "openQuestions";
      continue;
    }

    if (/^action items:?$/i.test(normalized) || /^next steps:?$/i.test(normalized)) {
      currentBucket = "actionItems";
      continue;
    }

    addBucketItem(maps, currentBucket, normalized);
  }
}

function collectPriorSummaryItems(
  priorSummaries: readonly MemorySummary[],
  maxItemsPerSection: number,
): SummaryBuckets {
  const maps = createItemMaps();

  [...priorSummaries]
    .sort(compareMemorySummaries)
    .reverse()
    .forEach((summary) => parseSummaryContent(summary.content, maps));

  return finalizeBuckets(maps, maxItemsPerSection);
}

function collectConflictMaskBuckets(turns: readonly CompressionChatTurn[]): SummaryBuckets {
  const maps = createItemMaps();

  for (const turn of turns) {
    for (const clause of splitIntoClauses(turn.content)) {
      const bucket = chooseBucket(clause, turn.role);
      if ((MERGEABLE_BUCKETS as readonly string[]).includes(bucket)) {
        addBucketItem(maps, bucket, clause);
      }
    }
  }

  return finalizeBuckets(maps, Number.MAX_SAFE_INTEGER);
}

function finalizeBuckets(
  maps: Record<keyof SummaryBuckets, Map<string, string>>,
  maxItemsPerSection: number,
): SummaryBuckets {
  const buckets = emptyBuckets();

  for (const key of Object.keys(buckets) as Array<keyof SummaryBuckets>) {
    buckets[key] = [...maps[key].values()].slice(-maxItemsPerSection);
  }

  return buckets;
}

function collectTurnItems(turns: readonly CompressionChatTurn[], maxItemsPerSection: number): SummaryBuckets {
  const maps = createItemMaps();

  for (const turn of turns) {
    for (const clause of splitIntoClauses(turn.content)) {
      addBucketItem(maps, chooseBucket(clause, turn.role), clause);
    }
  }

  const buckets = finalizeBuckets(maps, maxItemsPerSection);
  if (buckets.objective.length === 0) {
    const firstUserTurn = turns.find((turn) => turn.role === "user");
    if (firstUserTurn) {
      buckets.objective = [truncate(firstUserTurn.content, 220)];
    }
  }

  return buckets;
}

function formatMemoryEntry(entry: MemoryEntry) {
  const prefix = entry.title ? `${normalizeLine(entry.title)}: ` : "";
  const suffix = normalizeLine(entry.content);
  return truncate(`${prefix}${suffix}`.trim(), 220);
}

function collectDurableMemoryLines(entries: readonly MemoryEntry[]) {
  const maps = new Map<string, string>();

  [...entries]
    .filter((entry) => entry.status === "active")
    .sort(compareMemoryEntries)
    .forEach((entry) => {
      const subject = entry.dedupeKey ?? (canonicalizeSubject(entry.title || entry.content) || entry.id);
      const key = `${entry.kind}:${subject}`;
      if (!maps.has(key)) {
        maps.set(key, `[${entry.kind}] ${formatMemoryEntry(entry)}`);
      }
    });

  return [...maps.values()];
}

function collectDurableMemoryIds(entries: readonly MemoryEntry[]) {
  const seen = new Set<string>();
  const ids: string[] = [];

  [...entries]
    .filter((entry) => entry.status === "active")
    .sort(compareMemoryEntries)
    .forEach((entry) => {
      const subject = entry.dedupeKey ?? (canonicalizeSubject(entry.title || entry.content) || entry.id);
      const key = `${entry.kind}:${subject}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      ids.push(entry.id);
    });

  return ids;
}

function mergeBuckets(
  prior: SummaryBuckets,
  current: SummaryBuckets,
  maxItemsPerSection: number,
): SummaryBuckets {
  const buckets = emptyBuckets();
  const seen = createItemMaps();
  const appendItem = (bucket: keyof SummaryBuckets, item: string) => {
    const normalized = truncate(normalizeLine(item), 220);
    if (!normalized) {
      return;
    }

    const key = canonicalizeItem(normalized);
    if (seen[bucket].has(key)) {
      return;
    }

    seen[bucket].set(key, normalized);
    buckets[bucket].push(normalized);
  };
  const removeSubjectConflicts = (item: string) => {
    const currentAnchors = extractConflictAnchors(item);
    if (currentAnchors.size === 0) {
      return;
    }

    for (const bucket of MERGEABLE_BUCKETS) {
      buckets[bucket] = buckets[bucket].filter((existingItem) => {
        const matches = itemsConflict(existingItem, item);
        if (matches) {
          seen[bucket].delete(canonicalizeItem(existingItem));
        }
        return !matches;
      });
    }
  };

  for (const key of Object.keys(prior) as Array<keyof SummaryBuckets>) {
    for (const item of prior[key]) {
      appendItem(key, item);
    }
  }

  for (const key of Object.keys(current) as Array<keyof SummaryBuckets>) {
    for (const item of current[key]) {
      if ((MERGEABLE_BUCKETS as string[]).includes(key)) {
        removeSubjectConflicts(item);
      }
      appendItem(key, item);
    }
  }

  return finalizeBuckets(
    Object.fromEntries(
      (Object.keys(buckets) as Array<keyof SummaryBuckets>).map((key) => [key, new Map(buckets[key].map((item) => [item, item]))]),
    ) as Record<keyof SummaryBuckets, Map<string, string>>,
    maxItemsPerSection,
  );
}

function evictConflictingBucketItems(
  buckets: SummaryBuckets,
  newerBuckets: SummaryBuckets,
  maxItemsPerSection: number,
): SummaryBuckets {
  const maps = createItemMaps();
  const newerMergeableItems = MERGEABLE_BUCKETS.flatMap((bucket) => newerBuckets[bucket]);

  for (const key of Object.keys(buckets) as Array<keyof SummaryBuckets>) {
    for (const item of buckets[key]) {
      const shouldEvict =
        (MERGEABLE_BUCKETS as readonly string[]).includes(key) &&
        newerMergeableItems.some((newerItem) => itemsConflict(item, newerItem));

      if (!shouldEvict) {
        addBucketItem(maps, key, item);
      }
    }
  }

  return finalizeBuckets(maps, maxItemsPerSection);
}

function buildSummaryText(buckets: SummaryBuckets) {
  const lines: string[] = [];

  for (const section of SECTION_TITLES) {
    pushLines(lines, section.title, buckets[section.key]);
  }

  return lines.length > 0 ? lines.join("\n") : "No summarized context available.";
}

function buildRecentTail(turns: readonly CompressionChatTurn[]) {
  return turns.map((turn) => `- ${turn.role}: ${truncate(turn.content, 280)}`);
}

function fitLinesWithinBudget(lines: readonly string[], maxCharacters: number, minLineLength = 12) {
  if (lines.length === 0 || maxCharacters <= 0) {
    return [] as string[];
  }

  const normalizedLines = lines.map((line) => normalizeReloadLine(line));
  const fullLength = normalizedLines.reduce((sum, line) => sum + line.length, 0);
  if (fullLength <= maxCharacters) {
    return normalizedLines;
  }

  const baseLength = Math.max(4, Math.min(minLineLength, Math.floor(maxCharacters / normalizedLines.length)));
  const lengths = normalizedLines.map((line) => Math.min(line.length, baseLength));
  let used = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = Math.max(0, maxCharacters - used);

  while (remaining > 0) {
    let advanced = false;

    for (let index = 0; index < normalizedLines.length && remaining > 0; index += 1) {
      if (lengths[index] < normalizedLines[index].length) {
        lengths[index] += 1;
        remaining -= 1;
        advanced = true;
      }
    }

    if (!advanced) {
      break;
    }
  }

  return normalizedLines.map((line, index) => truncate(line, lengths[index]));
}

function fitRequiredSection(title: string, lines: readonly string[], maxCharacters: number) {
  if (maxCharacters <= 0) {
    return "";
  }

  const heading = `${title}:`;
  if (lines.length === 0) {
    return truncate(heading, maxCharacters);
  }

  if (heading.length >= maxCharacters) {
    return truncate(heading, maxCharacters);
  }

  const newlineBudget = lines.length;
  const availableForLines = Math.max(0, maxCharacters - heading.length - newlineBudget);
  const fittedLines = fitLinesWithinBudget(lines, availableForLines);
  return [heading, ...fittedLines].join("\n");
}

function fitOptionalSection(title: string, lines: readonly string[], maxCharacters: number) {
  if (lines.length === 0 || maxCharacters <= 0) {
    return "";
  }

  const heading = `${title}:`;
  if (heading.length > maxCharacters) {
    return "";
  }

  const sectionLines = [heading];
  let used = heading.length;

  for (const line of lines) {
    const normalized = normalizeReloadLine(line);
    const separatorCost = 1;
    const remaining = maxCharacters - used - separatorCost;
    if (remaining <= 0) {
      break;
    }

    if (normalized.length <= remaining) {
      sectionLines.push(normalized);
      used += separatorCost + normalized.length;
      continue;
    }

    sectionLines.push(truncate(normalized, remaining));
    used = maxCharacters;
    break;
  }

  return sectionLines.length > 1 ? sectionLines.join("\n") : "";
}

function buildReloadContext(
  summaryText: string,
  durableMemoryLines: readonly string[],
  recentTailLines: readonly string[],
  maxCharacters: number,
  options: { includeRollingSummary: boolean; includeRecentTail: boolean },
) {
  const joinSections = (sections: readonly string[]) => sections.filter(Boolean).join("\n");
  const summaryLines = summaryText.split("\n");
  const tailSection =
    options.includeRecentTail && recentTailLines.length > 0
      ? fitRequiredSection("Recent chat tail", recentTailLines, maxCharacters)
      : "";
  const reservedTailLength = tailSection.length > 0 ? tailSection.length : 0;
  const remainingBeforeTail = Math.max(0, maxCharacters - reservedTailLength - (tailSection ? 1 : 0));
  const summaryBudget = remainingBeforeTail;
  const summarySection =
    options.includeRollingSummary ? fitRequiredSection("Rolling summary", summaryLines, summaryBudget) : "";
  const summaryReservedSeparators = (summarySection ? 1 : 0) + (tailSection ? 1 : 0);
  const remainingForDurable = Math.max(0, maxCharacters - summarySection.length - reservedTailLength - summaryReservedSeparators);
  const durableSection = fitOptionalSection("Durable memory", durableMemoryLines, remainingForDurable);
  const reloadContext = joinSections([summarySection, durableSection, tailSection]);

  return reloadContext.length <= maxCharacters ? reloadContext : truncate(reloadContext, maxCharacters);
}

function collectMergedSummaryProvenance(
  priorSummaries: readonly MemorySummary[],
  summarizedTurns: readonly CompressionChatTurn[],
): SummaryProvenance {
  const chronologicalPriorSummaries = [...priorSummaries].sort(compareMemorySummaries).reverse();
  const priorStartMessageId =
    chronologicalPriorSummaries.find((summary) => summary.sourceMessageStartId !== null)?.sourceMessageStartId ?? null;
  const priorEndMessageId =
    [...chronologicalPriorSummaries]
      .reverse()
      .find((summary) => summary.sourceMessageEndId !== null)?.sourceMessageEndId ?? null;

  return {
    startMessageId: priorStartMessageId ?? summarizedTurns[0]?.id ?? null,
    endMessageId: summarizedTurns[summarizedTurns.length - 1]?.id ?? priorEndMessageId,
  };
}

export function compressContext(input: CompressContextInput): CompressionResult {
  const options: Required<CompressContextOptions> = {
    ...DEFAULT_OPTIONS,
    ...input.options,
  };
  assertValidOptions(options);

  const turns = normalizeTurns(input.turns);
  const priorSummaries = filterPriorSummariesForLevel(normalizePriorSummaries(input.priorSummaries), options.summaryLevel);
  const durableMemoryEntries = normalizeDurableMemoryEntries(input.durableMemoryEntries);

  const totalTokens = turns.reduce((sum, turn) => sum + estimateTokens(turn.content), 0);
  const shouldKeepTail =
    turns.length > options.maxTurnsBeforeCompression || totalTokens > options.maxTokensBeforeCompression;
  const tailCount = shouldKeepTail ? Math.min(options.recentTurnsToKeep, turns.length) : turns.length;
  const summarizedTurns = shouldKeepTail ? turns.slice(0, Math.max(0, turns.length - tailCount)) : turns;
  const recentTail = shouldKeepTail ? (tailCount > 0 ? turns.slice(-tailCount) : []) : turns;

  const durableMemoryLines = collectDurableMemoryLines(durableMemoryEntries);
  const durableMemoryIds = collectDurableMemoryIds(durableMemoryEntries);
  const priorBuckets = collectPriorSummaryItems(priorSummaries, options.maxSummaryItemsPerSection);
  const currentBuckets = collectTurnItems(summarizedTurns, options.maxSummaryItemsPerSection);
  const mergedBuckets = mergeBuckets(
    priorBuckets,
    currentBuckets,
    options.maxSummaryItemsPerSection,
  );
  const summaryBuckets = shouldKeepTail
    ? evictConflictingBucketItems(
        mergedBuckets,
        collectConflictMaskBuckets(recentTail),
        options.maxSummaryItemsPerSection,
      )
    : mergedBuckets;
  const summaryText = buildSummaryText(summaryBuckets);
  const recentTailLines = buildRecentTail(recentTail);
  const reloadContext = buildReloadContext(
    summaryText,
    durableMemoryLines,
    recentTailLines,
    options.maxReloadCharacters,
    {
      includeRollingSummary: shouldKeepTail || turns.length === 0,
      includeRecentTail: recentTail.length > 0,
    },
  );
  const mergedProvenance = collectMergedSummaryProvenance(priorSummaries, summarizedTurns);

  const summarizedRange =
    summarizedTurns.length > 0 || mergedProvenance.startMessageId !== null || mergedProvenance.endMessageId !== null
      ? {
          startTurnIndex: summarizedTurns.length > 0 ? 0 : -1,
          endTurnIndex: summarizedTurns.length > 0 ? summarizedTurns.length - 1 : -1,
          startMessageId: mergedProvenance.startMessageId,
          endMessageId: mergedProvenance.endMessageId,
          messageCount: summarizedTurns.length,
        }
      : null;

  const unsummarizedTailTokenEstimate =
    shouldKeepTail
      ? recentTail.reduce((sum, turn) => sum + estimateTokens(turn.content), 0)
      : 0;

  const freshnessRatio =
    totalTokens > 0 ? 1 - Math.min(1, unsummarizedTailTokenEstimate / Math.max(totalTokens, 1)) : DEFAULT_SUMMARY_FRESHNESS_SCORE;

  return {
    summaryText,
    reloadContext,
    metadata: {
      summarizedRange,
      summaryTokenEstimate: estimateTokens(summaryText),
      reloadTokenEstimate: estimateTokens(reloadContext),
      unsummarizedTailTokenEstimate,
      freshnessScore: Number(freshnessRatio.toFixed(3)),
      summaryVersion: Math.max(
        DEFAULT_SUMMARY_VERSION,
        priorSummaries.reduce((maxVersion, summary) => Math.max(maxVersion, summary.summaryVersion), 0) + 1,
      ),
      summaryLevel: options.summaryLevel,
      priorSummaryIds: [...priorSummaries].sort(compareMemorySummaries).map((summary) => summary.id),
      durableMemoryIds,
    },
  };
}

export type BuildCompressionMemorySummaryInput = {
  userId: string;
  projectId: string;
  sessionId?: string | null;
  result: CompressionResult;
};

export function buildCompressionMemorySummaryInput({
  userId,
  projectId,
  sessionId = null,
  result,
}: BuildCompressionMemorySummaryInput): CreateMemorySummaryInput {
  return {
    userId,
    projectId,
    sessionId,
    summaryLevel: result.metadata.summaryLevel,
    summaryVersion: result.metadata.summaryVersion,
    content: result.summaryText,
    sourceMessageStartId: result.metadata.summarizedRange?.startMessageId ?? null,
    sourceMessageEndId: result.metadata.summarizedRange?.endMessageId ?? null,
    tokenEstimate: result.metadata.summaryTokenEstimate,
    freshnessScore: result.metadata.freshnessScore,
  };
}
