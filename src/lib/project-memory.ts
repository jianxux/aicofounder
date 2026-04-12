import type {
  CustomerResearchMemoArtifact,
  ProjectArtifact,
  ProjectMemory,
  ProjectMemoryConfidence,
  ProjectMemoryEntry,
  ProjectMemoryField,
  ProjectMemorySource,
  ValidationScorecardArtifact,
} from "@/lib/types";

const PROJECT_MEMORY_FIELD_ORDER: ProjectMemoryField[] = [
  "icp",
  "constraints",
  "hypotheses",
  "experiments",
  "validatedFindings",
];

const PROJECT_MEMORY_CONFIDENCE_RANK: Record<ProjectMemoryConfidence, number> = {
  tentative: 0,
  supported: 1,
  validated: 2,
};

function normalizeText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeKey(value: string) {
  return normalizeText(value).toLowerCase();
}

function hashKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function createEmptyProjectMemory(): ProjectMemory {
  return {
    icp: [],
    constraints: [],
    hypotheses: [],
    experiments: [],
    validatedFindings: [],
  };
}

function compareSources(left: ProjectMemorySource, right: ProjectMemorySource) {
  return (
    left.artifactType.localeCompare(right.artifactType) ||
    left.artifactId.localeCompare(right.artifactId) ||
    left.revisionId.localeCompare(right.revisionId) ||
    left.updatedAt.localeCompare(right.updatedAt)
  );
}

function compareEntries(left: ProjectMemoryEntry, right: ProjectMemoryEntry) {
  return (
    normalizeKey(left.content).localeCompare(normalizeKey(right.content)) ||
    normalizeKey(left.label).localeCompare(normalizeKey(right.label)) ||
    left.id.localeCompare(right.id)
  );
}

function normalizeSources(sources: ProjectMemorySource[] | undefined) {
  const deduped = new Map<string, ProjectMemorySource>();

  for (const source of sources ?? []) {
    if (!source?.artifactId || !source?.artifactType || !source?.revisionId || !source?.updatedAt) {
      continue;
    }

    deduped.set(`${source.artifactType}:${source.artifactId}`, source);
  }

  return [...deduped.values()].sort(compareSources);
}

function normalizeExistingMemory(existingMemory: ProjectMemory | undefined): ProjectMemory {
  const normalized = createEmptyProjectMemory();

  for (const field of PROJECT_MEMORY_FIELD_ORDER) {
    const entries = existingMemory?.[field] ?? [];
    const deduped = new Map<string, ProjectMemoryEntry>();

    for (const entry of entries) {
      const label = normalizeText(entry?.label);
      const content = normalizeText(entry?.content);
      if (!label || !content) {
        continue;
      }

      const key = `${field}:${normalizeKey(content)}`;
      const existing = deduped.get(key);
      const nextEntry: ProjectMemoryEntry = {
        id: entry?.id && normalizeText(entry.id) ? entry.id : `memory:${field}:${hashKey(key)}`,
        field,
        label,
        content,
        confidence:
          entry?.confidence && entry.confidence in PROJECT_MEMORY_CONFIDENCE_RANK ? entry.confidence : "supported",
        updatedAt: normalizeText(entry?.updatedAt) || "1970-01-01T00:00:00.000Z",
        sources: normalizeSources(entry?.sources),
      };

      if (!existing) {
        deduped.set(key, nextEntry);
        continue;
      }

      deduped.set(key, mergeEntries(existing, nextEntry));
    }

    normalized[field] = [...deduped.values()].sort(compareEntries);
  }

  return normalized;
}

function mergeEntries(existing: ProjectMemoryEntry, next: ProjectMemoryEntry): ProjectMemoryEntry {
  const label =
    normalizeText(next.label).length > normalizeText(existing.label).length ? normalizeText(next.label) : existing.label;
  const content =
    normalizeText(next.content).length > normalizeText(existing.content).length
      ? normalizeText(next.content)
      : existing.content;
  const confidence =
    PROJECT_MEMORY_CONFIDENCE_RANK[next.confidence] >= PROJECT_MEMORY_CONFIDENCE_RANK[existing.confidence]
      ? next.confidence
      : existing.confidence;
  const updatedAt = next.updatedAt >= existing.updatedAt ? next.updatedAt : existing.updatedAt;
  const sources = normalizeSources([...existing.sources, ...next.sources]);

  return {
    id: existing.id,
    field: existing.field,
    label,
    content,
    confidence,
    updatedAt,
    sources,
  };
}

