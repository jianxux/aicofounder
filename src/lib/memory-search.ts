import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { compareMemoryEntries, compareMemorySummaries } from "@/lib/agent-memory";

export type MemorySearchOptions = {
  limit?: number;
  projectId?: string | null;
  sessionId?: string | null;
};

type MemorySearchResultBase = {
  score: number;
  matchedTerms: string[];
  snippet: string;
  reasons: string[];
};

export type MemoryEntrySearchResult = MemorySearchResultBase & {
  sourceType: "entry";
  entry: MemoryEntry;
};

export type MemorySummarySearchResult = MemorySearchResultBase & {
  sourceType: "summary";
  summary: MemorySummary;
};

type SearchableText = {
  raw: string;
  normalized: string;
  exactParts: string[];
};

type ScoredTermMatch = {
  matched: boolean;
  exact: boolean;
  score: number;
};

type ScoreAccumulator = {
  total: number;
  reasons: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenizeSearchQuery(query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(" "))];
}

function buildText(value: string | null | undefined): SearchableText {
  const raw = value ?? "";
  const normalized = normalizeSearchText(raw);
  return {
    raw,
    normalized,
    exactParts: normalized ? normalized.split(" ") : [],
  };
}

function buildTextCollection(values: readonly string[]): SearchableText {
  const raw = values.join(", ");
  const normalizedParts = values.map((value) => normalizeSearchText(value)).filter(Boolean);
  return {
    raw,
    normalized: normalizedParts.join(" "),
    exactParts: normalizedParts,
  };
}

function hasExactTerm(text: SearchableText, term: string) {
  if (text.exactParts.includes(term)) {
    return true;
  }

  if (!text.normalized) {
    return false;
  }

  return new RegExp(`(^| )${escapeRegExp(term)}( |$)`).test(text.normalized);
}

function scoreTerm(text: SearchableText, term: string, exactWeight: number, partialWeight: number): ScoredTermMatch {
  if (hasExactTerm(text, term)) {
    return { matched: true, exact: true, score: exactWeight };
  }

  if (text.normalized.includes(term)) {
    return { matched: true, exact: false, score: partialWeight };
  }

  return { matched: false, exact: false, score: 0 };
}

function clampLimit(limit: number | undefined, total: number) {
  if (limit === undefined) {
    return total;
  }

  return Math.max(0, Math.min(total, Math.floor(limit)));
}

function addScore(accumulator: ScoreAccumulator, delta: number, reason: string) {
  if (delta === 0) {
    return;
  }

  accumulator.total += delta;
  accumulator.reasons.push(reason);
}

function pickSnippet(texts: readonly SearchableText[], normalizedQuery: string, matchedTerms: readonly string[]) {
  for (const text of texts) {
    const raw = text.raw.trim();
    if (!raw) {
      continue;
    }

    const lowered = raw.toLowerCase();
    const exactIndex = normalizedQuery ? lowered.indexOf(normalizedQuery) : -1;
    if (exactIndex >= 0) {
      return sliceSnippet(raw, exactIndex, normalizedQuery.length);
    }

    for (const term of matchedTerms) {
      const termIndex = lowered.indexOf(term.toLowerCase());
      if (termIndex >= 0) {
        return sliceSnippet(raw, termIndex, term.length);
      }
    }
  }

  return "";
}

function sliceSnippet(value: string, start: number, length: number) {
  const before = 28;
  const after = 92;
  const sliceStart = Math.max(0, start - before);
  const sliceEnd = Math.min(value.length, start + length + after);
  const prefix = sliceStart > 0 ? "..." : "";
  const suffix = sliceEnd < value.length ? "..." : "";
  return `${prefix}${value.slice(sliceStart, sliceEnd).trim()}${suffix}`;
}

function computeRelativeRecencyScore(timestamp: string, newestTimestamp: number | null, maxPoints: number) {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value) || newestTimestamp === null) {
    return 0;
  }

  const daysBehind = Math.max(0, (newestTimestamp - value) / 86_400_000);
  return Math.max(0, Math.round((1 - Math.min(daysBehind, 30) / 30) * maxPoints));
}

function findNewestTimestamp(values: readonly string[]) {
  let newest: number | null = null;

  for (const value of values) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
      continue;
    }
    newest = newest === null ? time : Math.max(newest, time);
  }

  return newest;
}

