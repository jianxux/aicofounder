import type { ResearchCitation, ResearchReport, ResearchRunArtifact, ResearchSource } from "@/lib/research";

export type Sender = "user" | "assistant";

export type ChatMessage = {
  id: string;
  sender: Sender;
  content: string;
  createdAt: string;
};

export type NoteColor = "yellow" | "blue" | "green" | "pink" | "purple";

export type StickyNoteData = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  x: number;
  y: number;
};

export type SectionData = {
  id: string;
  title: string;
  color: NoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentCardData = {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
};

export type WebsiteBlockType = "hero" | "features" | "cta" | "text";

export type WebsiteBlock = {
  id: string;
  type: WebsiteBlockType;
  heading: string;
  body: string;
  buttonText?: string;
};

export type WebsiteBuilderData = {
  id: string;
  title: string;
  blocks: WebsiteBlock[];
  x: number;
  y: number;
};

export type DiagramLinkedCanvasItemKind = "note" | "section" | "document" | "website_builder";

export type DiagramNodeType = "topic" | "branch" | "detail" | "reference";

export type DiagramNodeShape = "pill" | "rounded_rect" | "circle";

export type DiagramNodeSource =
  | {
      type: "generated";
    }
  | {
      type: "canvas_item";
      itemKind: DiagramLinkedCanvasItemKind;
      itemId: string;
    };

export type DiagramNode = {
  id: string;
  type: DiagramNodeType;
  label: string;
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  source?: DiagramNodeSource;
  style?: {
    color?: NoteColor;
    shape?: DiagramNodeShape;
  };
  layout?: {
    parentId?: string;
    order?: number;
    collapsed?: boolean;
  };
};

export type DiagramEdgeType = "parent_child" | "association";

export type DiagramEdge = {
  id: string;
  from: string;
  to: string;
  type: DiagramEdgeType;
  label?: string;
};

export type DiagramLayoutMetadata = {
  algorithm: "manual" | "mind_map";
  direction: "horizontal" | "vertical" | "radial";
  rootNodeId?: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
};

export type DiagramDragMetadata = {
  snapToGrid: boolean;
  gridSize: number;
  reparentOnDrop: boolean;
};

export type ProjectDiagram = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  layout: DiagramLayoutMetadata;
  drag: DiagramDragMetadata;
};

export type PhaseTask = {
  id: string;
  label: string;
  done: boolean;
};

export type Phase = {
  id: string;
  title: string;
  tasks: PhaseTask[];
};

export type ProjectResearch = {
  status: "success" | "error";
  report?: ResearchReport;
  artifact?: ProjectResearchArtifact;
  errorMessage?: string;
  researchQuestion: string;
  sourceContext: string;
  updatedAt: string;
};

export type ProjectResearchArtifact = {
  status?: ResearchRunArtifact["status"];
  generatedAt?: string;
  plan?: Partial<ResearchRunArtifact["plan"]> & {
    budget?: Partial<ResearchRunArtifact["plan"]["budget"]>;
    steps?: Array<Partial<ResearchRunArtifact["plan"]["steps"][number]>>;
  };
  report?: Partial<ResearchReport>;
  selectedSources?: ResearchRunArtifact["selectedSources"];
  rejectedSources?: ResearchRunArtifact["rejectedSources"];
  sourceInventory?: ResearchRunArtifact["sourceInventory"];
  metrics?: Partial<ResearchRunArtifact["metrics"]>;
  failures?: ResearchRunArtifact["failures"];
};

export const PROJECT_ARTIFACT_TYPES = ["validation-scorecard", "customer-research-memo"] as const;

export type ProjectArtifactType = (typeof PROJECT_ARTIFACT_TYPES)[number];

export type ValidationScorecardCriterion = {
  id: string;
  label: string;
  score?: number;
  notes?: string;
};

export type ProjectArtifactStatus = "draft" | "completed" | "partial" | "failed";

export type ArtifactRevisionMetadata = {
  id: string;
  number: number;
  createdAt: string;
  status: ProjectArtifactStatus;
};

export type ValidationScorecardArtifactRevision = ArtifactRevisionMetadata & {
  summary?: string;
  criteria: ValidationScorecardCriterion[];
};

export type CustomerResearchMemoArtifactRevision = ArtifactRevisionMetadata & {
  research: ProjectResearch | null;
};

export type SharedProjectRevisionMetadata<TFamily extends string = string> = {
  artifactId: string;
  family: TFamily;
  revisionId: string;
  revisionNumber: number;
  updatedAt: string;
};

export type SharedProjectFact<TKey extends string = string> = {
  id: string;
  key: TKey;
  label: string;
  value: string;
  updatedAt: string;
};

export type SharedProjectRecord = {
  id: string;
  updatedAt: string;
};

export type SharedProjectEntity<TKind extends string = string> = SharedProjectRecord & {
  kind: TKind;
  title: string;
  content?: string;
  recordIds: string[];
};

export type SharedProjectViewLayout = {
  entityId: string;
  parentId?: string;
  order?: number;
  x?: number;
  y?: number;
};

export type SharedProjectViewState<TView extends string = string> = {
  view: TView;
  updatedAt: string;
  layouts: SharedProjectViewLayout[];
};

export type SharedProjectState<
  TFamily extends string = string,
  TFact extends SharedProjectFact = SharedProjectFact,
  TRecord extends SharedProjectRecord = SharedProjectRecord,
  TEntity extends SharedProjectEntity = SharedProjectEntity,
  TView extends SharedProjectViewState = SharedProjectViewState,
> = SharedProjectRevisionMetadata<TFamily> & {
  projectFacts: TFact[];
  records: TRecord[];
  entities: TEntity[];
  views: TView[];
};

export const RESEARCH_MEMO_VIEW_TYPES = ["report", "diagram"] as const;

export type ResearchMemoViewType = (typeof RESEARCH_MEMO_VIEW_TYPES)[number];

export const RESEARCH_MEMO_ENTITY_KINDS = [
  "summary",
  "section",
  "finding",
  "contradiction",
  "question",
  "source",
  "error",
] as const;

export type ResearchMemoEntityKind = (typeof RESEARCH_MEMO_ENTITY_KINDS)[number];

export const RESEARCH_MEMO_PROJECT_FACT_KEYS = [
  "project-name",
  "project-description",
  "research-question",
  "source-context",
] as const;

export type ResearchMemoProjectFactKey = (typeof RESEARCH_MEMO_PROJECT_FACT_KEYS)[number];

export type ResearchMemoProjectFact = SharedProjectFact<ResearchMemoProjectFactKey>;

export type ResearchMemoSourceReference = SharedProjectRecord & {
  sourceId: string;
  title: string;
  sourceType?: ResearchSource["sourceType"];
  url?: string;
  domain?: string;
  citationIds: string[];
  sectionIds: string[];
};

export type ResearchMemoEvidenceReference = SharedProjectRecord & {
  citationId: string;
  sourceId?: string;
  source: string;
  claim: string;
  url?: string;
  sectionIds: string[];
};

export type ResearchMemoRecord = ResearchMemoSourceReference | ResearchMemoEvidenceReference;

export type ResearchMemoEntity = SharedProjectEntity<ResearchMemoEntityKind> & {
  kind: ResearchMemoEntityKind;
  title: string;
  content?: string;
  sourceRefIds: string[];
  evidenceRefIds: string[];
};

export type ResearchMemoViewLayout = SharedProjectViewLayout;

export type ResearchMemoViewState = SharedProjectViewState<ResearchMemoViewType>;

type ResearchMemoViewLayoutCandidate = ResearchMemoViewLayout & {
  source?: "default" | "persisted-diagram";
};

export type ResearchMemoSharedState = SharedProjectState<
  "customer-research-memo",
  ResearchMemoProjectFact,
  ResearchMemoRecord,
  ResearchMemoEntity,
  ResearchMemoViewState
> & {
  projectFacts: ResearchMemoProjectFact[];
  records: ResearchMemoRecord[];
  sourceRefs: ResearchMemoSourceReference[];
  evidenceRefs: ResearchMemoEvidenceReference[];
  entities: ResearchMemoEntity[];
  views: ResearchMemoViewState[];
};

