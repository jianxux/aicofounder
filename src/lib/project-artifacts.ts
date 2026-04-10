import {
  type CustomerResearchMemoArtifact,
  type CustomerResearchMemoArtifactRevision,
  type Project,
  type ProjectArtifactStatus,
  type ProjectResearch,
  type ValidationScorecardArtifact,
  type ValidationScorecardArtifactRevision,
  getProjectArtifactByType,
  normalizeProject,
} from "@/lib/types";

function createRevisionId(artifactId: string, revisionNumber: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${artifactId}-revision-${revisionNumber}-${crypto.randomUUID()}`;
  }

  return `${artifactId}-revision-${revisionNumber}-${Date.now()}`;
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function validationStatus(summary: string | undefined, criteria: ValidationScorecardArtifact["criteria"]): ProjectArtifactStatus {
  return normalizeText(summary) || criteria.length > 0 ? "completed" : "draft";
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

function appendRevisionIfChanged<TArtifact extends ValidationScorecardArtifact | CustomerResearchMemoArtifact, TRevision extends {
  id: string;
  number: number;
  createdAt: string;
  status: ProjectArtifactStatus;
}>(
  artifact: TArtifact,
  nextRevision: Omit<TRevision, "id" | "number">,
  hasMeaningfulChange: (current: TRevision, candidate: Omit<TRevision, "id" | "number">) => boolean,
) {
  const currentRevision = artifact.revisionHistory[artifact.revisionHistory.length - 1] as unknown as TRevision;

  if (currentRevision && !hasMeaningfulChange(currentRevision, nextRevision)) {
    return {
      changed: false,
      artifact,
    };
  }

  const revisionNumber = (artifact.currentRevision?.number ?? artifact.revisionHistory.length) + 1;
  const revision = {
    ...nextRevision,
    id: createRevisionId(artifact.id, revisionNumber),
    number: revisionNumber,
  } as TRevision;

  return {
    changed: true,
    artifact: {
      ...artifact,
      updatedAt: nextRevision.createdAt,
      status: nextRevision.status,
      currentRevision: {
        id: revision.id,
        number: revision.number,
        createdAt: revision.createdAt,
        status: revision.status,
      },
      revisionHistory: [...artifact.revisionHistory, revision],
    } as TArtifact,
  };
}

export function applyValidationScorecardChatUpdate(
  project: Project,
  assistantContent: string,
  updatedAt: string,
) {
  const normalizedProject = normalizeProject(project);
  const artifact = getProjectArtifactByType(normalizedProject, "validation-scorecard");

  /* v8 ignore next -- normalizeProject always hydrates the canonical validation artifact */
  if (!artifact || artifact.type !== "validation-scorecard") {
    return { changed: false, project: normalizedProject };
  }

  const summary = assistantContent.trim();
  const status = validationStatus(summary, artifact.criteria);
  const nextRevision = {
    createdAt: updatedAt,
    status,
    ...(summary ? { summary } : {}),
    criteria: artifact.criteria,
  } satisfies Omit<ValidationScorecardArtifactRevision, "id" | "number">;

  const result = appendRevisionIfChanged(
    artifact,
    nextRevision,
    (current, candidate) =>
      current.status !== candidate.status ||
      normalizeText((current as ValidationScorecardArtifactRevision).summary) !==
        normalizeText((candidate as Omit<ValidationScorecardArtifactRevision, "id" | "number">).summary) ||
      stringify((current as ValidationScorecardArtifactRevision).criteria) !==
        stringify((candidate as Omit<ValidationScorecardArtifactRevision, "id" | "number">).criteria),
  );

  if (!result.changed) {
    return { changed: false, project: normalizedProject };
  }

  const nextArtifact: ValidationScorecardArtifact = {
    ...result.artifact,
    ...(summary ? { summary } : {}),
    criteria: artifact.criteria,
  };

  return {
    changed: true,
    project: normalizeProject({
      ...normalizedProject,
      artifacts: normalizedProject.artifacts?.map((entry) => (entry.id === artifact.id ? nextArtifact : entry)),
      activeArtifactId: artifact.id,
    }),
  };
}

function customerResearchMemoStatus(research: ProjectResearch | null): ProjectArtifactStatus {
  if (!research) {
    return "draft";
  }

  if (research.artifact?.status) {
    return research.artifact.status;
  }

  if (research.status === "error") {
    return "failed";
  }

  return research.report ? "completed" : "draft";
}

export function applyCustomerResearchMemoUpdate(project: Project, research: ProjectResearch | null) {
  const normalizedProject = normalizeProject(project);
  const artifact = getProjectArtifactByType(normalizedProject, "customer-research-memo");

  /* v8 ignore next -- normalizeProject always hydrates the canonical research memo artifact */
  if (!artifact || artifact.type !== "customer-research-memo") {
    return { changed: false, project: normalizedProject };
  }

  const status = customerResearchMemoStatus(research);
  const createdAt = research?.updatedAt ?? artifact.updatedAt;
  const nextRevision = {
    createdAt,
    status,
    research,
  } satisfies Omit<CustomerResearchMemoArtifactRevision, "id" | "number">;

  const result = appendRevisionIfChanged(
    artifact,
    nextRevision,
    (current, candidate) =>
      current.status !== candidate.status ||
      stringify((current as CustomerResearchMemoArtifactRevision).research) !==
        stringify((candidate as Omit<CustomerResearchMemoArtifactRevision, "id" | "number">).research),
  );

  const nextArtifact: CustomerResearchMemoArtifact = {
    ...(result.artifact as CustomerResearchMemoArtifact),
    updatedAt: createdAt,
    status,
    research,
  };

  return {
    changed: result.changed,
    project: normalizeProject({
      ...normalizedProject,
      research,
      artifacts: normalizedProject.artifacts?.map((entry) => (entry.id === artifact.id ? nextArtifact : entry)),
      activeArtifactId: artifact.id,
    }),
  };
}