function scoreMemoryEntry(
  entry: MemoryEntry,
  query: string,
  terms: readonly string[],
  options: MemorySearchOptions,
  newestTimestamp: number | null,
): MemoryEntrySearchResult {
  const title = buildText(entry.title);
  const content = buildText(entry.content);
  const tags = buildTextCollection(entry.tags);
  const kind = buildText(entry.kind);
  const dedupeKey = buildText(entry.dedupeKey);
  const normalizedQuery = normalizeSearchText(query);
  const matchedTerms = new Set<string>();
  const accumulator: ScoreAccumulator = { total: 0, reasons: [] };

  if (normalizedQuery) {
    if (title.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 180, "exact phrase in title");
    }
    if (tags.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 95, "exact phrase in tags");
    }
    if (kind.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 70, "exact phrase in kind");
    }
    if (dedupeKey.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 78, "exact phrase in dedupe key");
    }
    if (content.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 115, "exact phrase in content");
    }
  }

  let titleCoverage = 0;
  for (const term of terms) {
    let matched = false;

    const titleScore = scoreTerm(title, term, 34, 17);
    if (titleScore.matched) {
      matched = true;
      titleCoverage += 1;
      addScore(accumulator, titleScore.score, `title match for "${term}"`);
    }

    const tagScore = scoreTerm(tags, term, 24, 12);
    if (tagScore.matched) {
      matched = true;
      addScore(accumulator, tagScore.score, `tag match for "${term}"`);
    }

    const kindScore = scoreTerm(kind, term, 18, 9);
    if (kindScore.matched) {
      matched = true;
      addScore(accumulator, kindScore.score, `kind match for "${term}"`);
    }

    const dedupeScore = scoreTerm(dedupeKey, term, 15, 7);
    if (dedupeScore.matched) {
      matched = true;
      addScore(accumulator, dedupeScore.score, `dedupe key match for "${term}"`);
    }

    const contentScore = scoreTerm(content, term, 12, 6);
    if (contentScore.matched) {
      matched = true;
      addScore(accumulator, contentScore.score, `content match for "${term}"`);
    }

    if (matched) {
      matchedTerms.add(term);
    }
  }

  if (terms.length > 0 && matchedTerms.size === terms.length) {
    addScore(accumulator, 48, "all query terms matched");
  }

  if (terms.length > 1 && titleCoverage === terms.length) {
    addScore(accumulator, 24, "all query terms covered by title");
  }

  const statusAdjustment = { active: 0, superseded: -45, archived: -75 }[entry.status];
  addScore(accumulator, statusAdjustment, `${entry.status} status adjustment`);
  addScore(accumulator, entry.importance * 6, "importance boost");
  addScore(accumulator, Math.round(entry.confidence * 14), "confidence boost");

  if (options.projectId) {
    if (entry.projectId === options.projectId) {
      addScore(accumulator, 18, "project alignment");
    } else if (entry.projectId) {
      addScore(accumulator, -20, "project mismatch penalty");
    }
  }

  if (options.sessionId) {
    if (entry.sessionId === options.sessionId) {
      addScore(accumulator, 30, "session alignment");
    } else if (entry.sessionId) {
      addScore(accumulator, -16, "session mismatch penalty");
    }
  }

  if (options.sessionId) {
    const scopeScore = entry.scope === "session" ? 14 : entry.scope === "project" ? 8 : 0;
    addScore(accumulator, scopeScore, "scope relevance");
  } else if (options.projectId) {
    const scopeScore = entry.scope === "project" ? 12 : entry.scope === "session" ? 4 : 0;
    addScore(accumulator, scopeScore, "scope relevance");
  }

  const recencyScore = computeRelativeRecencyScore(entry.updatedAt, newestTimestamp, 6);
  addScore(accumulator, recencyScore, "recently updated");

  const orderedMatchedTerms = [...matchedTerms].sort();
  return {
    sourceType: "entry",
    entry,
    score: accumulator.total,
    matchedTerms: orderedMatchedTerms,
    snippet: pickSnippet([title, content, tags, dedupeKey], normalizedQuery, orderedMatchedTerms),
    reasons: accumulator.reasons,
  };
}