export type ProjectArtifactBase = {
  id: string;
  title: string;
  updatedAt: string;
  status: ProjectArtifactStatus;
  currentRevision: ArtifactRevisionMetadata;
};

export type ValidationScorecardArtifact = {
  revisionHistory: ValidationScorecardArtifactRevision[];
  type: "validation-scorecard";
} & ProjectArtifactBase & {
  summary?: string;
  criteria: ValidationScorecardCriterion[];
};

export type CustomerResearchMemoArtifact = {
  revisionHistory: CustomerResearchMemoArtifactRevision[];
  type: "customer-research-memo";
} & ProjectArtifactBase & {
  research: ProjectResearch | null;
  sharedState: ResearchMemoSharedState;
};

export type ProjectArtifact = ValidationScorecardArtifact | CustomerResearchMemoArtifact;

export type WorkspaceArtifactChatMode = "create" | "artifact-follow-up";

export type ValidationScorecardEvidenceSnapshot = {
  artifactType: "validation-scorecard";
  summary?: string;
  criteriaCount: number;
  scoredCriteriaCount: number;
  criteria: Array<{
    label: string;
    score?: number;
    notes?: string;
  }>;
};

export type CustomerResearchMemoEvidenceSnapshot = {
  artifactType: "customer-research-memo";
  researchStatus: ProjectResearch["status"] | "empty";
  artifactStatus?: ProjectArtifactStatus;
  executiveSummary?: string;
  keyFindings: string[];
  contradictions: string[];
  unansweredQuestions: string[];
  sourceCount: number;
  sectionCount: number;
};

export type ArtifactEvidenceSnapshot =
  | ValidationScorecardEvidenceSnapshot
  | CustomerResearchMemoEvidenceSnapshot;

export type ArtifactContextPayload = {
  id: string;
  type: ProjectArtifactType;
  label: string;
  status: ProjectArtifactStatus;
  mode: WorkspaceArtifactChatMode;
  hasMeaningfulOutput: boolean;
  revision: ArtifactRevisionMetadata;
  evidenceSnapshot: ArtifactEvidenceSnapshot;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  phase: string;
  updatedAt: string;
  notes: StickyNoteData[];
  sections?: SectionData[];
  documents: DocumentCardData[];
  websiteBuilders?: WebsiteBuilderData[];
  messages: ChatMessage[];
  phases: Phase[];
  research?: ProjectResearch | null;
  artifacts?: ProjectArtifact[];
  activeArtifactId?: string;
  diagram?: ProjectDiagram;
};

const DEFAULT_VALIDATION_SCORECARD_ARTIFACT_ID = "artifact-validation-scorecard";
const DEFAULT_CUSTOMER_RESEARCH_MEMO_ARTIFACT_ID = "artifact-customer-research-memo";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function createStableRecordId(prefix: string, fallbackSeed: string) {
  return `${prefix}-${fallbackSeed}`;
}