function pruneArtifactSources(memory: ProjectMemory, artifactId: string): ProjectMemory {
  const nextMemory = createEmptyProjectMemory();

  for (const field of PROJECT_MEMORY_FIELD_ORDER) {
    nextMemory[field] = memory[field]
      .map((entry) => ({
        ...entry,
        sources: entry.sources.filter((source) => source.artifactId !== artifactId),
      }))
      .filter((entry) => entry.sources.length > 0)
      .sort(compareEntries);
  }

  return nextMemory;
}

type ExtractedMemoryCandidate = {
  field: ProjectMemoryField;
  label: string;
  content: string;
  confidence: ProjectMemoryConfidence;
};

function createMemoryEntry(source: ProjectMemorySource, candidate: ExtractedMemoryCandidate): ProjectMemoryEntry | null {
  const label = normalizeText(candidate.label);
  const content = normalizeText(candidate.content);

  if (!label || !content) {
    return null;
  }

  const field = candidate.field;
  const key = `${field}:${normalizeKey(content)}`;

  return {
    id: `memory:${field}:${hashKey(key)}`,
    field,
    label,
    content,
    confidence: candidate.confidence,
    updatedAt: source.updatedAt,
    sources: [source],
  };
}

function splitSentences(value: string | undefined) {
  return normalizeText(value)
    .split(/(?<=[.!?])\s+/)
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function looksLikeIcp(value: string) {
  return (
    /\b(icp|ideal customer|target customer|customer segment|buyer persona|best-fit customer)\b/i.test(value) &&
    !looksLikeExperiment(value)
  );
}

function looksLikeConstraint(value: string) {
  return /\b(constraint|budget|timeline|resource|headcount|security|compliance|regulatory|integration|procurement|legal)\b/i.test(
    value,
  );
}

function looksLikeExperiment(value: string) {
  return /\b(experiment|pilot|test|tests|interview|interviews|survey|surveys|prototype|prototypes|trial|trials|smoke test|discovery call)\b/i.test(
    value,
  );
}

function looksUncertain(value: string) {
  return /\b(unclear|unknown|open question|question|assumption|hypothesis|need to validate|needs validation|unsure|tbd)\b/i.test(
    value,
  );
}

function extractValidationMemory(artifact: ValidationScorecardArtifact) {
  const candidates: ExtractedMemoryCandidate[] = [];

  splitSentences(artifact.summary).forEach((sentence) => {
    if (looksLikeIcp(sentence)) {
      candidates.push({ field: "icp", label: "Ideal customer profile", content: sentence, confidence: "supported" });
    }
    if (looksLikeConstraint(sentence)) {
      candidates.push({ field: "constraints", label: "Constraint", content: sentence, confidence: "supported" });
    }
    if (looksLikeExperiment(sentence)) {
      candidates.push({ field: "experiments", label: "Experiment", content: sentence, confidence: "tentative" });
    }
    if (looksUncertain(sentence)) {
      candidates.push({ field: "hypotheses", label: "Hypothesis to test", content: sentence, confidence: "tentative" });
    }
  });

  artifact.criteria.forEach((criterion) => {
    const notes = normalizeText(criterion.notes);
    const statement = notes ? `${criterion.label}: ${notes}` : criterion.label;

    if (looksLikeIcp(statement)) {
      candidates.push({ field: "icp", label: criterion.label, content: statement, confidence: "supported" });
    }

    if (looksLikeConstraint(statement)) {
      candidates.push({ field: "constraints", label: criterion.label, content: statement, confidence: "supported" });
    }

    if (looksLikeExperiment(statement)) {
      candidates.push({ field: "experiments", label: criterion.label, content: statement, confidence: "tentative" });
    }

    if (criterion.score === undefined || criterion.score <= 3 || looksUncertain(statement)) {
      candidates.push({ field: "hypotheses", label: criterion.label, content: statement, confidence: "tentative" });
    }

    if (typeof criterion.score === "number" && criterion.score >= 4 && notes) {
      candidates.push({
        field: "validatedFindings",
        label: criterion.label,
        content: statement,
        confidence: "validated",
      });
    }
  });

  return candidates;
}

function extractResearchMemory(artifact: CustomerResearchMemoArtifact) {
  const report = artifact.research?.report;
  const candidates: ExtractedMemoryCandidate[] = [];

  splitSentences(report?.executiveSummary).forEach((sentence) => {
    if (looksLikeIcp(sentence)) {
      candidates.push({ field: "icp", label: "Ideal customer profile", content: sentence, confidence: "supported" });
    }
    if (looksLikeConstraint(sentence)) {
      candidates.push({ field: "constraints", label: "Constraint", content: sentence, confidence: "supported" });
    }
    if (looksLikeExperiment(sentence)) {
      candidates.push({ field: "experiments", label: "Experiment", content: sentence, confidence: "tentative" });
    }
  });

  report?.sections.forEach((section) => {
    splitSentences(section.findings).forEach((sentence) => {
      if (looksLikeIcp(sentence)) {
        candidates.push({ field: "icp", label: section.title, content: sentence, confidence: "supported" });
      }
      if (looksLikeConstraint(sentence)) {
        candidates.push({ field: "constraints", label: section.title, content: sentence, confidence: "supported" });
      }
      if (looksLikeExperiment(sentence)) {
        candidates.push({ field: "experiments", label: section.title, content: sentence, confidence: "tentative" });
      }
    });
  });

  (report?.keyFindings ?? []).forEach((finding) => {
    if (finding.citationIds.length === 0 || (finding.strength !== "strong" && finding.strength !== "moderate")) {
      return;
    }

    candidates.push({
      field: "validatedFindings",
      label: "Validated finding",
      content: finding.statement,
      confidence: "validated",
    });

    if (looksLikeIcp(finding.statement)) {
      candidates.push({
        field: "icp",
        label: "Ideal customer profile",
        content: finding.statement,
        confidence: "supported",
      });
    }
  });

  (report?.caveats ?? []).forEach((caveat) => {
    candidates.push({
      field: "constraints",
      label: "Constraint",
      content: caveat.statement,
      confidence: "supported",
    });
  });

  (report?.contradictions ?? []).forEach((contradiction) => {
    candidates.push({
      field: "hypotheses",
      label: "Contradiction to resolve",
      content: contradiction.statement,
      confidence: "tentative",
    });
  });

  (report?.unansweredQuestions ?? []).forEach((question) => {
    candidates.push({
      field: "hypotheses",
      label: "Open question",
      content: question.question,
      confidence: "tentative",
    });
  });

  return candidates;
}

function extractArtifactMemory(artifact: ProjectArtifact) {
  const source: ProjectMemorySource = {
    artifactId: artifact.id,
    artifactType: artifact.type,
    revisionId: artifact.currentRevision.id,
    updatedAt: artifact.updatedAt,
  };
  const rawCandidates =
    artifact.type === "validation-scorecard" ? extractValidationMemory(artifact) : extractResearchMemory(artifact);

  const deduped = new Map<string, ProjectMemoryEntry>();

  for (const candidate of rawCandidates) {
    const entry = createMemoryEntry(source, candidate);
    if (!entry) {
      continue;
    }

    const key = `${entry.field}:${normalizeKey(entry.content)}`;
    const existing = deduped.get(key);
    deduped.set(key, existing ? mergeEntries(existing, entry) : entry);
  }

  return [...deduped.values()].sort(compareEntries);
}

function mergePromotedEntries(memory: ProjectMemory, entries: ProjectMemoryEntry[]) {
  const nextMemory = createEmptyProjectMemory();
  for (const field of PROJECT_MEMORY_FIELD_ORDER) {
    nextMemory[field] = [...memory[field]];
  }

  for (const entry of entries) {
    const field = entry.field;
    const key = `${field}:${normalizeKey(entry.content)}`;
    const existingIndex = nextMemory[field].findIndex((candidate) => `${field}:${normalizeKey(candidate.content)}` === key);

    if (existingIndex === -1) {
      nextMemory[field] = [...nextMemory[field], entry].sort(compareEntries);
      continue;
    }

    const merged = mergeEntries(nextMemory[field][existingIndex], entry);
    nextMemory[field] = nextMemory[field]
      .map((candidate, index) => (index === existingIndex ? merged : candidate))
      .sort(compareEntries);
  }

  return nextMemory;
}

export function deriveProjectMemoryFromArtifacts(input: {
  artifacts?: ProjectArtifact[];
  existingMemory?: ProjectMemory;
}) {
  let memory = normalizeExistingMemory(input.existingMemory);

  for (const artifact of input.artifacts ?? []) {
    memory = pruneArtifactSources(memory, artifact.id);
    memory = mergePromotedEntries(memory, extractArtifactMemory(artifact));
  }

  return memory;
}