function scoreMemorySummary(
  summary: MemorySummary,
  query: string,
  terms: readonly string[],
  options: MemorySearchOptions,
  newestTimestamp: number | null,
): MemorySummarySearchResult {
  const content = buildText(summary.content);
  const level = buildText(summary.summaryLevel);
  const normalizedQuery = normalizeSearchText(query);
  const matchedTerms = new Set<string>();
  const accumulator: ScoreAccumulator = { total: 0, reasons: [] };

  if (normalizedQuery) {
    if (content.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 125, "exact phrase in summary content");
    }
    if (level.normalized.includes(normalizedQuery)) {
      addScore(accumulator, 46, "exact phrase in summary level");
    }
  }

  for (const term of terms) {
    let matched = false;

    const contentScore = scoreTerm(content, term, 24, 10);
    if (contentScore.matched) {
      matched = true;
      addScore(accumulator, contentScore.score, `summary content match for "${term}"`);
    }

    const levelScore = scoreTerm(level, term, 12, 6);
    if (levelScore.matched) {
      matched = true;
      addScore(accumulator, levelScore.score, `summary level match for "${term}"`);
    }

    if (matched) {
      matchedTerms.add(term);
    }
  }

  if (terms.length > 0 && matchedTerms.size === terms.length) {
    addScore(accumulator, 32, "all query terms matched");
  }

  if (content.exactParts.length > matchedTerms.size) {
    addScore(accumulator, 10, "richer summary context");
  }

  addScore(accumulator, Math.round(summary.freshnessScore * 24), "freshness boost");
  addScore(accumulator, { session: 16, phase: 10, project: 6 }[summary.summaryLevel], "summary level weight");
  addScore(accumulator, Math.min(summary.summaryVersion * 2, 8), "summary version weight");

  if (options.projectId) {
    if (summary.projectId === options.projectId) {
      addScore(accumulator, 16, "project alignment");
    } else {
      addScore(accumulator, -90, "project mismatch penalty");
    }
  }

  if (options.sessionId) {
    if (summary.sessionId === options.sessionId) {
      addScore(accumulator, 24, "session alignment");
    } else if (summary.sessionId) {
      addScore(accumulator, -28, "session mismatch penalty");
    }
  }

  const recencyScore = computeRelativeRecencyScore(summary.createdAt, newestTimestamp, 6);
  addScore(accumulator, recencyScore, "recent summary");

  const orderedMatchedTerms = [...matchedTerms].sort();
  return {
    sourceType: "summary",
    summary,
    score: accumulator.total,
    matchedTerms: orderedMatchedTerms,
    snippet: pickSnippet([content, level], normalizedQuery, orderedMatchedTerms),
    reasons: accumulator.reasons,
  };
}

export function searchMemoryEntries(
  entries: readonly MemoryEntry[],
  query: string,
  options: MemorySearchOptions = {},
): MemoryEntrySearchResult[] {
  const terms = tokenizeSearchQuery(query);
  if (terms.length === 0) {
    return [];
  }

  const limit = clampLimit(options.limit, entries.length);
  const newestTimestamp = findNewestTimestamp(entries.map((entry) => entry.updatedAt));

  return entries
    .map((entry) => scoreMemoryEntry(entry, query, terms, options, newestTimestamp))
    .filter((result) => result.matchedTerms.length > 0)
    .sort((left, right) => right.score - left.score || compareMemoryEntries(left.entry, right.entry))
    .slice(0, limit);
}

export function searchMemorySummaries(
  summaries: readonly MemorySummary[],
  query: string,
  options: MemorySearchOptions = {},
): MemorySummarySearchResult[] {
  const terms = tokenizeSearchQuery(query);
  if (terms.length === 0) {
    return [];
  }

  const limit = clampLimit(options.limit, summaries.length);
  const newestTimestamp = findNewestTimestamp(summaries.map((summary) => summary.createdAt));

  return summaries
    .map((summary) => scoreMemorySummary(summary, query, terms, options, newestTimestamp))
    .filter((result) => result.matchedTerms.length > 0)
    .sort((left, right) => right.score - left.score || compareMemorySummaries(left.summary, right.summary))
    .slice(0, limit);
}
