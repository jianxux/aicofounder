import type { ResearchReport, ResearchRunArtifact, ResearchSource } from "@/lib/research";

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
    (value.research === null || isProjectResearch(value.research))
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

  return {
    id: typeof artifactRecord?.id === "string" ? artifactRecord.id : DEFAULT_CUSTOMER_RESEARCH_MEMO_ARTIFACT_ID,
    type: "customer-research-memo",
    title: typeof artifactRecord?.title === "string" ? artifactRecord.title : "Customer research memo",
    updatedAt: memoResearch?.updatedAt ?? (typeof artifactRecord?.updatedAt === "string" ? artifactRecord.updatedAt : fallbackUpdatedAt),
    status: currentRevision.status,
    currentRevision: {
      id: currentRevision.id,
      number: currentRevision.number,
      createdAt: currentRevision.createdAt,
      status: currentRevision.status,
    },
    research: memoResearch,
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
  const memoArtifact = getProjectArtifactByType({ artifacts }, "customer-research-memo");
  const memoResearch = isCustomerResearchMemoArtifact(memoArtifact) ? memoArtifact.research : null;
  const research = value.research ?? memoResearch ?? null;
  const activeArtifactId = artifacts.some((artifact) => artifact.id === value.activeArtifactId)
    ? value.activeArtifactId
    : research
      ? artifacts[1]?.id
      : artifacts[0]?.id;

  return {
    ...value,
    sections: value.sections ?? [],
    documents: value.documents ?? [],
    websiteBuilders: value.websiteBuilders ?? [],
    research,
    artifacts,
    activeArtifactId,
    diagram: value.diagram ?? createDefaultProjectDiagram(),
  };
}