function normalizeResearchMemoText(value: string | undefined | null) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function normalizeResearchMemoSourceUrl(value: string | undefined) {
  const normalized = normalizeResearchMemoText(value);

  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin.toLowerCase()}${pathname}`;
  } catch {
    return normalized.toLowerCase();
  }
}

function getResearchMemoSourceDomain(url: string | undefined) {
  const normalized = normalizeResearchMemoText(url);

  if (!normalized) {
    return undefined;
  }

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function hashResearchMemoSourceKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function createFallbackResearchMemoSourceKey(citation: ResearchCitation) {
  const normalizedUrl = normalizeResearchMemoSourceUrl(citation.url);
  const normalizedSource = normalizeResearchMemoText(citation.source)?.toLowerCase();
  const normalizedSourceType = citation.sourceType?.toLowerCase();
  const normalizedPublicationDate = normalizeResearchMemoText(citation.publicationDate)?.toLowerCase();

  if (normalizedUrl) {
    return `url:${normalizedUrl}`;
  }

  if (normalizedSource && normalizedSourceType) {
    return `source:${normalizedSourceType}:${normalizedSource}`;
  }

  if (normalizedSource && normalizedPublicationDate) {
    return `source:${normalizedSource}:${normalizedPublicationDate}`;
  }

  if (normalizedSource) {
    return `source:${normalizedSource}`;
  }

  return `citation:${citation.id}`;
}

function createResearchMemoFact(
  key: ResearchMemoProjectFactKey,
  label: string,
  value: string | undefined,
  updatedAt: string,
): ResearchMemoProjectFact | null {
  const normalizedValue = normalizeResearchMemoText(value);

  if (!normalizedValue) {
    return null;
  }

  return {
    id: `fact:${key}`,
    key,
    label,
    value: normalizedValue,
    updatedAt,
  };
}

function createResearchMemoEntityId(kind: Exclude<ResearchMemoEntityKind, "summary" | "error">, id: string) {
  return `research:${kind}:${id}`;
}

function getResearchMemoDiagramPrefix() {
  return "branch:research:";
}

function mergeResearchMemoViewState(
  view: ResearchMemoViewType,
  updatedAt: string,
  entityIds: Set<string>,
  nextLayouts: ResearchMemoViewLayoutCandidate[],
  existingView: ResearchMemoViewState | undefined,
): ResearchMemoViewState {
  const mergedLayouts = new Map<string, ResearchMemoViewLayout>();

  for (const layout of existingView?.layouts ?? []) {
    if (entityIds.has(layout.entityId)) {
      mergedLayouts.set(layout.entityId, layout);
    }
  }

  for (const layout of nextLayouts) {
    const existingLayout = mergedLayouts.get(layout.entityId);

    if (!existingLayout) {
      mergedLayouts.set(layout.entityId, {
        entityId: layout.entityId,
        parentId: layout.parentId,
        order: layout.order,
        x: layout.x,
        y: layout.y,
      });
      continue;
    }

    if (layout.source !== "persisted-diagram") {
      mergedLayouts.set(layout.entityId, existingLayout);
      continue;
    }

    mergedLayouts.set(layout.entityId, {
      entityId: layout.entityId,
      parentId: layout.parentId ?? existingLayout.parentId,
      order: layout.order ?? existingLayout.order,
      x: layout.x ?? existingLayout.x,
      y: layout.y ?? existingLayout.y,
    });
  }

  return {
    view,
    updatedAt,
    layouts: [...mergedLayouts.values()].sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        left.entityId.localeCompare(right.entityId),
    ),
  };
}

export function deriveResearchMemoSharedState(input: {
  artifactId: string;
  revision: ArtifactRevisionMetadata;
  updatedAt: string;
  project: Pick<Project, "name" | "description" | "diagram">;
  research: ProjectResearch | null;
  existingState?: ResearchMemoSharedState | null;
}): ResearchMemoSharedState {
  const report = input.research?.report;
  const updatedAt = input.updatedAt;
  const reportCitations = [
    ...new Map(
      (report?.citations ?? report?.sections.flatMap((section) => section.citations) ?? []).map((citation) => [
        citation.id,
        citation,
      ]),
    ).values(),
  ];
  const citationSectionIds = new Map<string, string[]>();
  report?.sections.forEach((section) => {
    section.citations.forEach((citation) => {
      const existingSectionIds = citationSectionIds.get(citation.id) ?? [];
      citationSectionIds.set(
        citation.id,
        existingSectionIds.includes(section.id) ? existingSectionIds : [...existingSectionIds, section.id],
      );
    });
  });
  const explicitSourceRefs = (report?.sources ?? input.research?.artifact?.sourceInventory?.selected ?? []).map<ResearchMemoSourceReference>((source) => ({
    id: `research:source:${source.id}`,
    sourceId: source.id,
    title: normalizeResearchMemoText(source.title) ?? "Untitled source",
    sourceType: source.sourceType,
    url: source.url,
    domain: source.domain,
    citationIds: source.citationIds,
    sectionIds: source.sectionIds,
    updatedAt,
  }));
  const coveredCitationIds = new Set(explicitSourceRefs.flatMap((sourceRef) => sourceRef.citationIds));
  const fallbackSourceRefs = new Map<string, ResearchMemoSourceReference>();

  reportCitations.forEach((citation) => {
    if (coveredCitationIds.has(citation.id)) {
      return;
    }

    const groupingKey = createFallbackResearchMemoSourceKey(citation);
    const existingSourceRef = fallbackSourceRefs.get(groupingKey);
    const sectionIds = citationSectionIds.get(citation.id) ?? [];
    const title = normalizeResearchMemoText(citation.source) ?? "Untitled source";

    if (existingSourceRef) {
      existingSourceRef.citationIds = [...existingSourceRef.citationIds, citation.id];
      existingSourceRef.sectionIds = Array.from(new Set([...existingSourceRef.sectionIds, ...sectionIds]));
      existingSourceRef.url ??= citation.url;
      existingSourceRef.domain ??= getResearchMemoSourceDomain(citation.url);
      existingSourceRef.sourceType ??= citation.sourceType;

      if (existingSourceRef.title === "Untitled source" && title !== "Untitled source") {
        existingSourceRef.title = title;
      }

      return;
    }

    const sourceId = createStableRecordId("research-fallback-source", hashResearchMemoSourceKey(groupingKey));
    fallbackSourceRefs.set(groupingKey, {
      id: `research:source:${sourceId}`,
      sourceId,
      title,
      sourceType: citation.sourceType,
      url: citation.url,
      domain: getResearchMemoSourceDomain(citation.url),
      citationIds: [citation.id],
      sectionIds,
      updatedAt,
    });
  });

  const sourceRefs = [...explicitSourceRefs, ...fallbackSourceRefs.values()];
  const citationSourceIds = new Map<string, string>();
  sourceRefs.forEach((sourceRef) => {
    sourceRef.citationIds.forEach((citationId) => {
      citationSourceIds.set(citationId, sourceRef.sourceId);
    });
  });

  const evidenceRefs = reportCitations.map<ResearchMemoEvidenceReference>((citation) => ({
    id: `evidence:${citation.id}`,
    citationId: citation.id,
    sourceId: citationSourceIds.get(citation.id),
    source: normalizeResearchMemoText(citation.source) ?? "Unknown source",
    claim: normalizeResearchMemoText(citation.claim) ?? "",
    url: citation.url,
    sectionIds: report?.sections
      .filter((section) => section.citations.some((sectionCitation) => sectionCitation.id === citation.id))
      .map((section) => section.id) ?? [],
    updatedAt,
  }));
  const evidenceRefIds = new Set(evidenceRefs.map((evidenceRef) => evidenceRef.id));

  const entities: ResearchMemoEntity[] = [];

  if (input.research?.status === "error") {
    entities.push({
      id: "research:error",
      kind: "error",
      title: "Research blocked",
      content: normalizeResearchMemoText(input.research.errorMessage ?? "Research run failed."),
      recordIds: [],
      sourceRefIds: [],
      evidenceRefIds: [],
      updatedAt,
    });
  } else if (report) {
    const executiveSummary = normalizeResearchMemoText(report.executiveSummary);
    if (executiveSummary) {
      entities.push({
        id: "research:summary",
        kind: "summary",
        title: "Executive summary",
        content: executiveSummary,
        recordIds: [...sourceRefs.map((sourceRef) => sourceRef.id), ...evidenceRefs.map((evidenceRef) => evidenceRef.id)],
        sourceRefIds: sourceRefs.map((sourceRef) => sourceRef.id),
        evidenceRefIds: evidenceRefs.map((evidenceRef) => evidenceRef.id),
        updatedAt,
      });
    }

    report.sections.forEach((section) => {
      entities.push({
        id: createResearchMemoEntityId("section", section.id),
        kind: "section",
        title: normalizeResearchMemoText(section.title) ?? "Untitled section",
        content: normalizeResearchMemoText(section.findings),
        recordIds: [
          ...sourceRefs.filter((sourceRef) => sourceRef.sectionIds.includes(section.id)).map((sourceRef) => sourceRef.id),
          ...section.citations.map((citation) => `evidence:${citation.id}`).filter((id) => evidenceRefIds.has(id)),
        ],
        sourceRefIds: sourceRefs
          .filter((sourceRef) => sourceRef.sectionIds.includes(section.id))
          .map((sourceRef) => sourceRef.id),
        evidenceRefIds: section.citations
          .map((citation) => `evidence:${citation.id}`)
          .filter((id) => evidenceRefIds.has(id)),
        updatedAt,
      });
    });

    (report.keyFindings ?? []).forEach((finding) => {
      entities.push({
        id: createResearchMemoEntityId("finding", finding.id),
        kind: "finding",
        title: "Key finding",
        content: normalizeResearchMemoText(finding.statement),
        recordIds: [
          ...sourceRefs
            .filter((sourceRef) => sourceRef.citationIds.some((citationId) => finding.citationIds.includes(citationId)))
            .map((sourceRef) => sourceRef.id),
          ...finding.citationIds.map((citationId) => `evidence:${citationId}`).filter((id) => evidenceRefIds.has(id)),
        ],
        sourceRefIds: sourceRefs
          .filter((sourceRef) => sourceRef.citationIds.some((citationId) => finding.citationIds.includes(citationId)))
          .map((sourceRef) => sourceRef.id),
        evidenceRefIds: finding.citationIds.map((citationId) => `evidence:${citationId}`).filter((id) => evidenceRefIds.has(id)),
        updatedAt,
      });
    });

    (report.contradictions ?? []).forEach((contradiction) => {
      entities.push({
        id: createResearchMemoEntityId("contradiction", contradiction.id),
        kind: "contradiction",
        title: "Contradiction",
        content: normalizeResearchMemoText(contradiction.statement),
        recordIds: [
          ...sourceRefs
            .filter((sourceRef) => sourceRef.citationIds.some((citationId) => contradiction.citationIds.includes(citationId)))
            .map((sourceRef) => sourceRef.id),
          ...contradiction.citationIds
            .map((citationId) => `evidence:${citationId}`)
            .filter((id) => evidenceRefIds.has(id)),
        ],
        sourceRefIds: sourceRefs
          .filter((sourceRef) => sourceRef.citationIds.some((citationId) => contradiction.citationIds.includes(citationId)))
          .map((sourceRef) => sourceRef.id),
        evidenceRefIds: contradiction.citationIds
          .map((citationId) => `evidence:${citationId}`)
          .filter((id) => evidenceRefIds.has(id)),
        updatedAt,
      });
    });

    (report.unansweredQuestions ?? []).forEach((question) => {
      entities.push({
        id: createResearchMemoEntityId("question", question.id),
        kind: "question",
        title: "Open question",
        content: normalizeResearchMemoText(question.question),
        recordIds: [
          ...sourceRefs
            .filter((sourceRef) => sourceRef.citationIds.some((citationId) => question.citationIds?.includes(citationId)))
            .map((sourceRef) => sourceRef.id),
          ...(question.citationIds ?? []).map((citationId) => `evidence:${citationId}`).filter((id) => evidenceRefIds.has(id)),
        ],
        sourceRefIds: sourceRefs
          .filter((sourceRef) => sourceRef.citationIds.some((citationId) => question.citationIds?.includes(citationId)))
          .map((sourceRef) => sourceRef.id),
        evidenceRefIds: (question.citationIds ?? [])
          .map((citationId) => `evidence:${citationId}`)
          .filter((id) => evidenceRefIds.has(id)),
        updatedAt,
      });
    });

    sourceRefs.forEach((sourceRef) => {
      entities.push({
        id: sourceRef.id,
        kind: "source",
        title: sourceRef.title,
        content: normalizeResearchMemoText(sourceRef.domain ?? sourceRef.sourceType),
        recordIds: [
          sourceRef.id,
          ...sourceRef.citationIds.map((citationId) => `evidence:${citationId}`).filter((id) => evidenceRefIds.has(id)),
        ],
        sourceRefIds: [sourceRef.id],
        evidenceRefIds: sourceRef.citationIds
          .map((citationId) => `evidence:${citationId}`)
          .filter((id) => evidenceRefIds.has(id)),
        updatedAt,
      });
    });
  }

  const entityIds = new Set(entities.map((entity) => entity.id));
  const reportLayouts: ResearchMemoViewLayoutCandidate[] = [];
  const pushLayout = (entityId: string, order: number) => {
    if (entityIds.has(entityId)) {
      reportLayouts.push({ entityId, order });
    }
  };

  let reportOrder = 0;
  pushLayout("research:summary", reportOrder++);
  (report?.sections ?? []).forEach((section) => pushLayout(createResearchMemoEntityId("section", section.id), reportOrder++));
  (report?.keyFindings ?? []).forEach((finding) => pushLayout(createResearchMemoEntityId("finding", finding.id), reportOrder++));
  (report?.contradictions ?? []).forEach((entry) => pushLayout(createResearchMemoEntityId("contradiction", entry.id), reportOrder++));
  (report?.unansweredQuestions ?? []).forEach((entry) => pushLayout(createResearchMemoEntityId("question", entry.id), reportOrder++));
  sourceRefs.forEach((sourceRef) => pushLayout(sourceRef.id, reportOrder++));
  pushLayout("research:error", reportOrder++);

  const diagramEntityIds: string[] = [];
  if (entityIds.has("research:error")) {
    diagramEntityIds.push("research:error");
  } else {
    if (entityIds.has("research:summary")) {
      diagramEntityIds.push("research:summary");
    }
    const findingIds = (report?.keyFindings ?? [])
      .slice(0, 3)
      .map((finding) => createResearchMemoEntityId("finding", finding.id))
      .filter((entityId) => entityIds.has(entityId));
    if (findingIds.length > 0) {
      diagramEntityIds.push(...findingIds);
    } else {
      diagramEntityIds.push(
        ...(report?.sections ?? [])
          .slice(0, 3)
          .map((section) => createResearchMemoEntityId("section", section.id))
          .filter((entityId) => entityIds.has(entityId)),
      );
    }
    diagramEntityIds.push(...sourceRefs.slice(0, 2).map((sourceRef) => sourceRef.id).filter((entityId) => entityIds.has(entityId)));
  }

  const diagramLayouts = diagramEntityIds.map<ResearchMemoViewLayoutCandidate>((entityId, index) => {
    const persistedNode = input.project.diagram?.nodes.find(
      (node) => node.id === `${getResearchMemoDiagramPrefix()}${entityId}`,
    );

    return {
      entityId,
      parentId: persistedNode?.layout?.parentId ?? "branch:research",
      order: persistedNode?.layout?.order ?? index,
      x: persistedNode?.x,
      y: persistedNode?.y,
      source: persistedNode ? "persisted-diagram" : "default",
    };
  });

  return {
    artifactId: input.artifactId,
    family: "customer-research-memo",
    revisionId: input.revision.id,
    revisionNumber: input.revision.number,
    updatedAt,
    projectFacts: [
      createResearchMemoFact("project-name", "Project name", input.project.name, updatedAt),
      createResearchMemoFact("project-description", "Project description", input.project.description, updatedAt),
      createResearchMemoFact("research-question", "Research question", input.research?.researchQuestion, updatedAt),
      createResearchMemoFact("source-context", "Source context", input.research?.sourceContext, updatedAt),
    ].filter((fact): fact is ResearchMemoProjectFact => fact !== null),
    records: [...sourceRefs, ...evidenceRefs],
    sourceRefs,
    evidenceRefs,
    entities,
    views: [
      mergeResearchMemoViewState("report", updatedAt, entityIds, reportLayouts, input.existingState?.views.find((view) => view.view === "report")),
      mergeResearchMemoViewState("diagram", updatedAt, entityIds, diagramLayouts, input.existingState?.views.find((view) => view.view === "diagram")),
    ],
  };
}

function asArtifactRecord(
  value: unknown,
  expectedType: ProjectArtifactType,
): (Record<string, unknown> & { type: ProjectArtifactType }) | undefined {
  if (!isRecord(value) || value.type !== expectedType) {
    return undefined;
  }

  return value as Record<string, unknown> & { type: ProjectArtifactType };
}

export const isSender = (value: unknown): value is Sender =>
  value === "user" || value === "assistant";

export const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isSender(value.sender) &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
};

export const isNoteColor = (value: unknown): value is NoteColor =>
  value === "yellow" ||
  value === "blue" ||
  value === "green" ||
  value === "pink" ||
  value === "purple";

export const isStickyNoteData = (value: unknown): value is StickyNoteData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    isNoteColor(value.color) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isSectionData = (value: unknown): value is SectionData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isNoteColor(value.color) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
};

export const isDocumentCardData = (value: unknown): value is DocumentCardData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isWebsiteBlockType = (value: unknown): value is WebsiteBlockType =>
  value === "hero" || value === "features" || value === "cta" || value === "text";

export const isWebsiteBlock = (value: unknown): value is WebsiteBlock => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isWebsiteBlockType(value.type) &&
    typeof value.heading === "string" &&
    typeof value.body === "string" &&
    (value.buttonText === undefined || typeof value.buttonText === "string")
  );
};

export const isWebsiteBuilderData = (value: unknown): value is WebsiteBuilderData => {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.blocks.every(isWebsiteBlock) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isDiagramLinkedCanvasItemKind = (value: unknown): value is DiagramLinkedCanvasItemKind =>
  value === "note" || value === "section" || value === "document" || value === "website_builder";

export const isDiagramNodeType = (value: unknown): value is DiagramNodeType =>
  value === "topic" || value === "branch" || value === "detail" || value === "reference";

export const isDiagramNodeShape = (value: unknown): value is DiagramNodeShape =>
  value === "pill" || value === "rounded_rect" || value === "circle";

export const isDiagramNodeSource = (value: unknown): value is DiagramNodeSource => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === "generated") {
    return true;
  }

  return value.type === "canvas_item" && isDiagramLinkedCanvasItemKind(value.itemKind) && typeof value.itemId === "string";
};

export const isDiagramNode = (value: unknown): value is DiagramNode => {
  if (!isRecord(value)) {
    return false;
  }

  const style = value.style;
  const layout = value.layout;

  return (
    typeof value.id === "string" &&
    isDiagramNodeType(value.type) &&
    typeof value.label === "string" &&
    (value.content === undefined || typeof value.content === "string") &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.width === undefined || isFiniteNumber(value.width)) &&
    (value.height === undefined || isFiniteNumber(value.height)) &&
    (value.source === undefined || isDiagramNodeSource(value.source)) &&
    (style === undefined ||
      (isRecord(style) &&
        (style.color === undefined || isNoteColor(style.color)) &&
        (style.shape === undefined || isDiagramNodeShape(style.shape)))) &&
    (layout === undefined ||
      (isRecord(layout) &&
        (layout.parentId === undefined || typeof layout.parentId === "string") &&
        (layout.order === undefined || isFiniteNumber(layout.order)) &&
        (layout.collapsed === undefined || typeof layout.collapsed === "boolean")))
  );
};

export const isDiagramEdgeType = (value: unknown): value is DiagramEdgeType =>
  value === "parent_child" || value === "association";

export const isDiagramEdge = (value: unknown): value is DiagramEdge => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    isDiagramEdgeType(value.type) &&
    (value.label === undefined || typeof value.label === "string")
  );
};

export const isDiagramLayoutMetadata = (value: unknown): value is DiagramLayoutMetadata => {
  if (!isRecord(value) || !isRecord(value.viewport)) {
    return false;
  }

  return (
    (value.algorithm === "manual" || value.algorithm === "mind_map") &&
    (value.direction === "horizontal" || value.direction === "vertical" || value.direction === "radial") &&
    (value.rootNodeId === undefined || typeof value.rootNodeId === "string") &&
    isFiniteNumber(value.viewport.x) &&
    isFiniteNumber(value.viewport.y) &&
    isFiniteNumber(value.viewport.zoom)
  );
};

export const isDiagramDragMetadata = (value: unknown): value is DiagramDragMetadata => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.snapToGrid === "boolean" &&
    isFiniteNumber(value.gridSize) &&
    typeof value.reparentOnDrop === "boolean"
  );
};

export const isProjectDiagram = (value: unknown): value is ProjectDiagram => {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return false;
  }

  return (
    value.nodes.every(isDiagramNode) &&
    value.edges.every(isDiagramEdge) &&
    isDiagramLayoutMetadata(value.layout) &&
    isDiagramDragMetadata(value.drag)
  );
};

export const isPhaseTask = (value: unknown): value is PhaseTask => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.done === "boolean"
  );
};

export const isPhase = (value: unknown): value is Phase => {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.tasks.every(isPhaseTask)
  );
};

export const isProjectArtifactType = (value: unknown): value is ProjectArtifactType =>
  PROJECT_ARTIFACT_TYPES.includes(value as ProjectArtifactType);

const isResearchRelevance = (value: unknown): value is "high" | "medium" | "low" =>
  value === "high" || value === "medium" || value === "low";

const isResearchSourceType = (value: unknown): value is ResearchSource["sourceType"] =>
  value === "report" ||
  value === "company" ||
  value === "documentation" ||
  value === "news" ||
  value === "community" ||
  value === "analyst" ||
  value === "academic" ||
  value === "government" ||
  value === "dataset" ||
  value === "other";

const isResearchAccessibilityStatus = (value: unknown): value is NonNullable<ResearchSource["accessibilityStatus"]> =>
  value === "public" ||
  value === "paywalled" ||
  value === "login_required" ||
  value === "restricted" ||
  value === "unknown";

const isResearchPublicationSignal = (value: unknown): value is NonNullable<ResearchSource["publicationSignal"]> =>
  value === "official" || value === "third_party" || value === "community" || value === "analyst" || value === "unknown";

const isResearchRecencySignal = (value: unknown): value is NonNullable<ResearchSource["recencySignal"]> =>
  value === "current" || value === "recent" || value === "dated" || value === "undated" || value === "unknown";

const isResearchEvidenceStrength = (value: unknown): value is NonNullable<NonNullable<ResearchReport["keyFindings"]>[number]["strength"]> =>
  value === "strong" || value === "moderate" || value === "weak";

const isResearchTrustScaffolding = (value: unknown): value is NonNullable<ResearchReport["trust"]> => {
  if (!isRecord(value) || !Array.isArray(value.sourceIds) || !Array.isArray(value.majorClaimIds)) {
    return false;
  }

  return (
    value.sourceIds.every((sourceId) => typeof sourceId === "string") &&
    value.majorClaimIds.every((claimId) => typeof claimId === "string") &&
    isRecord(value.evidenceStrength) &&
    isResearchEvidenceStrength(value.evidenceStrength.overall) &&
    typeof value.evidenceStrength.summary === "string" &&
    typeof value.evidenceStrength.claimCount === "number" &&
    typeof value.evidenceStrength.sourceCount === "number" &&
    typeof value.evidenceStrength.citationCount === "number" &&
    typeof value.evidenceStrength.strongClaimCount === "number" &&
    typeof value.evidenceStrength.moderateClaimCount === "number" &&
    typeof value.evidenceStrength.weakClaimCount === "number" &&
    typeof value.evidenceStrength.contradictionsCount === "number" &&
    typeof value.evidenceStrength.unresolvedQuestionCount === "number" &&
    Array.isArray(value.contradictionIds) &&
    value.contradictionIds.every((contradictionId) => typeof contradictionId === "string") &&
    Array.isArray(value.unresolvedQuestionIds) &&
    value.unresolvedQuestionIds.every((questionId) => typeof questionId === "string")
  );
};

const isResearchCitation = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.claim === "string" &&
    isResearchRelevance(value.relevance) &&
    (value.url === undefined || typeof value.url === "string") &&
    (value.sourceType === undefined || isResearchSourceType(value.sourceType)) &&
    (value.publicationDate === undefined || typeof value.publicationDate === "string") &&
    (value.publicationSignal === undefined || isResearchPublicationSignal(value.publicationSignal)) &&
    (value.recencySignal === undefined || isResearchRecencySignal(value.recencySignal)) &&
    (value.accessibilityStatus === undefined || isResearchAccessibilityStatus(value.accessibilityStatus))
  );
};

const isResearchSection = (value: unknown): boolean => {
  if (!isRecord(value) || !Array.isArray(value.citations)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.angle === "string" &&
    typeof value.findings === "string" &&
    value.citations.every(isResearchCitation)
  );
};

const isResearchReportLike = (value: unknown): value is Partial<ResearchReport> => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.sections === undefined || (Array.isArray(value.sections) && value.sections.every(isResearchSection))) &&
    (value.executiveSummary === undefined || typeof value.executiveSummary === "string") &&
    (value.researchQuestion === undefined || typeof value.researchQuestion === "string") &&
    (value.generatedAt === undefined || typeof value.generatedAt === "string") &&
    (value.citations === undefined || (Array.isArray(value.citations) && value.citations.every(isResearchCitation))) &&
    (value.sources === undefined || (Array.isArray(value.sources) && value.sources.every(isResearchSource))) &&
    (value.keyFindings === undefined ||
      (Array.isArray(value.keyFindings) &&
        value.keyFindings.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.statement === "string" &&
            Array.isArray(item.citationIds) &&
            item.citationIds.every((citationId) => typeof citationId === "string") &&
            (item.sectionIds === undefined || (Array.isArray(item.sectionIds) && item.sectionIds.every((sectionId) => typeof sectionId === "string"))) &&
            isResearchEvidenceStrength(item.strength),
        ))) &&
    (value.caveats === undefined ||
      (Array.isArray(value.caveats) &&
        value.caveats.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.statement === "string" &&
            (item.citationIds === undefined || (Array.isArray(item.citationIds) && item.citationIds.every((citationId) => typeof citationId === "string"))) &&
            (item.sectionIds === undefined || (Array.isArray(item.sectionIds) && item.sectionIds.every((sectionId) => typeof sectionId === "string"))),
        ))) &&
    (value.contradictions === undefined ||
      (Array.isArray(value.contradictions) &&
        value.contradictions.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.statement === "string" &&
            Array.isArray(item.citationIds) &&
            item.citationIds.every((citationId) => typeof citationId === "string") &&
            (item.sectionIds === undefined || (Array.isArray(item.sectionIds) && item.sectionIds.every((sectionId) => typeof sectionId === "string"))),
        ))) &&
    (value.unansweredQuestions === undefined ||
      (Array.isArray(value.unansweredQuestions) &&
        value.unansweredQuestions.every(
          (item) =>
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.question === "string" &&
            (item.citationIds === undefined || (Array.isArray(item.citationIds) && item.citationIds.every((citationId) => typeof citationId === "string"))) &&
            (item.sectionIds === undefined || (Array.isArray(item.sectionIds) && item.sectionIds.every((sectionId) => typeof sectionId === "string"))),
        ))) &&
    (value.trust === undefined || isResearchTrustScaffolding(value.trust))
  );
};

const isResearchSource = (value: unknown): value is ResearchSource => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.canonicalId === "string" &&
    isResearchSourceType(value.sourceType) &&
    (value.status === "selected" || value.status === "rejected") &&
    Array.isArray(value.citationIds) &&
    value.citationIds.every((citationId) => typeof citationId === "string") &&
    Array.isArray(value.sectionIds) &&
    value.sectionIds.every((sectionId) => typeof sectionId === "string") &&
    (value.url === undefined || typeof value.url === "string") &&
    (value.canonicalUrl === undefined || typeof value.canonicalUrl === "string") &&
    (value.domain === undefined || typeof value.domain === "string") &&
    (value.publicationDate === undefined || typeof value.publicationDate === "string") &&
    (value.publicationSignal === undefined || isResearchPublicationSignal(value.publicationSignal)) &&
    (value.recencySignal === undefined || isResearchRecencySignal(value.recencySignal)) &&
    (value.accessibilityStatus === undefined || isResearchAccessibilityStatus(value.accessibilityStatus)) &&
    typeof value.claimCount === "number" &&
    (value.rejectionReason === undefined ||
      value.rejectionReason === "duplicate" ||
      value.rejectionReason === "budget" ||
      value.rejectionReason === "invalid")
  );
};

const isResearchRejectedSource = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.reason === "duplicate" || value.reason === "budget" || value.reason === "invalid") &&
    typeof value.source === "string" &&
    (value.citationId === undefined || typeof value.citationId === "string")
  );
};

const isResearchFailure = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.stage === "plan" || value.stage === "gather" || value.stage === "report") &&
    (value.code === "invalid-input" ||
      value.code === "invalid-plan" ||
      value.code === "budget-exceeded" ||
      value.code === "no-evidence" ||
      value.code === "invalid-section" ||
      value.code === "invalid-summary" ||
      value.code === "provider-error") &&
    typeof value.message === "string"
  );
};

const isResearchPlanItemLike = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.id === undefined || typeof value.id === "string") &&
    (value.title === undefined || typeof value.title === "string") &&
    (value.angle === undefined || typeof value.angle === "string") &&
    (value.query === undefined || typeof value.query === "string") &&
    (value.rationale === undefined || typeof value.rationale === "string")
  );
};

export const isProjectResearchArtifact = (value: unknown): value is ProjectResearchArtifact => {
  if (!isRecord(value)) {
    return false;
  }

  const plan = value.plan;
  const metrics = value.metrics;

  return (
    (value.status === undefined || value.status === "completed" || value.status === "partial" || value.status === "failed") &&
    (value.generatedAt === undefined || typeof value.generatedAt === "string") &&
    (plan === undefined ||
      (isRecord(plan) &&
        (plan.projectName === undefined || typeof plan.projectName === "string") &&
        (plan.projectDescription === undefined || typeof plan.projectDescription === "string") &&
        (plan.researchQuestion === undefined || typeof plan.researchQuestion === "string") &&
        (plan.budget === undefined ||
          (isRecord(plan.budget) &&
            (plan.budget.maxAngles === undefined || typeof plan.budget.maxAngles === "number") &&
            (plan.budget.maxSections === undefined || typeof plan.budget.maxSections === "number") &&
            (plan.budget.maxCitationsPerSection === undefined || typeof plan.budget.maxCitationsPerSection === "number"))) &&
        (plan.steps === undefined || (Array.isArray(plan.steps) && plan.steps.every(isResearchPlanItemLike))))) &&
    (value.report === undefined || isResearchReportLike(value.report)) &&
    (value.selectedSources === undefined ||
      (Array.isArray(value.selectedSources) && value.selectedSources.every(isResearchCitation))) &&
    (value.rejectedSources === undefined ||
      (Array.isArray(value.rejectedSources) && value.rejectedSources.every(isResearchRejectedSource))) &&
    (value.sourceInventory === undefined ||
      (isRecord(value.sourceInventory) &&
        Array.isArray(value.sourceInventory.selected) &&
        value.sourceInventory.selected.every(isResearchSource) &&
        Array.isArray(value.sourceInventory.rejected) &&
        value.sourceInventory.rejected.every(isResearchSource))) &&
    (metrics === undefined ||
      (isRecord(metrics) &&
        (metrics.attemptedAngles === undefined || typeof metrics.attemptedAngles === "number") &&
        (metrics.completedSections === undefined || typeof metrics.completedSections === "number") &&
        (metrics.selectedSources === undefined || typeof metrics.selectedSources === "number") &&
        (metrics.rejectedSources === undefined || typeof metrics.rejectedSources === "number"))) &&
    (value.failures === undefined || (Array.isArray(value.failures) && value.failures.every(isResearchFailure)))
  );
};

export const isProjectResearch = (value: unknown): value is ProjectResearch => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.status !== "success" && value.status !== "error") {
    return false;
  }

  return (
    typeof value.researchQuestion === "string" &&
    typeof value.sourceContext === "string" &&
    typeof value.updatedAt === "string" &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string") &&
    (value.artifact === undefined || isProjectResearchArtifact(value.artifact)) &&
    (value.report === undefined ||
      (isRecord(value.report) &&
        Array.isArray(value.report.sections) &&
        value.report.sections.every(isResearchSection) &&
        typeof value.report.executiveSummary === "string" &&
        typeof value.report.researchQuestion === "string" &&
        typeof value.report.generatedAt === "string" &&
        isResearchReportLike(value.report)))
  );
};

export const isValidationScorecardCriterion = (value: unknown): value is ValidationScorecardCriterion => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (value.score === undefined || isFiniteNumber(value.score)) &&
    (value.notes === undefined || typeof value.notes === "string")
  );
};

export const isProjectArtifactStatus = (value: unknown): value is ProjectArtifactStatus =>
  value === "draft" || value === "completed" || value === "partial" || value === "failed";

export const isArtifactRevisionMetadata = (value: unknown): value is ArtifactRevisionMetadata => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.number === "number" &&
    typeof value.createdAt === "string" &&
    isProjectArtifactStatus(value.status)
  );
};

export const isValidationScorecardArtifactRevision = (value: unknown): value is ValidationScorecardArtifactRevision => {
  if (!isRecord(value) || !Array.isArray(value.criteria)) {
    return false;
  }

  const summary = "summary" in value ? value.summary : undefined;
  const criteria = value.criteria;

  return (
    isArtifactRevisionMetadata(value) &&
    (summary === undefined || typeof summary === "string") &&
    criteria.every(isValidationScorecardCriterion)
  );
};

export const isCustomerResearchMemoArtifactRevision = (value: unknown): value is CustomerResearchMemoArtifactRevision => {
  if (!isRecord(value)) {
    return false;
  }

  const research = "research" in value ? value.research : undefined;

  return isArtifactRevisionMetadata(value) && (research === null || isProjectResearch(research));
};

export const isResearchMemoViewType = (value: unknown): value is ResearchMemoViewType =>
  RESEARCH_MEMO_VIEW_TYPES.includes(value as ResearchMemoViewType);

export const isResearchMemoEntityKind = (value: unknown): value is ResearchMemoEntityKind =>
  RESEARCH_MEMO_ENTITY_KINDS.includes(value as ResearchMemoEntityKind);

export const isResearchMemoProjectFactKey = (value: unknown): value is ResearchMemoProjectFactKey =>
  RESEARCH_MEMO_PROJECT_FACT_KEYS.includes(value as ResearchMemoProjectFactKey);

export const isResearchMemoProjectFact = (value: unknown): value is ResearchMemoProjectFact => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isResearchMemoProjectFactKey(value.key) &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    typeof value.updatedAt === "string"
  );
};

export const isResearchMemoSourceReference = (value: unknown): value is ResearchMemoSourceReference => {
  if (!isRecord(value) || !Array.isArray(value.citationIds) || !Array.isArray(value.sectionIds)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.sourceId === "string" &&
    typeof value.title === "string" &&
    (value.sourceType === undefined || typeof value.sourceType === "string") &&
    (value.url === undefined || typeof value.url === "string") &&
    (value.domain === undefined || typeof value.domain === "string") &&
    value.citationIds.every((entry) => typeof entry === "string") &&
    value.sectionIds.every((entry) => typeof entry === "string") &&
    typeof value.updatedAt === "string"
  );
};

export const isResearchMemoEvidenceReference = (value: unknown): value is ResearchMemoEvidenceReference => {
  if (!isRecord(value) || !Array.isArray(value.sectionIds)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.citationId === "string" &&
    (value.sourceId === undefined || typeof value.sourceId === "string") &&
    typeof value.source === "string" &&
    typeof value.claim === "string" &&
    (value.url === undefined || typeof value.url === "string") &&
    value.sectionIds.every((entry) => typeof entry === "string") &&
    typeof value.updatedAt === "string"
  );
};

export const isResearchMemoEntity = (value: unknown): value is ResearchMemoEntity => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.recordIds) ||
    !Array.isArray(value.sourceRefIds) ||
    !Array.isArray(value.evidenceRefIds)
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isResearchMemoEntityKind(value.kind) &&
    typeof value.title === "string" &&
    (value.content === undefined || typeof value.content === "string") &&
    value.recordIds.every((entry) => typeof entry === "string") &&
    value.sourceRefIds.every((entry) => typeof entry === "string") &&
    value.evidenceRefIds.every((entry) => typeof entry === "string") &&
    typeof value.updatedAt === "string"
  );
};

export const isResearchMemoViewLayout = (value: unknown): value is ResearchMemoViewLayout => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.entityId === "string" &&
    (value.parentId === undefined || typeof value.parentId === "string") &&
    (value.order === undefined || isFiniteNumber(value.order)) &&
    (value.x === undefined || isFiniteNumber(value.x)) &&
    (value.y === undefined || isFiniteNumber(value.y))
  );
};

export const isResearchMemoViewState = (value: unknown): value is ResearchMemoViewState => {
  if (!isRecord(value) || !Array.isArray(value.layouts)) {
    return false;
  }

  return (
    isResearchMemoViewType(value.view) &&
    typeof value.updatedAt === "string" &&
    value.layouts.every(isResearchMemoViewLayout)
  );
};

export const isResearchMemoSharedState = (value: unknown): value is ResearchMemoSharedState => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.projectFacts) ||
    !Array.isArray(value.records) ||
    !Array.isArray(value.sourceRefs) ||
    !Array.isArray(value.evidenceRefs) ||
    !Array.isArray(value.entities) ||
    !Array.isArray(value.views)
  ) {
    return false;
  }

  return (
    typeof value.artifactId === "string" &&
    value.family === "customer-research-memo" &&
    typeof value.revisionId === "string" &&
    typeof value.revisionNumber === "number" &&
    typeof value.updatedAt === "string" &&
    value.projectFacts.every(isResearchMemoProjectFact) &&
    value.records.every((entry) => isResearchMemoSourceReference(entry) || isResearchMemoEvidenceReference(entry)) &&
    value.sourceRefs.every(isResearchMemoSourceReference) &&
    value.evidenceRefs.every(isResearchMemoEvidenceReference) &&
    value.entities.every(isResearchMemoEntity) &&
    value.views.every(isResearchMemoViewState)
  );
};

const isLegacyResearchMemoEntity = (value: unknown): value is Omit<ResearchMemoEntity, "recordIds"> => {
  if (!isRecord(value) || !Array.isArray(value.sourceRefIds) || !Array.isArray(value.evidenceRefIds)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isResearchMemoEntityKind(value.kind) &&
    typeof value.title === "string" &&
    (value.content === undefined || typeof value.content === "string") &&
    value.sourceRefIds.every((entry) => typeof entry === "string") &&
    value.evidenceRefIds.every((entry) => typeof entry === "string") &&
    typeof value.updatedAt === "string"
  );
};

const isLegacyResearchMemoSharedState = (value: unknown) => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.projectFacts) ||
    !Array.isArray(value.sourceRefs) ||
    !Array.isArray(value.evidenceRefs) ||
    !Array.isArray(value.entities) ||
    !Array.isArray(value.views)
  ) {
    return false;
  }

  return (
    typeof value.artifactId === "string" &&
    value.family === "customer-research-memo" &&
    typeof value.revisionId === "string" &&
    typeof value.revisionNumber === "number" &&
    typeof value.updatedAt === "string" &&
    value.projectFacts.every(isResearchMemoProjectFact) &&
    value.sourceRefs.every(isResearchMemoSourceReference) &&
    value.evidenceRefs.every(isResearchMemoEvidenceReference) &&
    value.entities.every(isLegacyResearchMemoEntity) &&
    value.views.every(isResearchMemoViewState)
  );
};

function hasValidCurrentRevisionFields(value: Record<string, unknown>) {
  return (
    typeof value.currentRevisionId === "string" &&
    typeof value.currentRevisionNumber === "number" &&
    typeof value.currentRevisionCreatedAt === "string" &&
    isProjectArtifactStatus(value.status)
  );
}

export const isValidationScorecardArtifact = (value: unknown): value is ValidationScorecardArtifact => {
  if (!isRecord(value) || !Array.isArray(value.criteria)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.type === "validation-scorecard" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "string" &&
    (!("status" in value) || isProjectArtifactStatus(value.status)) &&
    (!("currentRevision" in value) || isArtifactRevisionMetadata(value.currentRevision)) &&
    (!("revisionHistory" in value) ||
      (Array.isArray(value.revisionHistory) && value.revisionHistory.every(isValidationScorecardArtifactRevision))) &&
    (!hasValidCurrentRevisionFields(value) ||
      (typeof value.currentRevisionId === "string" &&
        typeof value.currentRevisionNumber === "number" &&
        typeof value.currentRevisionCreatedAt === "string")) &&
    (value.summary === undefined || typeof value.summary === "string") &&
    value.criteria.every(isValidationScorecardCriterion)
  );
};

export const isCustomerResearchMemoArtifact = (value: unknown): value is CustomerResearchMemoArtifact => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.type === "customer-research-memo" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "string" &&
    (!("status" in value) || isProjectArtifactStatus(value.status)) &&
    (!("currentRevision" in value) || isArtifactRevisionMetadata(value.currentRevision)) &&
    (!("revisionHistory" in value) ||
      (Array.isArray(value.revisionHistory) && value.revisionHistory.every(isCustomerResearchMemoArtifactRevision))) &&
    (!hasValidCurrentRevisionFields(value) ||
      (typeof value.currentRevisionId === "string" &&
        typeof value.currentRevisionNumber === "number" &&
        typeof value.currentRevisionCreatedAt === "string")) &&
    (value.research === null || isProjectResearch(value.research)) &&
    (!("sharedState" in value) ||
      isResearchMemoSharedState(value.sharedState) ||
      isLegacyResearchMemoSharedState(value.sharedState))
  );
};

export const isProjectArtifact = (value: unknown): value is ProjectArtifact =>
  isValidationScorecardArtifact(value) || isCustomerResearchMemoArtifact(value);

export const isProject = (value: unknown): value is Project => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.notes) ||
    !Array.isArray(value.documents) ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.phases)
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.phase === "string" &&
    typeof value.updatedAt === "string" &&
    value.notes.every(isStickyNoteData) &&
    (value.sections == null || (Array.isArray(value.sections) && value.sections.every(isSectionData))) &&
    value.documents.every(isDocumentCardData) &&
    (value.websiteBuilders == null ||
      (Array.isArray(value.websiteBuilders) && value.websiteBuilders.every(isWebsiteBuilderData))) &&
    value.messages.every(isChatMessage) &&
    value.phases.every(isPhase) &&
    (value.research == null || isProjectResearch(value.research)) &&
    (value.artifacts == null || (Array.isArray(value.artifacts) && value.artifacts.every(isProjectArtifact))) &&
    (value.activeArtifactId === undefined || typeof value.activeArtifactId === "string") &&
    (value.diagram === undefined || isProjectDiagram(value.diagram))
  );
};

export function createDefaultProjectDiagram(): ProjectDiagram {
  return {
    nodes: [],
    edges: [],
    layout: {
      algorithm: "manual",
      direction: "radial",
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    drag: {
      snapToGrid: false,
      gridSize: 24,
      reparentOnDrop: true,
    },
  };
}

function normalizeValidationScorecardArtifact(
  existingArtifact: unknown,
  fallbackUpdatedAt: string,
): ValidationScorecardArtifact {
  const artifactRecord = asArtifactRecord(existingArtifact, "validation-scorecard");
  const artifact = isValidationScorecardArtifact(artifactRecord) ? artifactRecord : undefined;
  const revisionHistory = Array.isArray(artifactRecord?.revisionHistory)
    ? artifactRecord.revisionHistory.filter(isValidationScorecardArtifactRevision)
    : [];
  const summary = artifact?.summary ?? (typeof artifactRecord?.summary === "string" ? artifactRecord.summary : undefined);
  const criteria = artifact?.criteria ?? (Array.isArray(artifactRecord?.criteria)
    ? artifactRecord.criteria.filter(isValidationScorecardCriterion)
    : []);
  const updatedAt = typeof artifactRecord?.updatedAt === "string" ? artifactRecord.updatedAt : fallbackUpdatedAt;
  const status =
    artifact?.status ??
    (isProjectArtifactStatus(artifactRecord?.status) ? artifactRecord.status : undefined) ??
    (summary?.trim() || criteria.length > 0 ? "completed" : "draft");
  const initialRevision: ValidationScorecardArtifactRevision = {
    id: createStableRecordId(
      "artifact-revision",
      `${(typeof artifactRecord?.id === "string" ? artifactRecord.id : undefined) ?? DEFAULT_VALIDATION_SCORECARD_ARTIFACT_ID}-1`,
    ),
    number: 1,
    createdAt:
      typeof artifactRecord?.updatedAt === "string"
        ? artifactRecord.updatedAt
        : typeof artifactRecord?.currentRevisionCreatedAt === "string"
          ? artifactRecord.currentRevisionCreatedAt
          : fallbackUpdatedAt,
    status,
    ...(summary ? { summary } : {}),
    criteria,
  };
  const normalizedRevisionHistory = revisionHistory.length > 0 ? revisionHistory : [initialRevision];
  const currentRevision =
    normalizedRevisionHistory.find((entry) => entry.id === artifact?.currentRevision?.id) ??
    normalizedRevisionHistory.find((entry) => entry.id === (typeof artifactRecord?.currentRevisionId === "string" ? artifactRecord.currentRevisionId : undefined)) ??
    normalizedRevisionHistory[normalizedRevisionHistory.length - 1] ??
    initialRevision;

  return {
    id: typeof artifactRecord?.id === "string" ? artifactRecord.id : DEFAULT_VALIDATION_SCORECARD_ARTIFACT_ID,
    type: "validation-scorecard",
    title: typeof artifactRecord?.title === "string" ? artifactRecord.title : "Validation scorecard",
    updatedAt,
    status: currentRevision.status,
    currentRevision: {
      id: currentRevision.id,
      number: currentRevision.number,
      createdAt: currentRevision.createdAt,
      status: currentRevision.status,
    },
    ...(summary ? { summary } : {}),
    criteria,
    revisionHistory: normalizedRevisionHistory,
  };
}

function normalizeCustomerResearchMemoArtifact(
  research: ProjectResearch | null,
  existingArtifact: unknown,
  fallbackUpdatedAt: string,
): CustomerResearchMemoArtifact {
  const artifactRecord = asArtifactRecord(existingArtifact, "customer-research-memo");
  const artifact = isCustomerResearchMemoArtifact(artifactRecord) ? artifactRecord : undefined;
  const artifactResearch = artifact?.research ?? (artifactRecord?.research === null || isProjectResearch(artifactRecord?.research)
    ? artifactRecord.research
    : undefined);
  const memoResearch = research ?? artifactResearch ?? null;
  const derivedStatus =
    artifact?.status ??
    (isProjectArtifactStatus(artifactRecord?.status) ? artifactRecord.status : undefined) ??
    memoResearch?.artifact?.status ??
    (memoResearch?.status === "error"
      ? "failed"
      : memoResearch?.report
        ? "completed"
        : "draft");
  const revisionHistory = Array.isArray(artifactRecord?.revisionHistory)
    ? artifactRecord.revisionHistory.filter(isCustomerResearchMemoArtifactRevision)
    : [];
  const initialRevision: CustomerResearchMemoArtifactRevision = {
    id: createStableRecordId(
      "artifact-revision",
      `${(typeof artifactRecord?.id === "string" ? artifactRecord.id : undefined) ?? DEFAULT_CUSTOMER_RESEARCH_MEMO_ARTIFACT_ID}-1`,
    ),
    number: 1,
    createdAt:
      memoResearch?.updatedAt ??
      (typeof artifactRecord?.updatedAt === "string"
        ? artifactRecord.updatedAt
        : typeof artifactRecord?.currentRevisionCreatedAt === "string"
          ? artifactRecord.currentRevisionCreatedAt
          : fallbackUpdatedAt),
    status: derivedStatus,
    research: memoResearch,
  };
  const normalizedRevisionHistory = revisionHistory.length > 0 ? revisionHistory : [initialRevision];
  const currentRevision =
    normalizedRevisionHistory.find((entry) => entry.id === artifact?.currentRevision?.id) ??
    normalizedRevisionHistory.find((entry) => entry.id === (typeof artifactRecord?.currentRevisionId === "string" ? artifactRecord.currentRevisionId : undefined)) ??
    normalizedRevisionHistory[normalizedRevisionHistory.length - 1] ??
    initialRevision;
  const updatedAt = memoResearch?.updatedAt ?? (typeof artifactRecord?.updatedAt === "string" ? artifactRecord.updatedAt : fallbackUpdatedAt);
  const sharedState = deriveResearchMemoSharedState({
    artifactId: typeof artifactRecord?.id === "string" ? artifactRecord.id : DEFAULT_CUSTOMER_RESEARCH_MEMO_ARTIFACT_ID,
    revision: {
      id: currentRevision.id,
      number: currentRevision.number,
      createdAt: currentRevision.createdAt,
      status: currentRevision.status,
    },
    updatedAt,
    project: {
      name: "",
      description: "",
      diagram: undefined,
    },
    research: memoResearch,
    existingState: isResearchMemoSharedState(artifactRecord?.sharedState) ? artifactRecord.sharedState : artifact?.sharedState,
  });

  return {
    id: typeof artifactRecord?.id === "string" ? artifactRecord.id : DEFAULT_CUSTOMER_RESEARCH_MEMO_ARTIFACT_ID,
    type: "customer-research-memo",
    title: typeof artifactRecord?.title === "string" ? artifactRecord.title : "Customer research memo",
    updatedAt,
    status: currentRevision.status,
    currentRevision: {
      id: currentRevision.id,
      number: currentRevision.number,
      createdAt: currentRevision.createdAt,
      status: currentRevision.status,
    },
    research: memoResearch,
    sharedState,
    revisionHistory: normalizedRevisionHistory,
  };
}

export function getProjectArtifactByType(
  project: Pick<Project, "artifacts">,
  type: ProjectArtifactType,
): ProjectArtifact | undefined {
  return project.artifacts?.find((artifact) => artifact.type === type);
}

export function getActiveProjectArtifact(project: Pick<Project, "artifacts" | "activeArtifactId">): ProjectArtifact | null {
  if (!project.artifacts?.length) {
    return null;
  }

  return project.artifacts.find((artifact) => artifact.id === project.activeArtifactId) ?? project.artifacts[0] ?? null;
}

export function normalizeProject(value: Project): Project {
  const existingArtifacts = new Map<ProjectArtifactType, unknown>();
  for (const artifact of value.artifacts ?? []) {
    if (!isRecord(artifact) || !isProjectArtifactType(artifact.type)) {
      continue;
    }

    existingArtifacts.set(artifact.type, artifact);
  }
  const artifacts: ProjectArtifact[] = [
    normalizeValidationScorecardArtifact(existingArtifacts.get("validation-scorecard"), value.updatedAt),
    normalizeCustomerResearchMemoArtifact(value.research ?? null, existingArtifacts.get("customer-research-memo"), value.updatedAt),
  ];
  const hydratedArtifacts = artifacts.map<ProjectArtifact>((artifact) => {
    if (artifact.type !== "customer-research-memo") {
      return artifact;
    }

    return {
      ...artifact,
      sharedState: deriveResearchMemoSharedState({
        artifactId: artifact.id,
        revision: artifact.currentRevision,
        updatedAt: artifact.updatedAt,
        project: {
          name: value.name,
          description: value.description,
          diagram: value.diagram,
        },
        research: artifact.research,
        existingState: artifact.sharedState,
      }),
    };
  });
  const memoArtifact = getProjectArtifactByType({ artifacts: hydratedArtifacts }, "customer-research-memo");
  const memoResearch = isCustomerResearchMemoArtifact(memoArtifact) ? memoArtifact.research : null;
  const research = value.research ?? memoResearch ?? null;
  const activeArtifactId = hydratedArtifacts.some((artifact) => artifact.id === value.activeArtifactId)
    ? value.activeArtifactId
    : research
      ? hydratedArtifacts[1]?.id
      : hydratedArtifacts[0]?.id;

  return {
    ...value,
    sections: value.sections ?? [],
    documents: value.documents ?? [],
    websiteBuilders: value.websiteBuilders ?? [],
    research,
    artifacts: hydratedArtifacts,
    activeArtifactId,
    diagram: value.diagram ?? createDefaultProjectDiagram(),
  };
}
